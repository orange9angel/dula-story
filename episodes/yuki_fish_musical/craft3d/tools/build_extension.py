"""craft3d 开场/结尾扩展构建器（只读消费本集既有数据与工具，全部输出落在 craft3d/）。

产出：
  craft3d/script3d.story                     — 扩展剧本（开场 + 正片整体后移 T0 + 结尾）
  craft3d/config3d/timeline.json             — 扩展时间轴（平移 + 新条目 + 扩展节拍网）
  craft3d/config3d/viseme_{yuki,mochi}.json  — 原轨道平移 + 新台词轨道（V17 同一构建器）
  craft3d/config3d/final_voice_features.json — 10ms 帧级 amplitude/gate（新区间来自新 TTS）
  craft3d/assets3d/mixed.wav                 — 新混音（music_bus 床层 + 新 TTS + 原 mixed 后移）
"""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

EP = Path(__file__).resolve().parents[2]          # episodes/yuki_fish_musical
OUT = EP / 'craft3d'
sys.path.insert(0, str(EP / 'tools'))
from build_timeline import load, envelope16k, pinyin_of, SR   # noqa: E402
from align_all import align_text                              # noqa: E402
from viseme_core import build_viseme_track                    # noqa: E402

# ── 新增台词（音频已用 volc-voice-casting/scripts/seedtts_say.py 合成并通过 qc_lines）──
NEW_LINES = {
    'o1_yuki_reward':  dict(character='Yuki', text='年糕今天奖励你小鱼干加餐',
                            display='年糕～今天奖励你，小鱼干加餐！'),
    'o2_mochi_yay':    dict(character='Mochi', text='好耶', display='好耶！'),
    'o3_yuki_water':   dict(character='Yuki', text='我去浇个花不许偷吃哦',
                            display='我去浇个花，不许偷吃哦。'),
    'e1_mochi_wash':   dict(character='Mochi', text='洗碗就洗碗', display='……洗碗就洗碗。'),
    'e2_yuki_watching': dict(character='Yuki', text='我看着呢', display='我看着呢。（画外）'),
}
# 条目排布：(id, kind, character, yuki_move, mochi_move, shot)
ESTABLISH_DUR, EMPTY_BEAT, GLANCE_BEAT, OUTRO_DUR = 2.2, 1.0, 1.0, 2.5
GAP = 0.25


def align_new_lines():
    from faster_whisper import WhisperModel
    from faster_whisper.tokenizer import Tokenizer
    model = WhisperModel('small', device='cpu', compute_type='int8', local_files_only=True)
    make_tokenizer = lambda: Tokenizer(model.hf_tokenizer, model.model.is_multilingual,
                                       task='transcribe', language='zh')
    out = {}
    for name, spec in NEW_LINES.items():
        path = OUT / f'assets3d/dialogue/{name}.mp3'
        chars, duration = align_text(model, make_tokenizer, path, spec['text'])
        out[name] = dict(chars=chars, measured=duration)
        print(f"{name}: {duration}s, {len(chars)} chars")
    return out


