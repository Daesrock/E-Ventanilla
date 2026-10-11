param([string]$BunExecutable = '')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
if (-not $BunExecutable) {
    $taskBundledBun = Join-Path $taskRoot '.tools/bun-1.4.2/bun-windows-x64/bun.exe'
    $taskBunCommand = Get-Command bun -ErrorAction SilentlyContinue
    $BunExecutable = if (Test-Path -LiteralPath $taskBundledBun) { $taskBundledBun } elseif ($taskBunCommand) { $taskBunCommand.Source } else { '' }
}
if (-not $BunExecutable -or -not (Test-Path -LiteralPath $BunExecutable)) { throw 'Instala Bun 1.4.2 o indica su ruta con -BunExecutable.' }
if ((& $BunExecutable --version) -ne '1.4.2') { throw 'El proyecto requiere Bun 1.4.2.' }
$env:Path = (Split-Path -Parent $BunExecutable) + ';' + $env:Path
Push-Location $taskRoot
try {
    & $BunExecutable scripts/start-local-db.mjs
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar la base local.' }
    Set-Location (Join-Path $taskRoot 'apps/api')
    & $BunExecutable install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias.' }
    & $BunExecutable run db:migrate
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron aplicar las migraciones.' }
    & $BunExecutable run dev
} finally { Pop-Location }
