#!/usr/bin/env python3
"""《星屑战壳》S1E1 混音对位验证（沿用 OP 工艺）：
① 每个 SFX 事件点 ±0.15s 窗内存在谱面瞬态；② 晨景底床 1s 块无掉线；③ 峰值 ≤ -1.8dBFS；
④ 每句对白窗口内人声声压高于底（voice bus 已混入 mixed）。
事件点位 = tools/build_audio.py 的 EVENTS 表；对白窗 = config/voice_envs.json（同一零点）。
用法：.venv/Scripts/python.exe episodes/stardust_clad_s1e1/tools/check_audio_sync.py
"""
from pathlib import Path
import json
import subprocess
import sys

import numpy as np

EP = Path(__file__).resolve().parents[1]
SR = 48000

def load(path, ch=1):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
                                   '-ar', str(SR), '-ac', str(ch), '-f', 'f32le', '-'])
    return np.frombuffer(raw, np.float32)

def main():
    from build_audio import EVENTS, AMBIENCE, build_bed
    mix = load(EP / 'assets3d/mixed.wav')
    from scipy.signal import butter, sosfilt
    hi = sosfilt(butter(2, 2000, fs=SR, btype='high', output='sos'), mix)
    hop = SR // 100
    env = np.sqrt(np.mean(hi[:len(hi) // hop * hop].reshape(-1, hop) ** 2, axis=1))
    nov = np.maximum(np.diff(env), 0)
    thr = np.percentile(nov, 60)
    failures = []
    for t0, name, *_ in EVENTS:
        w0, w1 = int((t0 - .15) * 100), int((t0 + .15) * 100)
        peak = float(nov[max(0, w0):w1].max()) if w1 > w0 else 0.0
        if peak < thr:
            failures.append(f'event {name}@{t0}: 窗内无谱面瞬态（novelty {peak:.5f} < {thr:.5f}）')
    # 晨景底床连续性（build_bed 单源重建）
    bed = build_bed(len(mix), AMBIENCE[0], AMBIENCE[1])
    bedmono = bed.mean(axis=1)
    blocks = len(bedmono) // SR
    one = np.sqrt(np.mean(bedmono[:blocks * SR].reshape(-1, SR) ** 2, axis=1))
    floor = one.mean() * 0.5
    for i, v in enumerate(one):
        if v < floor:
            failures.append(f'bed dropout at {i}s (rms {v:.4f} < {floor:.4f})')
    # 对白窗声压（mixed 直接量：对白窗应显著高于无对白参考段电平）
    envs = json.loads((EP / 'config/voice_envs.json').read_text(encoding='utf-8'))
    ref = float(np.sqrt(np.mean(mix[int(0.5 * SR):int(2.5 * SR)] ** 2)))  # establish 无对白段
    for e in envs['lines']:
        i0, i1 = int(e['t0'] * SR), int((e['t0'] + e['dur']) * SR)
        if i1 <= i0:
            failures.append(f"voice {e['id']}: 空窗口")
            continue
        v = float(np.sqrt(np.mean(mix[i0:i1] ** 2)))
        if v < ref * 1.15:
            failures.append(f"voice {e['id']}: 窗口声压 {v:.4f} 未显著超底 {ref:.4f}")
    peak = float(np.abs(load(EP / 'assets3d/mixed.wav', 2)).max())
    if peak > 10 ** (-1.8 / 20):
        failures.append(f'peak {peak:.4f} over -1.8dBFS')
    report = {'events_checked': len(EVENTS), 'onset_threshold': float(thr),
              'bed_blocks': blocks, 'voice_lines': len(envs['lines']),
              'peak': peak, 'failures': failures}
    (EP / 'assets3d/audio_sync_report.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    if failures:
        print('FAIL', len(failures))
        for f in failures[:10]:
            print(' ', f)
        return 2
    print(f"audio sync ok: {len(EVENTS)} events, bed {blocks}s, {len(envs['lines'])} lines, peak {peak:.4f}")

if __name__ == '__main__':
    sys.exit(main() or 0)
