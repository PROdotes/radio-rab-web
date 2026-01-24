# sync-raw-data.ps1
# Phase 1: Raw Data Acquisition from NPT (National Access Point)

$configPath = "$PSScriptRoot/../config.local.js"
$rawDir = "$PSScriptRoot/../data/raw"

# Create raw directory if it doesn't exist
if (!(Test-Path $rawDir)) {
    New-Item -ItemType Directory -Path $rawDir | Out-Null
}

# 1. Extract credentials from config.local.js
if (!(Test-Path $configPath)) {
    Write-Error "config.local.js not found at $configPath"
    exit
}

$configContent = [System.IO.File]::ReadAllText($configPath)
$usernameMatch = [regex]::Match($configContent, "user:\s*'([^']*)'")
$passwordMatch = [regex]::Match($configContent, "pass:\s*'([^']*)'")

if (!$usernameMatch.Success -or !$passwordMatch.Success) {
    Write-Error "Could not find credentials in config.local.js"
    exit
}

$username = $usernameMatch.Groups[1].Value
$password = $passwordMatch.Groups[1].Value

Write-Host "Authenticating with NPT..." 

# 2. Get Bearer Token
$authBody = @{
    grant_type = "password"
    username   = $username
    password   = $password
}

try {
    $auth = Invoke-RestMethod -Uri "https://b2b.promet-info.hr/uc/user/token" -Method Post -Body $authBody -ContentType "application/x-www-form-urlencoded"
    $token = $auth.access_token
    Write-Host "Authentication successful."
}
catch {
    Write-Error "Authentication failed: $($_.Exception.Message)"
    exit
}

# 3. List of Authorized Services
$services = @(
    "b2b.azm.roadworks.datex",
    "b2b.azm.weather.datex",
    "b2b.gtfs.jl",
    "b2b.hac.situationData.datex",
    "b2b.hac.weatherStationsData.datex",
    "b2b.hac.trafficData.datex",
    "b2b.hak.events.datex",
    "b2b.hak.roadworks.datex",
    "b2b.hc.events.datex",
    "b2b.hc.roadworks.datex",
    "b2b.counters.datex",
    "b2b.weather.datex",
    "b2b.wind.datex",
    "b2b.netex.timetable.jl"
)

$headers = @{ Authorization = "bearer $token" }
$totalStartTime = Get-Date

Write-Host "Starting Bulk Harvest..."

# 4. Bulk Download Loop
foreach ($service in $services) {
    $url = "https://b2b.promet-info.hr/dc/$service"
    $outputPath = "$rawDir/$service.xml"
    
    Write-Host "Fetching: $service... " -NoNewline
    
    $startTime = Get-Date
    try {
        Invoke-WebRequest -Uri $url -Headers $headers -OutFile $outputPath -UseBasicParsing -TimeoutSec 60
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        $fileSize = (Get-Item $outputPath).Length / 1024
        
        $durationStr = $duration.ToString("N2")
        $sizeStr = $fileSize.ToString("N1")
        
        Write-Host "OK ($durationStr s, $sizeStr KB)"
    }
    catch {
        Write-Host "FAILED" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Warning "$service : HTTP $($_.Exception.Response.StatusCode) - $($_.Exception.Response.StatusDescription)"
        }
        else {
            Write-Warning "Could not fetch $service : $($_.Exception.Message)"
        }
    }
}

$totalDuration = ((Get-Date) - $totalStartTime).TotalSeconds
$finalDurationStr = $totalDuration.ToString("N2")
Write-Host "Full Data Harvest Complete! ($finalDurationStr seconds)"
Write-Host "Raw data stored in: $rawDir"
