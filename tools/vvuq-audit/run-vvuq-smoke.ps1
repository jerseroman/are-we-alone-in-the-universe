$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'run-vvuq-audit.mjs'
node $script --mode smoke @args
