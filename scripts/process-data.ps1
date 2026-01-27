# process-data.ps1
# Transforms raw DatexII XML files into a simplified JSON for the Radio Web App.

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$DataDir = Join-Path $ProjectRoot "data"
$RawDir = Join-Path $DataDir "raw"
$OutputFile = Join-Path $DataDir "traffic.json"

Write-Host "Starting data processing..." -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

function Get-XmlContent {
    param([string]$FileName)
    $Path = Join-Path $RawDir $FileName
    if (Test-Path $Path) {
        try {
            # Read file with encoding that handles BOM/UTF8 correctly
            $Content = Get-Content $Path -Raw -Encoding UTF8
            $Xml = [xml]$Content
            return $Xml
        }
        catch {
            Write-Warning "Failed to parse XML: $FileName. Error: $_"
            return $null
        }
    }
    else {
        Write-Warning "File not found: $FileName"
        return $null
    }
}

function Get-SafeValue {
    param($Node, $PropPath)
    # Helper to safely navigate potentially null nested properties
    try {
        $Val = $Node
        $Props = $PropPath -split '\.'
        foreach ($Prop in $Props) {
            if ($null -eq $Val) { return $null }
            $Val = $Val.$Prop
        }
        return $Val
    }
    catch {
        return $null
    }
}

# -----------------------------------------------------------------------------
# 1. Process Events (Accidents, Roadworks, Hazards)
# -----------------------------------------------------------------------------
$AllEvents = @()

# List of event files to process
$EventFiles = @(
    @{ Name = "b2b.hak.events.datex.xml"; Type = "Event" },
    @{ Name = "b2b.hak.roadworks.datex.xml"; Type = "Roadwork" },
    @{ Name = "b2b.hc.events.datex.xml"; Type = "Event" },
    @{ Name = "b2b.hc.roadworks.datex.xml"; Type = "Roadwork" },
    @{ Name = "b2b.azm.roadworks.datex.xml"; Type = "Roadwork" },
    @{ Name = "b2b.hac.situationData.xml"; Type = "Event" }
)

foreach ($FileDef in $EventFiles) {
    $Xml = Get-XmlContent -FileName $FileDef.Name
    if ($null -eq $Xml) { continue }

    Write-Host "Processing $($FileDef.Name)..." -ForegroundColor Gray
    $FileEventCount = 0

    # Navigate to situation records
    # Note: DatexII structure is usually payloadPublication -> situation -> situationRecord
    $Situations = $Xml.d2LogicalModel.payloadPublication.situation

    foreach ($Sit in $Situations) {
        # 'situationRecord' can be a single object or an array if multiple records exist in one situation
        # We enforce array to handle both
        $Records = @($Sit.situationRecord)

        foreach ($Rec in $Records) {
            # --- Extract Basic Info ---
            $Id = $Rec.id
            $RecType = $Rec.GetType().Name # e.g., "EnvironmentalObstruction", "MaintenanceWorks"
             
            # Map Internal Type
            $Type = "info"
            if ($RecType -match "Accident") { $Type = "accident" }
            elseif ($RecType -match "Maintenance" -or $RecType -match "Construction") { $Type = "roadworks" }
            elseif ($RecType -match "Obstruction" -or $RecType -match "Environment") { $Type = "hazard" }

            # --- Extract Description ---
            # Path: generalPublicComment -> comment -> values -> value (lang=hr)
            $Comments = @($Rec.generalPublicComment)
            $MainText = ""
             
            foreach ($Gpc in $Comments) {
                $Vals = @($Gpc.comment.values.value)
                foreach ($Val in $Vals) {
                    if ($Val.lang -eq "hr") {
                        $MainText += $Val."#text" + " "
                    }
                }
            }
            $MainText = $MainText.Trim()
            if ([string]::IsNullOrWhiteSpace($MainText)) { continue } # Skip empty events

            # --- Extract Location ---
            # We look for 'groupOfLocations' -> 'locationForDisplay'
            $LocGroup = $Rec.groupOfLocations
            if ($null -eq $LocGroup) { continue }

            $Lat = Get-SafeValue $LocGroup "locationForDisplay.latitude"
            $Lng = Get-SafeValue $LocGroup "locationForDisplay.longitude"

            if ($null -eq $Lat -or $null -eq $Lng) { continue }

            # --- Extract Road Name (Optional) ---
            # Try to find 'linearElementIdentifier'
            $RoadName = ""
            if ($LocGroup.linearWithinLinearElement) {
                $RoadName = Get-SafeValue $LocGroup "linearWithinLinearElement.linearElement.linearElementIdentifier"
            }

            # --- Extract Validity (Start/End) ---
            $ValidStart = Get-SafeValue $Rec "validity.validityTimeSpecification.overallStartTime"
            $ValidEnd = Get-SafeValue $Rec "validity.validityTimeSpecification.overallEndTime"

            if ($Lat -and $Lng -and $MainText) {
                $AllEvents += [PSCustomObject]@{
                    id         = $Id
                    type       = $FileDef.Type
                    details    = $MainText
                    lat        = $Lat
                    lng        = $Lng
                    road       = $RoadName
                    sourceFile = $FileDef.Name
                    timestamp  = Get-SafeValue $Rec "situationRecordVersionTime"
                    validFrom  = $ValidStart
                    validUntil = $ValidEnd
                }
                $FileEventCount++
            }
        }
    }
    Write-Host "  Added $FileEventCount events." -ForegroundColor Cyan
}

