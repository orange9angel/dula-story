import json, re

with open('script.story', 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open('assets/audio/manifest.json', 'r', encoding='utf-8') as f:
    manifest = json.load(f)

manifest_by_index = {e['index']: e for e in manifest['entries']}

print('=== 所有TTS文本与原始台词对比 ===\n')
for i, line in enumerate(lines):
    line = line.strip()
    if line.isdigit():
        num = int(line)
        if num not in manifest_by_index:
            continue
        entry = manifest_by_index[num]
        # 获取原始台词
        j = i + 2
        original_lines = []
        while j < len(lines) and lines[j].strip() != '':
            original_lines.append(lines[j].strip())
            j += 1
        original = '\n'.join(original_lines)
        
        # 清理原始台词
        dialogue = re.sub(r'^\[\w+\]\s*', '', original)
        dialogue = re.sub(r'\{[^}]+\}\s*', '', dialogue).strip()
        
        char = entry['character']
        if dialogue != entry['dialogue']:
            print(f'MISMATCH {num:03d} [{char}]')
            print(f'  原始: {dialogue}')
            print(f'  TTS:  {entry["dialogue"]}')
            print()
        elif len(dialogue) > 10 and len(entry['dialogue']) < len(dialogue) * 0.5:
            print(f'TRUNCATED? {num:03d} [{char}]')
            print(f'  原始: {dialogue}')
            print(f'  TTS:  {entry["dialogue"]}')
            print()
