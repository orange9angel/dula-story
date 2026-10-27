"""P6 混音：对白 / 环境床 / 事件 Foley / 音乐 四层总线 → assets3d/mixed.wav + 分轨 + 清单。

工艺基线 bio_armor_academy_s1e3 remix_audio.py（level_bed 三道验收、RMS 配比、ducking）。
本集特定：
- 对白峰一化 .5，摆点=dialogue.json 的 t（与 voice_envs.json 口型零点共用同一常量）。
- LadyMoon 台词过"远方"链（highpass 250 + lowpass 6500 + aecho 轻混响）——space=hall/distance=far
  允许的空间处理，不做 pitch/formant。
- 静默纪律：348-400 无音乐（audio_direction exclusions），TEAR_FALL 366-369 只有 palace_hush 床。
- 成片峰值 ≤ -2dBFS（AAC 留量，星屑 R2 口径）。
"""
from pathlib import Path
import hashlib, json, subprocess
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
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(SR),
                                   '-ac', '2', '-f', 'f32le', '-'])
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def load_voice(path, far=False):
    """对白读入；LadyMoon 走远方链（轻混响+带通，不动音高）。"""
    path = Path(path)
    SOURCE_FILES[str(path.relative_to(EP))] = dict(provider='volcano/seed-tts-2.0',
                                                   sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    af = ('highpass=f=250,lowpass=f=6500,aecho=0.5:0.4:45|90:0.22|0.12' if far else 'anull')
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-af', af,
                                   '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'])
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def rms(x):
    return float(np.sqrt(np.mean(x * x))) if len(x) else 0.0


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
    dlg = json.loads((EP / 'config/dialogue.json').read_text(encoding='utf-8'))
    duration = json.loads((EP / 'config/timeline.json').read_text(encoding='utf-8'))['duration']
    n = round(duration * SR)
    stems = {k: np.zeros((n, 2)) for k in ['dialogue', 'ambience', 'effects', 'music']}
    reports = {}

    def place(bus, x, start, gain=1, fade_in=.02, fade_out=.02):
        at = round(start * SR); m = min(len(x), n - at)
        if at < 0 or m <= 0:
            raise ValueError(f'cue outside timeline: {start}')
        y = x[:m].copy() * gain
        for fade, head in [(fade_in, True), (fade_out, False)]:
            k = min(round(fade * SR), m // 2)
            if k:
                if head:
                    y[:k] *= np.linspace(0, 1, k)[:, None]
                else:
                    y[-k:] *= np.linspace(1, 0, k)[:, None]
        bus[at:at + m] += y

    # ── 对白（峰一化 .5；摆点=voice_envs 口型零点同一 t）──
    active = np.zeros(n)
    for line in dlg['lines']:
        far = line['character'] == 'LadyMoon'
        x = load_voice(EP / f"assets3d/dialogue/{line['id']}.wav", far=far)
        place(stems['dialogue'], x, line['t'], .5 / max(float(np.abs(x).max()), 1e-9))
        dur = len(x) / SR
        a = max(0, round((line['t'] - .13) * SR)); b = min(n, round((line['t'] + dur + .15) * SR))
        active[a:b] = 1
    voice = stems['dialogue']; voiced = voice[np.max(np.abs(voice), axis=1) > .015]
    voice_rms = rms(voiced)
    duck = gaussian_filter1d(active, .075 * SR)

    def bed(name, low, high, rel_db, t0, t1):
        x = load(EP / f'assets3d/sfx/{name}.wav', 'volcano/seed-audio-1.0')
        x, reports[name] = level_bed(x, low, high)
        x = to_rms(x, voice_rms * 10 ** (rel_db / 20))
        stride = len(x) - SR * 2
        at = t0
        while at < t1:
            place(stems['ambience'], x, at, fade_in=2, fade_out=2)
            at += stride / SR

    # ── 环境床（区间=场景，边界 2s 交叉淡化）──
    bed('wind_snowtown', 70, 1600, -26, 0, 91)
    bed('gears_bed', 60, 1400, -27, 89, 184)
    bed('wind_towertop', 90, 2000, -25, 182, 276)
    bed('palace_hush', 120, 3000, -31, 274, 376)
    bed('wind_predawn', 70, 1500, -29, 374, 407)
    bed('birds_sunrise', 300, 6000, -28, 420, 478)

    # ── 事件 Foley（瞬态对位画面事件点；点位=timeline cues）──
    def event(name, start, gain=1):
        x = load(EP / f'assets3d/sfx/{name}.wav', 'volcano/seed-audio-1.0')
        place(stems['effects'], x, start, gain * .45 / max(float(np.abs(x).max()), 1e-9),
              fade_in=.004, fade_out=.12)

    # R2：脚步改逐 stance 对位（build_footsteps.py，接触时刻=bake planted 转换）
    for t in (27.583, 78.483):                  # 踩雪脚步 m04/m11：逐 stance 合成轨
        beat = 'm04' if t < 50 else 'm11'
        event(f'footsteps_walk_{beat}', t, .5)
    event('moon_shimmer_dim', 44.0, .18)        # MOON_DIM
    event('wind_gust', 51.0, .5)                # WIND_GUST（火苗颤动）
    event('lamp_out', 58.0, .3)                 # LAMP_OUT
    event('fireflies_gold', 58.5, .22)          # FIREFLIES
    event('door_creak', 85.0, .6)               # DOOR_CREAK
    event('metal_tap', 102.0, .35)              # METAL_TAP
    event('star_pulse', 150.0, .3)              # STAR_PULSE
    event('star_wake', 156.0, .5)               # STAR_WAKE
    event('glasses_drop', 163.0, .3)            # GLASSES_DROP
    event('star_resonance', 178.0, .4)          # RESONANCE
    event('gears_stop', 179.0, .5)              # GEARS_STOP
    event('skylight_open', 184.0, .5)           # SKYLIGHT
    event('moon_shimmer_dim', 193.0, .18)       # MOON_FADE
    event('wind_gust', 206.0, .55)              # WIND_HIGH（高处阵风）
    event('star_rise', 220.0, .45)              # STAR_RISE
    event('stars_swarm', 227.0, .35)            # STARS_SWARM（音乐同点渐入，压低让位）
    event('stair_form', 235.0, .5)              # STAIR_FORM
    event('step_ring', 263.0, .4)               # STEP_RING
    event('moon_shimmer_dim', 317.0, .18)       # MOONLIGHT_DIM
    event('one_spark', 348.0, .22)              # ONE_SPARK
    event('tear_break', 369.0, .6)              # TEAR_BREAK（泪碎银铃）
    event('star_fade', 382.0, .3)               # STAIR_FADE
    event('petal_touch', 396.3, .18)            # FIRST_PETAL（R2：花瓣落手背实测 396.3）
    event('snow_to_petal', 400.0, .35)          # SNOW_TO_PETAL（MUSIC_RETURN 同点，让位）
    event('bell_deep', 408.0, 1.0)              # BELL1 指针启动
    event('bell_deep', 413.0, .95)              # BELL2 枯树抽芽
    event('bell_deep', 418.0, 1.1)              # BELL3 窗灯亮起
    event('lamp_relight', 430.0, .4)            # LAMP_RELIGHT
    event('star_chest', 446.4, .35)             # STAR_CHEST（R2：胸口亮度实测 446.5）
    event('gold_text', 466.4, .3)               # GOLD_TEXT（R2：金粒聚集首见 466.5）

    # ── 音乐（RMS=人声-12dB，对白 duck -7dB；静默区 348-400 无音乐）──
    # A5（2026-10-27）：音乐层换 Suno v6-mini 素材（MP3 48k，ffmpeg 解码）；
    # 旧 Seed-Audio 4 支保留在 assets3d/music/_archive_seed_audio/。
    def music(name, t0, t1, rel_db=-12, fade_in=2.0, fade_out=2.0, gain=1.0,
              off=0.0, ext='wav', provider='volcano/seed-audio-1.0'):
        x = load(EP / f'assets3d/music/{name}.{ext}', provider)
        x = x[round(off * SR):]
        x = to_rms(x, voice_rms * 10 ** (rel_db / 20)) * gain
        m = min(len(x), round((t1 - t0) * SR))
        place(stems['music'], x[:m], t0, fade_in=fade_in, fade_out=fade_out)

    SUNO = 'suno/v6-mini'
    music('suno_piano_open_a', 0, 176.5, fade_in=2.5, fade_out=3, ext='mp3', provider=SUNO)
    music('suno_piano_open_b', 173.5, 230, fade_in=3, fade_out=3, ext='mp3', provider=SUNO)  # 与 a 交叉 3s
    # 选段 off=28s：起自源曲乐句间低电平点，源曲 148-158s 自然渐弱恰好落 347-348 收尽口
    music('suno_strings_choir', 227, 348, rel_db=-11.5, fade_in=3, fade_out=6,
          off=28, ext='mp3', provider=SUNO)
    # 选段 off=84s：源曲 161-167s 自然 dip 落 477s+；避开 168-181s 的末尾再高潮
    music('suno_spring_return', 400, 478, rel_db=-11, fade_in=2.5, fade_out=20,
          off=84, ext='mp3', provider=SUNO)  # fade_out 20s：458(FINALE_DIM) 起退净（FINALE_DIM/聚字/晚安），尾声仅铜灯
    stems['music'] *= 10 ** ((-7 * duck) / 20)[:, None]
    stems['ambience'] *= 10 ** ((-2 * duck) / 20)[:, None]

    mix = sum(stems.values()); peak = float(np.abs(mix).max())
    scale = min(1, 10 ** (-2.0 / 20) / max(peak, 1e-9))
    OUT = EP / 'assets3d/stems'
    OUT.mkdir(parents=True, exist_ok=True)
    for name, x in stems.items():
        sf.write(OUT / f'{name}_stem.wav', x * scale, SR, subtype='PCM_24')
    sf.write(EP / 'assets3d/mixed.wav', mix * scale, SR, subtype='PCM_24')
    report = dict(duration=duration, source_files=SOURCE_FILES, bed_qc=reports,
                  mix_peak_dbfs=float(20 * np.log10(max(peak * scale, 1e-12))),
                  global_gain=scale, voice_rms=voice_rms,
                  silence_policy='348-400 无音乐；TEAR_FALL 366-369 仅 palace_hush 床',
                  mix_sha256=hashlib.sha256((EP / 'assets3d/mixed.wav').read_bytes()).hexdigest())
    (OUT / 'mix_manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: report[k] for k in ['duration', 'mix_peak_dbfs', 'global_gain', 'voice_rms', 'bed_qc']},
                     ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