Write-Host "Found $( $AllEvents.Count ) traffic events." -ForegroundColor Green


# -----------------------------------------------------------------------------
# 2. Process Weather (Wind, Temp)
# -----------------------------------------------------------------------------
# -----------------------------------------------------------------------------
# 2. Process Weather (Wind, Temp)
# -----------------------------------------------------------------------------
$AllWeather = @()

$WeatherFiles = @(
    "b2b.weather.datex.xml",
    "b2b.azm.weather.datex.xml",
    "b2b.wind.datex.xml",
    "b2b.hac.weatherStationsData.xml"  # HAC motorway weather stations
)

foreach ($FileName in $WeatherFiles) {
    $XmlWeather = Get-XmlContent -FileName $FileName
    if ($null -eq $XmlWeather) { continue }

    Write-Host "Processing Weather: $FileName..." -ForegroundColor Gray
    $FileWeatherCount = 0
    
    # Path: payloadPublication -> elaboratedData
    $DataItems = $XmlWeather.d2LogicalModel.payloadPublication.elaboratedData
    
    # We need to group by Source (Station ID) because attributes (Wind, Temp) are often in separate 'elaboratedData' blocks for the same station
    $GroupedData = $DataItems | Group-Object -Property { $_.source.sourceIdentification }

    foreach ($Group in $GroupedData) {
        $StationId = $Group.Name
        $Lat = $null
        $Lng = $null
        
        $WindSpeed = $null # km/h
        $WindGust = $null  # km/h
        $WindDir = $null   # degrees
        $Temp = $null      # Celsius
        $Humidity = $null  # %
        $RoadTemp = $null  # Celsius

        foreach ($Item in $Group.Group) {
            # Capture Location from the first valid item
            if ($null -eq $Lat) {
                $RawLat = Get-SafeValue $Item "basicData.pertinentLocation.locationForDisplay.latitude"
                $RawLng = Get-SafeValue $Item "basicData.pertinentLocation.locationForDisplay.longitude"
                if ($RawLat) { $Lat = $RawLat; $Lng = $RawLng }
            }

            # Parse Basic Data Types
            $BasicData = $Item.basicData
            
            # --- Wind ---
            if ($BasicData.wind) {
                if ($BasicData.wind.windSpeed) {
                    $SpeedMs = $BasicData.wind.windSpeed.speed
                    if ($SpeedMs) { $WindSpeed = [math]::Round([double]$SpeedMs * 3.6, 1) }
                }
                if ($BasicData.wind.maximumWindSpeed) {
                    $GustMs = $BasicData.wind.maximumWindSpeed.speed
                    if ($GustMs) { $WindGust = [math]::Round([double]$GustMs * 3.6, 1) }
                }
                if ($BasicData.wind.windDirectionBearing) {
                    $WindDir = $BasicData.wind.windDirectionBearing.directionBearing
                }
            }

            # --- Temperature ---
            if ($BasicData.temperature.airTemperature) {
                $Temp = $BasicData.temperature.airTemperature.temperature
            }

            # --- Humidity ---
            if ($BasicData.humidity) {
                $Humidity = $BasicData.humidity.relativeHumidity.percentage
            }

            # --- Road Surface ---
            if ($BasicData.roadSurfaceConditionMeasurements) {
                $RoadTemp = $BasicData.roadSurfaceConditionMeasurements.roadSurfaceTemperature.temperature
            }
        }

        # Only add if we have at least location and ONE meaningful metric
        if ($Lat -and ($WindSpeed -or $Temp)) {
            $AllWeather += [PSCustomObject]@{
                id        = $StationId
                lat       = $Lat
                lng       = $Lng
                windSpeed = $WindSpeed
                windGust  = $WindGust
                windDir   = $WindDir
                temp      = $Temp
                humidity  = $Humidity
                roadTemp  = $RoadTemp
                source    = $FileName # Track source for debugging
            }
            $FileWeatherCount++
        }
    }
    Write-Host "  Added $FileWeatherCount weather stations." -ForegroundColor Cyan
}

