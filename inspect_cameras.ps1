$file = "data/raw/b2b.hak.cameras.datex.xml"
$Xml = [xml](Get-Content $file -Raw)
$Ns = @{ d2 = "http://datex2.eu/schema/2/2_0" }
Select-Xml -Xml $Xml -XPath "//d2:cameraTitle//d2:value" -Namespace $Ns | Select-Object -First 50 | ForEach-Object { $_.Node.'#text' }
