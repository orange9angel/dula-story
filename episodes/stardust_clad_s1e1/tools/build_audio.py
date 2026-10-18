#!/usr/bin/env python3
"""《星屑战壳》S1E1 混音总线：BGM 为底 + 晨景底床 + SFX 事件摆点 + 对白（duck 平滑）。
- BGM：assets3d/sfx/bgm_morning.wav（Seed-Audio 74s 单条）
- 对白：assets3d/dialogue/<id>.wav（seed-tts-2.0），摆点=config/dialogue.json 的 t
  （零点=谱面零点；口型包络从最终放置的同一 PCM 派生 → config/voice_envs.json）
- 峰值上限 -2.2dBFS（AAC 过冲留量，OP R2 教训）
- 产物：assets3d/mixed.wav（48kHz 双声道）+ assets3d/mix_report.json + config/voice_envs.json

用法（dula-story 根）：.venv/Scripts/python.exe episodes/stardust_clad_s1e1/tools/build_audio.py
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
DURATION = 75.000
SFX_DIR = 'assets3d/sfx'

def load(path):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
                                   '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'])
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)

def rms(x):
    return float(np.sqrt(np.mean(x * x)))

# SFX 事件总线：[时刻, 文件, 增益]（时刻=performance.js 的 T 表）
EVENTS = [
    (10.800, 'dash_whoosh', 0.8),    # 追逐起跑
    (16.500, 'whoosh_fast', 0.6),    # 收步
    (19.400, 'scroll_pop', 0.9),     # 年检通告卷轴
    (27.400, 'energy_charge', 0.9),  # 阿箸战壳生长
    (35.000, 'pan_sizzle', 0.9),     # 盾面煎蛋
    (42.800, 'whoosh_fast', 0.7),    # 石头脱手
    (43.600, 'stone_thud', 1.0),     # 石头落地
    (44.000, 'body_drop', 0.8),      # 大釜坐地
    (47.000, 'star_chime', 0.55),    # 穿孔 6 连
    (47.280, 'star_chime', 0.55),
    (47.560, 'star_chime', 0.55),
    (47.840, 'star_chime', 0.55),
    (48.120, 'star_chime', 0.55),
    (48.400, 'star_chime', 0.55),
    (54.400, 'chopstick_tap', 1.0),  # TAP1 刃点盾
    (57.800, 'chopstick_tap', 0.9),  # TAP2 刃点肩甲
    (61.200, 'chopstick_clack', 1.0),# PINCH 双筷夹盘
    (63.400, 'pot_set', 0.9),        # 火锅落地
    (74.300, 'pot_clang', 1.0),      # 「当——」收尾（压尾字）
]
AMBIENCE = ('ambience_morning', 0.20)   # 晨风鸟鸣底床（全场循环）
HOTPOT_BED = ('hotpot_bubble', 64.2, 0.30)  # 火锅咕嘟（64.2 起到结尾，淡入淡出）
DUCK_DB = -6.0
DUCK_SMOOTH = 0.150

def build_bed(n, name, gain, t0=0.0, fade=0.8):
    """循环底床铺满 [t0,end]：先把源文件尾部 1.5s 折进头部做无缝环（loop repair），
    再平铺——段间叠化在稀疏内容上会造成接缝电平 dip（S1E1 晨风底床翻车实录），
    源内折尾比铺排时叠化干净。fade 进/出。"""
    amb = load(EP / SFX_DIR / f'{name}.wav') * gain
    xr = int(1.5 * SR)
    if len(amb) > 2 * xr:
        w = np.linspace(0, 1, xr)[:, None]
        repaired = amb.copy()
        repaired[:xr] = amb[-xr:] * (1 - w) + amb[:xr] * w  # 尾部折进头部
        amb = repaired[:-xr]
    seg = len(amb)
    bed = np.zeros((n, 2))
    pos = int(t0 * SR)
    while pos < n:
        j = min(n, pos + seg)
        bed[pos:j] += amb[:j - pos]
        pos += seg
    # 进/出淡出
    fi, fo = int(fade * SR), int(fade * SR)
    i0 = int(t0 * SR)
    bed[i0:i0 + fi] *= np.linspace(0, 1, fi)[:, None]
    bed[n - fo:] *= np.linspace(1, 0, fo)[:, None]
    return bed

def main():
    bgm = load(EP / SFX_DIR / 'bgm_morning.wav')
    n = int(DURATION * SR)
    if len(bgm) >= n:
        bgm = bgm[:n]
    else:
        bgm = np.pad(bgm, ((0, n - len(bgm)), (0, 0)))
    # BGM 尾 1.5s 淡出（结尾让位锅鸣）
    fo = int(1.5 * SR)
    bgm[n - fo:] *= np.linspace(1, 0, fo)[:, None]
    mix = bgm.copy() * 0.55

    sources = {'bgm': {'path': f'{SFX_DIR}/bgm_morning.wav', 'provider': 'volcano-seedaudio', 'gain': 0.55,
                       'sha256': hashlib.sha256((EP / SFX_DIR / 'bgm_morning.wav').read_bytes()).hexdigest()}}
    amb_name, amb_gain = AMBIENCE
    mix += build_bed(n, amb_name, amb_gain)
    sources['ambience'] = {'path': f'{SFX_DIR}/{amb_name}.wav', 'provider': 'volcano-seedaudio', 'gain': amb_gain,
                           'sha256': hashlib.sha256((EP / SFX_DIR / f'{amb_name}.wav').read_bytes()).hexdigest()}
    hb_name, hb_t0, hb_gain = HOTPOT_BED
    mix += build_bed(n, hb_name, hb_gain, t0=hb_t0, fade=1.0)
    sources['hotpot_bed'] = {'path': f'{SFX_DIR}/{hb_name}.wav', 'provider': 'volcano-seedaudio',
                             'gain': hb_gain, 't0': hb_t0,
                             'sha256': hashlib.sha256((EP / SFX_DIR / f'{hb_name}.wav').read_bytes()).hexdigest()}

    placed = []
    for t0, name, gain in EVENTS:
        sfx = load(EP / SFX_DIR / f'{name}.wav') * gain
        i = int(round(t0 * SR))
        j = min(n, i + len(sfx))
        mix[i:j] += sfx[:j - i]
        placed.append({'t': t0, 'sfx': name, 'gain': gain})
        key = f'sfx:{name}'
        if key not in sources:
            sources[key] = {'path': f'{SFX_DIR}/{name}.wav', 'provider': 'volcano-seedaudio',
                            'sha256': hashlib.sha256((EP / SFX_DIR / f'{name}.wav').read_bytes()).hexdigest()}

    # ── 对白（duck + 口型包络派生）──
    dlg = json.loads((EP / 'config/dialogue.json').read_text(encoding='utf-8'))
    duck = np.ones(n)
    voice_bus = np.zeros((n, 2))
    envs = []
    for line in dlg['lines']:
        v = load(EP / 'assets3d/dialogue' / f"{line['id']}.wav")
        t0 = line['t']
        vi = int(round(t0 * SR))
        vj = min(n, vi + len(v))
        voice_bus[vi:vj] += v[:vj - vi]
        # 口型能量包络（20ms 帧）：与混音同一音源同一零点
        vmono = v.mean(axis=1)
        hop = int(.02 * SR)
        env = np.sqrt(np.mean(np.pad(vmono, (0, (-len(vmono)) % hop))[:len(vmono) + (-len(vmono)) % hop]
                              .reshape(-1, hop) ** 2, axis=1))
        lo, hi = np.percentile(env, 15), max(np.percentile(env, 92), 1e-9)
        jaw = np.clip((env - lo) / (hi - lo) * 0.85, 0, 0.85)
        envs.append({'id': line['id'], 'speaker': line['speaker'], 't0': t0,
                     'dur': round(len(v) / SR, 3), 'dt': .02,
                     'jaw': [round(float(x), 3) for x in jaw]})
        # duck 窗（±0.3s）
        d0, d1 = max(0, vi - int(.3 * SR)), min(n, vj + int(.3 * SR))
        g = 10 ** (DUCK_DB / 20)
        ramp = int(DUCK_SMOOTH * SR)
        duck[d0:d1] = np.minimum(duck[d0:d1], g)
        duck[d0:d0 + ramp] = np.maximum(duck[d0:d0 + ramp],
                                        1 + (g - 1) * (0.5 - 0.5 * np.cos(np.pi * np.arange(ramp) / ramp)))
        duck[d1 - ramp:d1] = np.maximum(duck[d1 - ramp:d1],
                                        g + (1 - g) * (0.5 - 0.5 * np.cos(np.pi * np.arange(ramp) / ramp)))
        sources[f"voice:{line['id']}"] = {'path': f'assets3d/dialogue/{line["id"]}.wav', 't': t0,
                                          'provider': 'volcano-seedtts',
                                          'sha256': hashlib.sha256((EP / 'assets3d/dialogue' / f'{line["id"]}.wav').read_bytes()).hexdigest()}
    (EP / 'config/voice_envs.json').write_text(json.dumps({'lines': envs}, ensure_ascii=False), encoding='utf-8')
    mix *= duck[:, None]
    mix += voice_bus * 1.3

    peak = float(np.abs(mix).max())
    ceiling = 10 ** (-2.2 / 20)
    limited = False
    if peak > ceiling:
        mix *= ceiling / peak
        limited = True
    out = EP / 'assets3d/mixed.wav'
    sf.write(out, mix, SR, subtype='PCM_16')
    report = {'duration': DURATION, 'sr': SR, 'events': placed, 'sources': sources,
              'dialogue': [{'id': e['id'], 't': e['t0'], 'dur': e['dur']} for e in envs],
              'duck_db': DUCK_DB, 'voice_gain': 1.3,
              'peak_before': round(peak, 4), 'ceiling': round(ceiling, 4), 'normalized': limited,
              'mix_peak': round(float(np.abs(mix).max()), 4), 'mix_rms': round(rms(mix), 4)}
    (EP / 'assets3d/mix_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    print(json.dumps({'mixed': str(out), 'peak': report['mix_peak'], 'normalized': limited}, ensure_ascii=False))

if __name__ == '__main__':
    main()
