# scripts/fetch-raw-izor.ps1
# Fetch raw bytes from IZOR endpoint for a given station id and show multiple decodings

param(
    [int]$Id = 6229
)

$u = "https://vrtlac.izor.hr/ords/kakvoca/lokacija_sve_json?p_lok_id=$Id&p_jezik=hr"
Write-Host "Fetching: $u" -ForegroundColor Cyan

try {
    $wc = New-Object System.Net.WebClient
    $bytes = $wc.DownloadData($u)
    $utf8 = [System.Text.Encoding]::UTF8.GetString($bytes)
    $cp1250 = [System.Text.Encoding]::GetEncoding(1250).GetString($bytes)
    $cp1252 = [System.Text.Encoding]::GetEncoding(1252).GetString($bytes)

    Write-Host "\n--- Raw UTF8 decode ---\n"
    Write-Host $utf8
    Write-Host "\n--- Raw CP1250 decode ---\n"
    Write-Host $cp1250
    Write-Host "\n--- Raw CP1252 decode ---\n"
    Write-Host $cp1252

    Write-Host "\n--- Parsed JSON (Invoke-RestMethod) ---\n"
    try {
        $parsed = Invoke-RestMethod -Uri $u -Method Get -ErrorAction Stop
        $parsed | ConvertTo-Json -Depth 6 | Write-Host
    } catch {
        Write-Host "Parsed JSON failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} catch {
    Write-Error "Fetch failed: $($_.Exception.Message)"
}
