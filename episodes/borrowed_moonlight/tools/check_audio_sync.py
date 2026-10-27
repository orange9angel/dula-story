"""P6 声画对位：mixed.wav 在画面事件点 ±0.4s 窗做 onset 检测（librosa），
断言目标点 ±0.15s 内存在 onset（对白/BGM 的 onset 可能更强，只看"存在"，另记最强 onset）。
画面事件点位=timeline.json cues。报告 storyboard/p6_audio_sync/sync_report.json。
"""
from pathlib import Path
import json
import librosa
import numpy as np

EP = Path(__file__).resolve().parents[1]
SR = 48000

# (事件, 画面秒点, 依据)
TARGETS = [
    ('wind_gust', 51.0, 'm07 阵风/火苗颤动'),
    ('lamp_out', 58.0, 'm08 灯火熄灭'),
    ('door_creak', 85.0, 'm12 木门开启'),
    ('metal_tap', 102.0, 'm14 工作台上修星'),
    ('star_wake', 156.0, 'm21 星核苏醒'),
    ('gears_stop', 179.0, 'm24 齿轮停转（弱瞬态，宽判）'),
    ('skylight_open', 184.0, 'm25 天窗开启'),
    ('stair_form', 235.0, 'm32 星阶成形'),
    ('step_ring', 263.0, 'm36 靴落星阶'),
    ('tear_break', 369.0, 'm49 泪碎'),
    ('bell_1', 408.0, 'm55 钟第一响'),
    ('bell_2', 413.0, 'm56 钟第二响'),
    ('bell_3', 418.0, 'm57 钟第三响'),
    ('lamp_relight', 430.0, 'm59 铜灯重燃'),
    ('gold_text', 466.0, 'm63 金粒聚字'),
]
LOOSE = {'gears_stop': .35}  # 减速类事件瞬态天然拖尾


def main():
    y, sr = librosa.load(EP / 'assets3d/mixed.wav', sr=SR, mono=True)
    rows, failures = [], []
    for name, t0, note in TARGETS:
        a, b = int((t0 - .4) * SR), int((t0 + .4) * SR)
        seg = y[a:b]
        env = librosa.onset.onset_strength(y=seg, sr=SR)
        peaks = librosa.onset.onset_detect(onset_envelope=env, sr=SR, units='time')
        limit = LOOSE.get(name, .15)
        if not len(peaks):
            rows.append(dict(event=name, target=t0, nearest_onset=None, note=note))
            failures.append(f'{name}: no onset in window')
            continue
        frames = np.clip((peaks * SR / 512).astype(int), 0, len(env) - 1)
        strongest = peaks[int(np.argmax(env[frames]))]
        nearest = peaks[int(np.argmin(np.abs(peaks - .4)))]
        offset = nearest - .4
        rows.append(dict(event=name, target=t0, nearest_onset=round(t0 + offset, 3),
                         offset_s=round(offset, 3), strongest_onset=round(t0 + strongest - .4, 3),
                         limit=limit, note=note))
        if abs(offset) > limit:
            failures.append(f'{name}: nearest onset off by {offset:+.3f}s (limit ±{limit}s)')
    out = EP / 'storyboard/p6_audio_sync'
    out.mkdir(parents=True, exist_ok=True)
    report = dict(passed=not failures, rows=rows, failures=failures)
    (out / 'sync_report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=1))
    if failures:
        raise SystemExit(2)
    print('audio sync: all events aligned')


if __name__ == '__main__':
    main()
