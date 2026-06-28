$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'run-vvuq-audit.mjs'
node $script --mode 10h --hours 10 --slice-minutes 5 @args
