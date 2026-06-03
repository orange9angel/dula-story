import json
with open('assets/audio/manifest.json', 'r', encoding='utf-8') as f:
    manifest = json.load(f)
for entry in manifest['entries']:
    if entry['index'] == 1:
        entry['dialogue'] = '信号确认。坐标X-7749，未知星系边缘。'
        entry['audioDuration'] = 5.81
        print('Updated 001:', entry['dialogue'], f"({entry['audioDuration']:.2f}s)")
with open('assets/audio/manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
