#!/usr/bin/env python3
"""《星屑战壳》S1E2《夜守》混音总线：双段 BGM（夜守 0-140 / 夜战 140-296）+ 夜旷野底床（厚）+ 火盆噼啪层 + SFX 事件摆点 + 对白（duck 平滑）。
- BGM/底床/事件全 Seed-Audio（assets3d/sfx/，火山-only 规则）
- 对白：assets3d/dialogue/<id>.wav（seed-tts-2.0），摆点=config/dialogue.json 的 t
  （零点=谱面零点；口型包络从最终放置的同一 PCM 派生 → config/voice_envs.json）
- 峰值上限 -2.2dBFS（AAC 过冲留量，OP R2 教训）
- 产物：assets3d/mixed.wav（48kHz 双声道）+ assets3d/mix_report.json + config/voice_envs.json

用法（dula-story 根）：.venv/Scripts/python.exe episodes/stardust_clad_s1e2/tools/build_audio.py
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
DURATION = 320.000
SFX_DIR = 'assets3d/sfx'

def load(path):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
                                   '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'])
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)

def rms(x):
    return float(np.sqrt(np.mean(x * x)))

# SFX 事件总线：[时刻, 文件, 增益]（时刻=performance.js 的 T 表）
EVENTS = [
    (124.500, 'shield_bang', 1.0),   # 敲盾为号
    (121.000, 'beast_growl', 0.8),   # 兽踏出黑暗
    (149.500, 'beast_roar', 0.9),    # 扑击起跳
    (152.000, 'claw_scrape', 1.0),   # c1 兽爪抓盾
    (172.900, 'beast_roar', 0.7),    # 大釜挥空瞬间兽低吼
    (178.000, 'beast_charge', 1.0),  # c2 肩撞撞飞
    (206.000, 'disc_clatter', 0.9),  # 盘脱手滚落
    (252.400, 'rain_burst', 1.0),    # 千孔·银星雨爆发
    (256.000, 'crater_slam', 0.5),   # 弹雨压点（轻铺垫）
    (276.000, 'crater_slam', 1.0),   # c4 陨星·釜底落
    (295.500, 'beast_flee', 0.9),    # 兽醒逃入夜
]
AMBIENCE = ('ambience_night', 0.30)   # 夜旷野底床（厚：氛围感=大片感，存在感强于 S1E1）
FIRE_BED = ('fire_crackle', 0.16, 14.0, 316.0)  # 圣殿火盆噼啪层（圣殿段在画面内）
# BGM 双段：夜守沉隐（0-140），夜战压迫→爆发→落定（140-296 淡出，余韵留底床）
BGMS = [
    ('bgm_nightwatch', 0.50, 0.0, 140.0, 3.0),
    ('bgm_nightbattle', 0.58, 140.0, 296.0, 3.0),
]
DUCK_DB = -6.0
DUCK_SMOOTH = 0.150

def build_bed(n, name, gain, t0=0.0, fade=0.8):
    """循环底床铺满 [t0,end]：先把源文件尾部 1.5s 折进头部做无缝环（loop repair），
    再平铺——段间叠化在稀疏内容上会造成接缝电平 dip（S1E1 晨风底床翻车实录），
    源内折尾比铺排时叠化干净。fade 进/出。
    S1E2 增补：慢 AGC 抬平生成源自身的起淡低谷（夜风床起音 fade-in 会在每个循环节
    造成 dropout——增益域 0.8-2.2、1s uniform_filter1d 平滑防泵浦；np.convolve 全核
    在 75s×48k 会挂起，别用）。"""
    amb = load(EP / SFX_DIR / f'{name}.wav') * gain
    xr = int(1.5 * SR)
    if len(amb) > 2 * xr:
        w = np.linspace(0, 1, xr)[:, None]
        repaired = amb.copy()
        repaired[:xr] = amb[-xr:] * (1 - w) + amb[:xr] * w  # 尾部折进头部
        amb = repaired[:-xr]
    # 慢 AGC：1s 块 RMS 相对中位数的低谷抬平
    from scipy.ndimage import uniform_filter1d
    mono = np.abs(amb).mean(axis=1)
    blk = SR
    nb = len(mono) // blk
    if nb >= 4:
        block = np.sqrt(np.mean(mono[:nb * blk].reshape(nb, blk) ** 2, axis=1))
        med = np.median(block)
        g = np.clip(med / np.maximum(block, 1e-6), 0.8, 2.2)
        gsm = uniform_filter1d(g, size=3)
        gfull = np.repeat(gsm, blk)
        if len(gfull) < len(amb):
            gfull = np.pad(gfull, (0, len(amb) - len(gfull)), constant_values=gsm[-1])
        amb *= gfull[:len(amb)][:, None]
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
    fb_name, fb_gain, fb_t0, fb_t1 = FIRE_BED
    fb = build_bed(n, fb_name, fb_gain, t0=fb_t0, fade=1.2)
    fb[int(fb_t1 * SR):] = 0
    mix += fb
    sources['fire_bed'] = {'path': f'{SFX_DIR}/{fb_name}.wav', 'provider': 'volcano-seedaudio',
                           'gain': fb_gain, 'window': [fb_t0, fb_t1],
                           'sha256': hashlib.sha256((EP / SFX_DIR / f'{fb_name}.wav').read_bytes()).hexdigest()}

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
