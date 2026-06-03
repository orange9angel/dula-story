import json
with open('assets/audio/manifest.json', 'r', encoding='utf-8') as f:
    manifest = json.load(f)

updates = {
    18: ('没有敌意。', 1.51),
    20: ('什么意思？', 1.44),
    32: ('鳞甲也来了？', 1.97),
    44: ('互相帮助。', 1.92),
}

for entry in manifest['entries']:
    if entry['index'] in updates:
        text, dur = updates[entry['index']]
        entry['dialogue'] = text
        entry['audioDuration'] = dur
        idx = entry['index']
        print(f'Updated {idx:03d}: {text} ({dur:.2f}s)')

with open('assets/audio/manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
print('Manifest updated')
