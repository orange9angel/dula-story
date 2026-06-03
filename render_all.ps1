# Render all segments for star_travel_s1e1 with audio
$segments = @(
    @{start=0; duration=25; name="0-25"},
    @{start=25; duration=20; name="25-45"},
    @{start=45; duration=15; name="45-60"},
    @{start=60; duration=15; name="60-75"},
    @{start=75; duration=15; name="75-90"},
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
    Write-Host "`n=== Rendering segment $idx/$total : $($seg.name)s ===" -ForegroundColor Green
    $cmd = "node ../dula-engine/generate_video.js ./episodes/star_travel_s1e1 --start $($seg.start) --duration $($seg.duration)"
    Write-Host $cmd
    
    Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED segment $($seg.name)" -ForegroundColor Red
        exit 1
    }
    Write-Host "DONE segment $($seg.name)" -ForegroundColor Green
    $idx++
}

Write-Host "`n=== ALL SEGMENTS RENDERED ===" -ForegroundColor Cyan
