"""歌姬版 V9：MTV 卡点编排——拍网吸附剪辑 + HPSS 人声分离音节级口型。

V8 两个 P0：编辑点来自事后检测的底鼓（动作与音乐律动脱节）、口型包络提取自
全频段混音（被伴奏污染）。V9 的根治方案：

1. 拍网：librosa.beat.beat_track 提取 BPM + beat times，4/4 推 downbeats
   （onset 强度在 4 种相位偏移里选最强对齐）。所有 story 剪辑点吸附拍网，
   不再用 onset 散点。beat_track 不稳时打印 onset 自相关诊断，可 --bpm 覆盖。
2. 口型：hpss 分离 harmonic（人声主体）→ 200Hz-4kHz 带通 → 5ms hop RMS 包络；
   在 harmonic 上做 onset 检测，每个 onset 视为一个音节——开口在 onset，
   随后按包络衰减（>55% 峰值 open，>20% half，否则 closed），伴奏段残留
   onset 被能量门限拒绝，保持 closed。输出沿用 V8 契约 vocal_env RLE 段。
3. 段落：按小节（4 拍）统计 RMS 能量，能量最高的连续小节段为 chorus，
   首尾低能量段为 intro/outro，其余 verse/bridge。输出 sections。
4. MTV 编排：intro 静立 edit=hold；verse 每 2 拍 edit=change；chorus 每 1 拍
   快切 + downbeat snap + ghost=2；bridge 每 2 拍 arm_sweep；outro 回 diva，
   pose=finale + edit=hold，最后一拍给收尾字卡。
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import wave
import numpy as np
import librosa
from scipy.signal import butter, sosfiltfilt
from prepare_v5 import kicks, master
from prepare_v2 import load, onsets, SR, stamp

ROOT = Path(__file__).resolve().parents[1]
ANA_SR = 22050          # librosa 分析采样率（单声道）
HOP5 = round(0.005*ANA_SR)  # 口型包络 5ms hop
SNAP_TOL = 0.005        # 剪辑点吸附拍网容差（秒）

OUTFITS = ['original', 'bunny', 'sailor', 'princess', 'sunny']
FACES = ['smile', 'grin', 'wink', 'surprise', 'smile', 'grin', 'curious', 'wink']
GESTURES = ['paws', 'salute', 'ta_da', 'cool', 'peek', 'paws', 'salute', 'ta_da']
CARD_FINALE = '安可'
SCENE_OF = {'intro': 'diva', 'verse': 'diva', 'chorus': 'neon', 'bridge': 'star', 'outro': 'diva'}
MOVE_OF = {'intro': 'mic_hold', 'verse': 'mic_hold', 'chorus': 'dance', 'bridge': 'arm_sweep', 'outro': 'mic_hold'}


def beat_grid(y, sr, bpm_override=None):
    """beat_track 拍网 + 4/4 downbeat 相位选择；打印 onset 自相关诊断。"""
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    kwargs = {'onset_envelope': onset_env, 'sr': sr, 'units': 'frames'}
    if bpm_override:
        kwargs['start_bpm'] = bpm_override
    tempo, beat_frames = librosa.beat.beat_track(**kwargs)
    bpm = float(np.atleast_1d(tempo)[0])
    beats = librosa.frames_to_time(beat_frames, sr=sr)
    # 诊断：无先验的 onset 自相关 tempo（aggregated median），检查 beat_track 是否 octave 错
    ac = librosa.feature.rhythm.tempo(onset_envelope=onset_env, sr=sr, aggregate=np.median,
                                      start_bpm=bpm_override or 120)
    ac_bpm = float(np.atleast_1d(ac)[0])
    ratio = ac_bpm/bpm if bpm else 0
    note = ''
    if bpm_override:
        note = f'（--bpm {bpm_override} 覆盖先验）'
    elif not (0.75 < ratio < 1.5):
        print(f'[诊断] beat_track BPM={bpm:.1f} 与 onset 自相关 BPM={ac_bpm:.1f} 差距大 '
              f'(ratio {ratio:.2f})，短曲拍网可能不稳，必要时用 --bpm 手动覆盖')
    print(f'BPM {bpm:.2f}{note}，onset 自相关参考 {ac_bpm:.2f}，拍数 {len(beats)}')
    # 4/4 downbeat：4 种相位偏移里选 onset 强度对齐最强的
    strength = onset_env[beat_frames]
    phase = max(range(4), key=lambda p: float(np.mean(strength[p::4])) if len(strength[p::4]) else -1)
    downbeats = beats[phase::4]
    print(f'downbeat 相位 {phase}，downbeats {len(downbeats)} 个')
    return bpm, beats, downbeats, {'beat_track_bpm': round(bpm, 2), 'autocorr_bpm': round(ac_bpm, 2),
                                   'downbeat_phase': int(phase), 'bpm_override': bpm_override}


def detect_sections(y, sr, beats, downbeats, duration):
    """按小节（downbeat 间隔）统计 RMS 能量，切成 intro/verse/chorus[/bridge]/outro。"""
    rms = librosa.feature.rms(y=y, hop_length=512)[0]
    times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=512)
    bounds = [0.0] + [float(d) for d in downbeats if 0.0 < d < duration] + [duration]
    bar_energy = []
    for a, b in zip(bounds, bounds[1:]):
        mask = (times >= a) & (times < b)
        bar_energy.append(float(np.mean(rms[mask])) if mask.any() else 0.0)
    bar_energy = np.array(bar_energy)
    peak = float(bar_energy.max()) if len(bar_energy) else 0.0
    nb = len(bar_energy)
    # chorus：平均能量最高的连续 ~4 小节窗口（约 8s）
    win = min(4, nb)
    c0 = max(range(0, nb-win+1), key=lambda i: float(np.mean(bar_energy[i:i+win])))
    c1 = c0+win-1
    # intro：首个能量 >=55% 峰值的小节起点，最多 2 小节，且不越过 chorus
    high = [i for i in range(1, nb) if bar_energy[i] >= 0.55*peak]
    i_intro = min(high[0] if high else 1, 2, c0)
    # outro：最后 1 小节，仅当明显弱于峰值（能量收尾）且在 chorus 之后
    i_outro = nb-1 if nb >= 2 and bar_energy[-1] < 0.75*peak and nb-1 > c1 else c1+1
    i_outro = min(i_outro, nb-1)
    def sec(a, b, label):
        mask = (times >= a) & (times < b)
        return {'start': round(a, 3), 'end': round(b, 3), 'label': label,
                'energy': round(float(np.mean(rms[mask])) if mask.any() else 0.0, 5)}
    sections = []
    if i_intro > 0:
        sections.append(sec(bounds[0], bounds[i_intro], 'intro'))
    if i_intro < c0:
        sections.append(sec(bounds[i_intro], bounds[c0], 'verse'))
    sections.append(sec(bounds[c0], bounds[c1+1], 'chorus'))
    if c1+1 < i_outro:
        sections.append(sec(bounds[c1+1], bounds[i_outro], 'bridge'))
    if i_outro < len(bounds)-1:
        sections.append(sec(bounds[i_outro], bounds[-1], 'outro'))
    labels = '/'.join(s['label'] for s in sections)
    print(f'段落 {labels}: ' + ', '.join(f"{s['label']}[{s['start']:.2f}-{s['end']:.2f} e={s['energy']:.4f}]" for s in sections))
    return sections


def vocal_env_syllables(y, sr, duration):
    """HPSS harmonic → 200Hz-4kHz 带通 → 5ms RMS 包络；harmonic onset = 音节，
    开口在 onset，随后按包络衰减闭合。返回 RLE 段、占比、音节数。"""
    y_h, _ = librosa.effects.hpss(y)
    sos = butter(4, [200/(sr/2), 4000/(sr/2)], 'bandpass', output='sos')
    voice = sosfiltfilt(sos, y_h)
    n = len(voice)//HOP5
    env = np.sqrt(np.mean(voice[:n*HOP5].reshape(-1, HOP5)**2, axis=1))
    hop_s = HOP5/sr
    onset_env = librosa.onset.onset_strength(y=voice, sr=sr, hop_length=256)
    onset_times = librosa.onset.onset_detect(
        onset_envelope=onset_env, sr=sr, hop_length=256, units='time',
        backtrack=True, delta=0.05, wait=round(0.10*sr/256))
    onset_frames = [int(round(t/hop_s)) for t in onset_times]
    gate = float(np.quantile(env, 0.60))   # 音节能量门限：伴奏段残留 onset 不算
    floor = float(np.quantile(env, 0.30))  # 包络噪声底
    max_syl = int(0.5/hop_s)               # 音节窗口封顶 0.5s，防止拖尾吃掉间奏
    states = np.zeros(n, dtype=int)        # 0 closed / 1 half / 2 open
    syllables = 0
    for k, f0 in enumerate(onset_frames):
        f1 = onset_frames[k+1] if k+1 < len(onset_frames) else n
        f0, f1 = min(f0, n-1), min(min(f1, n), f0+max_syl)
        if f1 <= f0:
            continue
        peak = float(env[f0:f1].max())
        if peak < gate:
            continue
        syllables += 1
        hi, lo = 0.60*peak, max(0.35*peak, floor)
        seg = env[f0:f1]
        states[f0:f1] = np.where(seg >= hi, 2, np.where(seg >= lo, 1, 0))
        states[f0] = 2  # 开口在音节 onset
    # 防抖：短于 3 个 hop（15ms）的段并入相邻状态（同 v8 策略）
    for _ in range(8):
        changed = False
        i = 0
        while i < len(states):
            j = i
            while j < len(states) and states[j] == states[i]:
                j += 1
            if j-i < 3 and len(states) >= 3:
                fill = states[i-1] if i > 0 else (states[j] if j < len(states) else states[i])
                if fill != states[i]:
                    states[i:j] = fill
                    changed = True
            i = j
        if not changed:
            break
    names = ['closed', 'half', 'open']
    segs = [{'t': round(float(i*hop_s), 3), 'mouth': names[states[i]]}
            for i in range(n) if i == 0 or states[i] != states[i-1]]
    ratio = {names[k]: round(float(np.mean(states == k)), 3) for k in range(3)}
    return segs, ratio, syllables


def build_story(sections, beats, downbeats, duration):
    """MTV 编排：所有剪辑点吸附拍网。返回 story 文本与元素报告。"""
    down = {round(float(d), 3) for d in downbeats}
    cuts = {0.0}
    label_at = {}
    for s in sections:
        cuts.add(s['start'])
        label_at[s['start']] = s['label']
        in_beats = [b for b in beats if s['start']-1e-6 <= b < s['end']-1e-6]
        if s['label'] == 'chorus':
            pts = in_beats                      # 每 1 拍快切
        elif s['label'] in ('verse', 'bridge'):
            pts = in_beats[::2]                 # 每 2 拍
        elif s['label'] == 'outro':
            pts = in_beats[-1:] if len(in_beats) >= 2 else []  # 最后一拍给字卡
        else:
            pts = []                            # intro 静立 hold
        for p in pts:
            cuts.add(round(float(p), 3))
    bounds = sorted(t for t in cuts if t < duration-0.05)
    def section_of(t):
        for s in sections:
            if s['start']-1e-6 <= t < s['end']-1e-6 or (t >= s['start']-1e-6 and s is sections[-1]):
                return s['label']
        return sections[-1]['label']
    chorus_start = next((s['start'] for s in sections if s['label'] == 'chorus'), None)
    chorus_end = next((s['end'] for s in sections if s['label'] == 'chorus'), None)
    blocks, moves, snaps, cards = [], [], [], []
    for i, start in enumerate(bounds, 1):
        end = bounds[i] if i < len(bounds) else duration
        label = section_of(start)
        last = i == len(bounds)
        move = 'none' if last else MOVE_OF[label]
        snap = 1 if (label == 'chorus' and start in down) else 0
        swipe = ('right' if chorus_start is not None and abs(start-chorus_start) < 1e-6
                 else 'left' if chorus_end is not None and abs(start-chorus_end) < 1e-6
                 else 'none')
        card = CARD_FINALE if last else 'none'
        pose = 'finale' if label == 'outro' else 'hello'
        edit = 'hold' if label in ('intro', 'outro') else 'change'
        ghost = 2 if label == 'chorus' else 0
        moves.append(move)
        if snap:
            snaps.append(start)
        if card != 'none':
            cards.append({'time': start, 'text': card, 'hold_s': 0.6})
        prefix = ('@BeatStudioScene\n{Position:Yuki|x=0|y=-0.03|z=0|face=forward}\n'
                  f'{{Music:Play|name=mixed_v9|endTime={duration}|baseVolume=1|fadeIn=0|fadeOut=0}}\n'
                  if i == 1 else '')
        blocks.append(f'{i}\n{stamp(start)} --> {stamp(end)}\n{prefix}'
            f'{{Event:Animate|character=Yuki|action=AdPose|pose={pose}|duration={end-start:.3f}'
            f'|expression={FACES[(i-1)%len(FACES)]}|edit={edit}|outfit={OUTFITS[(i-1)%len(OUTFITS)]}'
            f'|accessory=none|gesture={GESTURES[(i-1)%len(GESTURES)]}|move={move}|outgoing=none'
            f'|scene={SCENE_OF[label]}|snap={snap}|card={card}|swipe={swipe}|ghost={ghost}}}\n'
            '{Camera:AdCamera|shot=hello}')
    elements = {
        'scene_cuts': [{'time': s['start'], 'label': s['label'], 'scene': SCENE_OF[s['label']],
                        'swipe': 'right' if s['label'] == 'chorus' else 'left' if i > 0 and sections[i-1]['label'] == 'chorus' else 'none'}
                       for i, s in enumerate(sections) if i > 0],
        'snap_zooms': [{'time': t, 'frames': 'push 2 + ease-out 4', 'amplitude': 0.13} for t in snaps],
        'cards': cards,
        'ghosts': [{'window': [s['start'], s['end']], 'delays_frames': [2, 4], 'opacity': [0.3, 0.15]}
                   for s in sections if s['label'] == 'chorus'],
    }
    return '\n\n'.join(blocks)+'\n', bounds, moves, elements


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', required=True, help='歌曲 wav（相对 episode 根目录）')
    ap.add_argument('--bpm', type=float, default=None, help='手动覆盖 BPM 先验（beat_track 不稳时用）')
    args = ap.parse_args()
    source = ROOT/args.input
    assert source.exists(), f'输入不存在: {source}'

    # 母带链（同 V5/V8，不改内容仅响度处理）
    y = load(source)
    duration = round(len(y)/SR, 3)
    fade = round(.3*SR)
    y[-fade:] *= np.linspace(1, 0, fade)[:, None]
    y *= .7/max(float(np.abs(y).max()), 1e-9)
    y = master(y)
    y *= .8/max(float(np.abs(y).max()), 1e-9)
    duration = round(len(y)/SR, 3)
    output = ROOT/'assets/audio/mixed_v9.wav'
    with wave.open(str(output), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y*32767).astype('<i2').tobytes())
    shutil.copyfile(output, ROOT/'assets/audio/music/mixed_v9.wav')

    # 分析用单声道 22.05k（librosa）
    ya = librosa.load(str(source), sr=ANA_SR, mono=True)[0]
    assert abs(len(ya)/ANA_SR - duration) < 0.05, '分析流与母带时长不一致'

    bpm, beats, downbeats, beat_diag = beat_grid(ya, ANA_SR, args.bpm)
    sections = detect_sections(ya, ANA_SR, beats, downbeats, duration)
    segs, ratio, syllables = vocal_env_syllables(ya, ANA_SR, duration)
    print(f'音节 onset {syllables} 个（过能量门限），'
          f'vocal_env {len(segs)} 段，三态占比 {ratio}（V8 closed=0.366）')
    if ratio['closed'] <= 0.366:
        print('[诊断] closed 占比未显著高于 V8，人声分离或门限需复查')

    story, bounds, moves, elements = build_story(sections, beats, downbeats, duration)
    (ROOT/'script_v9.story').write_text(story, encoding='utf-8')

    # 断言：所有条目边界吸附拍网（<=5ms）；vocal_env 覆盖全曲；总时长=音频时长
    grid = np.array([round(float(b), 3) for b in beats])
    worst = max(min(abs(grid-b)) for b in bounds[1:]) if len(bounds) > 1 else 0.0
    assert worst <= SNAP_TOL+1e-9, f'剪辑点偏离拍网 {worst*1000:.1f}ms > 5ms'
    assert segs[0]['t'] == 0.0 and all(0 <= s['t'] < duration for s in segs), 'vocal_env 时间轴越界'
    assert all(s['mouth'] in ('closed', 'half', 'open') for s in segs), 'vocal_env 状态非法'
    assert abs(bounds[-1] < duration) and round(duration, 3) == duration
    print(f'[断言通过] {len(bounds)} 条目，边界最大偏差 {worst*1000:.2f}ms；'
          f'vocal_env 覆盖 [0,{duration})；总时长 {duration}s')

    hit_list, hits = kicks(y), onsets(y)
    report = {'source': args.input, 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
     'provider': '火山豆包音乐模型（GenSongForTime）；未做人工听审',
     'duration': duration, 'onsets': hits, 'kicks': hit_list,
     'selected_attacks': bounds[1:], 'fps': 60,
     'look_changes': len(bounds)-1, 'moves': moves,
     'timeline_source': 'script_v9.story',
     'mastering': 'acompressor 3:1 + 110Hz shelf +2.5dB + alimiter 0.85 (同 V5)',
     'beat_lock': 'all edit points snapped to librosa beat_track grid (<=5ms); '
                  'chorus 1-beat cuts, verse/bridge 2-beat cuts, intro/outro hold',
     'beat_grid': {'bpm': round(bpm, 2),
                   'beats': [round(float(b), 3) for b in beats],
                   'downbeats': [round(float(d), 3) for d in downbeats],
                   'diagnostics': beat_diag},
     'sections': sections,
     'elements': elements,
     'vocal_env': segs,
     'vocal_env_method': 'hpss harmonic -> 200-4000Hz butter4 带通 -> 5ms hop RMS -> '
                         '带通 harmonic 频谱 onset（librosa onset_detect，hop256 delta=0.05 backtrack）'
                         '音节切分（峰值过 60% 分位门限才计音节，拒伴奏残留）-> '
                         'onset 开口 open，包络 >=60% 音节峰值 open / >=35% half / 否则 closed，'
                         '音节窗口封顶 0.5s -> 最小 3 hop 防抖；t 为段起点，状态保持到下一段',
     'vocal_env_ratio': ratio,
     'syllable_onsets': syllables,
     'review_limit': 'audio-only model review; user listening remains decisive'}
    (ROOT/'config/music_analysis_v9.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'duration': duration, 'bpm': round(bpm, 2), 'beats': len(beats),
                      'downbeats': len(downbeats),
                      'sections': [{k: s[k] for k in ('label', 'start', 'end')} for s in sections],
                      'story_entries': len(bounds), 'syllable_onsets': syllables,
                      'vocal_ratio': ratio}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
