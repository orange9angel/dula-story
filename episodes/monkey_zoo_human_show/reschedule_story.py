#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Reschedule script.story based on actual audio durations in manifest.json."""
import json
import pathlib
import re


def fmt_time(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int(round((seconds % 1) * 1000))
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def parse_time(ts):
    m = re.match(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})', ts)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3)) + int(m.group(4)) / 1000


def main():
    story_path = pathlib.Path('dula-story/episodes/monkey_zoo_human_show/script.story')
    manifest_path = pathlib.Path('dula-story/episodes/monkey_zoo_human_show/assets/audio/manifest.json')

    story_text = story_path.read_text(encoding='utf-8')
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))

    durations = {e['index']: e['audioDuration'] for e in manifest['entries']}

    # Parse all blocks
    blocks = re.split(r'\n\n+', story_text.strip())
    entries = []
    for block in blocks:
        lines = block.split('\n')
        if len(lines) < 2:
            continue
        idx = int(lines[0].strip())
        time_line = lines[1].strip()
        m = re.match(r'(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})', time_line)
        if not m:
            continue
        start = parse_time(m.group(1))
        end = parse_time(m.group(2))
        content_lines = lines[2:]
        entries.append({
            'index': idx,
            'start': start,
            'end': end,
            'content': '\n'.join(content_lines),
        })

    # Reschedule
    padding = 0.4
    min_duration = 2.0
    current_time = 0.0
    for e in entries:
        audio_dur = durations.get(e['index'], e['end'] - e['start'])
        needed = max(audio_dur + padding, min_duration)
        # Keep original gap to next entry if possible, but ensure enough duration
        e['start'] = current_time
        e['end'] = current_time + needed
        current_time = e['end'] + 0.5  # 0.5s gap between entries

    # Rebuild text
    out_lines = []
    for e in entries:
        out_lines.append(str(e['index']))
        out_lines.append(f"{fmt_time(e['start'])} --> {fmt_time(e['end'])}")
        out_lines.append(e['content'])
        out_lines.append('')

    story_path.write_text('\n'.join(out_lines), encoding='utf-8', newline='')
    print(f"Rescheduled {len(entries)} entries. Total duration: {entries[-1]['end']:.2f}s")


if __name__ == '__main__':
    main()
