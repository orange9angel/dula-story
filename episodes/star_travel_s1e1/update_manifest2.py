import json

with open('assets/audio/manifest.json', 'r', encoding='utf-8') as f:
    manifest = json.load(f)

# 恢复原始台词和实际时长
updates = {
    18: ('我们没有敌意。只是在探索未知星系。', 4.08),
    20: ('什么意思？有什么危险的？', 2.74),
    32: ('哈！鳞甲也来凑热闹？', 3.58),
    44: ('也许...我们可以互相帮助。你熟悉这里，我们有飞船和技术。', 6.41),
}

for entry in manifest['entries']:
    if entry['index'] in updates:
        text, dur = updates[entry['index']]
        entry['dialogue'] = text
        entry['audioDuration'] = dur
        idx = entry['index']
        print(f'Updated {idx:03d}: {text[:30]}... ({dur:.2f}s)')

with open('assets/audio/manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)
print('Manifest updated')
