#!/usr/bin/env python3
"""《星屑战壳》OP 混音总线：歌曲为底 + SFX 事件摆点 + 赫斯提亚画外音（duck -8dB/150ms 平滑）。

- 歌曲：assets/audio/music/suno/op_song_suno.wav（49.2s 定版，溯源 op_song_suno.source.json）
- SFX：assets/audio/sfx/ 事件按谱面绝对时刻摆点（时刻=performance.js 的 T 表，全部压 beatgrid）
- 收尾「当——」：block_impact 低通 1200Hz（比 impact_thud 更像锅盖金属声，试听二选一记录见 NOTES）
- 峰值上限 -1.8dBFS（超限整体归一）；放置零点=谱面零点
- 产物：assets3d/mixed.wav（48kHz 双声道）+ assets3d/mix_report.json

用法（dula-story 根）：.venv/Scripts/python.exe episodes/stardust_clad_op/tools/build_audio.py
"""
from pathlib import Path
import hashlib
import json
import subprocess

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

EP = Path(__file__).resolve().parents[1]
SR = 48000
DURATION = 49.200

def load(path):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
                                   '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'])
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)

def rms(x):
    return float(np.sqrt(np.mean(x * x)))

# SFX 事件总线：[时刻(压拍), 文件, 增益, 低通Hz(可选)]——R2 起全部音源=
# assets3d/sfx/ 的 Seed-Audio 生成件（溯源 .source.json）；旧程序合成件留档不进混音。
SFX_DIR = 'assets3d/sfx'
EVENTS = [
    (5.317,  'energy_charge', 0.9, None),   # 阿鏊战壳生长（downbeat）
    (8.568,  'energy_charge', 0.9, None),   # 小凿
    (13.305, 'energy_charge', 0.9, None),   # 大釜
    (15.023, 'dash_whoosh',   0.8, None),   # 阿鏊冲刺（downbeat）
    (16.625, 'block_impact',  1.0, None),   # 锅盖盾格挡（接触帧）
    (19.830, 'punch_heavy',   1.0, None),   # 拳甲相撞（接触帧）
    (21.432, 'dash_whoosh',   0.6, None),   # 追击小跳步
    (23.034, 'body_drop',     1.0, None),   # 击飞落地（接触帧）
    (23.034, 'impact_thud',   0.5, None),   # 落地垫底
    (31.045, 'whoosh_fast',   0.8, None),   # 冲锋（downbeat）
    (33.855, 'energy_blast',  0.9, None),   # 合体 gag 顶点
    (47.020, 'pot_clang',     1.0, None),   # 「当——」锅鸣收尾（Seed-Audio 专用件，替代低通程序音）
    # R11 必杀技专属 SFX（摆点=蓄力/接触帧）
    (15.900, 'steam_pillar',  0.8, None),   # 大釜蓄力蒸汽柱（沸泉·冲天柱）
    (16.550, 'star_lotus',   0.8, None),   # 莲华绽开（圆盾·星莲华，格挡前瞬）
    (19.830, 'pot_shock',    0.9, None),   # 锅鸣冲击波（震堂·锅鸣一击，对拳帧）
    (23.034, 'crater_slam',  0.9, None),   # 陨星坠地爆发（陨星·釜底落，击飞落地帧）
]
AMBIENCE = ('ambience_night', 0.22)  # 夜风+星火噼啪底床（全场循环，20s 交叉淡化无缝）
VOICE_T = 45.0      # 赫斯提亚画外音
DUCK_DB = -8.0      # 台词下歌曲闪避
DUCK_SMOOTH = 0.150 # 150ms 平滑

# 环境底床：20s 底循环铺满 n 帧，1s 交叉淡化无缝（摆点零点=谱面零点）
def build_bed(n):
    amb = load(EP / SFX_DIR / f'{AMBIENCE[0]}.wav') * AMBIENCE[1]
    seg = len(amb)
    xf = int(1.0 * SR)
    bed = np.zeros((n, 2))
    pos = 0
    while pos < n:
        j = min(n, pos + seg)
        chunk = amb[:j - pos].copy()
        k = min(xf, len(chunk))
        if pos > 0:  # 与前一段交叠区：本段头淡入
            w = 0.5 - 0.5 * np.cos(np.pi * np.arange(k) / k)
            chunk[:k] *= w[:, None]
        if pos + seg < n:  # 后续还有段：本段尾淡出（与下段头互补给等功率交叉）
            w = 0.5 + 0.5 * np.cos(np.pi * np.arange(k) / k)
            chunk[-k:] *= w[:, None]
        bed[pos:j] += chunk
        pos += seg - xf
    return bed

