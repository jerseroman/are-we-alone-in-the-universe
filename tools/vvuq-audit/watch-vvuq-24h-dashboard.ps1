param(
  [double]$Hours = 24,
  [double]$SliceMinutes = 5,
  [int]$MaxProfiles = 0,
  [string]$Out = "",
  [int]$RefreshSeconds = 10,
  [switch]$SkipPreflight,
  [switch]$NoClear
)

$ErrorActionPreference = 'Stop'

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  try {
    return Get-Content -Raw -Path $Path | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Read-JsonLines {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return @() }
  $rows = New-Object System.Collections.ArrayList
  try {
    foreach ($line in Get-Content -Path $Path) {
      if ([string]::IsNullOrWhiteSpace($line)) { continue }
      try { [void]$rows.Add(($line | ConvertFrom-Json)) } catch {}
    }
  } catch {}
  return @($rows.ToArray())
}

function Add-Number {
  param([double]$Current, $Value)
  $number = 0
  if ([double]::TryParse([string]$Value, [ref]$number)) {
    return $Current + $number
  }
  return $Current
}

function Value-OrDefault {
  param($Value, $Default)
  if ($null -eq $Value) { return $Default }
  return $Value
}

function Get-SummaryFiles {
  param([string]$RunDir, [string]$Filter)
  $profilesDir = Join-Path $RunDir 'profiles'
  if (-not (Test-Path $profilesDir)) { return @() }
  return @(Get-ChildItem -Path $profilesDir -Recurse -File -Filter $Filter -ErrorAction SilentlyContinue)
}