Write-Host "Found $( $AllWeather.Count ) weather stations." -ForegroundColor Green

# -----------------------------------------------------------------------------
# 2b. Filter Island Weather (Rab region + neighboring islands)
# -----------------------------------------------------------------------------
# Rab center coordinates
$RabLat = 44.76
$RabLng = 14.76
$IslandRadiusKm = 75  # Covers Rab, Pag, Cres, Krk, and mainland coast (Senj, Jablanac, Karlobag)

function Get-DistanceKm {
    param([double]$Lat1, [double]$Lng1, [double]$Lat2, [double]$Lng2)
    # Haversine formula
    $R = 6371  # Earth radius in km
    $dLat = ($Lat2 - $Lat1) * [Math]::PI / 180
    $dLng = ($Lng2 - $Lng1) * [Math]::PI / 180
    $a = [Math]::Sin($dLat / 2) * [Math]::Sin($dLat / 2) +
    [Math]::Cos($Lat1 * [Math]::PI / 180) * [Math]::Cos($Lat2 * [Math]::PI / 180) *
    [Math]::Sin($dLng / 2) * [Math]::Sin($dLng / 2)
    $c = 2 * [Math]::Atan2([Math]::Sqrt($a), [Math]::Sqrt(1 - $a))
    $c = 2 * [Math]::Atan2([Math]::Sqrt($a), [Math]::Sqrt(1 - $a))
    return $R * $c
}

function Get-DistFromLine {
    param($Lat, $Lng)
    # Approximate Croatian Coast Line (Rijeka -> Dubrovnik)
    # A: Rijeka
    $Lat1 = 45.327
    $Lng1 = 14.442
    # B: Dubrovnik
    $Lat2 = 42.650
    $Lng2 = 18.094
    
    # Vector AB
    $dLat = $Lat2 - $Lat1
    $dLng = $Lng2 - $Lng1
    
    # Project point P onto line AB to find parameter t
    # t = ((Px - Ax)(Bx - Ax) + (Py - Ay)(By - Ay)) / |AB|^2
    # Using simplistic euclidian approximation for projection factor t is enough for this scale/shape, 
    # then calculate real geo-distance to the projected point.
    
    $LenSq = $dLat * $dLat + $dLng * $dLng
    if ($LenSq -eq 0) { return (Get-DistanceKm $Lat $Lng $Lat1 $Lng1) }
    
    $t = (($Lat - $Lat1) * $dLat + ($Lng - $Lng1) * $dLng) / $LenSq
    
    # Clamp t to segment [0,1]
    if ($t -lt 0) { $t = 0 }
    if ($t -gt 1) { $t = 1 }
    
    # Nearest point on segment
    $NearLat = $Lat1 + $t * $dLat
    $NearLng = $Lng1 + $t * $dLng
    
    return Get-DistanceKm $Lat $Lng $NearLat $NearLng
}


