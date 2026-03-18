param(
  [string]$BaseUrl = "http://127.0.0.1:3101",
  [Parameter(Mandatory = $true)][string]$CompanyId,
  [string]$AgentRef = "Research-Gemini",
  [int]$Cycles = 1,
  [int]$PollIntervalSeconds = 2,
  [int]$RunTimeoutSeconds = 300,
  [switch]$RequireTokenMeasurement,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($Cycles -lt 1) {
  throw "-Cycles must be >= 1"
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
  if (-not $agent -or -not $agent.id) {
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
    [Parameter(Mandatory = $true)][string]$AssigneeAgentId
  )

  $payload = @{
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

$agentId = Get-AgentId

if ($DryRun) {
  [ordered]@{
    mode = "dry-run"
    companyId = $CompanyId
    agentRef = $AgentRef
    agentId = $agentId
    cycles = $Cycles
    tests = $tests | ForEach-Object {
      [ordered]@{
        key = $_.key
        name = $_.name
        titlePrefix = $_.titlePrefix
        targetPath = $_.targetPath
      }
    }
  } | ConvertTo-Json -Depth 8
  exit 0
}

$results = @()

for ($cycle = 1; $cycle -le $Cycles; $cycle++) {
  foreach ($test in $tests) {
    Reset-AgentSessionHard -AgentId $agentId

    $issueTitle = "$($test.titlePrefix): $($test.name) [cycle $cycle]"
    $description = New-TestDescription -TargetPath $test.targetPath -SchemaBlock $test.schema -Rules $test.rules

    $issue = New-IssueForTest -Title $issueTitle -Description $description -AssigneeAgentId $agentId

    [void](Start-IssueRun -IssueId ([string]$issue.id) -AgentId $agentId)

    $runId = Wait-IssueRunId -IssueId ([string]$issue.id) -TimeoutSeconds 45
    $run = Wait-RunFinished -RunId $runId -TimeoutSeconds $RunTimeoutSeconds

    $readoutArgs = @(
      "-ExecutionPolicy", "Bypass",
      "-File", $readoutScript,
      "-BaseUrl", $BaseUrl,
      "-RunId", $runId
    )

    if ($RequireTokenMeasurement) {
      $readoutArgs += "-RequireTokenMeasurement"
    }

    $readoutRaw = & powershell @readoutArgs
    $readout = $readoutRaw | ConvertFrom-Json

    $commentBody = Get-LatestIssueCommentBody -IssueId ([string]$issue.id)
    $outputHash = Get-TextSha256 -Text $commentBody

    $results += [pscustomobject]@{
      cycle = $cycle
      testKey = $test.key
      testName = $test.name
      issueId = [string]$issue.id
      issueIdentifier = [string]$issue.identifier
      runId = [string]$runId
      runStatus = [string]$run.status
      durationSeconds = $readout.duration_seconds
      benchmarkTokens = $readout.benchmarkTokens
      cachedInputTokens = $readout.cachedInputTokens
      tokenMeasurementStatus = $readout.tokenMeasurementStatus
      outputHashSha256 = $outputHash
    }
  }
}

$summary = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  baseUrl = $BaseUrl
  companyId = $CompanyId
  agentRef = $AgentRef
  agentId = $agentId
  cycles = $Cycles
  testsPerCycle = $tests.Count
  totalRuns = $results.Count
  results = $results
}

$summary | ConvertTo-Json -Depth 20
