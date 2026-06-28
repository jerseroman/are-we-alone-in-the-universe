$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'run-vvuq-audit.mjs'
node $script --mode 24h --hours 24 --slice-minutes 5 @args
