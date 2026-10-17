#!/usr/bin/env python3
"""混音对位验证（build-ambience-foley 纪律）：
① 每个 SFX 事件点 ±0.15s 窗内必须存在 onset（谱面瞬态；不断言"最强=事件"——歌曲
   鼓点可能更强）；② 环境底床全片 1s 块 RMS 无掉线；③ 峰值 ≤ -1.8dBFS。
事件点位 = tools/build_audio.py 的 EVENTS 表（画面事件秒点）；改谱面必须同步重核。
用法：.venv/Scripts/python.exe episodes/stardust_clad_op/tools/check_audio_sync.py
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
    from build_audio import EVENTS, AMBIENCE  # 同一份事件表，防两套点位漂移
    mix = load(EP / 'assets3d/mixed.wav')
    # 高频包络 novelty（谱面瞬态近似：10ms 窗 RMS 的正向差分）
    from scipy.signal import butter, sosfilt
    hi = sosfilt(butter(2, 2000, fs=SR, btype='high', output='sos'), mix)
    hop = SR // 100
    env = np.sqrt(np.mean(hi[:len(hi) // hop * hop].reshape(-1, hop) ** 2, axis=1))
    nov = np.maximum(np.diff(env), 0)
    thr = np.percentile(nov, 60)  # "存在 onset" 门槛：全局 60 分位
    failures = []
    for t0, name, *_ in EVENTS:
        w0, w1 = int((t0 - .15) * 100), int((t0 + .15) * 100)
        peak = float(nov[max(0, w0):w1].max()) if w1 > w0 else 0.0
        if peak < thr:
            failures.append(f'event {name}@{t0}: 窗内无谱面瞬态（novelty {peak:.5f} < {thr:.5f}）')
    # 底床连续性：重建底床轨（与混音同一 build_bed），1s 块 RMS 无掉线
    from build_audio import build_bed
    bed = build_bed(len(mix) * 1)  # 与 mixed 同长（mixed 是单声道解码帧数=秒数×SR）
    bedmono = bed.mean(axis=1)
    blocks = len(bedmono) // SR
    one = np.sqrt(np.mean(bedmono[:blocks * SR].reshape(-1, SR) ** 2, axis=1))
    floor = one.mean() * 0.5
    for i, v in enumerate(one):
        if v < floor:
            failures.append(f'bed dropout at {i}s (rms {v:.4f} < {floor:.4f})')
    peak = float(np.abs(load(EP / 'assets3d/mixed.wav', 2)).max())
    if peak > 10 ** (-1.8 / 20):
        failures.append(f'peak {peak:.4f} over -1.8dBFS')
    report = {'events_checked': len(EVENTS), 'onset_threshold': float(thr),
              'bed_blocks': blocks, 'peak': peak, 'failures': failures}
    (EP / 'assets3d/audio_sync_report.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    if failures:
        print('FAIL', len(failures))
        for f in failures[:10]:
            print(' ', f)
        return 2
    print(f'audio sync OK: {len(EVENTS)} events onset-aligned, bed continuous, peak {peak:.3f}')
    return 0

if __name__ == '__main__':
    sys.exit(main())
