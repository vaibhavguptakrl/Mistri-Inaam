$ErrorActionPreference = 'Stop'

$androidRoot = $PSScriptRoot
$keystoreDirectory = Join-Path $env:LOCALAPPDATA 'ShivAgencyRewards'
$keystorePath = Join-Path $keystoreDirectory 'play-upload-key.jks'
$keyAlias = 'shivagency_upload'

if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\keytool.exe'))) {
    $portableJdkRoot = Join-Path $env:TEMP 'plumber-playstore-jdk17'
    $portableJdk = Get-ChildItem $portableJdkRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName 'bin\keytool.exe') } |
        Select-Object -First 1
    if ($portableJdk) { $env:JAVA_HOME = $portableJdk.FullName }
}
if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\keytool.exe'))) {
    throw 'Set JAVA_HOME to a JDK 17 installation before running this script.'
}

New-Item -ItemType Directory -Path $keystoreDirectory -Force | Out-Null
$storePassword = Read-Host 'Create and enter a strong upload key password (save it in your password manager)' -AsSecureString
$keyPassword = Read-Host 'Enter the same password again for the key (recommended)' -AsSecureString

function ConvertTo-PlainText([Security.SecureString] $Value) {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

$env:PLAY_UPLOAD_KEYSTORE_PATH = $keystorePath
$env:PLAY_UPLOAD_KEY_ALIAS = $keyAlias
$env:PLAY_UPLOAD_KEYSTORE_PASSWORD = ConvertTo-PlainText $storePassword
$env:PLAY_UPLOAD_KEY_PASSWORD = ConvertTo-PlainText $keyPassword

try {
    if (-not (Test-Path $keystorePath)) {
        & (Join-Path $env:JAVA_HOME 'bin\keytool.exe') -genkeypair -v `
            -keystore $keystorePath -storetype JKS `
            -storepass:env PLAY_UPLOAD_KEYSTORE_PASSWORD `
            -keypass:env PLAY_UPLOAD_KEY_PASSWORD `
            -alias $keyAlias -keyalg RSA -keysize 3072 -validity 10000 `
            -dname 'CN=Shiv Agency Rewards Upload, O=Shiv Agency, C=IN'
        if ($LASTEXITCODE -ne 0) { throw 'Upload key generation failed.' }
    }

    Push-Location $androidRoot
    try {
        & .\gradlew.bat :app:bundleRelease
        if ($LASTEXITCODE -ne 0) { throw 'Release bundle build failed.' }
        & .\gradlew.bat :app:assembleRelease
        if ($LASTEXITCODE -ne 0) { throw 'Release APK build failed.' }
    }
    finally { Pop-Location }

    $releaseApk = Join-Path $androidRoot 'app\build\outputs\apk\release\app-release.apk'
    $projectRoot = Split-Path $androidRoot -Parent
    $adminPublicApk = Join-Path $projectRoot 'admin\public\ShivAgencyRewards.apk'
    $adminDistApk = Join-Path $projectRoot 'admin\dist\ShivAgencyRewards.apk'
    Copy-Item -LiteralPath $releaseApk -Destination $adminPublicApk -Force
    if (Test-Path (Split-Path $adminDistApk -Parent)) {
        Copy-Item -LiteralPath $releaseApk -Destination $adminDistApk -Force
    }

    Write-Host "Signed AAB: $androidRoot\app\build\outputs\bundle\release\app-release.aab"
    Write-Host "Signed APK: $androidRoot\app\build\outputs\apk\release\app-release.apk"
    Write-Host "Download page files are staged in admin\public and admin\dist. Deploy Hosting after reviewing the signed build."
    Write-Host "Upload keystore (keep a secure backup): $keystorePath"
    Write-Warning 'Record the password in a password manager and back up the keystore securely. Never commit either file.'
}
finally {
    Remove-Item Env:PLAY_UPLOAD_KEYSTORE_PATH -ErrorAction SilentlyContinue
    Remove-Item Env:PLAY_UPLOAD_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:PLAY_UPLOAD_KEY_ALIAS -ErrorAction SilentlyContinue
    Remove-Item Env:PLAY_UPLOAD_KEY_PASSWORD -ErrorAction SilentlyContinue
}