function Get-AuditCounters {
  param([string]$RunDir)

  $eventsPath = Join-Path $RunDir 'events.jsonl'
  $latestPath = Join-Path $RunDir 'latest-status.json'
  $summaryPath = Join-Path $RunDir 'extended-rotating-summary.json'
  $latest = Read-JsonFile $latestPath
  $summary = Read-JsonFile $summaryPath
  $events = Read-JsonLines $eventsPath

  $profileEnds = @($events | Where-Object { $_.type -eq 'profile_end' })
  $commandEnds = @($events | Where-Object { $_.type -eq 'command_end' })
  $commandPass = @($commandEnds | Where-Object { $_.status -eq 'PASS' })
  $commandFail = @($commandEnds | Where-Object { $_.status -eq 'FAIL' })
  $lastProfileStart = @($events | Where-Object { $_.type -eq 'profile_start' } | Select-Object -Last 1)

  $random = [ordered]@{
    Runs = 0
    Steps = 0
    GuiChecks = 0
    OracleCases = 0
    OracleBatches = 0
    MonteCarloRuns = 0
    MonteCarloGuiChecks = 0
    AdvancedChecks = 0
    OccurrenceChecks = 0
    GalaxyChecks = 0
    Failures = 0
  }
  foreach ($file in Get-SummaryFiles $RunDir 'random-ui-fuzz-summary.json') {
    $item = Read-JsonFile $file.FullName
    if ($null -eq $item) { continue }
    $random.Runs += 1
    $random.Steps = Add-Number $random.Steps $item.steps
    $random.GuiChecks = Add-Number $random.GuiChecks $item.gui_deterministic_checks
    $random.OracleCases = Add-Number $random.OracleCases $item.oracle_cases
    $random.OracleBatches = Add-Number $random.OracleBatches $item.oracle_batches
    $random.MonteCarloRuns = Add-Number $random.MonteCarloRuns $item.monte_carlo_runs
    $random.MonteCarloGuiChecks = Add-Number $random.MonteCarloGuiChecks $item.monte_carlo_gui_checks
    $random.AdvancedChecks = Add-Number $random.AdvancedChecks $item.advanced_state_checks
    $random.OccurrenceChecks = Add-Number $random.OccurrenceChecks $item.occurrence_state_checks
    $random.GalaxyChecks = Add-Number $random.GalaxyChecks $item.galaxy_state_checks
    if ($item.status -ne 'PASS') { $random.Failures += 1 }
  }

  $rawCore = [ordered]@{
    Runs = 0
    CompletedCalculations = 0
    ActiveCalculations = 0
    TotalCalculations = 0
    PythonOracleSamples = 0
    AdvancedCases = 0
    OccurrenceDirectCases = 0
    MaxRate = 0
    Failures = 0
  }
  foreach ($file in Get-SummaryFiles $RunDir 'high-throughput-random-core-fuzz-summary.json') {
    $item = Read-JsonFile $file.FullName
    if ($null -eq $item) { continue }
    $rawCore.Runs += 1
    $rawCore.CompletedCalculations = Add-Number $rawCore.CompletedCalculations (Value-OrDefault $item.raw_random_calculations $item.calculations)
    $rawCore.PythonOracleSamples = Add-Number $rawCore.PythonOracleSamples $item.python_oracle_sample_cases
    $rawCore.AdvancedCases = Add-Number $rawCore.AdvancedCases $item.advanced_cases
    $rawCore.OccurrenceDirectCases = Add-Number $rawCore.OccurrenceDirectCases $item.occurrence_direct_cases
    $rawCore.MaxRate = [math]::Max($rawCore.MaxRate, [double](Value-OrDefault $item.calculations_per_second 0))
    if ($item.status -ne 'PASS') { $rawCore.Failures += 1 }
  }
  foreach ($file in Get-SummaryFiles $RunDir 'high-throughput-random-core-fuzz-progress.json') {
    $summaryPath = Join-Path $file.Directory.FullName 'high-throughput-random-core-fuzz-summary.json'
    if (Test-Path $summaryPath) { continue }
    $item = Read-JsonFile $file.FullName
    if ($null -eq $item) { continue }
    $rawCore.ActiveCalculations = Add-Number $rawCore.ActiveCalculations (Value-OrDefault $item.raw_random_calculations $item.calculations)
    $rawCore.PythonOracleSamples = Add-Number $rawCore.PythonOracleSamples $item.python_oracle_sample_cases
    $rawCore.AdvancedCases = Add-Number $rawCore.AdvancedCases $item.advanced_cases
    $rawCore.OccurrenceDirectCases = Add-Number $rawCore.OccurrenceDirectCases $item.occurrence_direct_cases
    $rawCore.MaxRate = [math]::Max($rawCore.MaxRate, [double](Value-OrDefault $item.calculations_per_second 0))
    if ($item.status -eq 'FAIL') { $rawCore.Failures += 1 }
  }
  $rawCore.TotalCalculations = $rawCore.CompletedCalculations + $rawCore.ActiveCalculations

  $replay = [ordered]@{ Runs = 0; TraceRows = 0; Mismatches = 0; Failures = 0 }
  foreach ($file in Get-SummaryFiles $RunDir 'deterministic-replay-summary.json') {
    $item = Read-JsonFile $file.FullName
    if ($null -eq $item) { continue }
    $replay.Runs += 1
    $replay.TraceRows = Add-Number $replay.TraceRows $item.trace_a_rows
    $replay.Mismatches = Add-Number $replay.Mismatches $item.mismatch_count
    if ($item.status -ne 'PASS') { $replay.Failures += 1 }
  }

  $mutation = [ordered]@{ Runs = 0; Mutants = 0; Killed = 0; Survived = 0; Invalid = 0; Failures = 0 }
  foreach ($file in Get-SummaryFiles $RunDir 'mutation-summary.json') {
    $item = Read-JsonFile $file.FullName
    if ($null -eq $item) { continue }
    $mutation.Runs += 1
    $mutation.Mutants = Add-Number $mutation.Mutants $item.total_mutants
    $mutation.Killed = Add-Number $mutation.Killed $item.killed_mutants
    $mutation.Survived = Add-Number $mutation.Survived $item.survived_mutants
    $mutation.Invalid = Add-Number $mutation.Invalid $item.invalid_mutants
    if ($item.status -ne 'PASS') { $mutation.Failures += 1 }
  }

  $cross = [ordered]@{ Runs = 0; Requested = 0; OracleCases = 0; FailedBatches = 0; Failures = 0 }
  foreach ($file in Get-SummaryFiles $RunDir 'cross-implementation-formula-summary.json') {
    $item = Read-JsonFile $file.FullName
    if ($null -eq $item) { continue }
    $cross.Runs += 1
    $cross.Requested = Add-Number $cross.Requested $item.cases_requested
    $cross.OracleCases = Add-Number $cross.OracleCases $item.oracle_cases
    $cross.FailedBatches = Add-Number $cross.FailedBatches $item.oracle_failed_batches
    if ($item.status -ne 'PASS') { $cross.Failures += 1 }
  }

  $boundary = [ordered]@{ Runs = 0; EdgeSteps = 0; OracleCases = 0; MonteCarloGuiChecks = 0; Failures = 0 }
  foreach ($file in Get-SummaryFiles $RunDir 'boundary-extreme-summary.json') {
    $item = Read-JsonFile $file.FullName
    if ($null -eq $item) { continue }
    $boundary.Runs += 1
    $boundary.EdgeSteps = Add-Number $boundary.EdgeSteps $item.steps
    $boundary.OracleCases = Add-Number $boundary.OracleCases $item.oracle_cases
    $boundary.MonteCarloGuiChecks = Add-Number $boundary.MonteCarloGuiChecks $item.monte_carlo_gui_checks
    if ($item.status -ne 'PASS') { $boundary.Failures += 1 }
  }

  $stateSoak = [ordered]@{ Runs = 0; Iterations = 0; Checks = 0; FailedChecks = 0; Failures = 0 }
  foreach ($file in Get-SummaryFiles $RunDir 'state-transition-soak-summary.json') {
    $item = Read-JsonFile $file.FullName
    if ($null -eq $item) { continue }
    $stateSoak.Runs += 1
    $stateSoak.Iterations = Add-Number $stateSoak.Iterations $item.iterations
    $stateSoak.Checks = Add-Number $stateSoak.Checks $item.checks
    $stateSoak.FailedChecks = Add-Number $stateSoak.FailedChecks $item.failed_checks
    if ($item.status -ne 'PASS') { $stateSoak.Failures += 1 }
  }

  $export = [ordered]@{ Runs = 0; Checks = 0; FailedChecks = 0; Failures = 0 }
  foreach ($file in Get-SummaryFiles $RunDir 'export-consistency-summary.json') {
    $item = Read-JsonFile $file.FullName
    if ($null -eq $item) { continue }
    $export.Runs += 1
    $export.Checks = Add-Number $export.Checks $item.checks
    $export.FailedChecks = Add-Number $export.FailedChecks $item.failed_checks
    if ($item.status -ne 'PASS') { $export.Failures += 1 }
  }

  $performance = [ordered]@{ Runs = 0; Executions = 0; FailedExecutions = 0; MaxDurationMs = 0; MaxRssBytes = 0; Failures = 0 }
  foreach ($file in Get-SummaryFiles $RunDir 'performance-summary.json') {
    $item = Read-JsonFile $file.FullName
    if ($null -eq $item) { continue }
    $performance.Runs += 1
    $performance.Executions = Add-Number $performance.Executions $item.executions
    $performance.FailedExecutions = Add-Number $performance.FailedExecutions $item.failed_executions
    $performance.MaxDurationMs = [math]::Max($performance.MaxDurationMs, [double](Value-OrDefault $item.max_duration_ms 0))
    $performance.MaxRssBytes = [math]::Max($performance.MaxRssBytes, [double](Value-OrDefault $item.max_rss_bytes 0))
    if ($item.status -ne 'PASS') { $performance.Failures += 1 }
  }

  $reportIntegrity = [ordered]@{ Runs = 0; Failures = 0; Warnings = 0; FailedRuns = 0 }
  foreach ($file in Get-SummaryFiles $RunDir 'report-integrity-summary.json') {
    $item = Read-JsonFile $file.FullName
    if ($null -eq $item) { continue }
    $reportIntegrity.Runs += 1
    $reportIntegrity.Failures = Add-Number $reportIntegrity.Failures ($item.failures.Count)
    $reportIntegrity.Warnings = Add-Number $reportIntegrity.Warnings ($item.warnings.Count)
    if ($item.status -ne 'PASS') { $reportIntegrity.FailedRuns += 1 }
  }

  return [pscustomobject]@{
    Latest = $latest
    FinalSummary = $summary
    Events = $events.Count
    ProfileEnds = $profileEnds.Count
    CommandEnds = $commandEnds.Count
    CommandPass = $commandPass.Count
    CommandFail = $commandFail.Count
    LastProfile = if ($lastProfileStart.Count -gt 0) { $lastProfileStart[-1] } else { $null }
    Random = [pscustomobject]$random
    RawCore = [pscustomobject]$rawCore
    Replay = [pscustomobject]$replay
    Mutation = [pscustomobject]$mutation
    Cross = [pscustomobject]$cross
    Boundary = [pscustomobject]$boundary
    StateSoak = [pscustomobject]$stateSoak
    Export = [pscustomobject]$export
    Performance = [pscustomobject]$performance
    ReportIntegrity = [pscustomobject]$reportIntegrity
  }
}

