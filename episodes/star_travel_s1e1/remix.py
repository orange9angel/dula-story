import json, os, subprocess, sys
sys.path.insert(0, 'tools')
from generate_audio import mix_audio, parse_story, discover_manual_sfx, schedule_sfx_from_events, load_tennis_hit_times, generate_tennis_hit_sfx, check_bgm_files, mix_bgm_track

EPISODE = '.'
OUTPUT_DIR = os.path.join(EPISODE, 'assets', 'audio')
MANIFEST_PATH = os.path.join(OUTPUT_DIR, 'manifest.json')
SFX_DIR = os.path.join(OUTPUT_DIR, 'sfx')
STORY_PATH = os.path.join(EPISODE, 'script.story')

with open(STORY_PATH, 'r', encoding='utf-8') as f:
    story_text = f.read()
entries, music_cues, story_events = parse_story(story_text)

with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
    manifest = json.load(f)

manual_sfx = discover_manual_sfx()
scheduled_sfx = schedule_sfx_from_events(story_events, manual_sfx)
if scheduled_sfx:
    print(f'[Auto-SFX] Scheduled {len(scheduled_sfx)} event(s)')

bgm_path = None
all_bgm_cues = music_cues
if all_bgm_cues:
    max_time = max(e['endTime'] for e in entries) if entries else 70.0
    cues = []
    for cue in all_bgm_cues:
        opts = cue['options']
        cues.append({
            'name': opts.get('name', 'theme'),
            'startTime': cue['startTime'],
            'endTime': opts.get('endTime', max_time),
            'fadeIn': opts.get('fadeIn', 1.0),
            'fadeOut': opts.get('fadeOut', 1.0),
            'baseVolume': opts.get('baseVolume', 0.5),
        })
    if check_bgm_files(cues):
        bgm_path = mix_bgm_track(cues, entries, max_time + 1.0)

all_sfx_events = list(scheduled_sfx) if scheduled_sfx else []
tennis_hit_times = load_tennis_hit_times()
if tennis_hit_times:
    tennis_hit_path = os.path.join(SFX_DIR, 'tennis_hit.wav')
    generate_tennis_hit_sfx(tennis_hit_path)
    for t in tennis_hit_times:
        all_sfx_events.append({'file': tennis_hit_path, 'startTime': t})

mix_audio(manifest, bgm_path, all_sfx_events if all_sfx_events else None)
print('Audio mixing complete!')
