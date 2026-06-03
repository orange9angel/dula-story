import re

with open('script.story', 'r', encoding='utf-8') as f:
    lines = f.readlines()

entries = []
i = 0
while i < len(lines):
    line = lines[i].strip()
    if line == '' or not line.isdigit():
        i += 1
        continue
    
    index = int(line)
    i += 1
    if i >= len(lines):
        break
    
    time_line = lines[i].strip()
    i += 1
    
    m = re.match(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})', time_line)
    if not m:
        continue
    
    start = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3)) + int(m.group(4)) / 1000
    end = int(m.group(5)) * 3600 + int(m.group(6)) * 60 + int(m.group(7)) + int(m.group(8)) / 1000
    
    # 读取内容行
    content_lines = []
    while i < len(lines) and lines[i].strip() != '':
        content_lines.append(lines[i].strip())
        i += 1
    
    content = ' '.join(content_lines)
    char_match = re.search(r'\[(\w+)\]', content)
    character = char_match.group(1) if char_match else None
    
    entries.append({
        'index': index,
        'start': start,
        'end': end,
        'character': character,
        'content': content[:80] + '...' if len(content) > 80 else content
    })

# 计算每个条目之间的gap
print("=== 条目之间的时间间隔 ===\n")
for i in range(len(entries)):
    e = entries[i]
    duration = e['end'] - e['start']
    
    if i > 0:
        gap = e['start'] - entries[i-1]['end']
    else:
        gap = None
    
    # 标记需要更多时间的条目
    needs_more = ''
    if e['index'] in [18, 20, 32, 44]:
        needs_more = ' <-- NEEDS MORE TIME'
    
    gap_str = f'{gap:.1f}s' if gap is not None else 'N/A'
    print(f"{e['index']:03d} [{e['character'] or '---'}] {e['start']:.1f}s -> {e['end']:.1f}s (dur={duration:.1f}s, gap_after_prev={gap_str}){needs_more}")

# 计算总空白时间
total_gap = sum(entries[i]['start'] - entries[i-1]['end'] for i in range(1, len(entries)) if entries[i]['start'] > entries[i-1]['end'])
print(f"\n总间隔时间: {total_gap:.1f}s")
print(f"当前总时长: {entries[-1]['end']:.1f}s")
