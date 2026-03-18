param(
  [string]$BaseUrl = "http://127.0.0.1:3101",
  [string]$RunId,
  [string]$IssueId,
  [switch]$RequireTokenMeasurement,
  [int]$LogPageBytes = 262144,
  [int]$MaxLogPages = 20
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RunId) -and [string]::IsNullOrWhiteSpace($IssueId)) {
  throw "Provide -RunId or -IssueId."
}

function Invoke-Json {
  param(
    [Parameter(Mandatory = $true)][string]$Uri
  )

  $resp = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 15
  if ([string]::IsNullOrWhiteSpace($resp.Content)) {
    return $null
  }
  return ($resp.Content | ConvertFrom-Json)
}

function Get-RunIdFromIssue {
  param(
    [Parameter(Mandatory = $true)][string]$IssueRef
  )

  $runs = Invoke-Json -Uri "$BaseUrl/api/issues/$IssueRef/runs"
  if ($null -eq $runs -or $runs.Count -eq 0) {
    throw "No runs found for issue '$IssueRef'."
  }

  $latest = $runs |
    Sort-Object -Property @{ Expression = { [DateTime]($_.createdAt) }; Descending = $true } |
    Select-Object -First 1

  return [string]$latest.runId
}

function Read-FullRunLog {
  param(
    [Parameter(Mandatory = $true)][string]$ResolvedRunId
  )

  $offset = 0
  $pages = 0
  $builder = New-Object System.Text.StringBuilder

  while ($pages -lt $MaxLogPages) {
    $uri = "$BaseUrl/api/heartbeat-runs/$ResolvedRunId/log?offset=$offset&limitBytes=$LogPageBytes"
    $part = Invoke-Json -Uri $uri
    if ($null -eq $part) { break }

    $chunk = ""
    if ($part.PSObject.Properties.Name -contains "content" -and $null -ne $part.content) {
      $chunk = [string]$part.content
    }
    if ($chunk.Length -gt 0) {
      [void]$builder.Append($chunk)
    }

    if (-not ($part.PSObject.Properties.Name -contains "nextOffset") -or $null -eq $part.nextOffset) {
      break
    }

    $offset = [int]$part.nextOffset
    $pages++
  }

  return [string]$builder.ToString()
}

function Read-NumberField {
  param(
    $Record,
    [Parameter(Mandatory = $true)][string]$Name
  )

  if ($null -eq $Record) { return $null }
  if (-not ($Record.PSObject.Properties.Name -contains $Name)) { return $null }

  $value = $Record.$Name
  if ($null -eq $value) { return $null }

  try {
    return [double]$value
  } catch {
    return $null
  }
}

function Resolve-PreferredTokenValue {
  param(
    [double]$Primary,
    [double]$Fallback
  )

  if ($Primary -gt 0) { return $Primary }
  if ($Fallback -gt 0) { return $Fallback }
  if ($Primary -eq 0) { return $Primary }
  return $Fallback
}

function Get-ModelFromAdapterInvokeEvent {
  param(
    $Events
  )

  if ($null -eq $Events) { return $null }

  $invokeEvents = @($Events | Where-Object { $_.eventType -eq "adapter.invoke" })
  if ($invokeEvents.Count -eq 0) { return $null }

  $latest = $invokeEvents |
    Sort-Object -Property @{ Expression = { [int]($_.seq) }; Descending = $true } |
    Select-Object -First 1

  if ($null -eq $latest.payload) { return $null }
  $payload = $latest.payload

  if (-not ($payload.PSObject.Properties.Name -contains "commandArgs")) { return $null }
  $args = @($payload.commandArgs)
  if ($args.Count -eq 0) { return $null }

  for ($i = 0; $i -lt $args.Count; $i++) {
    if ([string]$args[$i] -eq "--model" -and $i + 1 -lt $args.Count) {
      return [string]$args[$i + 1]
    }
  }

  return $null
}

if ([string]::IsNullOrWhiteSpace($RunId)) {
  $RunId = Get-RunIdFromIssue -IssueRef $IssueId
}

$run = Invoke-Json -Uri "$BaseUrl/api/heartbeat-runs/$RunId"
if ($null -eq $run) {
  throw "Run '$RunId' not found."
}

$events = Invoke-Json -Uri "$BaseUrl/api/heartbeat-runs/$RunId/events?afterSeq=0&limit=500"
$agent = Invoke-Json -Uri "$BaseUrl/api/agents/$($run.agentId)"

$startedAt = if ($run.startedAt) { [DateTime]$run.startedAt } else { $null }
$finishedAt = if ($run.finishedAt) { [DateTime]$run.finishedAt } else { $null }
$durationMs = if ($startedAt -and $finishedAt) {
  [Math]::Max(0, [int64](($finishedAt - $startedAt).TotalMilliseconds))
} else {
  $null
}

$logContent = Read-FullRunLog -ResolvedRunId $RunId
$outputLength = if ($null -eq $logContent) { 0 } else { $logContent.Length }

$usage = if ($run.PSObject.Properties.Name -contains "usageJson") { $run.usageJson } else { $null }
$resultJson = if ($run.PSObject.Properties.Name -contains "resultJson") { $run.resultJson } else { $null }
$resultStats = if ($null -ne $resultJson -and $resultJson.PSObject.Properties.Name -contains "stats") { $resultJson.stats } else { $null }
$billingType = if ($null -ne $usage -and $usage.PSObject.Properties.Name -contains "billingType") { [string]$usage.billingType } else { $null }