function Write-Dashboard {
  param(
    [string]$RunDir,
    [System.Diagnostics.Process]$Process,
    [datetime]$StartedAt,
    [string]$StdoutLog,
    [string]$StderrLog,
    [switch]$Completed
  )

  $counters = Get-AuditCounters $RunDir
  if (-not $NoClear) { Clear-Host }

  $elapsed = New-TimeSpan -Start $StartedAt -End (Get-Date)
  $remaining = if ($counters.Latest -and $null -ne $counters.Latest.remaining_ms) {
    [TimeSpan]::FromMilliseconds([double]$counters.Latest.remaining_ms)
  } else {
    [TimeSpan]::Zero
  }
  $state = if ($Completed) { 'COMPLETED' } elseif ($Process.HasExited) { 'EXITED' } else { 'RUNNING' }
  $exitText = if ($Process.HasExited) {
    if ($null -ne $Process.ExitCode) { "$($Process.ExitCode)" } else { 'pending' }
  } else {
    'n/a'
  }
  $latest = $counters.Latest

  Write-Host "Extended rotating V&V/UQ 24h audit dashboard"
  Write-Host "Updated:        $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  Write-Host "State:          $state  PID=$($Process.Id)  ExitCode=$exitText"
  Write-Host "Run directory:  $RunDir"
  Write-Host "Elapsed:        $($elapsed.ToString('dd\.hh\:mm\:ss'))"
  Write-Host "Remaining:      $($remaining.ToString('dd\.hh\:mm\:ss'))"
  Write-Host ""
  Write-Host "Overall counters"
  Write-Host ("Profiles done:      {0,8}   failed: {1,5}   current/latest: {2}" -f (Value-OrDefault $latest.profile_executions 0), (Value-OrDefault $latest.failed_profile_executions 0), (Value-OrDefault $latest.profile_id 'n/a'))
  Write-Host ("Command iterations: {0,8}   commands started: {1,8}" -f (Value-OrDefault $latest.command_iterations 0), (Value-OrDefault $latest.commands_started 0))
  Write-Host ("Command completions:{0,8}   PASS: {1,8}   FAIL: {2,5}" -f $counters.CommandEnds, $counters.CommandPass, $counters.CommandFail)
  Write-Host ("Event records:      {0,8}" -f $counters.Events)
  if ($null -ne $counters.LastProfile) {
    Write-Host ("Last started:       #{0} {1} / {2}" -f $counters.LastProfile.execution_index, $counters.LastProfile.profile_id, $counters.LastProfile.title)
  }
  Write-Host ""
  Write-Host "High-throughput raw calculation counters"
  Write-Host ("Raw random calcs:   {0,12}   completed: {1,12}   active: {2,12}" -f $counters.RawCore.TotalCalculations, $counters.RawCore.CompletedCalculations, $counters.RawCore.ActiveCalculations)
  Write-Host ("Python samples:     {0,12}   advanced cases: {1,12}   occurrence direct: {2,12}" -f $counters.RawCore.PythonOracleSamples, $counters.RawCore.AdvancedCases, $counters.RawCore.OccurrenceDirectCases)
  Write-Host ("Raw fuzz runs:      {0,12}   max rate/s: {1,12}   failures: {2,5}" -f $counters.RawCore.Runs, $counters.RawCore.MaxRate, $counters.RawCore.Failures)
  Write-Host ""
  Write-Host "Random UI + Python oracle counters"
  Write-Host ("Random fuzz runs:   {0,8}   random GUI calculations/steps: {1,10}" -f $counters.Random.Runs, $counters.Random.Steps)
  Write-Host ("GUI checks:         {0,8}   Python oracle cases:          {1,10}   oracle batches: {2,8}" -f $counters.Random.GuiChecks, $counters.Random.OracleCases, $counters.Random.OracleBatches)
  Write-Host ("MC GUI runs:        {0,8}   MC GUI checks:                {1,10}" -f $counters.Random.MonteCarloRuns, $counters.Random.MonteCarloGuiChecks)
  Write-Host ("Advanced checks:    {0,8}   Occurrence/Bryson checks:     {1,10}   Galaxy checks: {2,8}" -f $counters.Random.AdvancedChecks, $counters.Random.OccurrenceChecks, $counters.Random.GalaxyChecks)
  Write-Host ""
  Write-Host "Special audit profile counters"
  Write-Host ("Replay runs:        {0,8}   replay trace rows: {1,8}   mismatches: {2,5}" -f $counters.Replay.Runs, $counters.Replay.TraceRows, $counters.Replay.Mismatches)
  Write-Host ("Boundary runs:      {0,8}   edge steps:        {1,8}   oracle cases: {2,8}" -f $counters.Boundary.Runs, $counters.Boundary.EdgeSteps, $counters.Boundary.OracleCases)
  Write-Host ("Cross-oracle runs:  {0,8}   requested cases:   {1,8}   oracle cases: {2,8}   failed batches: {3,5}" -f $counters.Cross.Runs, $counters.Cross.Requested, $counters.Cross.OracleCases, $counters.Cross.FailedBatches)
  Write-Host ("State-soak runs:    {0,8}   iterations:        {1,8}   checks: {2,8}   failed checks: {3,5}" -f $counters.StateSoak.Runs, $counters.StateSoak.Iterations, $counters.StateSoak.Checks, $counters.StateSoak.FailedChecks)
  Write-Host ("Export runs:        {0,8}   checks:            {1,8}   failed checks: {2,5}" -f $counters.Export.Runs, $counters.Export.Checks, $counters.Export.FailedChecks)
  Write-Host ("Mutation runs:      {0,8}   mutants:           {1,8}   killed: {2,8}   survived: {3,5}   invalid: {4,5}" -f $counters.Mutation.Runs, $counters.Mutation.Mutants, $counters.Mutation.Killed, $counters.Mutation.Survived, $counters.Mutation.Invalid)
  Write-Host ("Performance runs:   {0,8}   executions:        {1,8}   failed: {2,5}   max ms: {3,8}   max RSS: {4,12}" -f $counters.Performance.Runs, $counters.Performance.Executions, $counters.Performance.FailedExecutions, $counters.Performance.MaxDurationMs, $counters.Performance.MaxRssBytes)
  Write-Host ("Report integrity:   {0,8}   findings:          {1,8}   warnings: {2,5}   failed runs: {3,5}" -f $counters.ReportIntegrity.Runs, $counters.ReportIntegrity.Failures, $counters.ReportIntegrity.Warnings, $counters.ReportIntegrity.FailedRuns)
  Write-Host ""
  Write-Host "Logs"
  Write-Host "Stdout: $StdoutLog"
  Write-Host "Stderr: $StderrLog"
  if (Test-Path $StdoutLog) {
    Write-Host ""
    Write-Host "Latest runner output"
    Get-Content -Path $StdoutLog -Tail 8 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $_" }
  }
  if ((Test-Path $StderrLog) -and ((Get-Item $StderrLog).Length -gt 0)) {
    Write-Host ""
    Write-Host "Latest runner stderr"
    Get-Content -Path $StderrLog -Tail 6 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $_" }
  }

  return $counters
}

