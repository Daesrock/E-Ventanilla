param(
    [ValidateSet('home','menu')][string]$Screen = 'home',
    [string]$Device,
    [switch]$Install,
    [switch]$Build
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskSdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
$taskAdb = Join-Path $taskSdk 'platform-tools/adb.exe'
if (-not (Test-Path -LiteralPath $taskAdb)) { throw 'No se encontró Android SDK. Configura ANDROID_HOME.' }
if ($Build) { & (Join-Path $PSScriptRoot 'build-android.ps1'); $Install = $true }
if (-not $Device) {
    $taskDevices = @(& $taskAdb devices | Select-String '^([^\s]+)\s+device$' | ForEach-Object { $_.Matches[0].Groups[1].Value })
    if ($taskDevices.Count -ne 1) { throw 'Indica -Device con el identificador de tu teléfono o emulador.' }
    $Device = $taskDevices[0]
}
if ($Install) {
    $taskApk = Join-Path $taskRoot 'apps/android/app/build/outputs/apk/debug/app-debug.apk'
    & $taskAdb -s $Device install -r $taskApk
    if ($LASTEXITCODE -ne 0) { throw 'No fue posible instalar el APK de desarrollo.' }
}
& $taskAdb -s $Device shell am start -W --activity-clear-top -n dev.daesrock.eventanilla/.devtools.UiLabActivity --es screen $Screen
if ($LASTEXITCODE -ne 0) { throw 'No fue posible abrir la plantilla de interfaz.' }
