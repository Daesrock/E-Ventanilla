param([string]$NodeExecutable = '', [string]$PnpmExecutable = '')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
if (-not $NodeExecutable) {
    $taskNodeCommand = Get-Command node -ErrorAction SilentlyContinue
    $NodeExecutable = if ($taskNodeCommand) { $taskNodeCommand.Source } else {
        Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
    }
}
if (-not $PnpmExecutable) {
    $taskPnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
    $PnpmExecutable = if ($taskPnpmCommand) { $taskPnpmCommand.Source } else {
        Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm.cmd'
    }
}
if (-not (Test-Path -LiteralPath $NodeExecutable) -or -not (Test-Path -LiteralPath $PnpmExecutable)) {
    throw 'Instala Node.js 24 y pnpm o indica sus rutas con los parámetros del script.'
}
$env:Path = (Split-Path -Parent $NodeExecutable) + ';' + $env:Path
Push-Location $taskRoot
try {
    & $NodeExecutable scripts/start-local-db.mjs
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar la base local.' }
    Set-Location (Join-Path $taskRoot 'api')
    if (-not (Test-Path -LiteralPath node_modules)) {
        & $PnpmExecutable install --frozen-lockfile --store-dir ../.tools/pnpm-store
        if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias.' }
    }
    & $PnpmExecutable db:migrate
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron aplicar las migraciones.' }
    & $PnpmExecutable dev
} finally { Pop-Location }
