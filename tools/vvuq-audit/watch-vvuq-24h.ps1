param(
  [int]$Hours = 24,
  [int]$SliceMinutes = 5,
  [int]$MaxProfiles = 0,
  [string]$Out = ""
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $repoRoot

if ([string]::IsNullOrWhiteSpace($Out)) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $Out = Join-Path 'audit-output' "live-24h-$stamp"
}

$outFull = Join-Path $repoRoot $Out
New-Item -ItemType Directory -Force -Path $outFull | Out-Null

$monitorLog = Join-Path $outFull 'powershell-monitor.log'
$runner = Join-Path $repoRoot 'tools\vvuq-audit\run-vvuq-audit.mjs'

$nodeArgs = @(
  $runner,
  '--mode', '24h',
  '--hours', "$Hours",
  '--slice-minutes', "$SliceMinutes",
  '--out', $Out,
  '--live'
)

if ($MaxProfiles -gt 0) {
  $nodeArgs += @('--max-profiles', "$MaxProfiles")
}

Write-Host "V&V/UQ live audit monitor"
Write-Host "Run directory: $outFull"
Write-Host "Console log:   $monitorLog"
Write-Host "Events log:    $(Join-Path $outFull 'events.jsonl')"
Write-Host "Live output:   $(Join-Path $outFull 'live-output.log')"
Write-Host "Command:       node $($nodeArgs -join ' ')"
Write-Host ""

& node @nodeArgs 2>&1 | Tee-Object -FilePath $monitorLog
$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "Audit process exited with code $exitCode"

$summaryPath = Join-Path $outFull 'timeboxed-summary.json'
$fullSummaryPath = Join-Path $outFull 'full-vvuq-summary.json'
$eventsPath = Join-Path $outFull 'events.jsonl'

if (Test-Path $summaryPath) {
  $summary = Get-Content -Raw $summaryPath | ConvertFrom-Json
  Write-Host ""
  Write-Host "Timeboxed summary"
  Write-Host "Status:                  $($summary.status)"
  Write-Host "Mode:                    $($summary.mode)"
  Write-Host "Profiles configured:     $($summary.profile_count)"
  Write-Host "Profile executions:      $($summary.profile_executions)"
  Write-Host "Failed profile runs:     $($summary.failed_profile_executions)"
  Write-Host "Slice minutes:           $($summary.slice_minutes)"
  Write-Host "Max profiles limit:      $($summary.max_profiles)"
}

if (Test-Path $eventsPath) {
  $events = Get-Content $eventsPath | ForEach-Object {
    if (-not [string]::IsNullOrWhiteSpace($_)) { $_ | ConvertFrom-Json }
  }
  $profileEnds = @($events | Where-Object { $_.type -eq 'profile_end' })
  $commandEnds = @($events | Where-Object { $_.type -eq 'command_end' })
  Write-Host ""
  Write-Host "Event counters"
  Write-Host "Profile completions:     $($profileEnds.Count)"
  Write-Host "Command completions:     $($commandEnds.Count)"
  Write-Host "PASS commands:           $(@($commandEnds | Where-Object { $_.status -eq 'PASS' }).Count)"
  Write-Host "FAIL commands:           $(@($commandEnds | Where-Object { $_.status -eq 'FAIL' }).Count)"
  Write-Host ""
  Write-Host "Profile execution counts"
  $profileEnds |
    Group-Object profile_id |
    Sort-Object Name |
    ForEach-Object { Write-Host ("{0,-38} {1,5}" -f $_.Name, $_.Count) }
}

if (Test-Path $fullSummaryPath) {
  $fullSummary = Get-Content -Raw $fullSummaryPath | ConvertFrom-Json
  Write-Host ""
  Write-Host "Final report status:     $($fullSummary.status)"
  Write-Host "Final report:            $(Join-Path $outFull 'FULL_VVUQ_MODEL_AUDIT_REPORT.md')"
}

exit $exitCode