# -----------------------------------------------------------------------------
# 3. Process Traffic Counters
# -----------------------------------------------------------------------------
$AllCounters = @()
$CounterFiles = @(
    "b2b.counters.datex.xml",
    "b2b.hac.trafficData.xml"
)

foreach ($CounterFile in $CounterFiles) {
    $XmlCounters = Get-XmlContent -FileName $CounterFile
    if ($null -eq $XmlCounters) { continue }
    
    Write-Host "Processing Counters: $CounterFile..." -ForegroundColor Gray
    $FileCounterCount = 0
    
    $DataItems = $XmlCounters.d2LogicalModel.payloadPublication.elaboratedData
    $GroupedData = $DataItems | Group-Object -Property { $_.source.sourceIdentification }
    
    foreach ($Group in $GroupedData) {
        $SourceId = $Group.Name
        # Example ID: "COUNTER:KARL:3521-Kaptol - Požega"
        # Parse readable name
        $Name = $SourceId
        if ($SourceId -match "COUNTER:[^:]+:\d+-(.+)") {
            $Name = $Matches[1]
        }
        
        $Lat = $null
        $Lng = $null
        $Flow = $null   # veh/h
        $Speed = $null  # km/h
        
        foreach ($Item in $Group.Group) {
            # Location
            if ($null -eq $Lat) {
                $RawLat = Get-SafeValue $Item "basicData.pertinentLocation.locationForDisplay.latitude"
                $RawLng = Get-SafeValue $Item "basicData.pertinentLocation.locationForDisplay.longitude"
                if ($RawLat) { $Lat = $RawLat; $Lng = $RawLng }
            }
            
            $BasicData = $Item.basicData
            
            # Extract Flow
            if ($BasicData.vehicleFlow) {
                $Flow = $BasicData.vehicleFlow.vehicleFlowRate
            }
            
            # Extract Speed
            if ($BasicData.averageVehicleSpeed) {
                $Speed = $BasicData.averageVehicleSpeed.speed
            }
        }
        
        if ($Lat -and ($Flow -or $Speed)) {
            $AllCounters += [PSCustomObject]@{
                id    = $SourceId
                name  = $Name
                lat   = $Lat
                lng   = $Lng
                flow  = $Flow
                speed = $Speed
            }
            $FileCounterCount++
        }
    }
    Write-Host "  Added $FileCounterCount traffic counters." -ForegroundColor Cyan
}

Write-Host "Found $( $AllCounters.Count ) traffic counters." -ForegroundColor Green

# -----------------------------------------------------------------------------
# 3b. Process Cameras
# -----------------------------------------------------------------------------
$AllCameras = @()
$CameraFiles = @(
    "b2b.hak.cameras.datex.xml",
    "b2b.hac.cameras.xml",
    "b2b.cameras.datex.xml"
)

