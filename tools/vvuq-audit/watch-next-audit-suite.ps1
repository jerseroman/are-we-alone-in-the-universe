param(
  [string]$RunDir = "",
  [int]$RefreshSeconds = 10,
  [switch]$Once,
  [switch]$NoClear
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')

$Components = @(
  [pscustomobject]@{ Dir = '01-core-metamorphic-invariants'; Name = 'Core metamorphic invariants'; Summary = @('metamorphic-core-summary.json') },
  [pscustomobject]@{ Dir = '02-ui-state-display-metamorphic'; Name = 'UI/state/display metamorphic'; Summary = @('ui-state-display-metamorphic-summary.json') },
  [pscustomobject]@{ Dir = '03-export-metamorphic'; Name = 'Export metamorphic'; Summary = @('export-metamorphic-summary.json', 'export-consistency-summary.json') },
  [pscustomobject]@{ Dir = '08-09-browser-visual'; Name = 'Browser/visual'; Summary = @('browser-visual-summary.json') },
  [pscustomobject]@{ Dir = '10-final-adjudication'; Name = 'Final adjudication'; Summary = @('final-adjudication-summary.json') },
  [pscustomobject]@{ Dir = '11-timeout-aware-runner'; Name = 'Timeout-aware runner'; Summary = @('timeout-aware-runner-summary.json') },
  [pscustomobject]@{ Dir = '12-independent-oracle-expansion'; Name = 'Independent oracle expansion'; Summary = @('independent-oracle-expansion-summary.json', 'independent-model-scope-summary.json') },
  [pscustomobject]@{ Dir = '13-coverage-improvement'; Name = 'Coverage improvement'; Summary = @('coverage-improvement-summary.json', 'coverage-threshold-summary.json') },
  [pscustomobject]@{ Dir = '14-scientific-assumption-consistency'; Name = 'Scientific assumptions'; Summary = @('scientific-assumption-consistency-summary.json') },
  [pscustomobject]@{ Dir = '15-release-reproducibility'; Name = 'Release reproducibility'; Summary = @('release-reproducibility-summary.json') },
  [pscustomobject]@{ Dir = 'security-supply-chain-supporting-check'; Name = 'Security supporting check'; Summary = @('security-supply-chain-summary.json', 'security-smoke-skip-summary.json') }
)

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  try {
    return Get-Content -Raw -Path $Path | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Resolve-AuditRunDir {
  param([string]$Requested)

  if (-not [string]::IsNullOrWhiteSpace($Requested)) {
    if ([System.IO.Path]::IsPathRooted($Requested)) {
      return (Resolve-Path $Requested).Path
    }
    return (Resolve-Path (Join-Path $RepoRoot $Requested)).Path
  }

  $auditOutput = Join-Path $RepoRoot 'audit-output'
  if (-not (Test-Path $auditOutput)) { return $null }

  $dirs = @(Get-ChildItem -Path $auditOutput -Directory -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -like '*next-suite*' -or
      (Test-Path (Join-Path $_.FullName 'next-audit-suite-summary.json')) -or
      (Test-Path (Join-Path $_.FullName 'environment.json') -and $_.Name -like '*audit-code-audit*')
    } |
    Sort-Object LastWriteTime -Descending)

  if ($dirs.Count -eq 0) { return $null }
  return $dirs[0].FullName
}

function Get-StatusColor {
  param([string]$Status)
  switch -Regex ($Status) {
    '^PASS$' { return 'Green' }
    '^FAIL$' { return 'Red' }
    '^PARTIAL$' { return 'Yellow' }
    '^RUNNING$' { return 'Cyan' }
    '^PENDING$' { return 'DarkGray' }
    '^NOT_RUN$' { return 'DarkGray' }
    default { return 'Gray' }
  }
}

function Write-Status {
  param([string]$Status, [string]$Text = "")
  $label = if ([string]::IsNullOrWhiteSpace($Text)) { $Status } else { $Text }
  Write-Host $label -ForegroundColor (Get-StatusColor $Status)
}

function Get-NextSuiteProcesses {
  try {
    return @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -match 'next-audit-suite\.mjs' })
  } catch {
    return @()
  }
}

