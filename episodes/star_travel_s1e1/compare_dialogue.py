import json

# 读取原始脚本
with open('script.story', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 读取manifest
with open('assets/audio/manifest.json', 'r', encoding='utf-8') as f:
    manifest = json.load(f)

manifest_by_index = {e['index']: e for e in manifest['entries']}

print("=== 被过度缩短的台词对比 ===\n")

for i, line in enumerate(lines):
    line = line.strip()
    if line in ['18', '20', '23', '24', '32', '44']:
        num = int(line)
        time_line = lines[i+1].strip() if i+1 < len(lines) else ''
        original = lines[i+2].strip() if i+2 < len(lines) else ''
        
        # 清理原始台词（去掉角色标签等）
        import re
        dialogue = re.sub(r'^\[\w+\]\s*', '', original)
        dialogue = re.sub(r'\{[^}]+\}', '', dialogue).strip()
        
        entry = manifest_by_index.get(num)
        if entry:
            slot = entry['endTime'] - entry['startTime']
            print(f"{num:03d} [{entry['character']}] {time_line}")
            print(f"  原始台词: {dialogue}")
            print(f"  TTS实际:  {entry['dialogue']}")
            print(f"  时长: {entry['audioDuration']:.2f}s / 分配: {slot:.1f}s")
            print()
