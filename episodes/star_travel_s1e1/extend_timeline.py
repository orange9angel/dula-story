"""
Extend timeline for entries that need more time for their dialogue.
Preserves original dialogue text, adjusts timestamps to give each entry enough time.
"""

import re

# 读取原始脚本
with open('script.story', 'r', encoding='utf-8') as f:
    content = f.read()

# 需要额外时间的条目 (index -> extra_seconds_needed)
# 基于测试：018需要4.08s(slot 2.7), 020需要2.74s(slot 2.5), 032需要3.58s(slot 2.5), 044需要6.41s(slot 3.0)
# 给每个加0.5s缓冲
extra_time_needed = {
    18: 4.08 - 2.7 + 0.5,   # ~1.9s extra
    20: 2.74 - 2.5 + 0.3,   # ~0.5s extra  
    32: 3.58 - 2.5 + 0.5,   # ~1.6s extra
    44: 6.41 - 3.0 + 0.5,   # ~3.9s extra
}

# 解析所有条目
lines = content.split('\n')
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
        'extra': extra_time_needed.get(index, 0)
    })
    
    # 跳到下一个条目
    i = start_line_idx + 1
    while i < len(lines) and lines[i].strip() != '':
        i += 1

# 计算累积偏移
offset = 0
for entry in entries:
    entry['new_start'] = entry['start'] + offset
    entry['new_end'] = entry['end'] + offset + entry['extra']
    
    # 如果给了额外时间，后续条目都要偏移
    if entry['extra'] > 0:
        offset += entry['extra']

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

# 打印变更
print("=== 时间轴调整 ===\n")
for entry in entries:
    if entry['extra'] > 0:
        print(f"{entry['index']:03d}: {format_time(entry['start'])} --> {format_time(entry['end'])}  ->  {format_time(entry['new_start'])} --> {format_time(entry['new_end'])} (+{entry['extra']:.1f}s)")

print(f"\n总时长: {entries[-1]['end']:.1f}s -> {entries[-1]['new_end']:.1f}s (+{offset:.1f}s)")
