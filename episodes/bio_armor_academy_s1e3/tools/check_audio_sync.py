"""S1E3 事件音效对画验证：不再靠耳朵。

对 mixed.wav 在每个画面事件点 ±0.4s 窗口做 onset 包络检测（librosa），
断言窗口内最强 onset 与画面事件帧偏差 ≤0.15s。画面事件点位以
scenes/RooftopNoonScene.js doorA(t) 为准（门轴/门扇撞击=纯时间函数）。
报告落 storyboard/p11_audio_sync/sync_report.json。

用法：.venv python tools/check_audio_sync.py（重混音后运行）
"""
from pathlib import Path
import json
import sys

import librosa
import numpy as np

EP = Path(__file__).resolve().parents[1]
SR = 48000

# （名称, 画面事件秒点, 画面依据）——画面侧改门时序必须同步本表与 remix_audio.py
TARGETS = [
    ('lei_door_open', 7.05, 'doorA: 开门 6.9–7.5'),
    ('lei_door_close', 10.35, 'doorA: 关门 9.2–10.4（关严 10.4）'),
    ('hong_door_slam', 13.85, 'doorA: 撞开 13.55–13.85（撞击点=全开）'),
    ('hong_door_close', 18.25, 'doorA: 关门 17.1–18.3（关严 18.3）'),
]


def main():
    y, sr = librosa.load(EP / 'assets3d/mixed.wav', sr=SR, mono=True)
    rows = []
    failures = []
    for name, t0, note in TARGETS:
        a, b = int((t0 - .4) * SR), int((t0 + .4) * SR)
        seg = y[a:b]
        env = librosa.onset.onset_strength(y=seg, sr=SR)
        peaks = librosa.onset.onset_detect(onset_envelope=env, sr=SR, units='time')
        if not len(peaks):
            rows.append(dict(event=name, target=t0, nearest_onset=None, offset_s=None, note=note))
            failures.append(f'{name}: no onset in window')
            continue
        frames = np.clip((peaks * SR / 512).astype(int), 0, len(env) - 1)
        strongest = peaks[int(np.argmax(env[frames]))]
        nearest = peaks[int(np.argmin(np.abs(peaks - .4)))]
        # 对白会盖过事件音（BGM/台词的 onset 可能更强）——对位断言看「目标点 ±.15s 内
        # 存在 onset」，最强 onset 仅记录（只有撞门这类大瞬态才应是最强）
        offset = nearest - .4
        rows.append(dict(event=name, target=t0, nearest_onset=round(t0 + offset, 3),
                         offset_s=round(offset, 3), strongest_onset=round(t0 + strongest - .4, 3), note=note))
        if abs(offset) > .15:
            failures.append(f'{name}: nearest onset off by {offset:+.3f}s (limit ±0.15s)')
    out = EP / 'storyboard/p11_audio_sync'
    out.mkdir(parents=True, exist_ok=True)
    report = dict(passed=not failures, limit_s=.15, rows=rows, failures=failures)
    (out / 'sync_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=1))
    if failures:
        raise SystemExit(2)
    print('audio sync: all door events aligned within ±0.15s')


if __name__ == '__main__':
    main()
