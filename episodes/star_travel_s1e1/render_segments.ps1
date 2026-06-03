# Render Star Travelers S1E1 in 15s segments
$engine = "D:\opensource\movie\dula-engine"
$episode = "D:\opensource\movie\dula-story\episodes\star_travel_s1e1"
$segments = @(0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180)
$duration = 15

foreach ($start in $segments) {
    $end = $start + $duration
    if ($end -gt 188) { $duration = 188 - $start }
    if ($start -ge 188) { break }
    
    Write-Host "Rendering segment ${start}s-$($start+$duration)s..."
    $proc = Start-Process -FilePath "node" -ArgumentList "$engine\bin\dula-render.js", $episode, "--start", $start, "--duration", $duration -PassThru -Wait
    if ($proc.ExitCode -ne 0) {
        Write-Host "Segment $start failed with exit code $($proc.ExitCode)" -ForegroundColor Red
    } else {
        Write-Host "Segment $start done" -ForegroundColor Green
    }
}

Write-Host "All segments rendered!"
