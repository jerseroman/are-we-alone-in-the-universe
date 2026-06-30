$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'run-extended-rotating-24h.mjs'
node $script --hours 24 --slice-minutes 5 --live @args
