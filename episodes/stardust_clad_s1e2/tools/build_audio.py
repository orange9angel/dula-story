#!/usr/bin/env python3
"""《星屑战壳》S1E1 混音总线：双段 BGM（晨曲 0-44 / 考核战 44-108）+ 晨景底床 + SFX 事件摆点 + 对白（duck 平滑）。
- BGM：assets3d/sfx/bgm_morning.wav + bgm_trial.wav（Seed-Audio）
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
DURATION = 120.000
SFX_DIR = 'assets3d/sfx'

def load(path):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
                                   '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'])
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)

def rms(x):
    return float(np.sqrt(np.mean(x * x)))

# SFX 事件总线：[时刻, 文件, 增益]（时刻=performance.js 的 T 表）
EVENTS = [
    (19.800, 'scroll_pop', 0.9),     # 防务评估令公文展开
    (46.200, 'dash_whoosh', 0.8),    # 阿鏊无脑冲锋
    (51.500, 'chopstick_tap', 1.0),  # c1 刃点盾（无脑冲的句点）
    (52.200, 'body_drop', 0.7),      # 阿鏊被点倒单膝触地
    (63.500, 'chopstick_tap', 0.9),  # c2 刃点肩甲（犹豫的句点）
    (72.800, 'whoosh_fast', 0.8),    # 大釜全力挥空
    (74.000, 'chopstick_tap', 0.9),  # c3 刃点背（蛮力的句点）
    (74.600, 'body_drop', 0.7),      # 大釜跪撑落地
    (92.500, 'whoosh_fast', 0.9),    # 大釜合掌抛出阿鏊
    (96.500, 'pot_shock', 1.0),      # c4 震堂·锅鸣一击（空中盾击被架开）
    (97.500, 'chopstick_barrage', 0.9), # 流星·双箸乱穿弹幕
    (98.600, 'star_net', 0.9),       # 天罗·星屑网侧翼收束
    (99.500, 'shield_block', 1.0),   # c5 盾阵接住乱穿（挣到的反扑顶点）
]
AMBIENCE = ('ambience_morning', 0.20)   # 晨风鸟鸣底床（全场循环）
# BGM 双段：晨曲铺巡逻/通告（0-44），考核战鼓点铺考核→谷底→合体→评语（44-108 淡出）
BGMS = [
    ('bgm_morning', 0.55, 0.0, 44.0, 2.0),
    ('bgm_trial', 0.60, 44.0, 112.0, 2.5),
]
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
    n = int(DURATION * SR)
    mix = np.zeros((n, 2))
    sources = {}
    # BGM 双段摆位（各自带首尾淡入淡出，段间不叠）
    for bgm_name, bgm_gain, t0, t1, fade in BGMS:
        bgm = load(EP / SFX_DIR / f'{bgm_name}.wav') * bgm_gain
        i0, i1 = int(t0 * SR), min(n, int(t1 * SR))
        seg = bgm[:i1 - i0]
        if len(seg) < i1 - i0:  # 不够长则尾部折头循环（build_bed 同源工艺）
            xr = int(1.5 * SR)
            w = np.linspace(0, 1, xr)[:, None]
            rep = seg.copy()
            rep[:xr] = seg[-xr:] * (1 - w) + seg[:xr] * w
            seg = rep[:-xr]
            tiled = np.zeros((i1 - i0, 2))
            pos = 0
            while pos < i1 - i0:
                j = min(i1 - i0, pos + len(seg))
                tiled[pos:j] += seg[:j - pos]
                pos += len(seg)
            seg = tiled
        fi = int(fade * SR)
        seg[:fi] *= np.linspace(0, 1, fi)[:, None]
        seg[-fi:] *= np.linspace(1, 0, fi)[:, None]
        mix[i0:i0 + len(seg)] += seg
        sources[f'bgm:{bgm_name}'] = {'path': f'{SFX_DIR}/{bgm_name}.wav', 'provider': 'volcano-seedaudio',
                                      'gain': bgm_gain, 'window': [t0, t1],
                                      'sha256': hashlib.sha256((EP / SFX_DIR / f'{bgm_name}.wav').read_bytes()).hexdigest()}
    amb_name, amb_gain = AMBIENCE
    mix += build_bed(n, amb_name, amb_gain)
    sources['ambience'] = {'path': f'{SFX_DIR}/{amb_name}.wav', 'provider': 'volcano-seedaudio', 'gain': amb_gain,
                           'sha256': hashlib.sha256((EP / SFX_DIR / f'{amb_name}.wav').read_bytes()).hexdigest()}

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
        v = v * (0.5 / max(np.abs(v).max(), 1e-9))  # R12：逐句峰一化 .5（响度统一，9章工艺）
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
