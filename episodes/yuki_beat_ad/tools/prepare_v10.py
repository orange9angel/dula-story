"""V10: vocal-stem character alignment, pinyin visemes, complete dance phrases.

Story owns performance/camera timing; JSON stores audio observations. Known-text
DTW aligns characters. Pinyin consonant/vowel timing is an animation approximation.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d, maximum_filter1d
from scipy.signal import butter, sosfiltfilt, find_peaks
from pypinyin import lazy_pinyin, Style
from prepare_v2 import stamp
from separate_v10 import main as separate
from align_v10 import main as align

ROOT = Path(__file__).resolve().parents[1]


def vocal_data():
    aligned = json.loads((ROOT / 'config/lyrics_forced_alignment_v10.json').read_text(encoding='utf-8'))
    y, sr = sf.read(ROOT / 'assets/audio/stems_v10/vocals.wav', always_2d=True)
    mono = y.mean(axis=1)
    hop = round(sr * .01)
    n = len(mono) // hop
    rms = np.sqrt(np.mean(mono[:n*hop].reshape(n, hop) ** 2, axis=1))
    env = uniform_filter1d(rms, 3)
    times = (np.arange(n) + .5) * hop / sr
    ref = np.quantile(env, .90)
    floor = max(ref * .085, 1e-5)
    active = maximum_filter1d((env > floor).astype(float), 5) > 0
    chars = []
    for i, item in enumerate(aligned['chars']):
        c = dict(item)
        c['raw_start'], c['raw_end'] = c['start'], c['end']
        # DTW can assign a previous held vowel + a long rest to the next word.
        # Split on a sustained quiet island; retain the preceding vowel tail.
        local_ids = np.flatnonzero((times >= c['start']) & (times < c['end']))
        quiet = env[local_ids] < max(floor, env[local_ids].max() * .14)
        padded = np.r_[False, quiet, False].astype(int)
        begins, ends = np.flatnonzero(np.diff(padded) == 1), np.flatnonzero(np.diff(padded) == -1)
        gaps = [(a, b) for a, b in zip(begins, ends) if b-a >= 15 and b < len(local_ids)-8]
        if gaps:
            a, b = gaps[-1]
            if chars and times[local_ids[a]] > c['start']:
                chars[-1]['end'] = round(float(times[local_ids[a]]), 3)
            c['start'] = round(float(times[local_ids[b]])-.01, 3)
        ids = np.flatnonzero((times >= c['start']) & (times < c['end']) & active)
        if not len(ids):
            raise ValueError(f'No audible vocal in character {i}: {c}')
        c['start'] = round(max(c['start'], times[ids[0]] - .015), 3)
        c['end'] = round(min(c['end'], times[ids[-1]] + .015), 3)
        if c['end'] - c['start'] < .035:
            raise ValueError(f'Unusable character span {i}: {c}')
        chars.append(c)
    text = ''.join(c['ch'] for c in chars)
    for c, initial, final, syllable in zip(chars,
            lazy_pinyin(text, style=Style.INITIALS, strict=False),
            lazy_pinyin(text, style=Style.FINALS, strict=False), lazy_pinyin(text)):
        c.update(initial=initial, final=final, pinyin=syllable)
    original = [s.strip() for s in (ROOT / 'config/diva_lyrics.txt').read_text(encoding='utf-8').splitlines() if s.strip()]
    lines, index = [], 0
    for li, line in enumerate(original):
        count = len(line.replace(' ', ''))
        group = chars[index:index+count]
        lines.append({'text': line, 'start': group[0]['start'], 'end': group[-1]['end'],
                      'char0': index, 'n_chars': count, 'line': li})
        for c in group:
            c['line'] = li
        index += count
    envelope = [{'t': round(float(t), 3), 'level': round(float(np.clip((e-floor)/(ref-floor), 0, 1)), 3)}
                for t, e in zip(times, env)]
    return chars, lines, envelope, {'floor': float(floor), 'reference_rms': float(ref),
        'method': '30ms smoothed separated-vocal RMS; trim inaudible edges, preserve DTW internal timing',
        'raw_alignment': 'config/lyrics_forced_alignment_v10.json',
        'limits': 'DTW characters and pinyin visemes, not measured phonemes; singing alignment needs listening review'}


def drum_grid(old):
    y, sr = sf.read(ROOT / 'assets/audio/stems_v10/drums.wav', always_2d=True)
    low = sosfiltfilt(butter(3, 160, fs=sr, output='sos'), y.mean(axis=1))
    hop = round(sr * .005)
    n = len(low) // hop
    env = np.sqrt(np.mean(low[:n*hop].reshape(n, hop)**2, axis=1))
    peaks, _ = find_peaks(env, distance=round(.25*sr/hop), prominence=np.quantile(env, .9)*.25)
    attacks = []
    for peak in peaks:
        left = max(0, peak - round(.06*sr/hop))
        crossing = np.flatnonzero(env[left:peak+1] >= .32*env[peak])
        attacks.append((left + int(crossing[0])) * hop / sr)
    beats = []
    for b in old['beat_grid']['beats']:
        nearest = min(attacks, key=lambda p: abs(p-b)) if attacks else b
        beats.append(round(nearest if abs(nearest-b) < .12 else b, 3))
    assert all(a < b for a, b in zip(beats, beats[1:]))
    db = [min(beats, key=lambda b: abs(b-d)) for d in old['beat_grid']['downbeats']]
    return {**old['beat_grid'], 'beats': beats, 'downbeats': db,
            'method': 'V9 tempo grid refined to isolated-drum attack within 120ms',
            'kick_attacks': [round(a, 3) for a in attacks]}


def choreography(chars, lines, grid, duration):
    def word(li, text):
        line = lines[li]
        pos = line['text'].replace(' ', '').index(text)
        return chars[line['char0']+pos]['start']
    specs = [
        (0, 'invite', 0, 'diva', 'original', 'medium', '跟上这一拍', 0),
        (lines[1]['start'], 'step_touch', 1, 'diva', 'sailor', 'wide', '迈开小步', 0),
        (word(1, '快乐'), 'open_arms', 1, 'diva', 'sailor', 'wide', '快乐放大', 0),
        (word(2, '转'), 'twirl', 2, 'star', 'sailor', 'wide', '转个圈圈', 0),
        (word(2, '世界'), 'star_reach', 2, 'star', 'sailor', 'medium', '世界发光', 0),
        (word(3, '小雪'), 'present', 3, 'diva', 'princess', 'medium', '小雪登场', 0),
        (word(3, '心跳'), 'heart_hit', 3, 'diva', 'princess', 'medium', '心跳打拍', 0),
        (word(4, '左'), 'step_left', 4, 'neon', 'sunny', 'wide', '左一步', 0),
        (word(4, '右'), 'step_right', 4, 'neon', 'sunny', 'wide', '右一步', -.22),
        (word(4, '节奏'), 'groove', 4, 'neon', 'sunny', 'wide', '节奏自己掌握', .22),
        (word(5, '跳'), 'double_hop', 5, 'neon', 'sunny', 'wide', '跳一跳', 0),
        (word(5, '转'), 'twirl', 5, 'neon', 'sunny', 'wide', '转一转', 0),
        (word(5, '每一拍'), 'disco_hits', 5, 'neon', 'sunny', 'wide', '每一拍都闪烁', 0),
        (word(6, '跟上'), 'invite', 6, 'star', 'bunny', 'medium', '跟上这一拍', 0),
        (word(6, '把快乐'), 'sing_out', 6, 'star', 'bunny', 'close', '把快乐唱出来', 0),
        (word(7, '下一拍'), 'step_touch', 7, 'diva', 'original', 'wide', '下一拍', 0),
        (word(7, '你登场'), 'point_you', 7, 'diva', 'original', 'medium', '你登场', 0),
        (word(7, '和我'), 'open_arms', 7, 'diva', 'original', 'medium', '和我一起嗨', 0),
        (lines[-1]['end'], 'finale', 7, 'diva', 'original', 'wide', '安可', 0),
    ]
    assert all(a[0] < b[0] for a, b in zip(specs, specs[1:]))
    cues, blocks = [], []
    for i, (start, move, li, scene, outfit, shot, meaning, from_x) in enumerate(specs):
        start = round(start, 3)
        end = round(specs[i+1][0] if i+1 < len(specs) else duration, 3)
        land = min(grid['beats'], key=lambda b: abs(b-(start+.20)))
        land = round(float(np.clip(land, start+.14, end-.08)), 3)
        to_x = -.22 if move == 'step_left' else .22 if move == 'step_right' else 0
        role = 'chorus' if li in (4, 5) else 'outro' if move == 'finale' else 'bridge' if li == 6 else 'verse'
        card = '安可' if move == 'finale' else 'none'
        cue = dict(start=start, end=end, move=move, line=li, scene=scene, outfit=outfit,
                   shot=shot, meaning=meaning, land=land, fromX=from_x, toX=to_x, role=role)
        cues.append(cue)
        prefix = ('@BeatStudioScene\n{Position:Yuki|x=0|y=-0.03|z=0|face=forward}\n'
            f'{{Music:Play|name=mixed_v10|endTime={duration}|baseVolume=1|fadeIn=0|fadeOut=0}}\n') if i == 0 else ''
        opts = dict(pose='finale' if move == 'finale' else 'hello', duration=f'{end-start:.3f}',
                    expression='wink' if move in ('present', 'point_you', 'finale') else 'smile',
                    edit='hold', outfit=outfit, accessory='none', gesture='ta_da', move=move,
                    outgoing='none', scene=scene, snap=0, card=card, swipe='none', ghost=0,
                    shot=shot, line=li, role=role, land=land, fromX=from_x, toX=to_x)
        tags = '|'.join(f'{k}={v}' for k,v in opts.items())
        blocks.append(f'{i+1}\n{stamp(start)} --> {stamp(end)}\n{prefix}'
                      f'{{Event:Animate|character=Yuki|action=AdPose|{tags}}}\n{{Camera:AdCamera|shot=hello}}')
    return cues, '\n\n'.join(blocks)+'\n'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', default='assets/audio/music/diva_song_v8_a.wav')
    args = ap.parse_args()
    source = ROOT / args.input
    old = json.loads((ROOT / 'config/music_analysis_v9.json').read_text(encoding='utf-8'))
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    output = ROOT / 'assets/audio/mixed_v10.wav'
    if digest != old['source_sha256']:
        raise ValueError('Choreography is authored for the existing song. Re-author for a different song.')
    shutil.copyfile(ROOT / 'assets/audio/mixed_v9.wav', output)
    shutil.copyfile(output, ROOT / 'assets/audio/music/mixed_v10.wav')
    duration = round(sf.info(output).duration, 3)
    separate()
    align()
    chars, lines, envelope, align_meta = vocal_data()
    grid = drum_grid(old)
    cues, story = choreography(chars, lines, grid, duration)
    (ROOT / 'script_v10.story').write_text(story, encoding='utf-8')
    report = dict(source=args.input, source_sha256=digest, duration=duration, fps=60,
        master_sha256=hashlib.sha256(output.read_bytes()).hexdigest(), onsets=old['onsets'], beat_grid=grid,
        sections=[dict(start=c['start'], end=c['end'], label=c['role'], energy=1) for c in cues],
        lyric_chars=chars, lyric_lines=lines, vocal_envelope=envelope, lyric_align=align_meta,
        choreography=cues, timeline_source='script_v10.story',
        review_limit='Model-assisted checks, no human playback acceptance or exact phoneme-sync claim')
    (ROOT / 'config/music_analysis_v10.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'V10: {duration}s, {len(chars)} aligned characters, {len(cues)} complete action phrases')
    for c in cues:
        print(f"{c['start']:6.3f}-{c['end']:6.3f} {c['move']:14s} {c['meaning']}")


if __name__ == '__main__':
    main()
