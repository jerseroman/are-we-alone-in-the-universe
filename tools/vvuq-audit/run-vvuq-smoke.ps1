$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'run-extended-rotating-24h.mjs'
node $script --hours 24 --slice-minutes 0.08 --max-slices 1 --skip-preflight --live @args
