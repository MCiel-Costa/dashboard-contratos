$json = (Get-Content -Path 'C:\Users\mclro\.gemini\antigravity\brain\25635d1b-b371-41d2-b023-9d5b833523ce\.system_generated\steps\87\content.md')[4]
$output = "const staticData = " + $json + ";"
Set-Content -Path 'c:\Users\mclro\Desktop\BI\dashboard\data.js' -Value $output -Encoding UTF8