def main():
    aligned = align_new_lines()
    for name, spec in NEW_LINES.items():
        spec['duration'] = aligned[name]['measured']
        spec['chars'] = aligned[name]['chars']

    # ── 布局（时间轴唯一来源）──
    opening = [
        dict(id='00_establish', kind='reaction', yuki='fish_enter', mochi='cat_idle',
             shot='establish', dur=ESTABLISH_DUR),
        dict(id='o1_yuki_reward', kind='dialogue', yuki='fish_serve', mochi='cat_happy',
             shot='entry', dur=NEW_LINES['o1_yuki_reward']['duration']),
        dict(id='o2_mochi_yay', kind='dialogue', yuki='fish_idle', mochi='cat_happy',
             shot='entry', dur=NEW_LINES['o2_mochi_yay']['duration']),
        dict(id='o3_yuki_water', kind='dialogue', yuki='fish_depart', mochi='cat_idle',
             shot='depart', dur=NEW_LINES['o3_yuki_water']['duration']),
        dict(id='00_empty', kind='reaction', yuki='fish_offscreen', mochi='cat_idle',
             shot='plate', dur=EMPTY_BEAT),
    ]
    t = 0.0
    for i, s in enumerate(opening):
        s['start'] = round(t, 3)
        t = round(t + s['dur'] + (GAP if i < len(opening) - 1 else 0.0), 3)
        s['end'] = t if i == len(opening) - 1 else round(s['start'] + s['dur'], 3)
        s['end'] = round(s['start'] + s['dur'], 3)
    T0 = opening[-1]['end']

    orig_tl = json.loads((EP / 'config/timeline.json').read_text(encoding='utf-8'))
    orig_dur = orig_tl['duration']
    E0 = round(T0 + orig_dur, 3)
    ending = [
        dict(id='e1_mochi_wash', kind='dialogue', yuki='fish_offscreen', mochi='cat_wash_sink',
             shot='sink', dur=NEW_LINES['e1_mochi_wash']['duration']),
        dict(id='e0_glance', kind='reaction', yuki='fish_offscreen', mochi='cat_glance',
             shot='sink', dur=GLANCE_BEAT),
        dict(id='e2_yuki_watching', kind='dialogue', yuki='fish_offscreen', mochi='cat_freeze',
             shot='sink', dur=NEW_LINES['e2_yuki_watching']['duration']),
        dict(id='e9_outro', kind='reaction', yuki='fish_offscreen', mochi='cat_resign',
             shot='pullback', dur=OUTRO_DUR),
    ]
    t = E0
    for i, s in enumerate(ending):
        s['start'] = round(t, 3)
        s['end'] = round(s['start'] + s['dur'], 3)
        t = round(s['end'] + GAP, 3)
    duration = ending[-1]['end']
    print(f'T0={T0} E0={E0} duration={duration}')

    # ── script3d.story ──
    def fmt(t):
        ms = round(t * 1000)
        return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}'
    blocks = []
    for idx, s in enumerate(opening + ending):
        lines = [str(idx + 1), f"{fmt(s['start'])} --> {fmt(s['end'])}"]
        if s['id'] == '00_establish':
            lines.append('@HomeKitchenScene')
            lines.append('{Position:Yuki|x=-0.43|y=0|z=0|face=forward}')
            lines.append('{Position:Mochi|x=0.69|y=0|z=0|face=forward}')
        for char, move in (('Yuki', s['yuki']), ('Mochi', s['mochi'])):
            lines.append('{Event:Animate|character=%s|action=AdPose|pose=hello|duration=%.3f|move=%s'
                         '|emotion=calm|expression=smile|focus=audience|hit=%.3f|land=%.3f|shot=%s'
                         '|outfit=original|accessory=none|motif=none|segment=%s|line=-1|kind=%s}'
                         % (char, s['dur'], move, s['start'] + .2, s['end'], s['shot'], s['id'],
                            'dialogue' if s['kind'] == 'dialogue' else 'reaction'))
        lines.append('{Camera:AdCamera|shot=hello}')
        if s['kind'] == 'dialogue':
            spec = NEW_LINES[s['id']]
            lines.append(f"[{spec['character']}]{spec['display']}")
        blocks.append('\n'.join(lines))
    orig_story = (EP / 'script.story').read_text(encoding='utf-8').strip().split('\n\n')
    n0 = len(blocks)
    for j, block in enumerate(orig_story):
        lines = block.strip().splitlines()
        lines[0] = str(n0 + j + 1)
        lines[1] = fmt(T0 + parse_t(lines[1].split(' --> ')[0])) + ' --> ' + \
                   fmt(T0 + parse_t(lines[1].split(' --> ')[1]))
        blocks.append('\n'.join(lines))
    # 正片块移到结尾块之后时间轴上，但 SRT 索引按时间序重排
    blocks = opening_blocks_reorder(blocks, n0)
    (OUT / 'script3d.story').write_text('\n\n'.join(blocks) + '\n', encoding='utf-8')

    # ── timeline.json ──
    tl = json.loads(json.dumps(orig_tl))  # deep copy
    shift_json_times(tl, T0)
    tl['duration'] = duration
    new_dialogue = []
    for s in opening + ending:
        if s['kind'] != 'dialogue':
            continue
        spec = NEW_LINES[s['id']]
        chars = pinyin_of([dict(c, start=round(c['start'] + s['start'], 3),
                                end=round(c['end'] + s['start'], 3)) for c in spec['chars']])
        new_dialogue.append(dict(id=s['id'], character=spec['character'], text=spec['text'],
                                 display=spec['display'], start=s['start'], end=s['end'],
                                 chars=chars))
        s['chars'] = chars
    tl['dialogue'] = sorted(tl['dialogue'] + new_dialogue, key=lambda d: d['start'])
    tl['segments'] = ([dict(id=s['id'], kind=s['kind'], character=NEW_LINES.get(s['id'], {}).get('character'),
                            text=NEW_LINES.get(s['id'], {}).get('text'),
                            move=s['mochi'] if NEW_LINES.get(s['id'], {}).get('character') == 'Mochi' else s['yuki'],
                            shot=s['shot'], start=s['start'],
                            display=NEW_LINES.get(s['id'], {}).get('display'), end=s['end'])
                       for s in opening] + tl['segments'] +
                      [dict(id=s['id'], kind=s['kind'], character=NEW_LINES.get(s['id'], {}).get('character'),
                            text=NEW_LINES.get(s['id'], {}).get('text'),
                            move=s['mochi'] if NEW_LINES.get(s['id'], {}).get('character') == 'Mochi' else s['yuki'],
                            shot=s['shot'], start=s['start'],
                            display=NEW_LINES.get(s['id'], {}).get('display'), end=s['end'])
                       for s in ending])
    # 节拍网：沿用原周期向两端延
    beats = tl['beat_grid']['beats']
    downs = tl['beat_grid']['downbeats']
    period = float(np.median(np.diff(beats)))
    while beats[0] - period >= 0:
        beats.insert(0, round(beats[0] - period, 3))
    while beats[-1] + period <= duration + .1:
        beats.append(round(beats[-1] + period, 3))
    while downs and downs[0] - 4 * period >= 0:
        downs.insert(0, round(downs[0] - 4 * period, 3))
    while downs and downs[-1] + 4 * period <= duration + .1:
        downs.append(round(downs[-1] + 4 * period, 3))
    (OUT / 'config3d').mkdir(parents=True, exist_ok=True)
    (OUT / 'config3d/timeline.json').write_text(json.dumps(tl, ensure_ascii=False, indent=1),
                                                encoding='utf-8')

    # ── viseme 轨道：原轨道平移 + 新台词段用同一 V17 构建器 ──
    dia_env = {name: envelope16k(load(OUT / f'assets3d/dialogue/{name}.mp3', channels=1))
               for name in NEW_LINES}

    def env_at(env, local_t):
        f = min(max(local_t / .01, 0), len(env) - 1)
        i = int(f)
        return float(env[i] + (env[min(i + 1, len(env) - 1)] - env[i]) * (f - i))

    def amp_for(seg_ids):
        table = sorted(((next(s for s in opening + ending if s['id'] == i)['start'], i)
                        for i in seg_ids), key=lambda x: -x[0])
        def amp(t):
            for start, i in table:
                if t >= start - .05:
                    return env_at(dia_env[i], t - start)
            return 0.0
        return amp

    def splice(track_name, character):
        orig = json.loads((EP / f'config/viseme_{track_name}.json').read_text(encoding='utf-8'))
        shifted = [dict(k, t=round(k['t'] + T0, 2)) for k in orig['keyframes']]
        seg_ids = [s['id'] for s in opening + ending
                   if NEW_LINES.get(s['id'], {}).get('character') == character]
        chars = sorted((c for i in seg_ids
                        for c in next(s for s in opening + ending if s['id'] == i)['chars']),
                       key=lambda c: c['start'])
        if character == 'Yuki':
            fresh = build_viseme_track(chars, amp_for(seg_ids), duration)
        else:  # Mochi: jaw-only 20ms，与 build_timeline 同法
            amp = amp_for(seg_ids)
            fresh = []
            tcur = 0.0
            for s in (s for s in opening + ending if s['id'] in seg_ids):
                if s['start'] - tcur > .06:
                    fresh.append((tcur + .1, 0)); fresh.append((s['start'], 0))
                tt = s['start'] + .02
                while tt < s['end']:
                    fresh.append((round(tt, 2), min(max(amp(tt) * .85, 0), 1)))
                    tt += .02
                fresh.append((s['end'] + .1, 0))
                tcur = s['end'] + .1
            if duration - tcur > .06:
                fresh.append((duration - .05, 0))
            fresh = [dict(t=t0, jaw=j, width=0, rounding=0, seal=0, labiodental=0,
                          teeth=0, purse=0, amplitude=j) for t0, j in fresh]
        lo, hi = T0 - .3, E0 - .3
        merged = [k for k in fresh if k['t'] < lo or k['t'] > hi] + \
                 [k for k in shifted if lo <= k['t'] <= hi]
        merged.sort(key=lambda k: k['t'])
        deduped = []
        for k in merged:
            if deduped and k['t'] <= deduped[-1]['t']:
                deduped[-1] = k
            else:
                deduped.append(k)
        orig['keyframes'] = deduped
        (OUT / f'config3d/viseme_{track_name}.json').write_text(
            json.dumps(orig, ensure_ascii=False), encoding='utf-8')
        print(f'viseme_{track_name}: {len(deduped)} keys')

    splice('yuki', 'Yuki')
    splice('mochi', 'Mochi')

    # ── final_voice_features：平移 + 新区间 gate/amplitude ──
    ff = json.loads((EP / 'config/final_voice_features.json').read_text(encoding='utf-8'))
    step = ff['step']
    n = int(round(duration / step)) + 1
    for character in ('Yuki', 'Mochi'):
        old = ff['characters'][character]
        frames = [{'t': round(i * step, 2), 'amplitude': 0.0, 'gate': 0.0} for i in range(n)]
        for fr in old:
            i = int(round((fr['t'] + T0) / step))
            if 0 <= i < n:
                frames[i] = {'t': round(i * step, 2), 'amplitude': fr['amplitude'], 'gate': fr['gate']}
        for s in opening + ending:
            if NEW_LINES.get(s['id'], {}).get('character') != character:
                continue
            env = dia_env[s['id']]
            i0, i1 = int(round(s['start'] / step)), int(round(s['end'] / step))
            for i in range(i0, min(i1, n)):
                a = env_at(env, i * step - s['start'])
                frames[i] = {'t': round(i * step, 2), 'amplitude': round(a, 4),
                             'gate': 1.0 if a > .06 else 0.0}
        ff['characters'][character] = frames
    (OUT / 'config3d/final_voice_features.json').write_text(
        json.dumps(ff, ensure_ascii=False), encoding='utf-8')

    # ── 混音：music_bus 床层（开场/结尾）+ 新 TTS + 原 mixed 后移 T0 ──
    total = int(round(duration * SR))
    mix = np.zeros((total, 2))
    bed = load(EP / 'assets/audio/music_bus.wav')
    BED = 10 ** (-16 / 20)
    def place(dst_offset, src, gain=1.0, fade=.25):
        n0 = min(len(src), total - dst_offset)
        if n0 <= 0:
            return
        seg = src[:n0] * gain
        f = min(int(fade * SR), n0 // 2)
        if f > 0:
            ramp = np.linspace(0, 1, f)[:, None]
            seg[:f] *= ramp
            seg[-f:] *= ramp[::-1]
        mix[dst_offset:dst_offset + n0] += seg
    place(0, bed[:int(T0 * SR)], BED, fade=.4)
    place(int(E0 * SR), bed[int((orig_dur - (duration - E0)) * SR):], BED, fade=.4)
    place(int(T0 * SR), load(EP / 'assets/audio/mixed.wav'))
    for s in opening + ending:
        if s['kind'] == 'dialogue':
            place(int(s['start'] * SR), load(OUT / f"assets3d/dialogue/{s['id']}.mp3"))
    peak = float(np.max(np.abs(mix)))
    if peak > .98:
        mix *= .98 / peak
    (OUT / 'assets3d').mkdir(exist_ok=True)
    sf.write(str(OUT / 'assets3d/mixed.wav'), mix, SR)
    print(f'mixed.wav: {duration}s peak {peak:.3f}')


def parse_t(hms):
    h, m, rest = hms.split(':')
    s, ms = rest.split(',')
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def opening_blocks_reorder(blocks, n0):
    return blocks  # opening/ending 在前、正片在后已是时间序


def shift_json_times(node, off):
    if isinstance(node, dict):
        for k, v in node.items():
            if k in ('start', 'end') and isinstance(v, (int, float)):
                node[k] = round(v + off, 3)
            else:
                shift_json_times(v, off)
    elif isinstance(node, list):
        for v in node:
            shift_json_times(v, off)


if __name__ == '__main__':
    main()
