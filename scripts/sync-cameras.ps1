# sync-cameras.ps1
# Specialized sync script for Camera data from NPT

$configPath = "$PSScriptRoot/../config.local.js"
$rawDir = "$PSScriptRoot/../data/raw"

if (!(Test-Path $rawDir)) { New-Item -ItemType Directory -Path $rawDir | Out-Null }

# 1. Extract credentials
if (!(Test-Path $configPath)) { Write-Error "config.local.js not found"; exit }
$configContent = [System.IO.File]::ReadAllText($configPath)
$usernameMatch = [regex]::Match($configContent, '(?:user|NPT_USER):\s*[''"]?([^''"\s,}]+)[''"]?')
$passwordMatch = [regex]::Match($configContent, '(?:pass|NPT_PASS):\s*[''"]?([^''"\s,}]+)[''"]?')
if (!$usernameMatch.Success -or !$passwordMatch.Success) { Write-Error "Credentials missing"; exit }
$username = $usernameMatch.Groups[1].Value
$password = $passwordMatch.Groups[1].Value

# 2. Authenticate
$authBody = @{ grant_type = "password"; username = $username; password = $password }
try {
    $auth = Invoke-RestMethod -Uri "https://b2b.promet-info.hr/uc/user/token" -Method Post -Body $authBody -ContentType "application/x-www-form-urlencoded"
    $token = $auth.access_token
    Write-Host "Authentication successful." -ForegroundColor Green
}
catch {
    Write-Error "Authentication failed: $($_.Exception.Message)"
    exit
}

# 3. Camera Services
$services = @(
    "b2b.hac.cameras",
    "b2b.hak.cameras.datex",
    "b2b.cameras.datex"
)

$headers = @{ 
    Authorization = "bearer $token"
    "User-Agent"  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

Write-Host "Starting Camera Sync..." -ForegroundColor Cyan

foreach ($service in $services) {
    $url = "https://b2b.promet-info.hr/dc/$service"
    $outputPath = "$rawDir/$service.xml"
    Write-Host "Fetching: $service... " -NoNewline
    try {
        Invoke-WebRequest -Uri $url -Headers $headers -OutFile $outputPath -UseBasicParsing -TimeoutSec 60
        Write-Host "OK" -ForegroundColor Green
    }
    catch {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Warning "$service : $($_.Exception.Message)"
    }
}