$usageInputTokens = Read-NumberField -Record $usage -Name "inputTokens"
$usageOutputTokens = Read-NumberField -Record $usage -Name "outputTokens"
$usageCachedInputTokens = Read-NumberField -Record $usage -Name "cachedInputTokens"

$statsInputTokens = Read-NumberField -Record $resultStats -Name "input_tokens"
$statsOutputTokens = Read-NumberField -Record $resultStats -Name "output_tokens"
$statsCachedInputTokens = Read-NumberField -Record $resultStats -Name "cached"

$inputTokens = Resolve-PreferredTokenValue -Primary $usageInputTokens -Fallback $statsInputTokens
$outputTokens = Resolve-PreferredTokenValue -Primary $usageOutputTokens -Fallback $statsOutputTokens
$cachedInputTokens = Resolve-PreferredTokenValue -Primary $usageCachedInputTokens -Fallback $statsCachedInputTokens
$rawInputTokens = Read-NumberField -Record $usage -Name "rawInputTokens"
$rawOutputTokens = Read-NumberField -Record $usage -Name "rawOutputTokens"
$rawCachedInputTokens = Read-NumberField -Record $usage -Name "rawCachedInputTokens"

$benchmarkTokens = if ($null -ne $inputTokens -and $null -ne $outputTokens) {
  [int64]($inputTokens + $outputTokens)
} else {
  $null
}

$observedTokens = if ($null -ne $inputTokens -and $null -ne $outputTokens -and $null -ne $cachedInputTokens) {
  [int64]($inputTokens + $outputTokens + $cachedInputTokens)
} else {
  $null
}

$rawBenchmarkTokens = if ($null -ne $rawInputTokens -and $null -ne $rawOutputTokens) {
  [int64]($rawInputTokens + $rawOutputTokens)
} else {
  $null
}

$hasTokenEvidence = @(
  $inputTokens,
  $outputTokens,
  $cachedInputTokens,
  $rawInputTokens,
  $rawOutputTokens,
  $rawCachedInputTokens
) | Where-Object { $null -ne $_ -and [double]$_ -gt 0 } | Select-Object -First 1

$tokenMeasurementStatus = if ($hasTokenEvidence) {
  "available"
} elseif ($billingType -eq "subscription") {
  "token-measurement-blocked"
} else {
  "missing"
}

$tokenMeasurementNote = if ($tokenMeasurementStatus -eq "available") {
  $null
} elseif ($billingType -eq "subscription") {
  "Gemini run succeeded, but no token counts were found in usageJson or resultJson.stats."
} else {
  "Gemini run did not provide token usage fields."
}

$modelFromEvent = Get-ModelFromAdapterInvokeEvent -Events $events
$modelFromAgent = $null
if ($null -ne $agent -and $null -ne $agent.adapterConfig -and $agent.adapterConfig.PSObject.Properties.Name -contains "model") {
  $modelFromAgent = [string]$agent.adapterConfig.model
}

$costByAgent = $null
try {
  $costRows = Invoke-Json -Uri "$BaseUrl/api/companies/$($run.companyId)/costs/by-agent"
  if ($null -ne $costRows) {
    $costByAgent = $costRows | Where-Object { $_.agentId -eq $run.agentId } | Select-Object -First 1
  }
} catch {
  $costByAgent = $null
}

$result = [ordered]@{
  runId = [string]$run.id
  issueId = if ($run.contextSnapshot -and $run.contextSnapshot.PSObject.Properties.Name -contains "issueId") { [string]$run.contextSnapshot.issueId } else { $null }
  issueIdentifier = if ($run.contextSnapshot -and $run.contextSnapshot.PSObject.Properties.Name -contains "paperclipIssue" -and $run.contextSnapshot.paperclipIssue.identifier) { [string]$run.contextSnapshot.paperclipIssue.identifier } else { $null }
  issueTitle = if ($run.contextSnapshot -and $run.contextSnapshot.PSObject.Properties.Name -contains "paperclipIssue" -and $run.contextSnapshot.paperclipIssue.title) { [string]$run.contextSnapshot.paperclipIssue.title } else { $null }
  status = [string]$run.status
  startedAt = $run.startedAt
  finishedAt = $run.finishedAt
  duration_ms = $durationMs
  duration_seconds = if ($null -ne $durationMs) { [Math]::Round(($durationMs / 1000.0), 1) } else { $null }
  adapterType = if ($null -ne $agent) { [string]$agent.adapterType } else { $null }
  model = if ($modelFromEvent) { $modelFromEvent } else { $modelFromAgent }
  modelSource = if ($modelFromEvent) { "adapter.invoke.commandArgs" } elseif ($modelFromAgent) { "agent.adapterConfig.model" } else { $null }
  billingType = $billingType
  tokenMeasurementStatus = $tokenMeasurementStatus
  tokenMeasurementNote = $tokenMeasurementNote
  benchmarkTokens = $benchmarkTokens
  observedTokens = $observedTokens
  inputTokens = $inputTokens
  outputTokens = $outputTokens
  cachedInputTokens = $cachedInputTokens
  rawBenchmarkTokens = $rawBenchmarkTokens
  rawInputTokens = $rawInputTokens
  rawOutputTokens = $rawOutputTokens
  rawCachedInputTokens = $rawCachedInputTokens
  usageJson = $run.usageJson
  resultJson = $run.resultJson
  logBytes = $run.logBytes
  output_length = $outputLength
  costByAgentSnapshot = $costByAgent
}

$result | ConvertTo-Json -Depth 20

if ($RequireTokenMeasurement -and $tokenMeasurementStatus -ne "available") {
  Write-Error "Token measurement unavailable for run '$RunId'. $tokenMeasurementNote"
  exit 2
}
