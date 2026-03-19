param(
  [string]$BaseUrl = "http://127.0.0.1:3100",
  [Parameter(Mandatory = $true)][string]$CompanyId,
  [string]$ProjectId,
  [string]$AgentRef = "Research-Gemini",
  [ValidateSet("T1-floor-v1", "T1-floor-v2", "T1-floor-normalized-v1", "T1-paperclip-default-v1")]
  [string]$BenchmarkFamily = "T1-floor-v1",
  [string]$TestKey = "T1",
  [int]$Repeats = 3,
  [int]$PollIntervalSeconds = 2,
  [int]$RunTimeoutSeconds = 300,
  [int]$PolicyLogPageBytes = 65536,
  [double]$FloorReferenceTotalTokens = 0,
  [double]$FloorReferenceInputTokens = 0,
  [switch]$RequireTokenMeasurement,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($Repeats -lt 1) {
  throw "-Repeats must be >= 1"
}

if (-not $DryRun -and [string]::IsNullOrWhiteSpace($ProjectId)) {
  throw "-ProjectId is required for live benchmark runs so the issue is bound to the intended project workspace."
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$readoutScript = Join-Path $scriptDir "gemini-benchmark-readout.ps1"
if (-not (Test-Path $readoutScript)) {
  throw "Missing readout script: $readoutScript"
}

function Invoke-ApiJson {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Path,
    $Body = $null,
    [int]$TimeoutSec = 30
  )

  $uri = "$BaseUrl$Path"
  $headers = @{ "Content-Type" = "application/json" }

  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -TimeoutSec $TimeoutSec
  }

  $jsonBody = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 20 }
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $jsonBody -TimeoutSec $TimeoutSec
}

function Get-AgentId {
  $agent = Invoke-ApiJson -Method "GET" -Path "/api/agents/${AgentRef}?companyId=$CompanyId"
  if ($null -eq $agent -or -not $agent.id) {
    throw "Could not resolve agent '$AgentRef' for company '$CompanyId'."
  }
  return [string]$agent.id
}

function New-TestDescription {
  param(
    [Parameter(Mandatory = $true)][string]$TargetPath,
    [Parameter(Mandatory = $true)][string]$SchemaBlock,
    [Parameter(Mandatory = $true)][string[]]$Rules
  )

  $ruleText = ($Rules | ForEach-Object { "- $_" }) -join "`n"

  return @"
Read only the file:
$TargetPath

Do not read any other file.
Do not write or modify any file.
Do not run commands.
Do not create follow-up tasks.

Return exactly one JSON object and nothing else.
Use exactly this schema:
$SchemaBlock

Rules:
$ruleText
"@
}

function New-IssueForTest {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Description,
    [Parameter(Mandatory = $true)][string]$AssigneeAgentId,
    [Parameter(Mandatory = $true)][string]$ProjectId
  )

  $payload = @{
    projectId = $ProjectId
    title = $Title
    description = $Description
    status = "backlog"
    priority = "medium"
    assigneeAgentId = $AssigneeAgentId
  }

  return Invoke-ApiJson -Method "POST" -Path "/api/companies/$CompanyId/issues" -Body $payload
}

function Reset-AgentSessionHard {
  param([Parameter(Mandatory = $true)][string]$AgentId)

  # Clear all runtime session state and persisted task sessions to avoid carry-over.
  [void](Invoke-ApiJson -Method "POST" -Path "/api/agents/$AgentId/runtime-state/reset-session" -Body @{})
}

function Start-IssueRun {
  param(
    [Parameter(Mandatory = $true)][string]$IssueId,
    [Parameter(Mandatory = $true)][string]$AgentId
  )

  $payload = @{
    agentId = $AgentId
    expectedStatuses = @("backlog", "todo", "blocked", "in_progress")
  }

  return Invoke-ApiJson -Method "POST" -Path "/api/issues/$IssueId/checkout" -Body $payload
}

function Invoke-AgentHeartbeatBestEffort {
  param([Parameter(Mandatory = $true)][string]$AgentId)

  try {
    [void](Invoke-ApiJson -Method "POST" -Path "/api/agents/$AgentId/heartbeat/invoke" -Body @{})
    return $true
  } catch {
    return $false
  }
}

