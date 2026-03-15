# AI Intercom — Native Messaging Host Installer

$HostName = "com.antigravity.ai_intercom"
$ManifestFile = "host.json"
$RegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"

Write-Host "Installing AI Intercom Native Host..." -ForegroundColor Cyan

# Find current directory
$CurrentDir = Get-Location
$FullPath = "$CurrentDir\$ManifestFile"

if (-Not (Test-Path $FullPath)) {
    Write-Error "Could not find host.json in current directory."
    exit 1
}

# Update manifest with absolute path (placeholder for real logic if needed)
# For now we assume host.json is correctly configured or the installer should fix it.

# Create registry key
if (-Not (Test-Path $RegistryPath)) {
    New-Item -Path $RegistryPath -Force | Out-Null
}

Set-ItemProperty -Path $RegistryPath -Name "(Default)" -Value $FullPath

Write-Host "Registration complete!" -ForegroundColor Green
Write-Host "Native Host Name: $HostName"
Write-Host "Manifest Path: $FullPath"