function Write-FinalMonitorReport {
  param(
    [string]$RunDir,
    [object]$Counters,
    [int]$ExitCode,
    [datetime]$StartedAt,
    [datetime]$EndedAt
  )

  $reportPath = Join-Path $RunDir 'LIVE_MONITOR_FINAL_REPORT.md'
  $finalReport = Join-Path $RunDir 'EXTENDED_ROTATING_VVUQ_AUDIT_REPORT.md'
  $elapsed = New-TimeSpan -Start $StartedAt -End $EndedAt
  $status = if ($ExitCode -eq 0) { 'PASS' } else { 'FAIL' }
  $badge = if ($ExitCode -eq 0) { '![PASS](https://img.shields.io/badge/PASS-green)' } else { '![FAIL](https://img.shields.io/badge/FAIL-red)' }

  $lines = @(
    '# Live 24h V&V/UQ Monitor Final Report',
    '',
    $badge,
    '',
    "| Item | Value |",
    "| --- | --- |",
    ("| Monitor status | ``{0}`` |" -f $status),
    ("| Runner exit code | ``{0}`` |" -f $ExitCode),
    ("| Started | ``{0}`` |" -f $StartedAt.ToString('o')),
    ("| Ended | ``{0}`` |" -f $EndedAt.ToString('o')),
    ("| Elapsed | ``{0}`` |" -f $elapsed.ToString('dd\.hh\:mm\:ss')),
    ("| Run directory | ``{0}`` |" -f $RunDir),
    ("| Final runner report | ``{0}`` |" -f $finalReport),
    ("| Profiles completed | ``{0}`` |" -f (Value-OrDefault $Counters.Latest.profile_executions 0)),
    ("| Failed profiles | ``{0}`` |" -f (Value-OrDefault $Counters.Latest.failed_profile_executions 0)),
    ("| Commands completed | ``{0}`` |" -f $Counters.CommandEnds),
    ("| PASS commands | ``{0}`` |" -f $Counters.CommandPass),
    ("| FAIL commands | ``{0}`` |" -f $Counters.CommandFail),
    ("| Raw random calculations | ``{0}`` |" -f $Counters.RawCore.TotalCalculations),
    ("| Raw Python oracle sample cases | ``{0}`` |" -f $Counters.RawCore.PythonOracleSamples),
    ("| Raw advanced-factor cases | ``{0}`` |" -f $Counters.RawCore.AdvancedCases),
    ("| Raw occurrence-direct cases | ``{0}`` |" -f $Counters.RawCore.OccurrenceDirectCases),
    ("| Random GUI calculations / steps | ``{0}`` |" -f $Counters.Random.Steps),
    ("| GUI deterministic checks | ``{0}`` |" -f $Counters.Random.GuiChecks),
    ("| Python oracle cases | ``{0}`` |" -f $Counters.Random.OracleCases),
    ("| Monte Carlo GUI checks | ``{0}`` |" -f $Counters.Random.MonteCarloGuiChecks),
    ("| Advanced module checks | ``{0}`` |" -f $Counters.Random.AdvancedChecks),
    ("| Occurrence/Bryson checks | ``{0}`` |" -f $Counters.Random.OccurrenceChecks),
    ("| Galaxy checks | ``{0}`` |" -f $Counters.Random.GalaxyChecks),
    ("| Replay trace rows | ``{0}`` |" -f $Counters.Replay.TraceRows),
    ("| Boundary edge steps | ``{0}`` |" -f $Counters.Boundary.EdgeSteps),
    ("| Cross-oracle cases | ``{0}`` |" -f $Counters.Cross.OracleCases),
    ("| State-soak checks | ``{0}`` |" -f $Counters.StateSoak.Checks),
    ("| Export checks | ``{0}`` |" -f $Counters.Export.Checks),
    ("| Mutants executed | ``{0}`` |" -f $Counters.Mutation.Mutants),
    ("| Mutants killed | ``{0}`` |" -f $Counters.Mutation.Killed),
    ("| Mutants survived | ``{0}`` |" -f $Counters.Mutation.Survived),
    ("| Performance executions | ``{0}`` |" -f $Counters.Performance.Executions),
    ("| Report-integrity findings | ``{0}`` |" -f $Counters.ReportIntegrity.Failures)
  )

  Set-Content -Path $reportPath -Value $lines -Encoding UTF8
  return $reportPath
}

