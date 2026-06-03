#!/usr/bin/env python3
"""
Fix script timing based on actual TTS audio durations.
Reads script.story and mp3 files, then rewrites script with proper timing.
Ensures no dialogue overlap (gap between lines).
"""

import os
import re
import subprocess
import sys

EPISODE = sys.argv[1] if len(sys.argv) > 1 else "."
if not os.path.isabs(EPISODE):
    EPISODE = os.path.join(os.getcwd(), EPISODE)

STORY_PATH = os.path.join(EPISODE, "script.story")
AUDIO_DIR = os.path.join(EPISODE, "assets", "audio")
OUTPUT_PATH = os.path.join(EPISODE, "script.story")

def get_mp3_duration(mp3_path):
    result = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
         '-of', 'default=noprint_wrappers=1:nokey=1', mp3_path],
        capture_output=True, text=True
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 3.0  # fallback

def time_to_str(seconds):
    """Convert seconds to SRT time format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def parse_story(text):
    """Parse script.story into entries."""
    entries = []
    lines = text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.isdigit():
            entry = {'index': int(line), 'start': None, 'end': None, 
                     'character': None, 'dialogue': None, 'body_lines': []}
            i += 1
            # Parse time line
            if i < len(lines) and '-->' in lines[i]:
                time_line = lines[i].strip()
                m = re.match(r'(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})', time_line)
                if m:
                    entry['start'] = int(m.group(1))*3600 + int(m.group(2))*60 + int(m.group(3)) + int(m.group(4))/1000
                    entry['end'] = int(m.group(5))*3600 + int(m.group(6))*60 + int(m.group(7)) + int(m.group(8))/1000
                i += 1
            # Parse body lines until next entry or empty line followed by digit
            while i < len(lines):
                body_line = lines[i]
                # Check if next line starts a new entry
                if i + 1 < len(lines) and lines[i+1].strip().isdigit() and body_line.strip() == '':
                    break
                if body_line.strip().isdigit() and i > 0 and lines[i-1].strip() == '':
                    break
                # Check for dialogue
                dm = re.match(r'\[(\w+)\]\s*(.+)', body_line.strip())
                if dm:
                    entry['character'] = dm.group(1)
                    entry['dialogue'] = dm.group(2)
                entry['body_lines'].append(body_line)
                i += 1
            entries.append(entry)
        else:
            i += 1
    return entries

def main():
    with open(STORY_PATH, 'r', encoding='utf-8') as f:
        original_text = f.read()
    
    entries = parse_story(original_text)
    
    # Get actual TTS durations
    for entry in entries:
        if entry['character'] and entry['dialogue']:
            mp3_path = os.path.join(AUDIO_DIR, f"{entry['index']:03d}_{entry['character']}.mp3")
            if os.path.exists(mp3_path):
                entry['tts_duration'] = get_mp3_duration(mp3_path)
            else:
                entry['tts_duration'] = entry['end'] - entry['start'] if entry['end'] else 3.0
        else:
            entry['tts_duration'] = entry['end'] - entry['start'] if entry['end'] else 3.0
    
    # Recalculate timing: each dialogue gets its actual duration + 0.5s gap
    # Non-dialogue entries keep their relative timing but shift with dialogues
    GAP = 0.5  # gap between dialogue lines
    
    # First pass: calculate new times for dialogue entries
    current_time = 0.0
    new_entries = []
    
    for entry in entries:
        if entry['character'] and entry['dialogue']:
            # Dialogue entry: set start to current_time
            entry['new_start'] = current_time
            entry['new_end'] = current_time + entry['tts_duration']
            current_time = entry['new_end'] + GAP
        else:
            # Non-dialogue entry: keep original duration, shift start
            orig_dur = (entry['end'] - entry['start']) if entry['end'] and entry['start'] else 3.0
            entry['new_start'] = current_time
            entry['new_end'] = current_time + orig_dur
            current_time = entry['new_end']
        new_entries.append(entry)
    
    # Build new script
    output_lines = []
    for entry in new_entries:
        output_lines.append(str(entry['index']))
        if entry['new_start'] is not None and entry['new_end'] is not None:
            output_lines.append(f"{time_to_str(entry['new_start'])} --> {time_to_str(entry['new_end'])}")
        for bl in entry['body_lines']:
            output_lines.append(bl)
        output_lines.append('')  # blank line between entries
    
    # Remove trailing blank lines
    while output_lines and output_lines[-1] == '':
        output_lines.pop()
    
    # Write back
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines) + '\n')
    
    total_duration = new_entries[-1]['new_end'] if new_entries else 0
    print(f"Timing fixed! Total duration: {total_duration:.1f}s")
    print(f"Written to: {OUTPUT_PATH}")
    
    # Print overlap report
    print("\n--- Timing Report ---")
    for entry in new_entries:
        if entry['character'] and entry['dialogue']:
            orig_dur = entry['end'] - entry['start'] if entry['end'] and entry['start'] else 0
            new_dur = entry['new_end'] - entry['new_start']
            print(f"[{entry['index']:02d}] {entry['character']:8} orig:{orig_dur:4.1f}s -> new:{new_dur:4.1f}s (TTS:{entry['tts_duration']:.1f}s) {entry['dialogue'][:30]}")

if __name__ == '__main__':
    main()
