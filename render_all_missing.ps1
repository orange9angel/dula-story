$segments = @(
    @{start=45; duration=15; name="45-60"},
    @{start=60; duration=15; name="60-75"},
    @{start=90; duration=15; name="90-105"},
    @{start=105; duration=15; name="105-120"},
    @{start=120; duration=15; name="120-135"},
    @{start=135; duration=15; name="135-150"},
    @{start=150; duration=15; name="150-165"},
    @{start=165; duration=15; name="165-180"},
    @{start=180; duration=15; name="180-195"},
    @{start=195; duration=15; name="195-210"},
    @{start=210; duration=15; name="210-225"},
    @{start=225; duration=15; name="225-240"},
    @{start=240; duration=15; name="240-255"},
    @{start=255; duration=15; name="255-270"},
    @{start=270; duration=15; name="270-285"}
)

$total = $segments.Count
$idx = 1
foreach ($seg in $segments) {
    $outfile = "episodes/star_travel_s1e1/output/output_$($seg.name).mp4"
    if (Test-Path $outfile) {
        $dur = [double](ffprobe -v error -show_entries format=duration -of csv=p=0 $outfile 2>$null)
        if ($dur -ge 14) {
            Write-Host "SKIP $($seg.name) (already ${dur}s)" -ForegroundColor Yellow
            $idx++
            continue
        }
    }
    
    # Clean frames before each render
    if (Test-Path "episodes/star_travel_s1e1/storyboard/frames") {
        Remove-Item -Recurse -Force "episodes/star_travel_s1e1/storyboard/frames"
    }
    
    Write-Host "`n=== Rendering segment $idx/$total : $($seg.name)s ===" -ForegroundColor Green
    $cmd = "node ../dula-engine/generate_video.js ./episodes/star_travel_s1e1 --start $($seg.start) --duration $($seg.duration)"
    Write-Host $cmd
    
    Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED segment $($seg.name), continuing..." -ForegroundColor Red
    } else {
        Write-Host "DONE segment $($seg.name)" -ForegroundColor Green
    }
    $idx++
}

Write-Host "`n=== ALL SEGMENTS COMPLETE ===" -ForegroundColor Cyan
