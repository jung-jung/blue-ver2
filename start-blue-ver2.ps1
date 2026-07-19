$ErrorActionPreference = "Stop"
$Node = "C:\Users\yuiop\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Here
& $Node server.mjs
