import json, os, subprocess

with open('assets/audio/manifest.json', 'r', encoding='utf-8') as f:
    manifest = json.load(f)

print("=== TTS时长超过时间槽的台词（需要调整时间轴）===\n")

for entry in manifest['entries']:
    filepath = os.path.join('assets/audio', entry['file'])
    if os.path.exists(filepath):
        result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filepath], capture_output=True, text=True)
        actual = float(result.stdout.strip())
        slot = entry['endTime'] - entry['startTime']
        
        if actual > slot + 0.3:  # 超过0.3s算重叠
            print(f"{entry['index']:03d} [{entry['character']}]")
            print(f"  TTS: {entry['dialogue']}")
            print(f"  实际: {actual:.2f}s > 分配: {slot:.1f}s (超出 {actual-slot:.2f}s)")
            print(f"  建议: 将结束时间从 {entry['endTime']:.1f}s 延长到 {entry['endTime'] + (actual-slot) + 0.5:.1f}s")
            print()
