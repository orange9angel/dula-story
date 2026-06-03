import json
with open('assets/audio/manifest.json', 'r', encoding='utf-8') as f:
    manifest = json.load(f)
for entry in manifest['entries']:
    if entry['index'] == 23:
        entry['dialogue'] = '不。我在警告你们。'
        entry['audioDuration'] = 2.74
        print('Updated 023:', entry['dialogue'], f"({entry['audioDuration']:.2f}s)")
    elif entry['index'] == 24:
        entry['dialogue'] = '他的能量读数...在飙升！'
        entry['audioDuration'] = 2.26
        print('Updated 024:', entry['dialogue'], f"({entry['audioDuration']:.2f}s)")
with open('assets/audio/manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