$RefreshSeconds = [math]::Max(2, $RefreshSeconds)
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $repoRoot

if ([string]::IsNullOrWhiteSpace($Out)) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $Out = Join-Path 'audit-output' "extended-24h-live-$stamp"
}

$outFull = Join-Path $repoRoot $Out
New-Item -ItemType Directory -Force -Path $outFull | Out-Null

$runner = Join-Path $repoRoot 'tools\vvuq-audit\run-extended-rotating-24h.mjs'
$stdoutLog = Join-Path $outFull 'node-stdout.log'
$stderrLog = Join-Path $outFull 'node-stderr.log'
$monitorLog = Join-Path $outFull 'powershell-monitor.log'
$nodeArgs = @(
  $runner,
  '--hours', "$Hours",
  '--slice-minutes', "$SliceMinutes",
  '--out', $Out,
  '--live'
)
if ($MaxProfiles -gt 0) {
  $nodeArgs += @('--max-slices', "$MaxProfiles")
}
if ($SkipPreflight) {
  $nodeArgs += '--skip-preflight'
}

$startedAt = Get-Date
"Starting extended V&V/UQ audit monitor at $($startedAt.ToString('o'))" | Set-Content -Path $monitorLog -Encoding UTF8
"Run directory: $outFull" | Add-Content -Path $monitorLog
"Command: node $($nodeArgs -join ' ')" | Add-Content -Path $monitorLog

