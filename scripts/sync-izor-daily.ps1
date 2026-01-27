# scripts/sync-izor-daily.ps1
# Incremental daily fetcher: only fetches current year and appends new readings

$DataDir = "$PSScriptRoot/../data"
$OutputFile = Join-Path $DataDir "sea-quality.json"
$JsOutputFile = Join-Path $DataDir "sea-quality.js"
$MetaFile = Join-Path $DataDir "sea-quality-meta.json"
$DebugFile = Join-Path $DataDir "sea-quality-debug.json"

Write-Host "Running daily IZOR sync (current year only) ..." -ForegroundColor Cyan

if (-not (Test-Path $OutputFile)) {
    Write-Error "Output file $OutputFile not found. Run the full backfill sync first (sync-izor.ps1)."
    exit 1
}

# Helpers
function TryParseDateTime([string]$s) {
    if ([string]::IsNullOrWhiteSpace($s)) { return $null }
    try { return [datetime]$s } catch { return $null }
}

function ToMutable([object]$p, [string]$key) {
    $mutable = @{}
    try {
        foreach ($prop in $p.psobject.Properties) { $mutable[$prop.Name] = $prop.Value }
    } catch {
        if ($p -is [System.Collections.IDictionary]) { foreach ($k in $p.Keys) { $mutable[[string]$k] = $p[$k] } }
        else { $mutable['lsta'] = $key }
    }
    return [PSCustomObject]$mutable
}

# Load existing data
$existing = Get-Content $OutputFile -Raw | ConvertFrom-Json
$markersMap = @{}
foreach ($p in $existing.points) {
    $k = $p.lsta
    if ($k) { $markersMap[$k] = ToMutable $p $k }
}

# Load or init meta (store as a mutable hashtable)
$meta = @{}
if (Test-Path $MetaFile) {
    try {
        $rawMeta = Get-Content $MetaFile -Raw | ConvertFrom-Json
        # Convert PSCustomObject to hashtable for safe ContainsKey and indexing
        if ($rawMeta -and $rawMeta.psobject -and $rawMeta.psobject.Properties.Count -gt 0) {
            foreach ($prop in $rawMeta.psobject.Properties) { $meta[$prop.Name] = $prop.Value }
        } elseif ($rawMeta -is [System.Collections.IDictionary]) {
            foreach ($k in $rawMeta.Keys) { $meta[[string]$k] = $rawMeta[$k] }
        }
    } catch { Write-Host "Warning: failed to read meta, starting fresh" -ForegroundColor Yellow }
}

$currentYear = (Get-Date).Year
$summary = @{}

# Iterate markers and fetch only current year
$allKeys = @($markersMap.Keys)
$idx = 0
foreach ($LocId in $allKeys) {
    $idx++
    $marker = $markersMap[$LocId]
    $markerId = [string]$LocId

    # Determine last known timestamp
    $lastTs = $null
    if ($meta.ContainsKey($markerId) -and $meta[$markerId].lastHistoryTs) {
        $lastTs = TryParseDateTime($meta[$markerId].lastHistoryTs)
    }
    if (-not $lastTs) {
        # compute from existing history
        $max = $null
        foreach ($r in ($marker.history | Where-Object { $_ })) {
            $dt = TryParseDateTime($r.vri); if (-not $dt) { $dt = TryParseDateTime($r.datum) }; if (-not $dt) { $dt = TryParseDateTime($r.dan) }
            if ($dt -and ($max -eq $null -or $dt -gt $max)) { $max = $dt }
        }
        if ($max) { $lastTs = $max }
    }
    if (-not $lastTs) { $lastTs = [datetime]'0001-01-01' }

    $gotNew = 0
    $fetchUrl = "https://vrtlac.izor.hr/ords/kakvoca/lokacija_sve_json?p_lok_id=$markerId&p_god=$currentYear&p_jezik=hr"
    Write-Host "[$idx/$($allKeys.Count)] Fetching current-year for $markerId... " -NoNewline
    try {
        $resp = Invoke-RestMethod -Uri $fetchUrl -Method Get -ErrorAction Stop
        if ($resp -and $resp.isp) {
            $toAppend = @()
            foreach ($rec in $resp.isp) {
                $s = $rec.vri; if (-not $s) { $s = $rec.datum }; if (-not $s) { $s = $rec.dan }
                $dt = TryParseDateTime($s)
                if ($dt -and $dt -gt $lastTs) { $toAppend += $rec }
            }
            if ($toAppend.Count -gt 0) {
                if (-not $marker.history) { $marker.history = @() }
                $marker.history += $toAppend
                # Dedupe by timestamp
                $seen = @{}
                $unique = @()
                foreach ($rec in $marker.history) {
                    $ts = $rec.vri; if (-not $ts) { $ts = $rec.datum; if (-not $ts) { $ts = $rec.dan } }
                    if (-not $ts) { $ts = [guid]::NewGuid().Guid }
                    if (-not $seen.ContainsKey($ts)) { $seen[$ts] = $true; $unique += $rec }
                }
                # Sort desc
                $sorted = $unique | Sort-Object -Property @{ Expression = { Try { $dt = TryParseDateTime($_.vri); if ($null -eq $dt) { $dt = TryParseDateTime($_.datum) }; if ($null -eq $dt) { $dt = TryParseDateTime($_.dan) }; return $dt } Catch { return [datetime]'0001-01-01' } } } -Descending
                $marker.history = $sorted
                # update meta lastHistoryTs
                $newest = TryParseDateTime($marker.history[0].vri); if (-not $newest) { $newest = TryParseDateTime($marker.history[0].datum) }; if (-not $newest) { $newest = TryParseDateTime($marker.history[0].dan) }
                if (-not $meta.ContainsKey($markerId)) { $meta[$markerId] = [PSCustomObject]@{ lastHistoryTs = $null; backfilled = $false } }
                $meta[$markerId].lastHistoryTs = $newest.ToString("o")
                $gotNew = $toAppend.Count
                Write-Host "OK (+$gotNew)" -ForegroundColor Green
            } else {
                Write-Host "OK (+0)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "EMPTY" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "FAILED" -ForegroundColor Red
    }
    $summary[[string]$markerId] = $gotNew
    Start-Sleep -Milliseconds 40
}

# Write outputs
$Output = @{ updatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ"); points = $markersMap.Values }
$JsonContent = $Output | ConvertTo-Json -Depth 12 -Compress
$JsonContent | Set-Content -Path $OutputFile -Encoding UTF8

$JsContent = "const IZOR_DATA = $JsonContent;"
$JsContent | Set-Content -Path $JsOutputFile -Encoding UTF8

# Save meta
$meta | ConvertTo-Json -Depth 6 -Compress | Set-Content -Path $MetaFile -Encoding UTF8

# Write debug summary
$diag = @{ fetchedAt = (Get-Date).ToString("o"); year = $currentYear; added = $summary }
$diag | ConvertTo-Json -Depth 6 -Compress | Set-Content -Path $DebugFile -Encoding UTF8

Write-Host "\nDaily sync complete. Added total: $((($summary.Values) | Measure-Object -Sum).Sum) readings" -ForegroundColor Green
