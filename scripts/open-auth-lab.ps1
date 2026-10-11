param(
    [ValidateSet('menu','login','register','verify','forgot','reset-code','reset')][string]$Screen = 'menu',
    [ValidateSet('accepted','pending','failed','expired','not_requested','verified','offline','tracking_expired','cooldown')][string]$Scenario = 'accepted',
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
    if (-not (Test-Path -LiteralPath $taskApk)) { throw 'Compila primero con -Build.' }
    & $taskAdb -s $Device install -r $taskApk
    if ($LASTEXITCODE -ne 0) { throw 'No fue posible instalar el APK de desarrollo.' }
}
& $taskAdb -s $Device shell am start --activity-clear-top -n dev.daesrock.eventanilla/.devtools.AuthLabActivity --es screen $Screen --es scenario $Scenario
if ($LASTEXITCODE -ne 0) { throw 'No fue posible abrir el laboratorio. Instala el APK debug con -Install.' }
