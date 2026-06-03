import json, os, subprocess

OUTPUT_DIR = 'assets/audio'
manifest_path = os.path.join(OUTPUT_DIR, 'manifest.json')
with open(manifest_path, 'r', encoding='utf-8') as f:
    manifest = json.load(f)

for entry in manifest['entries']:
    filepath = os.path.join(OUTPUT_DIR, entry['file'])
    if os.path.exists(filepath):
        result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filepath], capture_output=True, text=True)
        actual = float(result.stdout.strip())
        stored = entry.get('audioDuration', 0)
        slot = entry['endTime'] - entry['startTime']
        status = 'OK' if actual <= slot + 0.5 else 'OVERRUN'
        idx = entry['index']
        char = entry['character']
        print(f'{status} {idx:03d}_{char}.mp3: actual={actual:.2f}s stored={stored:.2f}s slot={slot:.1f}s')
