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

$dashboard = Join-Path $PSScriptRoot 'watch-vvuq-24h-dashboard.ps1'
$argsList = @(
  '-ExecutionPolicy', 'Bypass',
  '-File', $dashboard,
  '-Hours', "$Hours",
  '-SliceMinutes', "$SliceMinutes",
  '-RefreshSeconds', "$RefreshSeconds"
)

if ($MaxProfiles -gt 0) {
  $argsList += @('-MaxProfiles', "$MaxProfiles")
}
if (-not [string]::IsNullOrWhiteSpace($Out)) {
  $argsList += @('-Out', $Out)
}
if ($SkipPreflight) {
  $argsList += '-SkipPreflight'
}
if ($NoClear) {
  $argsList += '-NoClear'
}

& powershell @argsList
exit $LASTEXITCODE
