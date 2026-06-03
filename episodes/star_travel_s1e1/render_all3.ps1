$engine = "D:\opensource\movie\dula-engine"
$episode = "D:\opensource\movie\dula-story\episodes\star_travel_s1e1"
$segments = @(15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195)

foreach ($start in $segments) {
    $dur = 15
    if (($start + $dur) -gt 206) { $dur = 206 - $start }
    if ($start -ge 206) { break }
    
    # 等待端口释放
    for ($i = 0; $i -lt 60; $i++) {
        $conn = Get-NetTCPConnection -LocalPort 8765 -ErrorAction SilentlyContinue
        if (-not $conn) { break }
        Start-Sleep -Seconds 1
    }
    
    Write-Host "[RENDER] ${start}s-$($start+$dur)s..."
    $proc = Start-Process -FilePath "node" -ArgumentList "$engine\bin\dula-render.js", $episode, "--start", $start, "--duration", $dur -PassThru -Wait -NoNewWindow
    if ($proc.ExitCode -ne 0) {
        Write-Host "[ERROR] Segment $start failed!"
    } else {
        Write-Host "[OK] Segment $start done"
    }
}

Write-Host "[DONE] All segments rendered!"

# Concat
$concatFile = "$episode\output\concat.txt"
$files = Get-ChildItem -Path "$episode\output" -Filter "output_*.mp4" | Sort-Object {
    if ($_.Name -match 'output_(\d+)-') { [int]$matches[1] } else { 999 }
}
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$lines = $files | ForEach-Object { "file '$($_.FullName -replace '\\', '/')'" }
[System.IO.File]::WriteAllLines($concatFile, $lines, $utf8NoBom)

$concatPath = $concatFile -replace '\\', '/'
$finalPath = "$episode\output\final.mp4" -replace '\\', '/'
Start-Process -FilePath "ffmpeg" -ArgumentList "-y", "-f", "concat", "-safe", "0", "-i", $concatPath, "-c", "copy", $finalPath -PassThru -Wait -NoNewWindow
Write-Host "[DONE] Final video: $finalPath"