def main():
    song = load(EP / 'assets/audio/music/suno/op_song_suno.wav')
    n = int(DURATION * SR)
    song = song[:n]
    if len(song) < n:
        song = np.pad(song, ((0, n - len(song)), (0, 0)))
    mix = song.copy()
    placed = []
    sources = {'song': {'path': 'assets/audio/music/suno/op_song_suno.wav', 'provider': 'suno',
                        'sha256': hashlib.sha256((EP / 'assets/audio/music/suno/op_song_suno.wav').read_bytes()).hexdigest()}}

    mix += build_bed(n)
    amb_name, amb_gain = AMBIENCE
    sources['ambience'] = {'path': f'{SFX_DIR}/{amb_name}.wav', 'provider': 'volcano-seedaudio', 'gain': amb_gain,
                           'sha256': hashlib.sha256((EP / SFX_DIR / f'{amb_name}.wav').read_bytes()).hexdigest()}

    for t0, name, gain, lowpass in EVENTS:
        sfx = load(EP / SFX_DIR / f'{name}.wav') * gain
        if lowpass:
            sfx = sosfilt(butter(2, lowpass, fs=SR, btype='low', output='sos'), sfx, axis=0)
        i = int(round(t0 * SR))
        j = min(n, i + len(sfx))
        mix[i:j] += sfx[:j - i]
        placed.append({'t': t0, 'sfx': name, 'gain': gain, 'lowpass': lowpass})
        key = f'sfx:{name}'
        if key not in sources:
            sources[key] = {'path': f'{SFX_DIR}/{name}.wav', 'provider': 'volcano-seedaudio',
                            'sha256': hashlib.sha256((EP / SFX_DIR / f'{name}.wav').read_bytes()).hexdigest()}

    voice = load(EP / 'assets3d/dialogue/hestia_line.wav')
    vi = int(round(VOICE_T * SR))
    vj = min(n, vi + len(voice))
    # 口型包络轨（能量→jaw，20ms 帧）：供 viewer 女神慵懒口型；与混音同一音源零漂移
    vmono = voice.mean(axis=1)
    hop = int(.02 * SR)
    env = np.sqrt(np.mean(np.pad(vmono, (0, (-len(vmono)) % hop))[:len(vmono) + (-len(vmono)) % hop]
                          .reshape(-1, hop) ** 2, axis=1))
    lo, hi = np.percentile(env, 15), max(np.percentile(env, 92), 1e-9)
    jaw = np.clip((env - lo) / (hi - lo) * 0.85, 0, 0.85)
    (EP / 'config/hestia_voice_env.json').write_text(json.dumps(
        {'t0': VOICE_T, 'dt': .02, 'jaw': [round(float(x), 3) for x in jaw]}), encoding='utf-8')
    # duck：台词/喊招窗歌曲 -8dB，150ms 余弦平滑进出（先合并所有窗口再统一施加）
    duck = np.ones(n)
    g = 10 ** (DUCK_DB / 20)
    ramp = int(DUCK_SMOOTH * SR)
    duck_windows = [(vi - int(.3 * SR), min(n, vj + int(.3 * SR)))]
    # ── R11 喊招（少年漫喊招必须炸出来：增益顶格 1.6，逐条并入 duck 窗）──
    calls_cfg = json.loads((EP / 'config/calls.json').read_text(encoding='utf-8'))
    calls_audio = []
    for c in calls_cfg['calls']:
        cw = load(EP / 'assets3d/calls' / f"{c['id']}.wav")
        ci = int(round(c['t0'] * SR))
        cj = min(n, ci + len(cw))
        duck_windows.append((max(0, ci - int(.2 * SR)), cj))
        calls_audio.append((ci, cj, cw, c))
    for w0, w1 in duck_windows:
        w0 = max(0, w0)
        duck[w0:w1] = g
        duck[w0:w0 + ramp] = 1 + (g - 1) * (0.5 - 0.5 * np.cos(np.pi * np.arange(ramp) / ramp))
        duck[w1 - ramp:w1] = g + (1 - g) * (0.5 - 0.5 * np.cos(np.pi * np.arange(ramp) / ramp))
    mix *= duck[:, None]
    mix[vi:vj] += voice[:vj - vi] * 1.4  # 台词电平补偿（QC 峰值 0.25 偏低）
    calls_placed = []
    for ci, cj, cw, c in calls_audio:
        mix[ci:cj] += cw[:cj - ci] * 1.6
        calls_placed.append({'id': c['id'], 't': c['t0'], 'move': c['move']})
        sources[f"call:{c['id']}"] = {'path': f'assets3d/calls/{c["id"]}.wav', 't': c['t0'],
                                      'provider': 'volcano-seedtts',
                                      'sha256': hashlib.sha256((EP / 'assets3d/calls' / f'{c["id"]}.wav').read_bytes()).hexdigest()}

    peak = float(np.abs(mix).max())
    ceiling = 10 ** (-2.2 / 20)  # -2.2dBFS（AAC 编码有约 1.3% 过冲，留余量保成片 ≤-1.8dBFS）
    limited = False
    if peak > ceiling:
        mix *= ceiling / peak
        limited = True
    out = EP / 'assets3d/mixed.wav'
    sf.write(out, mix, SR, subtype='PCM_16')
    report = {
        'duration': DURATION, 'sr': SR,
        'song_rms': round(rms(song), 4), 'events': placed,
        'sources': sources,  # 逐文件 provider+sha256（R2：SFX 全换 Seed-Audio，程序合成留档不进混音）
        'voice': {'file': 'assets3d/dialogue/hestia_line.wav', 't': VOICE_T,
                  'duck_db': DUCK_DB, 'duck_smooth_s': DUCK_SMOOTH, 'voice_gain': 1.4,
                  'provider': 'volcano-seedtts',
                  'sha256': hashlib.sha256((EP / 'assets3d/dialogue/hestia_line.wav').read_bytes()).hexdigest()},
        'peak_before': round(peak, 4), 'ceiling': round(ceiling, 4), 'normalized': limited,
        'mix_peak': round(float(np.abs(mix).max()), 4), 'mix_rms': round(rms(mix), 4),
    }
    (EP / 'assets3d/mix_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps({'mixed': str(out), 'peak': report['mix_peak'], 'normalized': limited}, ensure_ascii=False))

if __name__ == '__main__':
    main()
