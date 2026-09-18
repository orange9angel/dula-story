"""歌姬版 V8：30s 人声歌曲的音频准备（母带 + 底鼓锁拍 + 三态口型包络）。

V5/V6 用 13.6s 纯音乐切片，编辑点全锁在 <150Hz 底鼓上。V8 换成人声歌曲
（火山音乐模型生成，当前用 v7 试听稿占位跑通管线），人声会掩蔽底鼓，
所以底鼓稀疏时回退到 prepare_v2 的全频段能量 novelty onset 补拍。
片长不再硬编码 13.6s，跟随输入音频。

新增 vocal_env：300Hz-3kHz 带通（人声主体频段）→ 短时 RMS 包络
（hop 240，与 prepare_v2 同分辨率）→ 分位数阈值量化三态口型
closed/half/open，最小态持续 3 个 hop 防抖。供 viewer_v8 驱动歌姬口型。
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import wave
import numpy as np
from scipy.signal import butter, sosfiltfilt
from prepare_v5 import kicks, master
from prepare_v2 import load, onsets, SR, stamp

ROOT = Path(__file__).resolve().parents[1]
HOP = 240  # 与 prepare_v2 同分辨率（SR=48000 下 5ms/hop）

# 服装循环池（与 V5/V6 同套皮肤）；歌姬版以跳舞为主体，
# move 大量给 dance，窗口用 min_gap 拉长到 1.3s+。
OUTFITS = ['original', 'bunny', 'sailor', 'princess', 'sunny']
MOVES = ['dance', 'dance', 'twirl', 'dance', 'jump', 'dance', 'dance', 'none']
FACES = ['smile', 'grin', 'wink', 'surprise', 'smile', 'grin', 'curious', 'wink']
GESTURES = ['paws', 'salute', 'ta_da', 'cool', 'peek', 'paws', 'salute', 'ta_da']
MIN_GAP = 1.3  # 编辑点最小间隔（秒），dance 窗口拉长
CARD_TEXT = ['唱起来', '萌力全开', '你登场']


def vocal_env(y, band=(300, 3000), q=(0.35, 0.70), min_run=3):
    """人声带通包络 → 三态口型（closed/half/open），最小态持续 min_run 个 hop 防抖。"""
    mono = np.mean(y, axis=1)
    sos = butter(4, [band[0]/(SR/2), band[1]/(SR/2)], 'bandpass', output='sos')
    voice = sosfiltfilt(sos, mono)
    env = np.sqrt(np.mean(voice[:len(voice)//HOP*HOP].reshape(-1, HOP)**2, axis=1))
    lo, hi = np.quantile(env, q)
    states = np.where(env < lo, 0, np.where(env < hi, 1, 2))
    # 防抖：短于 min_run 的段并入前一状态（段首则并入后一状态），迭代到稳定
    for _ in range(8):
        changed = False
        i = 0
        while i < len(states):
            j = i
            while j < len(states) and states[j] == states[i]:
                j += 1
            if j-i < min_run and len(states) >= min_run:
                fill = states[i-1] if i > 0 else (states[j] if j < len(states) else states[i])
                if fill != states[i]:
                    states[i:j] = fill
                    changed = True
            i = j
        if not changed:
            break
    names = ['closed', 'half', 'open']
    segs = []
    for i in range(len(states)):
        if i == 0 or states[i] != states[i-1]:
            segs.append({'t': round(float(i*HOP/SR), 3), 'mouth': names[states[i]]})
    ratio = {names[k]: round(float(np.mean(states == k)), 3) for k in range(3)}
    return segs, ratio


def pick_targets(hit_list, duration, min_gap=MIN_GAP):
    """按时间贪心挑底鼓，间隔 >= min_gap；底鼓太稀疏时回退全频段 onset 补拍。"""
    picks = []
    for h in hit_list:
        if h['time'] > duration-.6:
            break
        if h['time'] < 1.0:
            continue  # 开场留足 1s，避免首个编辑点切出碎块
        if not picks or h['time']-picks[-1] >= min_gap:
            picks.append(h['time'])
    return picks


def scene_of(t, cuts):
    return 'candy' if t < cuts[0] else 'neon' if t < cuts[1] else 'star'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input', required=True, help='歌曲 wav（相对 episode 根目录）')
    args = ap.parse_args()
    source = ROOT/args.input
    assert source.exists(), f'输入不存在: {source}'
    y = load(source)
    duration = round(len(y)/SR, 3)
    fade = round(.3*SR)
    y[-fade:] *= np.linspace(1, 0, fade)[:, None]
    y *= .7/max(float(np.abs(y).max()), 1e-9)
    y = master(y)
    y *= .8/max(float(np.abs(y).max()), 1e-9)
    duration = round(len(y)/SR, 3)
    output = ROOT/'assets/audio/mixed_v8.wav'
    with wave.open(str(output), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y*32767).astype('<i2').tobytes())
    shutil.copyfile(output, ROOT/'assets/audio/music/mixed_v8.wav')

    hit_list = kicks(y)
    hits = onsets(y)
    starts_inner = pick_targets(hit_list, duration)
    beat_lock = 'attacks snapped to low-band (<150Hz) kick onsets (min gap 1.3s)'
    if len(starts_inner) < 4:
        # 人声掩蔽底鼓时回退：全频段能量 novelty onset 补拍
        starts_inner = pick_targets(hits, duration)
        beat_lock = 'kick band too sparse under vocals; fell back to full-band onsets'
    starts = [0]+starts_inner
    print(f'时长 {duration}s，底鼓 {len(hit_list)} 个，全频段 onset {len(hits)} 个，编辑点 {len(starts_inner)} 个')

    segs, ratio = vocal_env(y)
    assert segs[0]['t'] == 0.0 and all(0 <= s['t'] < duration for s in segs), 'vocal_env 时间轴越界'
    assert all(s['mouth'] in ('closed', 'half', 'open') for s in segs), 'vocal_env 状态非法'
    print(f'vocal_env {len(segs)} 段，三态占比 {ratio}')

    # 元素编排：场景切换取 1/3、2/3 处最近的编辑点；snap 取最强 5 拍；
    # 卡片随场景切换 + 最强拍；ghost 挂最长的 dance 窗口。
    thirds = [duration/3, 2*duration/3]
    cut_idx = [min(range(1, len(starts)), key=lambda i, tt=t: abs(starts[i]-tt)) for t in thirds]
    cuts = [starts[i] for i in cut_idx]
    strength_at = {h['time']: h['strength'] for h in hit_list}
    ranked = sorted(starts[1:], key=lambda t: -strength_at.get(t, 0))
    snap_times = sorted(ranked[:5])
    card_at = {cuts[0]: CARD_TEXT[0], ranked[0]: CARD_TEXT[1], cuts[1]: CARD_TEXT[2]}
    card_keys = list(card_at)
    blocks = []
    windows = []
    for i, (start, end) in enumerate(zip(starts, starts[1:]+[duration]), 1):
        move = MOVES[(i-1) % len(MOVES)]
        if move == 'dance':
            windows.append((end-start, i))
        card = next((CARD_TEXT[card_keys.index(c)] for c in card_keys if abs(c-start) < 1e-6), 'none')
        el = {'snap': 1 if any(abs(s-start) < 1e-6 for s in snap_times) else 0,
              'card': card,
              'swipe': 'right' if abs(start-cuts[0]) < 1e-6 else 'left' if abs(start-cuts[1]) < 1e-6 else 'none'}
        prefix = f'@BeatStudioScene\n{{Position:Yuki|x=0|y=-0.03|z=0|face=forward}}\n{{Music:Play|name=mixed_v8|endTime={duration}|baseVolume=1|fadeIn=0|fadeOut=0}}\n' if i == 1 else ''
        blocks.append(f'{i}\n{stamp(start)} --> {stamp(end)}\n{prefix}'
            f'{{Event:Animate|character=Yuki|action=AdPose|pose=hello|duration={end-start:.3f}|expression={FACES[(i-1)%len(FACES)]}|edit=change'
            f'|outfit={OUTFITS[(i-1)%len(OUTFITS)]}|accessory=none|gesture={GESTURES[(i-1)%len(GESTURES)]}|move={move}|outgoing=none'
            f"|scene={scene_of(start, cuts)}|snap={el['snap']}|card={el['card']}|swipe={el['swipe']}|ghost=0}}\n"
            '{Camera:AdCamera|shot=hello}')
    (ROOT/'script_v8.story').write_text('\n\n'.join(blocks)+'\n', encoding='utf-8')

    ghost_window = max(windows) if windows else None
    report = {'source': args.input, 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
     'provider': '火山音乐模型（占位：v7 试听稿）；未做人工听审',
     'duration': duration, 'onsets': hits, 'kicks': hit_list, 'selected_attacks': starts[1:], 'fps': 60,
     'look_changes': len(starts)-1, 'moves': [MOVES[(i-1) % len(MOVES)] for i in range(1, len(starts)+1)],
     'timeline_source': 'script_v8.story',
     'mastering': 'acompressor 3:1 + 110Hz shelf +2.5dB + alimiter 0.85 (同 V5)',
     'beat_lock': beat_lock,
     'elements': {
       'scene_cuts': [{'time': c, 'from': scene_of(c-.001, cuts), 'to': scene_of(c, cuts),
                       'swipe': 'right' if j == 0 else 'left'} for j, c in enumerate(cuts)],
       'snap_zooms': [{'time': t, 'frames': 'push 2 + ease-out 4', 'amplitude': 0.13} for t in snap_times],
       'cards': [{'time': c, 'text': CARD_TEXT[j], 'hold_s': 0.6} for j, c in enumerate(card_keys)],
       'ghosts': [{'window': [starts[ghost_window[1]-1], starts[ghost_window[1]-1]+ghost_window[0]],
                   'delays_frames': [2, 4], 'opacity': [0.3, 0.15]}] if ghost_window else [],
     },
     'vocal_env': segs,
     'vocal_env_method': '300-3000Hz butter4 带通 -> hop240 RMS -> 35/70 分位三态量化 -> 最小 3 hop 防抖；t 为段起点，状态保持到下一段',
     'vocal_env_ratio': ratio,
     'review_limit': 'audio-only model review; user listening remains decisive'}
    (ROOT/'config/music_analysis_v8.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'duration': duration, 'selected_attacks': starts[1:],
                      'vocal_env_segments': len(segs), 'vocal_ratio': ratio}, indent=2))


if __name__ == '__main__':
    main()