function Find-ComponentSummary {
  param([string]$BaseDir, $Component)
  $componentDir = Join-Path $BaseDir $Component.Dir
  foreach ($file in $Component.Summary) {
    $path = Join-Path $componentDir $file
    if (Test-Path $path) { return $path }
  }
  return $null
}

function Get-ComponentRows {
  param([string]$BaseDir)
  $rows = New-Object System.Collections.ArrayList
  foreach ($component in $Components) {
    $componentDir = Join-Path $BaseDir $component.Dir
    $summaryPath = Find-ComponentSummary $BaseDir $component
    $summary = if ($summaryPath) { Read-JsonFile $summaryPath } else { $null }
    $status = 'PENDING'
    $detail = ''
    $modified = $null

    if ($summary) {
      $status = [string]$summary.status
      $modified = (Get-Item $summaryPath).LastWriteTime
      if ($summary.checks -ne $null) { $detail = "checks=$($summary.checks)" }
      elseif ($summary.reason) { $detail = [string]$summary.reason }
    } elseif (Test-Path $componentDir) {
      $status = 'RUNNING'
      $modified = (Get-Item $componentDir).LastWriteTime
    }

    [void]$rows.Add([pscustomobject]@{
      Name = $component.Name
      Dir = $component.Dir
      Status = $status
      Detail = $detail
      Modified = $modified
      SummaryPath = $summaryPath
      Summary = $summary
    })
  }
  return @($rows.ToArray())
}

function Count-Statuses {
  param($Rows)
  [pscustomobject]@{
    PASS = @($Rows | Where-Object { $_.Status -eq 'PASS' }).Count
    PARTIAL = @($Rows | Where-Object { $_.Status -eq 'PARTIAL' }).Count
    FAIL = @($Rows | Where-Object { $_.Status -eq 'FAIL' }).Count
    RUNNING = @($Rows | Where-Object { $_.Status -eq 'RUNNING' }).Count
    PENDING = @($Rows | Where-Object { $_.Status -eq 'PENDING' -or $_.Status -eq 'NOT_RUN' }).Count
  }
}

function Shorten {
  param([string]$Text, [int]$Max = 92)
  if ([string]::IsNullOrWhiteSpace($Text)) { return '' }
  $flat = $Text -replace '\s+', ' '
  if ($flat.Length -le $Max) { return $flat }
  return $flat.Substring(0, $Max - 3) + '...'
}

function Write-ComponentTable {
  param($Rows)
  Write-Host ""
  Write-Host "Component status"
  Write-Host "----------------"
  foreach ($row in $Rows) {
    $status = ([string]$row.Status).PadRight(8)
    Write-Host -NoNewline $status -ForegroundColor (Get-StatusColor $row.Status)
    Write-Host ("  {0,-36} {1}" -f (Shorten $row.Name 34), (Shorten $row.Detail 80))
  }
}

function Write-AuditItemTable {
  param($Summary)
  if (-not $Summary -or -not $Summary.audit_items) { return }
  Write-Host ""
  Write-Host "Audit item status"
  Write-Host "-----------------"
  foreach ($item in $Summary.audit_items) {
    $status = ([string]$item.status).PadRight(8)
    Write-Host -NoNewline ("{0,2}. " -f $item.id)
    Write-Host -NoNewline $status -ForegroundColor (Get-StatusColor $item.status)
    Write-Host ("  {0}" -f (Shorten $item.title 95))
  }
}

function Write-KeyCounters {
  param([string]$BaseDir)

  $core = Read-JsonFile (Join-Path $BaseDir '01-core-metamorphic-invariants\metamorphic-core-summary.json')
  $ui = Read-JsonFile (Join-Path $BaseDir '02-ui-state-display-metamorphic\ui-state-display-metamorphic-summary.json')
  $adjudication = Read-JsonFile (Join-Path $BaseDir '10-final-adjudication\final-adjudication-summary.json')
  $release = Read-JsonFile (Join-Path $BaseDir '15-release-reproducibility\release-reproducibility-summary.json')

  Write-Host ""
  Write-Host "Key counters"
  Write-Host "------------"
  if ($core) {
    Write-Host ("Core metamorphic: checks={0} failures={1}" -f $core.checks, $core.failures)
  }
  if ($ui) {
    Write-Host ("UI/state/display: checks={0} failures={1}" -f $ui.checks, $ui.failures)
  }
  if ($adjudication) {
    Write-Host ("Final adjudication: raw_failed_profiles={0} code_failures={1} timeout_or_harness_partials={2}" -f $adjudication.raw_failed_profiles, $adjudication.code_failures, $adjudication.timeout_or_harness_partials)
  }
  if ($release) {
    Write-Host ("Release reproducibility: build={0} evidence_manifest={1}" -f $release.build_status, $release.evidence_manifest_status)
  }
}

