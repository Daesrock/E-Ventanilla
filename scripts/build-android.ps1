param([switch]$Test, [ValidateSet('local', 'vps')][string]$ApiEnvironment = 'vps')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskJdk = Get-ChildItem -LiteralPath (Join-Path $taskRoot '.tools/jdk') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($taskJdk) { $env:JAVA_HOME = $taskJdk.FullName }
if (-not $env:JAVA_HOME) { throw 'Configura JAVA_HOME con un JDK 17 o 21.' }
$env:GRADLE_USER_HOME = Join-Path $taskRoot '.tools/gradle-home'
Push-Location (Join-Path $taskRoot 'apps/android')
try {
    $taskGradleArgs = @('assembleDebug', '--no-daemon', "-PapiEnvironment=$ApiEnvironment")
    if ($Test) { $taskGradleArgs += 'testDebugUnitTest' }
    & .\gradlew.bat @taskGradleArgs
    if ($LASTEXITCODE -ne 0) { throw 'La compilación Android falló.' }
} finally { Pop-Location }
