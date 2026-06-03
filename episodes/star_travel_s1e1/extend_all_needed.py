"""
自动检测所有TTS时长超过时间槽的条目，并延长script.story时间轴。
"""
import json, os, re, subprocess

# 读取当前manifest
with open('assets/audio/manifest.json', 'r', encoding='utf-8') as f:
    manifest = json.load(f)

# 检测哪些条目TTS时长超过时间槽
overruns = []
for entry in manifest['entries']:
    filepath = os.path.join('assets/audio', entry['file'])
    if os.path.exists(filepath):
        result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filepath], capture_output=True, text=True)
        actual = float(result.stdout.strip())
        slot = entry['endTime'] - entry['startTime']
        if actual > slot + 0.3:  # 超过0.3s算需要调整
            overruns.append({
                'index': entry['index'],
                'character': entry['character'],
                'dialogue': entry['dialogue'],
                'actual': actual,
                'slot': slot,
                'needed': actual - slot + 0.5  # 加0.5s缓冲
            })

if not overruns:
    print("所有条目时间槽都足够！")
    exit(0)

print("=== 需要延长时间轴的条目 ===\n")
for o in overruns:
    print(f"{o['index']:03d} [{o['character']}]: {o['dialogue'][:40]}...")
    print(f"  实际: {o['actual']:.2f}s > 槽: {o['slot']:.1f}s, 需要 +{o['needed']:.1f}s\n")

# 读取script.story
with open('script.story', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

# 解析所有条目
entries = []
i = 0
while i < len(lines):
    line = lines[i].strip()
    if line == '' or not line.isdigit():
        i += 1
        continue
    
    index = int(line)
    start_line_idx = i + 1
    
    if start_line_idx >= len(lines):
        break
    
    time_line = lines[start_line_idx].strip()
    m = re.match(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})', time_line)
    if not m:
        i += 1
        continue
    
    start = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3)) + int(m.group(4)) / 1000
    end = int(m.group(5)) * 3600 + int(m.group(6)) * 60 + int(m.group(7)) + int(m.group(8)) / 1000
    
    entries.append({
        'index': index,
        'start': start,
        'end': end,
        'time_line_idx': start_line_idx,
        'extra_needed': 0
    })
    
    i = start_line_idx + 1
    while i < len(lines) and lines[i].strip() != '':
        i += 1

# 标记需要额外时间的条目
overrun_by_index = {o['index']: o['needed'] for o in overruns}
for entry in entries:
    if entry['index'] in overrun_by_index:
        entry['extra_needed'] = overrun_by_index[entry['index']]

# 计算累积偏移
offset = 0
for entry in entries:
    entry['new_start'] = entry['start'] + offset
    entry['new_end'] = entry['end'] + offset + entry['extra_needed']
    if entry['extra_needed'] > 0:
        offset += entry['extra_needed']

# 生成新的时间行
def format_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

# 替换时间行
new_lines = lines.copy()
for entry in entries:
    idx = entry['time_line_idx']
    new_time_line = f"{format_time(entry['new_start'])} --> {format_time(entry['new_end'])}"
    new_lines[idx] = new_time_line

# 写回文件
with open('script.story', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print("\n=== 时间轴调整完成 ===")
print(f"总时长: {entries[-1]['end']:.1f}s -> {entries[-1]['new_end']:.1f}s (+{offset:.1f}s)")