function Write-RecentEvidence {
  param([string]$BaseDir)
  Write-Host ""
  Write-Host "Recent evidence files"
  Write-Host "---------------------"
  $files = @(Get-ChildItem -Path $BaseDir -Recurse -File -Include *.json,*.md -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 8)
  foreach ($file in $files) {
    $rel = Resolve-Path -Relative $file.FullName
    Write-Host ("{0:HH:mm:ss}  {1}" -f $file.LastWriteTime, $rel)
  }
}

function Show-Dashboard {
  $resolvedRunDir = Resolve-AuditRunDir $RunDir
  if (-not $NoClear) { Clear-Host }

  Write-Host "Next V&V/UQ audit suite live monitor"
  Write-Host ("Updated:          {0:yyyy-MM-dd HH:mm:ss}" -f (Get-Date))
  Write-Host ("Refresh seconds:  {0}" -f $RefreshSeconds)

  if (-not $resolvedRunDir) {
    Write-Host ""
    Write-Host "No next-suite run directory found." -ForegroundColor Yellow
    Write-Host "Start one with:"
    Write-Host "  npm run audit:vvuq:next-suite"
    Write-Host "or monitor a specific folder with:"
    Write-Host "  powershell -ExecutionPolicy Bypass -File tools/vvuq-audit/watch-next-audit-suite.ps1 -RunDir audit-output\<run-dir>"
    return
  }

  $summaryPath = Join-Path $resolvedRunDir 'next-audit-suite-summary.json'
  $summary = Read-JsonFile $summaryPath
  $environment = Read-JsonFile (Join-Path $resolvedRunDir 'environment.json')
  $processes = Get-NextSuiteProcesses
  $componentRows = Get-ComponentRows $resolvedRunDir
  $counts = Count-Statuses $componentRows

  $state = if ($summary) { 'COMPLETE_OR_SUMMARY_WRITTEN' } elseif ($processes.Count -gt 0) { 'RUNNING' } else { 'WAITING_OR_INCOMPLETE' }
  Write-Host ("State:            {0}" -f $state)
  Write-Host ("Run directory:    {0}" -f $resolvedRunDir)
  if ($processes.Count -gt 0) {
    Write-Host ("Node PIDs:        {0}" -f (($processes | ForEach-Object { $_.ProcessId }) -join ', '))
  } else {
    Write-Host "Node PIDs:        none"
  }
  if ($environment) {
    Write-Host ("Git commit:       {0}" -f $environment.git.commit)
    Write-Host ("Git clean:        {0}" -f $environment.git.clean)
  }
  if ($summary) {
    $codeStatus = if ($summary.code_behavior_status) { $summary.code_behavior_status } else { $summary.status }
    $scopeStatus = if ($summary.formal_scope_status) { $summary.formal_scope_status } else { $summary.status }
    Write-Host -NoNewline "Code behavior:    "
    Write-Status $codeStatus $codeStatus
    Write-Host -NoNewline "Formal scope:     "
    Write-Status $scopeStatus $scopeStatus
  } else {
    Write-Host "Code behavior:    not written yet"
    Write-Host "Formal scope:     not written yet"
  }

  Write-Host ""
  Write-Host ("Component counts: PASS={0} PARTIAL={1} FAIL={2} RUNNING={3} PENDING={4}" -f $counts.PASS, $counts.PARTIAL, $counts.FAIL, $counts.RUNNING, $counts.PENDING)

  Write-ComponentTable $componentRows
  Write-AuditItemTable $summary
  Write-KeyCounters $resolvedRunDir
  Write-RecentEvidence $resolvedRunDir
}

do {
  Show-Dashboard
  if ($Once) { break }
  Start-Sleep -Seconds $RefreshSeconds
} while ($true)
