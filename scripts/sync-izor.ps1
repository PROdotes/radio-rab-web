# scripts/sync-izor.ps1
# Fetches Sea Quality data from IZOR and saves it locally for the Radio Rab app.
# Includes detailed sampling history for each location.

$DataDir = "$PSScriptRoot/../data"
$OutputFile = Join-Path $DataDir "sea-quality.json"
$JsOutputFile = Join-Path $DataDir "sea-quality.js"

Write-Host "Fetching IZOR Sea Quality markers (multiple years)..." -ForegroundColor Cyan

# Fixed years: explicitly fetch 2025, 2024 and 2023 (do not depend on runtime year)
# We keep this static to ensure we always aggregate those historical years.
$Years = @(2025, 2024, 2023)

try {
    # If previous output exists, load it and seed markersMap so we merge instead of overwrite
    $markersMap = @{}
    if (Test-Path $OutputFile) {
        try {
            $existing = Get-Content $OutputFile -Raw | ConvertFrom-Json -ErrorAction Stop
            if ($existing -and $existing.points) {
                foreach ($p in $existing.points) {
                    # Ensure key exists and convert to a mutable PSCustomObject for safe mutation
                    $k = $p.lsta
                    if ($k) {
                        # Some objects from ConvertFrom-Json may be typed or not allow adding properties.
                        # Create a fresh PSCustomObject copy that is safe to mutate.
                        $mutable = @{}
                        foreach ($prop in $p.psobject.Properties) { $mutable[$prop.Name] = $prop.Value }
                        $markersMap[$k] = [PSCustomObject]$mutable
                    }
                }
            }
        } catch {
            Write-Host "Warning: failed to read existing output file for merge: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }

    # For each marker, prefer fetching the full history once (no year filter) and extract 2023-2025 entries.
    # Fall back to per-year requests only if the full-history response contains no matching years.
    # Snapshot the keys into an array to avoid "collection modified" errors when we mutate markersMap
    $allKeys = @($markersMap.Keys)
    $idx = 0
    foreach ($LocId in $allKeys) {
        $idx++
        $gotAny = $false

        # Full-history attempt
        $fullUrl = "https://vrtlac.izor.hr/ords/kakvoca/lokacija_sve_json?p_lok_id=$LocId&p_jezik=hr"
        try {
            Write-Host "[$idx/$($allKeys.Count)] Fetching full history for $LocId... " -NoNewline
            $fullResp = Invoke-RestMethod -Uri $fullUrl -Method Get -ErrorAction Stop
            if ($null -ne $fullResp -and $null -ne $fullResp.isp) {
                $filtered = @()
                foreach ($rec in $fullResp.isp) {
                    $s = $rec.vri; if (-not $s) { $s = $rec.datum }; if (-not $s) { $s = $rec.dan }
                    $dt = TryParseDateTime($s)
                    $ry = $null
                    if ($dt) { $ry = $dt.Year } elseif ($s -match '(20\d{2})') { $ry = [int]$matches[1] }
                    if ($ry -and ($Years -contains $ry)) { $filtered += $rec }
                }
                if ($filtered.Count -gt 0) {
                    if (-not $markersMap[$LocId].history) { $markersMap[$LocId].history = @() }
                    $markersMap[$LocId].history += $filtered
                    Write-Host "OK (full: $($filtered.Count) readings)" -ForegroundColor Green
                    $gotAny = $true
                } else {
                    Write-Host "EMPTY (full)" -ForegroundColor Yellow
                }
            } else {
                Write-Host "EMPTY (full)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "FAILED (full)" -ForegroundColor Red
        }

        if (-not $gotAny) {
            # Fallback: request per-year history explicitly
            foreach ($year in $Years) {
                $HistUrl = "https://vrtlac.izor.hr/ords/kakvoca/lokacija_sve_json?p_lok_id=$LocId&p_god=$year&p_jezik=hr"
                try {
                    Write-Host "[$idx/$($allKeys.Count)] Fetching history for $LocId ($year)... " -NoNewline
                    $HistResp = Invoke-RestMethod -Uri $HistUrl -Method Get -ErrorAction Stop
                    if ($null -ne $HistResp -and $null -ne $HistResp.isp) {
                        if (-not $markersMap[$LocId].history) { $markersMap[$LocId].history = @() }
                        $markersMap[$LocId].history += $HistResp.isp
                        Write-Host "OK ($($HistResp.isp.Count) readings)" -ForegroundColor Green
                        $gotAny = $true
                    } else {
                        Write-Host "EMPTY" -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "FAILED" -ForegroundColor Red
                }
                Start-Sleep -Milliseconds 40
            }
        }
    }

    # Helper to safely parse timestamp for sorting
    function TryParseDateTime([string]$s) {
        if ([string]::IsNullOrWhiteSpace($s)) { return $null }
        try {
            return [datetime]$s
        } catch {
            return $null
        }
    }

    # Repair common UTF-8->Windows-1252 mojibake (e.g. 'Å¾' -> 'ž') by reinterpreting as windows-1252 bytes
    function RepairEncoding([string]$s) {
        if (-not $s) { return $s }
        if ($s -notmatch '[ÅÃ]') { return $s }
        try {
            $bytes = [System.Text.Encoding]::GetEncoding(1252).GetBytes($s)
            $fixed = [System.Text.Encoding]::UTF8.GetString($bytes)
            return $fixed
        } catch {
            return $s
        }
    }

    function SanitizeRecord($rec) {
        # Return a shallow PSCustomObject copy with string fields repaired
        $out = @{}
        try {
            foreach ($prop in $rec.psobject.Properties) {
                $val = $prop.Value
                if ($val -is [string]) { $out[$prop.Name] = RepairEncoding($val) } else { $out[$prop.Name] = $val }
            }
        } catch {
            return $rec
        }
        return [PSCustomObject]$out
    }

    # Sanitize marker-level strings and history records to fix mojibake from the source
    foreach ($k in @($markersMap.Keys)) {
        $entry = $markersMap[$k]
        $newProps = @{}
        try {
            foreach ($prop in $entry.psobject.Properties) {
                $val = $prop.Value
                if ($val -is [string]) { $newProps[$prop.Name] = RepairEncoding($val) } else { $newProps[$prop.Name] = $val }
            }
        } catch {
            # fallback: leave entry as-is
            continue
        }
        # sanitize history entries if present
        if ($newProps.ContainsKey('history') -and $newProps['history']) {
            $san = @()
            foreach ($r in $newProps['history']) { $san += SanitizeRecord($r) }
            $newProps['history'] = $san
        }
        $markersMap[$k] = [PSCustomObject]$newProps
    }

    # Deduplicate and sort histories per marker (newest first)
    # Snapshot keys before iterating to avoid collection-modified exceptions
    $keysForDedupe = @($markersMap.Keys)
    foreach ($key in $keysForDedupe) {
        $h = $markersMap[$key].history
        if (-not $h) { $markersMap[$key].history = @(); continue }

        # Dedupe by timestamp string (vri) or combined fields
        $seen = @{}
        $unique = @()
        foreach ($rec in $h) {
            $ts = $rec.vri
            if (-not $ts) { $ts = $rec.datum; if (-not $ts) { $ts = $rec.dan } }
            if (-not $ts) { $ts = [guid]::NewGuid().Guid }
            if (-not $seen.ContainsKey($ts)) {
                $seen[$ts] = $true
                $unique += $rec
            }
        }

        # Sort unique by parsed datetime descending
        $sorted = $unique | Sort-Object -Property @{ Expression = { Try { $dt = TryParseDateTime($_.vri); if ($null -eq $dt) { $dt = TryParseDateTime($_.datum) }; if ($null -eq $dt) { $dt = TryParseDateTime($_.dan) }; return $dt } Catch { return [datetime]'0001-01-01' } } } -Descending
        $markersMap[$key].history = $sorted

        # Compute distinct years present in this marker's history for diagnostics
        $yearSet = New-Object System.Collections.Generic.HashSet[int]
        foreach ($rec in $sorted) {
            $dt = TryParseDateTime($rec.vri) ; if (-not $dt) { $dt = TryParseDateTime($rec.datum) } ; if (-not $dt) { $dt = TryParseDateTime($rec.dan) }
            if ($dt) { $yearSet.Add($dt.Year) | Out-Null }
        }
        # Build a fresh PSCustomObject from the existing entry and attach historyYears
        $orig = $markersMap[$key]
        $newProps = @{}
        $succeeded = $false
        try {
            foreach ($prop in $orig.psobject.Properties) { $newProps[$prop.Name] = $prop.Value }
            $succeeded = $true
        } catch {
            # Not all objects expose psobject.Properties the same way; try IDictionary
            if ($orig -is [System.Collections.IDictionary]) {
                foreach ($k in $orig.Keys) { $newProps[[string]$k] = $orig[$k] }
                $succeeded = $true
            }
        }
        if (-not $succeeded) {
            # Fallback: copy common expected fields if present
            $newProps['lsta'] = $key
            if ($orig -is [object[]]) { $newProps['raw'] = $orig }
        }
        # Attach the computed historyYears
        $newProps['historyYears'] = ($yearSet | Sort-Object -Descending)
        # Replace the entry with a guaranteed mutable PSCustomObject
        $markersMap[$key] = [PSCustomObject]$newProps
    }

    $Output = @{
        updatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
        years = $Years
        points = $markersMap.Values
    }

    $JsonContent = $Output | ConvertTo-Json -Depth 12 -Compress
    $JsonContent | Set-Content -Path $OutputFile -Encoding UTF8

    $JsContent = "const IZOR_DATA = $JsonContent;"
    $JsContent | Set-Content -Path $JsOutputFile -Encoding UTF8

    # Produce a diagnostics summary to help debug missing years
    try {
        $yearTotals = @{}
        foreach ($y in $Years) { $yearTotals[[string]$y] = 0 }
        $perMarkerYears = @{}
        foreach ($p in $markersMap.Values) {
            $markerId = $p.lsta
            $perMarkerYears[[string]$markerId] = @{}
            foreach ($rec in ($p.history | Where-Object { $_ })) {
                $s = $rec.vri; if (-not $s) { $s = $rec.datum }; if (-not $s) { $s = $rec.dan }
                $dt = TryParseDateTime($s)
                $ry = $null
                if ($dt) { $ry = $dt.Year } else { if ($s -match '(20\d{2})') { $ry = [int]$matches[1] } }
                if ($ry) {
                    if ($yearTotals.ContainsKey([string]$ry)) { $yearTotals[[string]$ry] += 1 }
                    # Ensure key exists then increment per-marker year counts
                    if (-not $perMarkerYears[[string]$markerId].ContainsKey([string]$ry)) { $perMarkerYears[[string]$markerId][[string]$ry] = 0 }
                    $perMarkerYears[[string]$markerId][[string]$ry] += 1
                }
            }
        }
        $diag = @{ fetchedAt = (Get-Date).ToString("o"); yearTotals = $yearTotals; perMarkerYears = $perMarkerYears }
        $diag | ConvertTo-Json -Depth 6 -Compress | Set-Content -Path (Join-Path $DataDir "sea-quality-debug.json") -Encoding UTF8
    } catch {
        Write-Host "Warning: diagnostics write failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    Write-Host "`nSuccessfully saved to $OutputFile" -ForegroundColor Green
} catch {
    Write-Error "Failed to sync IZOR data: $($_.Exception.Message)"
}
