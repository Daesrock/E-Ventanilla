param([string]$ApiBaseUrl = 'https://api-ventanilla.daesrock.dev/v1/')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskBun = Join-Path $taskRoot '.tools/bun-1.4.2/bun-windows-x64/bun.exe'
if (-not (Test-Path -LiteralPath $taskBun)) { $taskBun = (Get-Command bun -ErrorAction Stop).Source }
& $taskBun (Join-Path $PSScriptRoot 'check-public-api.mjs') $ApiBaseUrl
if ($LASTEXITCODE -ne 0) { throw 'Una o más comprobaciones de API fallaron.' }
