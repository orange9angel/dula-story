$engine = "D:\opensource\movie\dula-engine"
$episode = "D:\opensource\movie\dula-story\episodes\star_travel_s1e1"
$segments = @(15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180)

foreach ($start in $segments) {
    $dur = 15
    if (($start + $dur) -gt 188) { $dur = 188 - $start }
    if ($start -ge 188) { break }
    
    Write-Host "[RENDER] Segment ${start}s-$($start+$dur)s..." -ForegroundColor Cyan
    $proc = Start-Process -FilePath "node" -ArgumentList "$engine\bin\dula-render.js", $episode, "--start", $start, "--duration", $dur -PassThru -Wait -NoNewWindow
    if ($proc.ExitCode -ne 0) {
        Write-Host "[ERROR] Segment $start failed!" -ForegroundColor Red
    } else {
        Write-Host "[OK] Segment $start done" -ForegroundColor Green
    }
}

Write-Host "[DONE] All segments rendered!" -ForegroundColor Green

# Concat all segments
$concatFile = "$episode\output\concat.txt"
$files = Get-ChildItem -Path "$episode\output" -Filter "output_*.mp4" | Sort-Object Name
$files | ForEach-Object { "file '$($_.FullName)'" } | Out-File -FilePath $concatFile -Encoding utf8

Write-Host "[CONCAT] Merging $($files.Count) segments..." -ForegroundColor Cyan
$ffmpegCmd = "ffmpeg -y -f concat -safe 0 -i `"$concatFile`" -c copy `"$episode\output\final.mp4`""
Invoke-Expression $ffmpegCmd
Write-Host "[DONE] Final video: $episode\output\final.mp4" -ForegroundColor Green
