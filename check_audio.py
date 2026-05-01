import json, os, subprocess

with open('episodes/starlight_courier/assets/audio/manifest.json') as f:
    m = json.load(f)

print("=== TimeTunnelScene dialogue check ===")
prev_end = 0
for e in m['entries']:
    s = e['startTime']
    if s < 100:
        continue
    
    # Get actual audio duration
    filepath = f"episodes/starlight_courier/assets/audio/{e['file']}"
    dur = 0
    if os.path.exists(filepath):
        result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', 
                                '-of', 'default=noprint_wrappers=1:nokey=1', filepath],
                               capture_output=True, text=True)
        try:
            dur = float(result.stdout.strip())
        except:
            pass
    
    audio_end = s + dur
    gap = s - prev_end
    status = "OK" if gap >= 0.3 else ("TIGHT" if gap >= 0 else "OVERLAP!")
    print(f"Entry {e['index']:02d}: {e['character']} start={s:.1f}s audioEnd={audio_end:.1f}s (gap={gap:.1f}s) [{status}]")
    prev_end = audio_end