foreach ($CamFile in $CameraFiles) {
    if (!(Test-Path (Join-Path $RawDir $CamFile))) { continue }
    
    Write-Host "Processing Cameras: $CamFile..." -ForegroundColor Gray
    $FileCamCount = 0

    # Clean XML - strip ALL namespaces and prefixes for easy navigation
    $RawXml = Get-Content (Join-Path $RawDir $CamFile) -Raw -Encoding UTF8
    $CleanXml = $RawXml -replace 'xmlns(:\w+)?="[^"]+"', '' -replace '<\w+:', '<' -replace '</\w+:', '</' -replace ' xsi:type="[^"]+"', ''
    
    try {
        [xml]$XmlClean = $CleanXml
    } catch {
        Write-Warning "Failed to parse cleaned XML $CamFile. Skipping."
        continue
    }

    # HAK / Datex Structure: The data can be in 'predefinedLocationContainer' or 'predefinedLocation'
    # We'll search for both types of blocks
    $Containers = $XmlClean.SelectNodes("//predefinedLocationContainer | //predefinedLocation")

    foreach ($Loc in $Containers) {
        try {
            # 1. Find the Camera Record (might be direct or in Extension)
            $Cam = $Loc.predefinedLocationContainerExtension.trafficCameraRecord
            if (!$Cam) { $Cam = $Loc.trafficCameraRecord }
            if (!$Cam) { continue }

            $Id = $Cam.cameraId
            
            # Title extraction
            $Title = ""
            if ($Cam.cameraTitle.values.value) {
                $V = $Cam.cameraTitle.values.value
                if ($V -is [array]) { $Title = $V[0].'#text' }
                else { $Title = $V.'#text' }
                if (!$Title) { $Title = $V.InnerText }
                if (!$Title) { $Title = $V }
            }

            # URL extraction (stillImageUrl is the standard in your HAK sample)
            $Url = $Cam.stillImageUrl
            if (!$Url) { $Url = $Cam.imageUrl.urlLinkAddress }
            if ($Url -is [System.Xml.XmlElement]) { $Url = $Url.InnerText }

            # GPS extraction (Sibling 'location' block in HAK structure)
            $Lat = $null
            $Lng = $null
            
            # Case 1: Under sibling 'location' (HAK style)
            if ($Loc.location.locationForDisplay) {
                $Lat = $Loc.location.locationForDisplay.latitude
                $Lng = $Loc.location.locationForDisplay.longitude
            }
            # Case 2: Under direct 'locationForDisplay' (HAC style)
            elseif ($Loc.locationForDisplay) {
                $Lat = $Loc.locationForDisplay.latitude
                $Lng = $Loc.locationForDisplay.longitude
            }

            if ($Url -and $Lat -and $Lng) {
                $AllCameras += [PSCustomObject]@{
                    id    = $Id
                    title = $Title
                    lat   = $Lat
                    lng   = $Lng
                    url   = $Url
                    source = $CamFile
                }
                $FileCamCount++
            }
        }
        catch {
            continue
        }
    }
    Write-Host "  Added $FileCamCount cameras." -ForegroundColor Cyan
}

Write-Host "Found $( $AllCameras.Count ) cameras." -ForegroundColor Green


# -----------------------------------------------------------------------------
# 4. Bucketing Logic (Hierarchical)
# -----------------------------------------------------------------------------
# 1. Island: < 75km from Rab
# 2. Coastal: < 50km from Coast Line (AND NOT Island)
# 3. Global: Everything else
# -----------------------------------------------------------------------------

$IslandData = @{ counters = @(); weather = @(); cameras = @() }
$CoastalData = @{ counters = @(); weather = @(); cameras = @() }
$GlobalData = @{ counters = @(); weather = @(); cameras = @() }

# Process Counters
foreach ($C in $AllCounters) {
    if (!$C.lat -or !$C.lng) { continue }
    
    $DistRab = Get-DistanceKm -Lat1 $RabLat -Lng1 $RabLng -Lat2 $C.lat -Lng2 $C.lng
    $DistCoast = Get-DistFromLine -Lat $C.lat -Lng $C.lng
    
    if ($DistRab -le $IslandRadiusKm) {
        $C | Add-Member -NotePropertyName "distanceFromRab" -NotePropertyValue ([math]::Round($DistRab, 1)) -Force
        $IslandData.counters += $C
    }
    elseif ($DistCoast -le 50) {
        $CoastalData.counters += $C
    }
    else {
        $GlobalData.counters += $C
    }
}

# Process Weather
foreach ($W in $AllWeather) {
    if (!$W.lat -or !$W.lng) { continue }
    
    $DistRab = Get-DistanceKm -Lat1 $RabLat -Lng1 $RabLng -Lat2 $W.lat -Lng2 $W.lng
    $DistCoast = Get-DistFromLine -Lat $W.lat -Lng $W.lng
    
    if ($DistRab -le $IslandRadiusKm) {
        $W | Add-Member -NotePropertyName "distanceFromRab" -NotePropertyValue ([math]::Round($DistRab, 1)) -Force
        $IslandData.weather += $W
    }
    elseif ($DistCoast -le 50) {
        $CoastalData.weather += $W
    }
    else {
        $GlobalData.weather += $W
    }
}

