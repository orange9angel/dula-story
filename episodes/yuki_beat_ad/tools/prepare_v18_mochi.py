"""V18: append Mochi's backup-dancer lane to script_v18.story.

prepare_v16 logic against the V18 data: Yuki entries are kept verbatim,
Mochi entries are re-timed to the V18 beat grid / section roles and appended
on their own lane. Re-running strips any existing Mochi blocks first, so the
tool is idempotent.
"""
from pathlib import Path
import json
import re

import numpy as np

ROOT = Path(__file__).resolve().parents[1]

MOCHI_X = 0.58      # stage right; the whole loaf stays inside the wide-shot frustum
MOCHI_Z = -0.50     # half a meter upstage of Yuki: clear of her arms and the candy props
MOCHI_OFF_X = 2.6   # parked offscreen right (wide-shot half-width at z=0 is ~0.85)
PHRASE_BEATS = 4    # chorus phrase length


def srt(t):
    ms = round(t * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


def parse_story(text):
    entries = []
    for block in re.split(r'\n\s*\n', text.strip()):
        lines = [l for l in block.split('\n') if l.strip()]
        m = re.match(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})', lines[1])
        entries.append({
            'index': int(lines[0]),
            'start': int(m[1]) * 3600 + int(m[2]) * 60 + int(m[3]) + int(m[4]) / 1000,
            'end': int(m[5]) * 3600 + int(m[6]) * 60 + int(m[7]) + int(m[8]) / 1000,
            'mochi': 'character=Mochi' in block,
            'block': block,
        })
    return entries


def main():
    music = json.loads((ROOT / 'config/music_analysis_v18.json').read_text(encoding='utf-8'))
    story_text = (ROOT / 'script_v18.story').read_text(encoding='utf-8')
    parsed = parse_story(story_text)
    yuki_blocks = [e['block'] for e in parsed if not e['mochi']]
    yuki = [e for e in parsed if not e['mochi']]
    beats = sorted(music['beat_grid']['beats'])
    downbeats = sorted(music['beat_grid']['downbeats'])
    sections = sorted(music['sections'], key=lambda s: s['start'])

    yuki_blocks = [e['block'] for e in parsed if not e['mochi']]
    yuki = [e for e in parsed if not e['mochi']]
    finale_start = yuki[-1]['start']  # the pose=finale entry
    video_end = yuki[-1]['end']

    # The measured grid dies with the last drum hit; the quiet finale tail
    # still needs snap targets, so extend it by the median beat period.
    period = float(np.median(np.diff(beats)))
    while beats[-1] + period <= video_end + .1:
        beats.append(round(beats[-1] + period, 3))
    while downbeats[-1] + 4 * period <= video_end + .1:
        downbeats.append(round(downbeats[-1] + 4 * period, 3))

    def snap(t):
        return min(beats, key=lambda b: abs(b - t))

    def beat_idx(t):
        return min(range(len(beats)), key=lambda i: abs(beats[i] - t))

    chorus = next(s for s in sections if s.get('label') == 'chorus')
    bridge = next(s for s in sections if s.get('label') == 'bridge')
    final = next(s for s in sections if s.get('label') == 'verse' and s['start'] > bridge['start'])
    # Entrance: first chorus downbeat, landing on the beat two beats later.
    enter_t = next(d for d in downbeats if d >= chorus['start'] - 1e-3)
    enter_end = beats[beat_idx(enter_t) + 2]

    # The bridge spans consecutive labeled sections; snap its outer bounds.
    bridge_end = snap(max(s['end'] for s in sections if s.get('label') == 'bridge'))
    bridge_t = snap(bridge['start'])
    final_t, final_end = snap(final['start']), snap(finale_start)

    # Chorus phrases: alternate bounce/sway every PHRASE_BEATS beats.
    phrases = []
    cursor, i = enter_end, 0
    while cursor < bridge_t - .05:
        ni = beat_idx(cursor) + PHRASE_BEATS
        nxt = beats[ni] if ni < len(beats) and beats[ni] <= bridge_t + .05 else bridge_t
        phrases.append((cursor, nxt, 'cat_bounce' if i % 2 == 0 else 'cat_sway', 'chorus'))
        cursor, i = nxt, i + 1

    # Final stretch: bounce to the next downbeat, paw taps, one pre-finale yawn.
    paw_t = snap(next(d for d in downbeats if d > final_t + 1e-3))
    yawn_t = snap(final_end - 1.0)

    plan = [
        (0.0, 0.1, 'cat_off', 'intro'),
        (enter_t, enter_end, 'cat_enter', 'chorus'),
        *phrases,
        (bridge_t, bridge_end, 'cat_loaf_spin', 'bridge'),
        (final_t, paw_t, 'cat_bounce', 'verse'),
        (paw_t, yawn_t, 'cat_paw', 'verse'),
        (yawn_t, final_end, 'cat_yawn', 'verse'),
        (final_end, video_end, 'cat_freeze', 'outro'),
    ]
    assert all(a[1] - a[0] > .05 for a in plan), f'Mochi 条目时长非法: {plan}'

    blocks = []
    for k, (start, end, move, role) in enumerate(plan):
        idx = yuki[-1]['index'] + 1 + k
        dur = end - start
        hit = snap((start + end) / 2)
        fields = ('{Event:Animate|character=Mochi|action=AdPose|pose=hello'
                  f'|duration={dur:.3f}|expression=smile|emotion=calm|focus=audience'
                  f'|motif=none|hit={hit:.3f}|land={start:.3f}|edit=hold|outfit=original'
                  f'|accessory=none|gesture=ta_da|move={move}|outgoing=none|scene=diva'
                  f'|snap=0|card=none|swipe=none|ghost=0|shot=wide|line=0|role={role}}}')
        lines = [str(idx), f'{srt(start)} --> {srt(end)}']
        if move == 'cat_off':
            lines.append(f'{{Position:Mochi|x={MOCHI_OFF_X}|y=0|z={MOCHI_Z}|face=forward}}')
        lines.append(fields)
        blocks.append('\n'.join(lines))
        err = (start - snap(start)) * 1000
        print(f'  #{idx:<2} {start:7.3f}-{end:7.3f} {move:<14} role={role:<7} snapErr={err:+.0f}ms')

    out = '\n\n'.join(yuki_blocks) + '\n\n' + '\n\n'.join(blocks) + '\n'
    (ROOT / 'script_v18.story').write_text(out, encoding='utf-8')
    print(f'V18: {len(yuki)} Yuki entries kept verbatim, {len(blocks)} Mochi entries appended '
          f'(enter @{enter_t:.3f} downbeat, freeze @{final_end:.3f})')


if __name__ == '__main__':
    main()