$process = Start-Process -FilePath 'node' `
  -ArgumentList $nodeArgs `
  -WorkingDirectory $repoRoot `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -NoNewWindow `
  -PassThru

do {
  $process.Refresh()
  $counters = Write-Dashboard -RunDir $outFull -Process $process -StartedAt $startedAt -StdoutLog $stdoutLog -StderrLog $stderrLog
  $snapshot = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] profiles=$(Value-OrDefault $counters.Latest.profile_executions 0) failedProfiles=$(Value-OrDefault $counters.Latest.failed_profile_executions 0) commands=$($counters.CommandEnds) rawCalcs=$($counters.RawCore.TotalCalculations) randomSteps=$($counters.Random.Steps) oracleCases=$($counters.Random.OracleCases) mcGui=$($counters.Random.MonteCarloGuiChecks)"
  $snapshot | Add-Content -Path $monitorLog
  if (-not $process.HasExited) { Start-Sleep -Seconds $RefreshSeconds }
} while (-not $process.HasExited)

$endedAt = Get-Date
try { $process.WaitForExit() } catch {}
$process.Refresh()
$finalCounters = Write-Dashboard -RunDir $outFull -Process $process -StartedAt $startedAt -StdoutLog $stdoutLog -StderrLog $stderrLog -Completed
$exitCode = if ($null -ne $process.ExitCode) {
  [int]$process.ExitCode
} else {
  $runnerSummary = Read-JsonFile (Join-Path $outFull 'extended-rotating-summary.json')
  if ($runnerSummary -and $runnerSummary.status -eq 'PASS') { 0 } else { 1 }
}

$integrityOut = Join-Path $outFull 'final-report-integrity'
try {
  & node (Join-Path $repoRoot 'tools\vvuq-audit\report-integrity-audit.mjs') --run-dir $Out --out $integrityOut | Add-Content -Path $monitorLog
} catch {
  "Report integrity command failed: $($_.Exception.Message)" | Add-Content -Path $monitorLog
}

$finalCounters = Get-AuditCounters $outFull
$monitorReport = Write-FinalMonitorReport -RunDir $outFull -Counters $finalCounters -ExitCode $exitCode -StartedAt $startedAt -EndedAt $endedAt

Write-Host ""
Write-Host "Audit process exited with code $exitCode"
Write-Host "Runner final report:  $(Join-Path $outFull 'EXTENDED_ROTATING_VVUQ_AUDIT_REPORT.md')"
Write-Host "Monitor final report: $monitorReport"
Write-Host "Run directory:        $outFull"

exit $exitCode
