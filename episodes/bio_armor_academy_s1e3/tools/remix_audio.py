"""S1E3 混音：对白 / 环境床 / 事件 Foley / BGM 四层总线，对白 ducking，峰值压到 -1.5dBFS。

只动音乐/音效时直接改本文件重跑；对白对齐与视素归 build_audio.py。
环境床节律验收（RMS 包络 max/mean<1.4、0.5-1s 自相关<0.15、4-8kHz 嘶声<0.2，
超标 EQ + 0.4s 滑动包络归一化兜底）沿用 S1E2 level_bed 工艺。
"""
from pathlib import Path
import hashlib
import json
import subprocess
import numpy as np
import soundfile as sf
from scipy.ndimage import gaussian_filter1d, uniform_filter1d
from scipy.signal import butter, sosfilt, welch, correlate

EP = Path(__file__).resolve().parents[1]
SR = 48000
SOURCE_FILES = {}


def load(path, provider):
    path = Path(path)
    SOURCE_FILES[str(path.relative_to(EP))] = dict(provider=provider, sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'])
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def rms(x):
    return float(np.sqrt(np.mean(x * x)))


def to_rms(x, target):
    return x * (target / max(rms(x), 1e-9))


def bed_metrics(x):
    y = x.mean(axis=1); blocks = len(y) // SR
    one = np.sqrt(np.mean(y[:blocks * SR].reshape(-1, SR) ** 2, axis=1))
    hop = SR // 100
    env = np.sqrt(np.mean(y[:len(y) // hop * hop].reshape(-1, hop) ** 2, axis=1)); env -= env.mean()
    corr = correlate(env, env, mode='full', method='fft')[len(env) - 1:]; corr /= max(corr[0], 1e-12)
    f, p = welch(y, SR, nperseg=8192)
    return dict(rms_max_mean=float(one.max() / max(one.mean(), 1e-12)),
                envelope_corr_05_1s=float(np.max(corr[50:101])),
                high_band_4_8k=float(p[(f >= 4000) & (f < 8000)].sum() / max(p.sum(), 1e-12)))


def level_bed(x, low, high):
    x = sosfilt(butter(2, [low, high], fs=SR, btype='bandpass', output='sos'), x, axis=0)
    before = bed_metrics(x)
    power = uniform_filter1d(np.mean(x * x, axis=1), size=round(.4 * SR), mode='reflect')
    floor = max(float(np.percentile(power, 25)) * .12, 1e-10)
    x = x / np.sqrt(np.maximum(power, floor))[:, None]
    after = bed_metrics(x)
    return x, dict(before=before, after=after,
                   treatment=f'bandpass {low}-{high}Hz; shared 0.4s RMS envelope normalization')


def main():
    tl = json.loads((EP / 'config/timeline.json').read_text(encoding='utf-8'))
    duration = tl['duration']; n = round(duration * SR)
    stems = {name: np.zeros((n, 2)) for name in ['dialogue', 'ambience', 'effects', 'music']}
    reports = {}

    def place(bus, x, start, gain=1, fade_in=.02, fade_out=.02):
        at = round(start * SR); m = min(len(x), n - at)
        if at < 0 or m <= 0:
            raise ValueError('Cue outside timeline')
        y = x[:m].copy() * gain
        for fade, head in [(fade_in, True), (fade_out, False)]:
            k = min(round(fade * SR), m // 2)
            if k:
                if head:
                    y[:k] *= np.linspace(0, 1, k)[:, None]
                else:
                    y[-k:] *= np.linspace(1, 0, k)[:, None]
        bus[at:at + m] += y

    # ── 对白（峰一化 .55，S1E2 同款）──
    active = np.zeros(n)
    for line in tl['dialogue']:
        x = load(EP / f"tmp/proc/{line['id']}.wav", 'volcano/seed-tts-2.0')
        place(stems['dialogue'], x, line['start'], .55 / max(float(np.abs(x).max()), 1e-9))
        a = max(0, round((line['start'] - .13) * SR)); b = min(n, round((line['end'] + .15) * SR))
        active[a:b] = 1
    voice = stems['dialogue']; voiced = voice[np.max(np.abs(voice), axis=1) > .015]
    voice_rms = rms(voiced)
    duck = gaussian_filter1d(active, .08 * SR)

    def loop_bed(name, low, high, rel_db):
        x = load(EP / f'assets3d/sfx/{name}.wav', 'volcano/seed-audio-1.0')
        x, reports[name] = level_bed(x, low, high)
        x = to_rms(x, voice_rms * 10 ** (rel_db / 20))
        stride = len(x) - SR * 2  # 等功率重叠窗，无突兀循环接缝
        for at in range(0, n, stride):
            place(stems['ambience'], x, at / SR, fade_in=2, fade_out=2)

    # ── 环境床：正午微风 + 远操场 + 蝉鸟 ──
    loop_bed('wind_noon', 70, 1700, -26)
    loop_bed('playground_distant', 100, 4000, -32)
    loop_bed('birds_noon', 450, 5500, -34)

    # ── 事件 Foley（瞬态对齐可见接触；日常集电平压低）──
    def event(name, start, gain=1):
        x = load(EP / f'assets3d/sfx/{name}.wav', 'volcano/seed-audio-1.0')
        place(stems['effects'], x, start, gain * .45 / max(float(np.abs(x).max()), 1e-9),
              fade_in=.004, fade_out=.12)

    event('door_close', 10.1, .30)          # 雷晓带上门
    event('door_slam', 13.80, .75)          # 轰刚撞门（视觉 13.55-13.85 全开+回弹）
    event('sit_down', 13.72, .30)           # 雷晓落座
    event('sit_down', 21.80, .45)           # 轰刚落座（更重）
    event('bento_open', 21.95, .35)         # 第二盒放上矮沿
    event('bento_open', 22.60, .30)         # 轰刚开盒显摆
    event('skewer_pick', 41.20, .35)        # 插签
    event('chew_soft', 47.60, .20)          # 雷晓咬下第一口
    for t in (55.9, 58.9, 61.9, 64.9):      # 空拍咀嚼（雷晓节拍 3.0s）
        event('chew_soft', t, .10)
    for t in (57.0, 59.6, 62.2, 64.8):      # 轰刚节拍 2.6s 错开
        event('chew_soft', t, .10)
    # 微光瞬间：极轻能量心跳（S1E2 已验收资产复用，压到很低——日常集不是打斗集）
    x = load(EP / 'assets3d/sfx/heartbeat_core.wav', 'volcano/seed-audio-1.0 (S1E2 asset reuse)')
    place(stems['effects'], x, 52.1, .18 * .45 / max(float(np.abs(x).max()), 1e-9), fade_in=.05, fade_out=.8)

    # ── BGM：日常暖意器乐 cue 全片铺底，对白 ducking ──
    music = load(EP / 'assets3d/music/rooftop_noon_theme.wav', 'volcano/seed-audio-1.0')
    music = to_rms(music, voice_rms * 10 ** (-24 / 20))
    place(stems['music'], music, 0, fade_in=1.5, fade_out=4)
    stems['music'] *= 10 ** ((-8 * duck) / 20)[:, None]
    stems['ambience'] *= 10 ** ((-2 * duck) / 20)[:, None]

    mix = sum(stems.values()); peak = float(np.abs(mix).max())
    scale = min(1, 10 ** (-1.5 / 20) / max(peak, 1e-9))
    OUT = EP / 'assets3d/refinement'
    OUT.mkdir(parents=True, exist_ok=True)
    for name, x in stems.items():
        sf.write(OUT / (name + '_stem.wav'), x * scale, SR, subtype='PCM_24')
    sf.write(EP / 'assets3d/mixed.wav', mix * scale, SR, subtype='PCM_24')
    report = dict(duration=duration, source_files=SOURCE_FILES,
                  bed_qc=reports, mix_peak_dbfs=float(20 * np.log10(max(peak * scale, 1e-12))),
                  global_gain=scale, voice_rms=voice_rms,
                  mix_sha256=hashlib.sha256((EP / 'assets3d/mixed.wav').read_bytes()).hexdigest())
    (OUT / 'mix_manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: report[k] for k in ['duration', 'mix_peak_dbfs', 'global_gain', 'voice_rms', 'bed_qc']},
                     ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