# Process Cameras
foreach ($Cam in $AllCameras) {
    if (!$Cam.lat -or !$Cam.lng) { continue }
    
    $DistRab = Get-DistanceKm -Lat1 $RabLat -Lng1 $RabLng -Lat2 $Cam.lat -Lng2 $Cam.lng
    $DistCoast = Get-DistFromLine -Lat $Cam.lat -Lng $Cam.lng
    
    if ($DistRab -le $IslandRadiusKm) {
        $Cam | Add-Member -NotePropertyName "distanceFromRab" -NotePropertyValue ([math]::Round($DistRab, 1)) -Force
        $IslandData.cameras += $Cam
    }
    elseif ($DistCoast -le 50) {
        $CoastalData.cameras += $Cam
    }
    else {
        $GlobalData.cameras += $Cam
    }
}

Write-Host "Bucketing Stats:" -ForegroundColor Cyan
Write-Host "  Island:  $( $IslandData.counters.Count ) counters, $( $IslandData.weather.Count ) weather, $( $IslandData.cameras.Count ) cameras"
Write-Host "  Coastal: $( $CoastalData.counters.Count ) counters, $( $CoastalData.weather.Count ) weather, $( $CoastalData.cameras.Count ) cameras"
Write-Host "  Global:  $( $GlobalData.counters.Count ) counters, $( $GlobalData.weather.Count ) weather, $( $GlobalData.cameras.Count ) cameras"

# -----------------------------------------------------------------------------
# 5. Export Files
# -----------------------------------------------------------------------------

# File 1: traffic.json (Base + Island)
$BaseOutput = @{
    updatedAt      = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    dataVersion    = "2.0-tiered"
    events         = $AllEvents
    islandWeather  = $IslandData.weather
    islandCounters = $IslandData.counters
    islandCameras  = $IslandData.cameras
}

# File 2: traffic-coastal.json
$CoastalOutput = @{
    updatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    weather   = $CoastalData.weather
    counters  = $CoastalData.counters
    cameras   = $CoastalData.cameras
}

# File 3: traffic-global.json
$GlobalOutput = @{
    updatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    weather   = $GlobalData.weather
    counters  = $GlobalData.counters
    cameras   = $GlobalData.cameras
}

function Export-JsonFile {
    param($Data, $Path)
    $Content = $Data | ConvertTo-Json -Depth 10 -Compress
    $Content | Set-Content -Path $Path -Encoding UTF8
    #Write-Host "Exported: $(Split-Path $Path -Leaf)" -ForegroundColor Green
    return $Content
}

$JsonContent = Export-JsonFile -Data $BaseOutput -Path $OutputFile
Export-JsonFile -Data $CoastalOutput -Path (Join-Path $DataDir "traffic-coastal.json")
Export-JsonFile -Data $GlobalOutput -Path (Join-Path $DataDir "traffic-global.json")

# --- ALSO EXPORT BASE AS JS FOR LOCAL FILE:// ACCESS ---
$JsOutputFile = Join-Path $DataDir "traffic-data.js"
$JsContent = "const NPT_DATA = $JsonContent;"
$JsContent | Set-Content -Path $JsOutputFile -Encoding UTF8

# Export Coastal as JS
$JsCoastalFile = Join-Path $DataDir "traffic-coastal.js"
$CoastalJson = $CoastalOutput | ConvertTo-Json -Depth 10 -Compress
$JsCoastalContent = "const NPT_COASTAL = $CoastalJson;"
$JsCoastalContent | Set-Content -Path $JsCoastalFile -Encoding UTF8

# Export Global as JS
$JsGlobalFile = Join-Path $DataDir "traffic-global.js"
$GlobalJson = $GlobalOutput | ConvertTo-Json -Depth 10 -Compress
$JsGlobalContent = "const NPT_GLOBAL = $GlobalJson;"
$JsGlobalContent | Set-Content -Path $JsGlobalFile -Encoding UTF8

Write-Host "Successfully wrote JSON to $OutputFile" -ForegroundColor Green
Write-Host "Successfully wrote JS to $JsOutputFile, traffic-coastal.js, and traffic-global.js (for local testing)" -ForegroundColor Green