function Wait-IssueRunId {
  param(
    [Parameter(Mandatory = $true)][string]$IssueId,
    [Parameter(Mandatory = $true)][int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $issue = Invoke-ApiJson -Method "GET" -Path "/api/issues/$IssueId"
    if ($issue.executionRunId) {
      return [string]$issue.executionRunId
    }
    Start-Sleep -Seconds $PollIntervalSeconds
  }

  throw "Timed out waiting for executionRunId on issue '$IssueId'."
}

function Wait-RunFinished {
  param(
    [Parameter(Mandatory = $true)][string]$RunId,
    [Parameter(Mandatory = $true)][int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $run = Invoke-ApiJson -Method "GET" -Path "/api/heartbeat-runs/$RunId"
    if ($run.status -in @("succeeded", "failed", "cancelled", "timed_out")) {
      return $run
    }
    Start-Sleep -Seconds $PollIntervalSeconds
  }

  throw "Timed out waiting for run '$RunId' to finish."
}

function Get-RunLogPage {
  param(
    [Parameter(Mandatory = $true)][string]$RunId,
    [Parameter(Mandatory = $true)][int]$Offset,
    [Parameter(Mandatory = $true)][int]$LimitBytes
  )

  try {
    return Invoke-ApiJson -Method "GET" -Path "/api/heartbeat-runs/$RunId/log?offset=$Offset&limitBytes=$LimitBytes"
  } catch {
    $message = [string]$_.Exception.Message
    $statusCode = $null
    $responseBody = ""

    if ($_.Exception -and $_.Exception.Response) {
      try { $statusCode = [int]$_.Exception.Response.StatusCode } catch { $statusCode = $null }
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($null -ne $stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          try { $responseBody = [string]$reader.ReadToEnd() } finally { $reader.Dispose() }
        }
      } catch {
        $responseBody = ""
      }
    }

    if ($statusCode -eq 404 -or $message -match "Run log not found" -or $responseBody -match "Run log not found") {
      return $null
    }
    throw
  }
}

function Cancel-RunBestEffort {
  param([Parameter(Mandatory = $true)][string]$RunId)

  try {
    [void](Invoke-ApiJson -Method "POST" -Path "/api/heartbeat-runs/$RunId/cancel" -Body @{})
    return $true
  } catch {
    return $false
  }
}

function Test-ContainsForbiddenToolInChunk {
  param([string]$ChunkText)

  if ([string]::IsNullOrWhiteSpace($ChunkText)) {
    return $null
  }

  $checks = @(
    @{ tool = "run_shell_command"; reason = "shell_command_used"; pattern = "run_shell_command" },
    @{ tool = "activate_skill"; reason = "skill_activation_used"; pattern = "activate_skill" },
    @{ tool = "list_directory"; reason = "list_directory_used"; pattern = "list_directory" },
    @{ tool = "grep_search"; reason = "search_tool_used"; pattern = "grep_search" },
    @{ tool = "glob_search"; reason = "search_tool_used"; pattern = "glob_search" },
    @{ tool = "find_files"; reason = "search_tool_used"; pattern = "find_files" },
    @{ tool = "codebase_investigator"; reason = "forbidden_tool_used"; pattern = "codebase_investigator" },
    @{ tool = "generalist"; reason = "forbidden_tool_used"; pattern = "generalist" },
    @{ tool = "google_web_search"; reason = "forbidden_tool_used"; pattern = "google_web_search" },
    @{ tool = "web_fetch"; reason = "forbidden_tool_used"; pattern = "web_fetch" },
    @{ tool = "save_memory"; reason = "forbidden_tool_used"; pattern = "save_memory" },
    @{ tool = "cli_help"; reason = "forbidden_tool_used"; pattern = "cli_help" }
  )

  foreach ($entry in $checks) {
    if ($ChunkText -match [Regex]::Escape($entry.tool)) {
      return [pscustomobject]@{ tool = $entry.tool; reasonCode = $entry.reason; pattern = $entry.pattern }
    }
  }

  return $null
}

function Get-FirstForbiddenMarker {
  param([string]$ChunkText)

  if ([string]::IsNullOrWhiteSpace($ChunkText)) {
    return $null
  }

  foreach ($outerLine in ($ChunkText -split "`n")) {
    if ([string]::IsNullOrWhiteSpace($outerLine)) { continue }

    $outerObj = $null
    try { $outerObj = $outerLine | ConvertFrom-Json } catch { continue }
    if ($null -eq $outerObj) { continue }

    $outerTs = if ($outerObj.PSObject.Properties.Name -contains "ts" -and $outerObj.ts) { [string]$outerObj.ts } else { $null }
    $innerChunk = if ($outerObj.PSObject.Properties.Name -contains "chunk" -and $outerObj.chunk) { [string]$outerObj.chunk } else { "" }
    if ([string]::IsNullOrWhiteSpace($innerChunk)) { continue }

    foreach ($innerLine in ($innerChunk -split "`n")) {
      if ([string]::IsNullOrWhiteSpace($innerLine)) { continue }

      $violation = Test-ContainsForbiddenToolInChunk -ChunkText $innerLine
      if ($null -eq $violation) { continue }

      $innerObj = $null
      try { $innerObj = $innerLine | ConvertFrom-Json } catch { $innerObj = $null }
      $eventTs = if ($null -ne $innerObj -and $innerObj.PSObject.Properties.Name -contains "timestamp" -and $innerObj.timestamp) { [string]$innerObj.timestamp } else { $outerTs }

      return [pscustomobject]@{
        reasonCode = [string]$violation.reasonCode
        toolName = [string]$violation.tool
        pattern = [string]$violation.pattern
        timestamp = $eventTs
      }
    }
  }

  return $null
}

function Wait-RunFinishedWithPolicy {
  param(
    [Parameter(Mandatory = $true)][string]$RunId,
    [Parameter(Mandatory = $true)][int]$TimeoutSeconds,
    [Parameter(Mandatory = $true)][bool]$StrictFloorMode
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $logOffset = 0
  $earlyReasons = New-Object System.Collections.Generic.List[string]
  $cancelIssued = $false
  $cancelIssuedAt = $null
  $firstForbiddenReasonCode = $null
  $firstForbiddenToolName = $null
  $firstForbiddenPattern = $null
  $firstForbiddenTimestamp = $null
  $runStartedAt = $null
  $runStartedCaptured = $false

  while ((Get-Date) -lt $deadline) {
    $run = Invoke-ApiJson -Method "GET" -Path "/api/heartbeat-runs/$RunId"

    if (-not $runStartedCaptured -and $run.startedAt) {
      try {
        $runStartedAt = [DateTime]$run.startedAt
        $runStartedCaptured = $true
      } catch {
        $runStartedAt = $null
      }
    }

    if ($StrictFloorMode -and $run.status -in @("queued", "running")) {
      $logPage = Get-RunLogPage -RunId $RunId -Offset $logOffset -LimitBytes $PolicyLogPageBytes
      $chunk = if ($null -ne $logPage -and $logPage.PSObject.Properties.Name -contains "content" -and $null -ne $logPage.content) { [string]$logPage.content } else { "" }

      if ($chunk.Length -gt 0) {
        $marker = Get-FirstForbiddenMarker -ChunkText $chunk
        if ($null -ne $marker) {
          if (-not $earlyReasons.Contains([string]$marker.reasonCode)) {
            [void]$earlyReasons.Add([string]$marker.reasonCode)
          }

          if ($null -eq $firstForbiddenReasonCode) {
            $firstForbiddenReasonCode = [string]$marker.reasonCode
            $firstForbiddenToolName = [string]$marker.toolName
            $firstForbiddenPattern = [string]$marker.pattern
            $firstForbiddenTimestamp = [string]$marker.timestamp
          }

          if (-not $cancelIssued) {
            $cancelIssued = [bool](Cancel-RunBestEffort -RunId $RunId)
            if ($cancelIssued) {
              $cancelIssuedAt = Get-Date
            }
          }
        }
      }

      if ($null -ne $logPage -and $logPage.PSObject.Properties.Name -contains "nextOffset" -and $null -ne $logPage.nextOffset) {
        $nextOffset = [int]$logPage.nextOffset
        if ($nextOffset -gt $logOffset) {
          $logOffset = $nextOffset
        }
      }
    }

    if ($run.status -in @("succeeded", "failed", "cancelled", "timed_out")) {
      $cancelIssuedAtSeconds = $null
      if ($cancelIssued -and $null -ne $runStartedAt -and $null -ne $cancelIssuedAt) {
        $cancelIssuedAtSeconds = [Math]::Round((($cancelIssuedAt - $runStartedAt).TotalSeconds), 3)
      }

      $firstForbiddenEventAtSeconds = $null
      if ($null -ne $runStartedAt -and -not [string]::IsNullOrWhiteSpace([string]$firstForbiddenTimestamp)) {
        try {
          $firstTs = [DateTime]$firstForbiddenTimestamp
          $firstForbiddenEventAtSeconds = [Math]::Round((($firstTs - $runStartedAt).TotalSeconds), 3)
        } catch {
          $firstForbiddenEventAtSeconds = $null
        }
      }

      return [pscustomobject]@{
        run = $run
        earlyReasonCodes = @($earlyReasons)
        cancelIssued = $cancelIssued
        cancelIssuedAtSeconds = $cancelIssuedAtSeconds
        firstForbiddenEventAtSeconds = $firstForbiddenEventAtSeconds
        firstForbiddenReasonCode = $firstForbiddenReasonCode
        firstForbiddenToolName = $firstForbiddenToolName
        firstForbiddenPattern = $firstForbiddenPattern
      }
    }

    Start-Sleep -Seconds $PollIntervalSeconds
  }

  throw "Timed out waiting for run '$RunId' to finish."
}

function Get-LatestIssueCommentBody {
  param([Parameter(Mandatory = $true)][string]$IssueId)

  $comments = Invoke-ApiJson -Method "GET" -Path "/api/issues/$IssueId/comments?order=desc&limit=20"
  if ($null -eq $comments) { return "" }

  $rows = @($comments)
  if ($rows.Count -eq 0) { return "" }

  foreach ($row in $rows) {
    if ($row.body -and [string]$row.body -ne "") {
      return [string]$row.body
    }
  }

  return ""
}

function Get-RunFinalAssistantText {
  param([Parameter(Mandatory = $true)][string]$LogContent)

  $latestText = ""
  $deltaBuilder = New-Object System.Text.StringBuilder
  if ([string]::IsNullOrWhiteSpace($LogContent)) {
    return $latestText
  }

  $outerLines = [string]$LogContent -split "`n"
  foreach ($outer in $outerLines) {
    if ([string]::IsNullOrWhiteSpace($outer)) { continue }

    $outerObj = $null
    try { $outerObj = $outer | ConvertFrom-Json } catch { continue }
    if ($null -eq $outerObj) { continue }
    if (-not ($outerObj.PSObject.Properties.Name -contains "chunk")) { continue }

    $chunkText = [string]$outerObj.chunk
    if ([string]::IsNullOrWhiteSpace($chunkText)) { continue }

    foreach ($inner in ($chunkText -split "`n")) {
      if ([string]::IsNullOrWhiteSpace($inner)) { continue }

      $entry = $null
      try { $entry = $inner | ConvertFrom-Json } catch { continue }
      if ($null -eq $entry) { continue }

      $entryType = [string]$entry.type
      $isAssistantMessage = (
        $entryType -eq "assistant" -or
        ($entryType -eq "message" -and [string]$entry.role -eq "assistant")
      )
      if ($isAssistantMessage) {
        $parts = New-Object System.Collections.Generic.List[string]
        if (($entry.PSObject.Properties.Name -contains "message") -and $entry.message -and $entry.message.text) {
          $text = [string]$entry.message.text
          if (-not [string]::IsNullOrWhiteSpace($text)) {
            [void]$parts.Add($text.Trim())
          }
        }
        if (($entry.PSObject.Properties.Name -contains "message") -and $entry.message -and $entry.message.content) {
          foreach ($partRaw in @($entry.message.content)) {
            $part = $partRaw
            if ($null -eq $part) { continue }
            $partType = [string]$part.type
            if ($partType -notin @("output_text", "text", "content")) { continue }
            $partValue = if ($null -ne $part.text) { $part.text } else { $part.content }
            $partText = [string]$partValue
            if (-not [string]::IsNullOrWhiteSpace($partText)) {
              [void]$parts.Add($partText.Trim())
            }
          }
        }
        if ($parts.Count -eq 0 -and $entry.PSObject.Properties.Name -contains "content") {
          $contentText = [string]$entry.content
          if (-not [string]::IsNullOrWhiteSpace($contentText)) {
            [void]$parts.Add($contentText)
          }
        }
        if ($parts.Count -gt 0) {
          $entryText = ($parts -join "`n")
          $isDelta = ($entry.PSObject.Properties.Name -contains "delta" -and [bool]$entry.delta)
          if ($isDelta) {
            [void]$deltaBuilder.Append($entryText)
            $latestText = [string]$deltaBuilder.ToString()
          } else {
            $latestText = $entryText.Trim()
            $null = $deltaBuilder.Clear()
          }
        }
        continue
      }

      if ($entryType -eq "text") {
        $part = $null
        if ($entry.PSObject.Properties.Name -contains "part") {
          $part = $entry.part
        }
        $partText = if ($part -and $part.text) { [string]$part.text } else { "" }
        if (-not [string]::IsNullOrWhiteSpace($partText)) {
          $isDelta = ($entry.PSObject.Properties.Name -contains "delta" -and [bool]$entry.delta)
          if ($isDelta) {
            [void]$deltaBuilder.Append($partText)
            $latestText = [string]$deltaBuilder.ToString()
          } else {
            $latestText = $partText.Trim()
            $null = $deltaBuilder.Clear()
          }
        }
        continue
      }

      if ($entryType -eq "result") {
        $resultValue = ""
        if ($entry.PSObject.Properties.Name -contains "result") {
          $resultValue = $entry.result
        } elseif ($entry.PSObject.Properties.Name -contains "text") {
          $resultValue = $entry.text
        } elseif ($entry.PSObject.Properties.Name -contains "response") {
          $resultValue = $entry.response
        }
        $resultText = [string]$resultValue
        if (-not [string]::IsNullOrWhiteSpace($resultText)) {
          $latestText = $resultText.Trim()
        }
      }
    }
  }

  return $latestText
}

function Get-TextSha256 {
  param([string]$Text)

  $normalized = if ($null -eq $Text) { "" } else { ($Text -replace "\r\n", "`n").Trim() }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hashBytes = $sha.ComputeHash($bytes)
    return ([System.BitConverter]::ToString($hashBytes)).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Get-RunLogContent {
  param([Parameter(Mandatory = $true)][string]$RunId)

  $offset = 0
  $pages = 0
  $maxPages = 30
  $maxBytes = 262144
  $builder = New-Object System.Text.StringBuilder

  while ($pages -lt $maxPages) {
    $page = Get-RunLogPage -RunId $RunId -Offset $offset -LimitBytes $maxBytes
    if ($null -eq $page) { break }

    $chunk = if ($page.PSObject.Properties.Name -contains "content" -and $null -ne $page.content) { [string]$page.content } else { "" }
    if ($chunk.Length -gt 0) {
      [void]$builder.Append($chunk)
    }

    if (-not ($page.PSObject.Properties.Name -contains "nextOffset") -or $null -eq $page.nextOffset) {
      break
    }

    $nextOffset = [int]$page.nextOffset
    if ($nextOffset -le $offset) {
      break
    }

    $offset = $nextOffset
    $pages++
  }

  return [string]$builder.ToString()
}

function Convert-ToNormalizedPath {
  param([string]$PathText)

  if ([string]::IsNullOrWhiteSpace($PathText)) { return "" }
  return (($PathText -replace "\\", "/").Trim().ToLowerInvariant())
}

function Test-IsTargetPathMatch {
  param(
    [Parameter(Mandatory = $true)][string]$ObservedPath,
    [Parameter(Mandatory = $true)][string]$TargetPath
  )

  $observed = Convert-ToNormalizedPath -PathText $ObservedPath
  $target = Convert-ToNormalizedPath -PathText $TargetPath
  if ($observed -eq "" -or $target -eq "") { return $false }

  return ($observed -eq $target -or $observed.EndsWith("/" + $target) -or $observed.EndsWith($target))
}

function Get-RunToolAndReadStats {
  param([string]$LogContent)

  $toolCounts = @{}
  $readPaths = New-Object System.Collections.Generic.HashSet[string] ([System.StringComparer]::OrdinalIgnoreCase)

  if ([string]::IsNullOrWhiteSpace($LogContent)) {
    return [pscustomobject]@{ toolCounts = $toolCounts; readPaths = @() }
  }

  $outerLines = [string]$LogContent -split "`n"
  foreach ($outer in $outerLines) {
    if ([string]::IsNullOrWhiteSpace($outer)) { continue }

    $outerObj = $null
    try { $outerObj = $outer | ConvertFrom-Json } catch { continue }
    if ($null -eq $outerObj) { continue }
    if (-not $outerObj.PSObject.Properties.Name.Contains("chunk")) { continue }

    $chunkText = [string]$outerObj.chunk
    if ([string]::IsNullOrWhiteSpace($chunkText)) { continue }

    foreach ($inner in ($chunkText -split "`n")) {
      if ([string]::IsNullOrWhiteSpace($inner)) { continue }
      $entry = $null
      try { $entry = $inner | ConvertFrom-Json } catch { continue }
      if ($null -eq $entry) { continue }

      if ($entry.type -eq "tool_use") {
        $toolName = if ($entry.tool_name) { [string]$entry.tool_name } elseif ($entry.name) { [string]$entry.name } else { "" }
        if (-not [string]::IsNullOrWhiteSpace($toolName)) {
          if (-not $toolCounts.ContainsKey($toolName)) {
            $toolCounts[$toolName] = 0
          }
          $toolCounts[$toolName] = [int]$toolCounts[$toolName] + 1

          if ($toolName -eq "read_file") {
            $pathValue = ""
            if (
              $entry.parameters -and
              $entry.parameters.PSObject.Properties.Name -contains "path" -and
              $entry.parameters.path
            ) {
              $pathValue = [string]$entry.parameters.path
            } elseif (
              $entry.PSObject.Properties.Name -contains "input" -and
              $entry.input -and
              $entry.input.PSObject.Properties.Name -contains "path" -and
              $entry.input.path
            ) {
              $pathValue = [string]$entry.input.path
            }
            if (-not [string]::IsNullOrWhiteSpace($pathValue)) {
              [void]$readPaths.Add($pathValue)
            }
          }
        }
      }

      if ($entry.type -eq "assistant" -and $entry.message -and $entry.message.content) {
        foreach ($part in $entry.message.content) {
          if ($part.type -eq "tool_call") {
            $toolName = if ($part.name) { [string]$part.name } else { "" }
            if (-not [string]::IsNullOrWhiteSpace($toolName)) {
              if (-not $toolCounts.ContainsKey($toolName)) {
                $toolCounts[$toolName] = 0
              }
              $toolCounts[$toolName] = [int]$toolCounts[$toolName] + 1

              if (
                $toolName -eq "read_file" -and
                $part.PSObject.Properties.Name -contains "input" -and
                $part.input -and
                $part.input.PSObject.Properties.Name -contains "path" -and
                $part.input.path
              ) {
                [void]$readPaths.Add([string]$part.input.path)
              }
            }
          }
        }
      }
    }
  }

  return [pscustomobject]@{
    toolCounts = $toolCounts
    readPaths = @($readPaths)
  }
}

function Test-IsRawJson {
  param([string]$Text)

  $trimmed = if ($null -eq $Text) { "" } else { $Text.Trim() }
  if ([string]::IsNullOrWhiteSpace($trimmed)) { return $false }
  if ($trimmed.StartsWith('```') -or $trimmed.Contains('```')) { return $false }
  if (-not ($trimmed.StartsWith("{") -and $trimmed.EndsWith("}"))) { return $false }

  try {
    $null = $trimmed | ConvertFrom-Json
    return $true
  } catch {
    return $false
  }
}

function Get-StrictFloorOutputAnalysis {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Text,
    [Parameter(Mandatory = $true)][bool]$AllowFenceNormalization
  )

  $trimmed = if ($null -eq $Text) { "" } else { $Text.Trim() }
  $strictRawOutputPass = Test-IsRawJson -Text $trimmed
  $normalizedForAnalysis = $false
  $normalizationReason = "none"
  $analysisText = $trimmed

  if (-not $strictRawOutputPass -and $AllowFenceNormalization -and $trimmed.StartsWith('```') -and $trimmed.Contains('```')) {
    $candidate = $trimmed -replace '^\s*```(?:json)?\s*', ''
    $candidate = $candidate -replace '\s*```\s*$', ''
    $candidate = $candidate.Trim()
    if (Test-IsRawJson -Text $candidate) {
      $normalizedForAnalysis = $true
      $normalizationReason = "fenced_json_output"
      $analysisText = $candidate
    }
  }

  $analysisObject = $null
  if ($strictRawOutputPass -or $normalizedForAnalysis) {
    $analysisObject = $analysisText | ConvertFrom-Json
  }

  return [pscustomobject]@{
    strictRawOutputPass = $strictRawOutputPass
    normalizedForAnalysis = $normalizedForAnalysis
    normalizationReason = $normalizationReason
    analysisObject = $analysisObject
  }
}

function Test-OutputSchema {
  param(
    [Parameter(Mandatory = $true)][string]$TestKey,
    [Parameter(Mandatory = $true)]$JsonObject
  )

  $requiredKeys = switch ($TestKey) {
    "T1" { @("env_keys", "model_sets", "fallback_rule") }
    "T2" { @("status_codes", "invalid_json_branch", "default_error_branch") }
    "T3" { @("wake_conditions", "skip_conditions", "summary") }
    default { @() }
  }

  if ($requiredKeys.Count -eq 0) {
    return $false
  }

  $props = @{}
  foreach ($p in $JsonObject.PSObject.Properties) {
    $props[[string]$p.Name] = $true
  }

  foreach ($k in $requiredKeys) {
    if (-not $props.ContainsKey($k)) {
      return $false
    }
  }

  return ($props.Keys.Count -eq $requiredKeys.Count)
}

function Get-FailReasonCodeForTool {
  param([string]$ToolName)

  switch ($ToolName) {
    "run_shell_command" { return "shell_command_used" }
    "list_directory" { return "list_directory_used" }
    "grep_search" { return "search_tool_used" }
    "glob_search" { return "search_tool_used" }
    "find_files" { return "search_tool_used" }
    "activate_skill" { return "skill_activation_used" }
    default { return "forbidden_tool_used" }
  }
}

$tests = @(
  @{
    key = "T1"
    name = "Models Constants Extraction"
    titlePrefix = "Gemini MicroBench T1"
    targetPath = "packages/adapters/gemini-local/src/server/models.ts"
    schema = @'
{
  "env_keys": ["..."],
  "model_sets": ["..."],
  "fallback_rule": "..."
}
'@
    rules = @(
      "env_keys: keys from EXTRA_GEMINI_MODELS_ENV_KEYS in source order",
      "model_sets: top-level exported const arrays only",
      "fallback_rule: max 1 sentence"
    )
  },
  @{
    key = "T2"
    name = "Error Handler Mapping"
    titlePrefix = "Gemini MicroBench T2"
    targetPath = "server/src/middleware/error-handler.ts"
    schema = @'
{
  "status_codes": ["..."],
  "invalid_json_branch": "...",
  "default_error_branch": "..."
}
'@
    rules = @(
      "status_codes: distinct numeric status codes used in responses, ascending as strings",
      "invalid_json_branch: max 1 sentence",
      "default_error_branch: max 1 sentence"
    )
  },
  @{
    key = "T3"
    name = "Checkout Wake Logic"
    titlePrefix = "Gemini MicroBench T3"
    targetPath = "server/src/routes/issues-checkout-wakeup.ts"
    schema = @'
{
  "wake_conditions": ["..."],
  "skip_conditions": ["..."],
  "summary": "..."
}
'@
    rules = @(
      "wake_conditions and skip_conditions: concise bullet-like strings",
      "summary: max 1 sentence"
    )
  }
)

$selectedTest = $tests | Where-Object { $_.key -eq $TestKey } | Select-Object -First 1
if ($null -eq $selectedTest) {
  $available = ($tests | ForEach-Object { $_.key }) -join ", "
  throw "Unknown -TestKey '$TestKey'. Available keys: $available"
}

$agentId = Get-AgentId

if ($DryRun) {
  [ordered]@{
    mode = "dry-run"
    benchmarkFamily = $BenchmarkFamily
    companyId = $CompanyId
    projectId = $ProjectId
    agentRef = $AgentRef
    agentId = $agentId
    testKey = $selectedTest.key
    repeats = $Repeats
    test = [ordered]@{
      key = $selectedTest.key
      name = $selectedTest.name
      titlePrefix = $selectedTest.titlePrefix
      targetPath = $selectedTest.targetPath
    }
  } | ConvertTo-Json -Depth 8
  exit 0
}

$results = @()
$seriesStartedAt = Get-Date
$strictFloorMode =
  $BenchmarkFamily -like "T1-floor-v*" -or
  $BenchmarkFamily -eq "T1-floor-normalized-v1"
$normalizedAnalysisMode = ($BenchmarkFamily -eq "T1-floor-normalized-v1")
$allowedToolsForFloor = @("read_file")

for ($iteration = 1; $iteration -le $Repeats; $iteration++) {
  Reset-AgentSessionHard -AgentId $agentId

  $issueTitle = "$($selectedTest.titlePrefix): $($selectedTest.name) [run $iteration]"
  if ($normalizedAnalysisMode) {
    $issueTitle += " (normalized)"
  }
  $description = New-TestDescription -TargetPath $selectedTest.targetPath -SchemaBlock $selectedTest.schema -Rules $selectedTest.rules

  if (-not $strictFloorMode -and $BenchmarkFamily -eq "T1-paperclip-default-v1" -and $selectedTest.key -eq "T1") {
    $description = @"
Task:
Extract model constants from the Gemini adapter model-file area and return one JSON object.

Primary target:
- packages/adapters/gemini-local/src/server/models.ts

Bounded scope:
- You may inspect related files under packages/adapters/gemini-local/src/server if needed.
- Do not read outside packages/adapters/gemini-local/src.
- Do not write or modify files.
- Do not run shell commands.
- Do not call Paperclip API/task workflow endpoints.

Return exactly one JSON object and nothing else.
Use exactly this schema:
$($selectedTest.schema)

Rules:
- env_keys: keys from EXTRA_GEMINI_MODELS_ENV_KEYS in source order
- model_sets: top-level exported const arrays only
- fallback_rule: max 1 sentence
"@
  }

  if ($strictFloorMode) {
    $strictFloorVersionNote = if ($BenchmarkFamily -eq "T1-floor-v2") {
      "Benchmark family: T1-floor-v2 (strict)"
    } elseif ($BenchmarkFamily -eq "T1-floor-normalized-v1") {
      "Benchmark family: T1-floor-normalized-v1 (analysis-only normalized)"
    } else {
      "Benchmark family: T1-floor-v1 (strict)"
    }
    $description = @"
$description

${strictFloorVersionNote}

Analysis-only note:
- fenced JSON may be normalized for analysis only
- strict_raw_output_pass remains false unless the raw output is already an unwrapped JSON object

Hard constraints:
- Only read_file is allowed.
- Any shell command, API call, directory listing, search, or skill activation is a FAIL.
- Any non-target file read is a FAIL.
- Output must be exactly one raw JSON object.
- The first non-whitespace character must be {.
- The last non-whitespace character must be }.
- Do not use markdown fences.
- Do not add any prose before or after the JSON object.
"@
  }

  $issue = New-IssueForTest -Title $issueTitle -Description $description -AssigneeAgentId $agentId -ProjectId $ProjectId

  [void](Start-IssueRun -IssueId ([string]$issue.id) -AgentId $agentId)
  $runId = Wait-IssueRunId -IssueId ([string]$issue.id) -TimeoutSeconds 45
  $runOutcome = Wait-RunFinishedWithPolicy -RunId $runId -TimeoutSeconds $RunTimeoutSeconds -StrictFloorMode:$strictFloorMode
  $run = $runOutcome.run
  $earlyReasonCodes = @($runOutcome.earlyReasonCodes)
  $cancelIssued = [bool]$runOutcome.cancelIssued
  $cancelIssuedAtSeconds = $runOutcome.cancelIssuedAtSeconds
  $firstForbiddenEventAtSeconds = $runOutcome.firstForbiddenEventAtSeconds
  $firstForbiddenReasonCode = $runOutcome.firstForbiddenReasonCode
  $firstForbiddenToolName = $runOutcome.firstForbiddenToolName
  $firstForbiddenPattern = $runOutcome.firstForbiddenPattern

  $readoutArgs = @(
    "-ExecutionPolicy", "Bypass",
    "-File", $readoutScript,
    "-BaseUrl", $BaseUrl,
    "-RunId", $runId
  )

  if ($RequireTokenMeasurement) {
    $readoutArgs += "-RequireTokenMeasurement"
  }

  $readoutRaw = $null
  $readout = $null
  try {
    $readoutRaw = & powershell @readoutArgs 2>&1
    $readoutText = [string]($readoutRaw | Out-String)
    $readout = $readoutText | ConvertFrom-Json
  } catch {
    $readout = [pscustomobject]@{
      duration_seconds = $null
      benchmarkTokens = $null
      observedTokens = $null
      inputTokens = $null
      cachedInputTokens = $null
      outputTokens = $null
      usageJson = $null
      tokenMeasurementStatus = "missing"
      readoutError = [string]$_.Exception.Message
      readoutRaw = if ($null -ne $readoutRaw) { [string]($readoutRaw | Out-String) } else { $null }
    }
  }

  $runLog = Get-RunLogContent -RunId $runId
  $commentBody = if ($strictFloorMode) {
    Get-RunFinalAssistantText -LogContent $runLog
  } else {
    Get-LatestIssueCommentBody -IssueId ([string]$issue.id)
  }
  $outputHash = ""
  $toolStats = Get-RunToolAndReadStats -LogContent $runLog
  $toolCounts = $toolStats.toolCounts
  $readPaths = @($toolStats.readPaths)

  $toolCallCount = 0
  foreach ($kv in $toolCounts.GetEnumerator()) {
    $toolCallCount += [int]$kv.Value
  }

  $allowedToolCallCount = 0
  foreach ($allowedTool in $allowedToolsForFloor) {
    if ($toolCounts.ContainsKey($allowedTool)) {
      $allowedToolCallCount += [int]$toolCounts[$allowedTool]
    }
  }

  $forbiddenToolCallCount = [Math]::Max(0, $toolCallCount - $allowedToolCallCount)

  $reasonCodes = New-Object System.Collections.Generic.List[string]
  foreach ($r in $earlyReasonCodes) {
    if (-not [string]::IsNullOrWhiteSpace($r) -and -not $reasonCodes.Contains($r)) {
      [void]$reasonCodes.Add($r)
    }
  }

  foreach ($kv in $toolCounts.GetEnumerator()) {
    $toolName = [string]$kv.Key
    if ($allowedToolsForFloor -notcontains $toolName) {
      $reason = Get-FailReasonCodeForTool -ToolName $toolName
      if (-not $reasonCodes.Contains($reason)) {
        [void]$reasonCodes.Add($reason)
      }
    }
  }

  foreach ($pathValue in $readPaths) {
    if (-not (Test-IsTargetPathMatch -ObservedPath ([string]$pathValue) -TargetPath $selectedTest.targetPath)) {
      if (-not $reasonCodes.Contains("read_non_target_file")) {
        [void]$reasonCodes.Add("read_non_target_file")
      }
      break
    }
  }

  $apiTouchDetected = ($runLog -match "Invoke-RestMethod|Invoke-WebRequest|http://127\.0\.0\.1:3101/api/|/api/")
  if ($apiTouchDetected -and -not $reasonCodes.Contains("api_call_used")) {
    [void]$reasonCodes.Add("api_call_used")
  }

  $otherIssueTouched = $false
  $issueIdentifier = [string]$issue.identifier
  if (-not [string]::IsNullOrWhiteSpace($issueIdentifier)) {
    $matches = [regex]::Matches($runLog, "DAV-\d+")
    foreach ($m in $matches) {
      if ([string]$m.Value -ne $issueIdentifier) {
        $otherIssueTouched = $true
        break
      }
    }
  }
  if ($otherIssueTouched -and -not $reasonCodes.Contains("other_issue_context_touched")) {
    [void]$reasonCodes.Add("other_issue_context_touched")
  }

  $floorOutputAnalysis = Get-StrictFloorOutputAnalysis -Text $commentBody -AllowFenceNormalization:$normalizedAnalysisMode
  $isRawJsonOutput = [bool]$floorOutputAnalysis.strictRawOutputPass
  $normalizedForAnalysis = [bool]$floorOutputAnalysis.normalizedForAnalysis
  $normalizationReason = [string]$floorOutputAnalysis.normalizationReason
  $analysisOutputObj = $floorOutputAnalysis.analysisObject
  $outputSchemaValid = $false
  if ($null -ne $analysisOutputObj) {
    $outputSchemaValid = Test-OutputSchema -TestKey $selectedTest.key -JsonObject $analysisOutputObj
  }

  if (-not $isRawJsonOutput -and -not $normalizedForAnalysis -and -not $reasonCodes.Contains("non_json_output")) {
    [void]$reasonCodes.Add("non_json_output")
  }
  if (($isRawJsonOutput -or $normalizedForAnalysis) -and -not $outputSchemaValid -and -not $reasonCodes.Contains("output_schema_mismatch")) {
    [void]$reasonCodes.Add("output_schema_mismatch")
  }

  if ($run.status -ne "succeeded" -and -not $reasonCodes.Contains("run_not_succeeded")) {
    [void]$reasonCodes.Add("run_not_succeeded")
  }

  $failReasonCodes = @($reasonCodes)
  $passFail = if ($failReasonCodes.Count -eq 0) { "PASS" } else { "FAIL" }

  $providerInputTokens = if ($null -ne $readout.inputTokens) { [double]$readout.inputTokens } else { $null }
  $providerCachedInputTokens = if ($null -ne $readout.cachedInputTokens) { [double]$readout.cachedInputTokens } else { $null }
  $providerOutputTokens = if ($null -ne $readout.outputTokens) { [double]$readout.outputTokens } else { $null }
  $freshSession = if ($null -ne $readout.usageJson -and $readout.usageJson.PSObject.Properties.Name -contains "freshSession") { [bool]$readout.usageJson.freshSession } else { $null }
  $sessionReused = if ($null -ne $readout.usageJson -and $readout.usageJson.PSObject.Properties.Name -contains "sessionReused") { [bool]$readout.usageJson.sessionReused } else { $null }
  $taskSessionReused = if ($null -ne $readout.usageJson -and $readout.usageJson.PSObject.Properties.Name -contains "taskSessionReused") { [bool]$readout.usageJson.taskSessionReused } else { $null }
  $providerTotalTokens = if ($null -ne $providerInputTokens -and $null -ne $providerCachedInputTokens -and $null -ne $providerOutputTokens) {
    [int64]($providerInputTokens + $providerCachedInputTokens + $providerOutputTokens)
  } elseif ($null -ne $readout.observedTokens) {
    [int64]$readout.observedTokens
  } elseif ($null -ne $readout.benchmarkTokens) {
    [int64]$readout.benchmarkTokens
  } else {
    $null
  }

  $results += [pscustomobject]@{
    benchmarkFamily = $BenchmarkFamily
    projectId = $ProjectId
    iteration = $iteration
    testKey = $selectedTest.key
    testName = $selectedTest.name
    issueId = [string]$issue.id
    issueIdentifier = [string]$issue.identifier
    runId = [string]$runId
    runStatus = [string]$run.status
    durationSeconds = $readout.duration_seconds
    inputTokens = $providerInputTokens
    cachedInputTokens = $providerCachedInputTokens
    outputTokens = $providerOutputTokens
    totalTokens = $providerTotalTokens
    benchmarkTokens = $readout.benchmarkTokens
    tokenMeasurementStatus = $readout.tokenMeasurementStatus
    freshSession = $freshSession
    sessionReused = $sessionReused
    taskSessionReused = $taskSessionReused
    toolCallCount = $toolCallCount
    allowedToolCallCount = $allowedToolCallCount
    forbiddenToolCallCount = $forbiddenToolCallCount
    toolCallsByTool = $toolCounts
    readPaths = $readPaths
    cancelIssued = $cancelIssued
    cancelIssuedAtSeconds = $cancelIssuedAtSeconds
    firstForbiddenEventAtSeconds = $firstForbiddenEventAtSeconds
    firstForbiddenReasonCode = $firstForbiddenReasonCode
    firstForbiddenToolName = $firstForbiddenToolName
    firstForbiddenPattern = $firstForbiddenPattern
    rawOutputValidJson = $isRawJsonOutput
    normalizedForAnalysis = $normalizedForAnalysis
    strictRawOutputPass = $isRawJsonOutput
    normalizationReason = $normalizationReason
    rawOutputSchemaValid = $outputSchemaValid
    passFail = $passFail
    failReasonCodes = $failReasonCodes
    outputHashSha256 = $outputHash
  }
}

$seriesFinishedAt = Get-Date
$tokenValues = @($results | Where-Object { $null -ne $_.totalTokens } | ForEach-Object { [double]$_.totalTokens })
$inputTokenValues = @($results | Where-Object { $null -ne $_.inputTokens } | ForEach-Object { [double]$_.inputTokens })
$durationValues = @($results | Where-Object { $null -ne $_.durationSeconds } | ForEach-Object { [double]$_.durationSeconds })
$hashValues = @($results | ForEach-Object { [string]$_.outputHashSha256 } | Where-Object { $_ -ne "" })

$passCount = @($results | Where-Object { $_.passFail -eq "PASS" }).Count
$failCount = @($results | Where-Object { $_.passFail -eq "FAIL" }).Count
$passRate = if ($results.Count -gt 0) { [Math]::Round((100.0 * $passCount / $results.Count), 1) } else { 0 }

$violationHistogram = @{}
foreach ($row in $results) {
  foreach ($reason in @($row.failReasonCodes)) {
    if (-not $violationHistogram.ContainsKey($reason)) {
      $violationHistogram[$reason] = 0
    }
    $violationHistogram[$reason] = [int]$violationHistogram[$reason] + 1
  }
}

$minBenchmarkTokens = if ($tokenValues.Count -gt 0) { ($tokenValues | Measure-Object -Minimum).Minimum } else { $null }
$maxBenchmarkTokens = if ($tokenValues.Count -gt 0) { ($tokenValues | Measure-Object -Maximum).Maximum } else { $null }
$meanBenchmarkTokens = if ($tokenValues.Count -gt 0) { [Math]::Round(($tokenValues | Measure-Object -Average).Average, 1) } else { $null }
$minInputTokens = if ($inputTokenValues.Count -gt 0) { ($inputTokenValues | Measure-Object -Minimum).Minimum } else { $null }
$maxInputTokens = if ($inputTokenValues.Count -gt 0) { ($inputTokenValues | Measure-Object -Maximum).Maximum } else { $null }
$meanInputTokens = if ($inputTokenValues.Count -gt 0) { [Math]::Round(($inputTokenValues | Measure-Object -Average).Average, 1) } else { $null }
$meanRunDurationSeconds = if ($durationValues.Count -gt 0) { [Math]::Round(($durationValues | Measure-Object -Average).Average, 1) } else { $null }
$outputHashEquality = if ($hashValues.Count -eq 0) { $false } else { (@($hashValues | Select-Object -Unique).Count -eq 1) }
$seriesDurationSeconds = [Math]::Round((($seriesFinishedAt - $seriesStartedAt).TotalSeconds), 1)

$totalTokensSpreadRatio = if ($null -ne $minBenchmarkTokens -and [double]$minBenchmarkTokens -gt 0 -and $null -ne $maxBenchmarkTokens) {
  [Math]::Round(([double]$maxBenchmarkTokens / [double]$minBenchmarkTokens), 3)
} else {
  $null
}

$inputTokensSpreadRatio = if ($null -ne $minInputTokens -and [double]$minInputTokens -gt 0 -and $null -ne $maxInputTokens) {
  [Math]::Round(([double]$maxInputTokens / [double]$minInputTokens), 3)
} else {
  $null
}

$hasCancelIssued = @($results | Where-Object { $_.cancelIssued -eq $true }).Count -gt 0
$stablePass = (
  $results.Count -ge 3 -and
  $passCount -eq $results.Count -and
  -not $hasCancelIssued -and
  $null -ne $totalTokensSpreadRatio -and
  $null -ne $inputTokensSpreadRatio -and
  $totalTokensSpreadRatio -le 1.15 -and
  $inputTokensSpreadRatio -le 1.15
)

$overheadRatioTotal = if ($FloorReferenceTotalTokens -gt 0 -and $null -ne $meanBenchmarkTokens) {
  [Math]::Round(($meanBenchmarkTokens / $FloorReferenceTotalTokens), 3)
} else {
  $null
}

$overheadRatioInput = if ($FloorReferenceInputTokens -gt 0 -and $null -ne $meanInputTokens) {
  [Math]::Round(($meanInputTokens / $FloorReferenceInputTokens), 3)
} else {
  $null
}

$summary = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  benchmarkFamily = $BenchmarkFamily
  baseUrl = $BaseUrl
  companyId = $CompanyId
  projectId = $ProjectId
  agentRef = $AgentRef
  agentId = $agentId
  testKey = $selectedTest.key
  testName = $selectedTest.name
  repeats = $Repeats
  seriesDurationSeconds = $seriesDurationSeconds
  passCount = $passCount
  failCount = $failCount
  passRate = $passRate
  normalizedForAnalysisCount = @($results | Where-Object { $_.normalizedForAnalysis -eq $true }).Count
  strictRawOutputPassCount = @($results | Where-Object { $_.strictRawOutputPass -eq $true }).Count
  normalizationReasonHistogram = @{}
  minTotalTokens = $minBenchmarkTokens
  maxTotalTokens = $maxBenchmarkTokens
  meanTotalTokens = $meanBenchmarkTokens
  totalTokensSpreadRatio = $totalTokensSpreadRatio
  inputTokensSpreadRatio = $inputTokensSpreadRatio
  hasCancelIssued = $hasCancelIssued
  stablePass = $stablePass
  meanInputTokens = $meanInputTokens
  floorReferenceTotalTokens = if ($FloorReferenceTotalTokens -gt 0) { $FloorReferenceTotalTokens } else { $null }
  floorReferenceInputTokens = if ($FloorReferenceInputTokens -gt 0) { $FloorReferenceInputTokens } else { $null }
  overheadRatioTotal = $overheadRatioTotal
  overheadRatioInput = $overheadRatioInput
  minBenchmarkTokens = $minBenchmarkTokens
  maxBenchmarkTokens = $maxBenchmarkTokens
  meanBenchmarkTokens = $meanBenchmarkTokens
  meanRunDurationSeconds = $meanRunDurationSeconds
  outputHashEquality = $outputHashEquality
  violationHistogram = $violationHistogram
  totalRuns = $results.Count
  results = $results
}

foreach ($row in $results) {
  $reason = [string]$row.normalizationReason
  if ([string]::IsNullOrWhiteSpace($reason)) { $reason = "none" }
  if (-not $summary.normalizationReasonHistogram.Contains($reason)) {
    $summary.normalizationReasonHistogram[$reason] = 0
  }
  $summary.normalizationReasonHistogram[$reason] = [int]$summary.normalizationReasonHistogram[$reason] + 1
}

$summary | ConvertTo-Json -Depth 20
