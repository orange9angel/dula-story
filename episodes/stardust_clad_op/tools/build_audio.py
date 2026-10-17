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

# SFX 事件总线：[时刻(压拍), 文件, 增益, 低通Hz(可选)]
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
    (47.020, 'block_impact',  1.0, 1200),   # 「当——」锅盖收尾（低通）
]
VOICE_T = 45.0      # 赫斯提亚画外音
DUCK_DB = -8.0      # 台词下歌曲闪避
DUCK_SMOOTH = 0.150 # 150ms 平滑

def main():
    song = load(EP / 'assets/audio/music/suno/op_song_suno.wav')
    n = int(DURATION * SR)
    song = song[:n]
    if len(song) < n:
        song = np.pad(song, ((0, n - len(song)), (0, 0)))
    mix = song.copy()
    placed = []

    for t0, name, gain, lowpass in EVENTS:
        sfx = load(EP / f'assets/audio/sfx/{name}.wav') * gain
        if lowpass:
            sfx = sosfilt(butter(2, lowpass, fs=SR, btype='low', output='sos'), sfx, axis=0)
        i = int(round(t0 * SR))
        j = min(n, i + len(sfx))
        mix[i:j] += sfx[:j - i]
        placed.append({'t': t0, 'sfx': name, 'gain': gain, 'lowpass': lowpass})

    voice = load(EP / 'assets3d/dialogue/hestia_line.wav')
    vi = int(round(VOICE_T * SR))
    vj = min(n, vi + len(voice))
    # duck：台词窗 ±0.3s 内歌曲 -8dB，150ms 余弦平滑进出
    duck = np.ones(n)
    d0, d1 = vi - int(.3 * SR), min(n, vj + int(.3 * SR))
    g = 10 ** (DUCK_DB / 20)
    ramp = int(DUCK_SMOOTH * SR)
    duck[d0:d1] = g
    # 余弦平滑进出
    duck[d0:d0 + ramp] = 1 + (g - 1) * (0.5 - 0.5 * np.cos(np.pi * np.arange(ramp) / ramp))
    duck[d1 - ramp:d1] = g + (1 - g) * (0.5 - 0.5 * np.cos(np.pi * np.arange(ramp) / ramp))
    mix *= duck[:, None]
    mix[vi:vj] += voice[:vj - vi] * 1.4  # 台词电平补偿（QC 峰值 0.25 偏低）

    peak = float(np.abs(mix).max())
    ceiling = 10 ** (-1.8 / 20)  # -1.8dBFS
    limited = False
    if peak > ceiling:
        mix *= ceiling / peak
        limited = True
    out = EP / 'assets3d/mixed.wav'
    sf.write(out, mix, SR, subtype='PCM_16')
    report = {
        'duration': DURATION, 'sr': SR, 'song_sha256': hashlib.sha256(
            (EP / 'assets/audio/music/suno/op_song_suno.wav').read_bytes()).hexdigest(),
        'song_rms': round(rms(song), 4), 'events': placed,
        'voice': {'file': 'assets3d/dialogue/hestia_line.wav', 't': VOICE_T,
                  'duck_db': DUCK_DB, 'duck_smooth_s': DUCK_SMOOTH, 'voice_gain': 1.4},
        'peak_before': round(peak, 4), 'ceiling': round(ceiling, 4), 'normalized': limited,
        'mix_peak': round(float(np.abs(mix).max()), 4), 'mix_rms': round(rms(mix), 4),
    }
    (EP / 'assets3d/mix_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps({'mixed': str(out), 'peak': report['mix_peak'], 'normalized': limited}, ensure_ascii=False))

if __name__ == '__main__':
    main()
