# scripts/fetch-locations.ps1
# Fetch the locations list endpoint and show raw plus decodings

param(
    [string]$Endpoint = 'lokacije_json'
)

$u = "https://vrtlac.izor.hr/ords/kakvoca/$Endpoint?p_jezik=hr"
Write-Host "Fetching: $u" -ForegroundColor Cyan
try {
    $wc = New-Object System.Net.WebClient
    $bytes = $wc.DownloadData($u)
    $utf8 = [System.Text.Encoding]::UTF8.GetString($bytes)
    $cp1250 = [System.Text.Encoding]::GetEncoding(1250).GetString($bytes)
    $cp1252 = [System.Text.Encoding]::GetEncoding(1252).GetString($bytes)

    Write-Host "\n--- UTF8 (first 800 chars) ---\n"
    Write-Host ($utf8.Substring(0,[math]::Min(800,$utf8.Length)))
    Write-Host "\n--- CP1250 (first 800 chars) ---\n"
    Write-Host ($cp1250.Substring(0,[math]::Min(800,$cp1250.Length)))
    Write-Host "\n--- CP1252 (first 800 chars) ---\n"
    Write-Host ($cp1252.Substring(0,[math]::Min(800,$cp1252.Length)))

} catch {
    Write-Error "Fetch failed: $($_.Exception.Message)"
}
