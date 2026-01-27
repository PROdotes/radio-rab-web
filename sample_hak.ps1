$Path = "data/raw/b2b.hak.cameras.datex.xml"
$Xml = [xml](Get-Content $Path -Raw)
$Ns = @{ d = "http://datex2.eu/schema/2/2_0" }
$Records = Select-Xml -Xml $Xml -XPath "//d:trafficCameraRecord" -Namespace $Ns
if ($Records) {
    $parent = $Records[0].Node.ParentNode
    Write-Host "--- HAK Parent ---"
    Write-Host $parent.OuterXml.Substring(0, [math]::Min($parent.OuterXml.Length, 1000))
}
