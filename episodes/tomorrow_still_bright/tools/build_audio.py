"""T4 混音：对白 / 环境床 / 事件 Foley / 音乐 四层总线 → assets3d/mixed.wav + 分轨 + 清单。

工艺基线 borrowed_moonlight P6 remix_audio_r3.py（level_bed 三道验收、RMS 配比、ducking）。
本集特定：
- 对白峰一化 .5，摆点=config/dialogue.json 的 t（绝对秒，script.story 时轴）。
  EVA=轻 PA 链（highpass180+lowpass7000+轻 aecho）；Girl=旧录音链（bandpass 320-3400
  +bed_tape 底噪垫 +轻房间）——空间/距离处理，不动音高共振峰。
- Foley 摆点全部来自 config/contact_events.json 绝对秒（T1 最终画面导出），不估秒；
  每个 event() 调用注释注明 contact id。
- 静默纪律（bible 六节）：0-120s 无音乐；s11 MUSIC_HALT 160-177 音乐压没；
  s21 SILENCE_BEAT 320-321 全总线物理静音；s19 音乐盒片段=s29 完整主题同源裁剪。
- duck 纪律照 P6：音乐 RMS=人声-12dB，对白 duck 音乐 -7dB / 环境床 -2dB（75ms 高斯平滑）。
- 成片峰值上限 -3.8dBFS（监制令），只缩不放。
"""
from pathlib import Path
import hashlib, json, subprocess, sys
import numpy as np
import soundfile as sf
from scipy.ndimage import gaussian_filter1d, uniform_filter1d
from scipy.signal import butter, sosfilt, welch, correlate

EP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(EP.parents[2] / 'dula-skills/build-ambience-foley/scripts'))
sys.path.insert(0, str(EP.parents[2] / 'dula-skills/direct-episode-audio/scripts'))
from bed_loop import bounded_bed
from mix_envelopes import smooth_activity
SR = 48000
SOURCE_FILES = {}

# Suno 音乐盒主题完整版裁剪参数（实测：主题首音 onset 0.12s，前五音 0.12-2.4s）
MUSICBOX_FULL = dict(file='suno_musicbox_a', ext='mp3', off=0.0)
FRAG = dict(off=0.1, len=2.6, wind_down=1.4)   # s19 片段：完整版开头五音 + 发条拧停衰减


def load(path, provider):
    path = Path(path)
    SOURCE_FILES[str(path.relative_to(EP))] = dict(provider=provider, sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(SR),
                                   '-ac', '2', '-f', 'f32le', '-'])
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def load_voice(path, chain):
    path = Path(path)
    SOURCE_FILES[str(path.relative_to(EP))] = dict(provider='volcano/seed-tts-2.0',
                                                   sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    af = {'dry': 'anull',
          'pa': 'highpass=f=180,lowpass=f=7000,aecho=0.4:0.3:30|60:0.15|0.08',
          'tape': 'highpass=f=320,lowpass=f=3400,aecho=0.5:0.25:40:0.10'}[chain]
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

    # ── 对白（峰一化 .5；EVA=pa 链 / Girl=tape 链）──
    active = np.zeros(n)
    for line in dlg['lines']:
        chain = 'tape' if line['character'] == 'Girl' else 'pa'
        x = load_voice(EP / f"assets3d/dialogue/{line['id']}.mp3", chain)
        place(stems['dialogue'], x, line['t'], .5 / max(float(np.abs(x).max()), 1e-9))
        dur = len(x) / SR
        a = max(0, round((line['t'] - .13) * SR)); b = min(n, round((line['t'] + dur + .15) * SR))
        active[a:b] = 1
    voice = stems['dialogue']; voiced = voice[np.max(np.abs(voice), axis=1) > .015]
    voice_rms = rms(voiced)
    duck = smooth_activity(active, SR)

    def bed(name, low, high, rel_db, t0, t1, fade_in=1.4, fade_out=1.5):
        x = load(EP / f'assets3d/sfx/{name}.wav', 'volcano/seed-audio-1.0')
        x, reports[name] = level_bed(x, low, high)
        x = to_rms(x, voice_rms * 10 ** (rel_db / 20))
        fitted = bounded_bed(x, round((t1 - t0) * SR), SR, fade_in=fade_in, fade_out=fade_out)
        place(stems['ambience'], fitted, t0, fade_in=0, fade_out=0)
        reports[name]['cue'] = [t0, t1]

    # ── 环境床（区间=场景；边界交叠由 fade 承担）──
    bed('bed_station_hum', 50, 900, -27, 0, 302)                    # 舱体低频（s01-s19）
    bed('bed_ventilation', 150, 2500, -30, 112, 178)                # 温室通风（s08-s11）
    bed('bed_powerroom', 40, 700, -25, 300, 348)                    # 能源室低频（s20-s22）
    bed('bed_tape', 200, 6000, -30, 254.5, 283.0, fade_in=.4, fade_out=.05)  # 录音底噪，283 戛然而止
    bed('bed_cockpit', 60, 1200, -28, 380, 480, fade_out=3.0)       # 舱内底噪收尾（s25-s32）

    # ── 事件 Foley（摆点=config/contact_events.json 绝对秒；注释=contact id）──
    # Seed-Audio 素材自带前导淡入（实测攻击点内偏 0.18-0.44s）——impact 类按素材内
    # RMS 首达 15% 峰值的攻击点回退摆放，保证瞬头精确落在接触帧。
    def attack_offset(x):
        hop = 128
        mono = np.abs(x).max(axis=1)
        nblk = len(mono) // hop
        e = mono[:nblk * hop].reshape(-1, hop).max(axis=1)
        pk = e.max()
        if pk < 1e-6:
            return 0.0
        idx = int(np.argmax(e >= pk * .15))
        return min(idx * hop / SR, .6)

    def event(name, start, gain=1, align=True):
        x = load(EP / f'assets3d/sfx/{name}.wav', 'volcano/seed-audio-1.0')
        off = attack_offset(x) if align else 0.0
        place(stems['effects'], x, start - off, gain * .45 / max(float(np.abs(x).max()), 1e-9),
              fade_in=.004, fade_out=.12)

    event('wheel_squeak', 18.5, .8, align=False)        # wheel_roll（slide 18.5-29.5，素材 12s 自然覆盖）
    event('oil_spray', 30.0, .9)           # oil_spray
    event('leg_squeak', 38.0, .8)          # leg_squeak（34 轮静后留 1s 静默，38 腿响）
    event('switch_click', 51.0, .9)        # switch_1
    event('switch_click', 54.5, .9)        # switch_2
    event('switch_click', 58.0, .9)        # switch_3
    event('switch_click', 61.5, .9)        # switch_4
    event('scan_beep', 66.0, .8)           # scan_drawing
    event('breaker', 81.0, 1.0)            # breaker
    event('fan_stop', 84.0, .7, align=False)            # fan_stop（state 84-90 指数衰减）
    event('screw_drop', 90.0, .7)          # screw_drop
    event('door_creak', 100.5, .9, align=False)         # door_creak（slide 100.5-104）
    event('air_light', 130.0, .6, align=False)          # leaf_air_bend（window 130-133）
    event('scan_beep', 146.0, .8)          # scan_life
    event('headlamp_place', 181.5, .7)     # headlamp_place
    event('drawer_slide', 193.5, .9, align=False)       # drawer_slide_1（slide 193.5-195）
    event('battery_place', 197.5, .7)      # battery_a_out（window 196.5-199，取放中点）
    event('battery_place', 202.2, .7)      # battery_b_out（window 201-203.5）
    event('drawer_slide', 209.5, .9, align=False)       # drawer_slide_2（slide 209.5-211）
    event('label_peel', 211.0, .7)         # label_peel
    event('battery_place', 218.0, .7)      # battery_c_back
    event('battery_drag', 225.5, .8, align=False)       # big_battery_drag（slide 225.5-232.5）
    event('parts_scatter', 233.0, 1.0)     # parts_scatter
    event('screw_roll', 233.2, .6, align=False)         # screw_roll（slide 233.2-234.5）
    event('screw_ping', 246.0, .9)         # screw_ping（清亮叮）
    event('cloth_rustle', 250.0, .6)       # screw_pocket
    event('musicbox_wind', 288.0, .8, align=False)      # musicbox_wind（slide 288-292）
    event('chest_open', 334.5, .8)         # chest_open
    event('alarm_short', 335.0, .9)        # ALARM_SHORT（同 cue）
    event('screw_back', 339.0, .7, align=False)         # chest_screw_back（window 339-342.5）
    event('meter_beep', 350.0, .8)         # meter_probe 1/3
    event('meter_beep', 352.5, .8)         # meter_probe 2/3
    event('meter_beep', 355.0, .8)         # meter_probe 3/3
    event('weld_sparks', 367.0, 1.0)       # weld_contact（火星飞出接触帧）
    event('light_online', 384.0, .8)       # light_online
    event('cup_clink', 400.0, 1.0)         # cup_place_1（第一次倾斜）
    event('cup_clink', 404.0, .6)          # cup_place_2（更轻）
    event('cup_clink', 408.0, .85)         # cup_place_3（落定）
    event('habitat_connect', 415.0, 1.1)   # habitat_connect（弦乐下让位增益）
    event('gate_far', 431.0, .9)           # GATE_FAR（同 cue，远处闸门）
    event('paper_rustle', 434.5, .7)       # drawing_pocket（window 434.5-436）
    event('power_down_far', 450.0, .7)     # last_light_out（空间站最后一盏灯）
    event('sit_down', 462.5, .6)           # sit_down（window 461-464，落座接触）

    # ── 音乐（Suno v6；静默纪律：0-120 无音乐、160-177 MUSIC_HALT、320-321 全静默）──
    SUNO = 'suno/v6'
    music_q = {}

    def music(name, t0, t1, rel_db=-12, fade_in=2.0, fade_out=2.0, gain=1.0,
              off=0.0, ext='mp3', provider=SUNO, seg=None):
        x = load(EP / f'assets3d/music/{name}.{ext}', provider)
        x = x[round(off * SR):]
        x = to_rms(x, voice_rms * 10 ** (rel_db / 20)) * gain
        m = min(len(x), round((t1 - t0) * SR))
        place(stems['music'], x[:m], t0, fade_in=fade_in, fade_out=fade_out)
        if seg:
            music_q[seg] = dict(src=name, off=off, cue=[t0, t1], rel_db=rel_db, gain=gain)

    # 稀疏段 120-162（温室好奇段；bible「只在好奇时点缀」），MUSIC_HALT@162 自然收尽；
    # 之后 120-240 只剩两个单音点缀（180/213），不铺连续音乐
    music('suno_sparse_a', 120, 162, rel_db=-13, fade_in=5, fade_out=2.5, seg='sparse')
    halt = np.ones(n)
    a, b = round(160 * SR), round(177 * SR)
    ramp = round(1.2 * SR)
    halt[a:a + ramp] = np.linspace(1, 0, ramp)
    halt[a + ramp:b - ramp] = 0
    halt[b - ramp:b] = np.linspace(0, 1, ramp)

    # s19 音乐盒片段：与 s29 完整主题同源（同一 Suno 完整版裁剪，四五音即断 + 发条衰减）
    mb = load(EP / f"assets3d/music/{MUSICBOX_FULL['file']}.{MUSICBOX_FULL['ext']}", SUNO)
    frag = mb[round(FRAG['off'] * SR):round((FRAG['off'] + FRAG['len'] + FRAG['wind_down']) * SR)].copy()
    kl = round(FRAG['len'] * SR)
    frag[kl:] *= np.linspace(1, 0, len(frag) - kl)[:, None]       # 四五音后拧停衰减
    frag = to_rms(frag, voice_rms * 10 ** (-11 / 20))
    place(stems['music'], frag, 289.5, fade_in=.05, fade_out=0)
    music_q['musicbox_fragment'] = dict(src=MUSICBOX_FULL['file'], off=FRAG['off'],
                                        cue=[289.5, 289.5 + FRAG['len'] + FRAG['wind_down']],
                                        same_melody_as='musicbox_full')

    # 弦乐渐入 340-430（bible 四段）：源曲 off=100（100-120 平稳→120-140 低谷→140-150 最盛
    # →180-190 自然淡出），映射 380-390 绽放段恰好托住 s25 灯亮@384；焊接火星在 effects 层
    music('suno_strings_a', 340, 430, rel_db=-13, fade_in=6, fade_out=5, off=100, seg='strings')

    # 音乐盒主题完整钢琴旋律 442-479（bible 五段 430-480；s28 末 442 入，尾留舱内底噪）
    full = mb[round(MUSICBOX_FULL['off'] * SR):]
    full = to_rms(full, voice_rms * 10 ** (-11.5 / 20))
    m = min(len(full), round((479 - 442) * SR))
    place(stems['music'], full[:m], 441.88, fade_in=1.0, fade_out=6)   # 首音（源内 0.12s）落 442
    music_q['musicbox_full'] = dict(src=MUSICBOX_FULL['file'], off=MUSICBOX_FULL['off'],
                                    cue=[442, 479])

    # 单音点缀（s12 钢琴单音@180 / s14 木琴两音@213，bible 音乐层）——Suno 稀疏段提取或兜底素材
    accent_piano = load(EP / 'assets3d/music/accent_piano_single.wav', 'derived from suno sparse (fallback: volcano/seed-audio-1.0)')
    accent_xylo = load(EP / 'assets3d/music/accent_xylo_two.wav', 'derived from suno sparse (fallback: volcano/seed-audio-1.0)')
    for acc, t, g in [(accent_piano, 180.0, 1.0), (accent_xylo, 213.0, 1.0)]:
        a2 = to_rms(acc, voice_rms * 10 ** (-11 / 20)) * g
        place(stems['music'], a2, t, fade_in=.01, fade_out=.8)

    stems['music'] *= halt[:, None]
    stems['music'] *= 10 ** ((-7 * duck) / 20)[:, None]
    stems['ambience'] *= 10 ** ((-2 * duck) / 20)[:, None]

    mix = sum(stems.values())
    # SILENCE_BEAT：s21 320-321 全总线物理静音（50ms 斜坡）
    sil = np.ones(n)
    sa, sb = round(320 * SR), round(321 * SR)
    r50 = round(.05 * SR)
    sil[sa - r50:sa] = np.linspace(1, 0, r50)
    sil[sa:sb] = 0
    sil[sb:sb + r50] = np.linspace(0, 1, r50)
    mix *= sil[:, None]

    peak = float(np.abs(mix).max())
    scale = min(1, 10 ** (-3.8 / 20) / max(peak, 1e-9))
    OUT = EP / 'assets3d/stems'
    OUT.mkdir(parents=True, exist_ok=True)
    for name, x in stems.items():
        sf.write(OUT / f'{name}_stem.wav', x * scale, SR, subtype='PCM_24')
    sf.write(EP / 'assets3d/mixed.wav', mix * scale, SR, subtype='PCM_24')
    report = dict(duration=duration, source_files=SOURCE_FILES, bed_qc=reports, music=music_q,
                  mix_peak_dbfs=float(20 * np.log10(max(peak * scale, 1e-12))),
                  global_gain=scale, voice_rms=voice_rms,
                  silence_policy='0-120 无音乐；160-177 MUSIC_HALT；320-321 SILENCE_BEAT 全总线物理静音；479.5 FADE',
                  mix_sha256=hashlib.sha256((EP / 'assets3d/mixed.wav').read_bytes()).hexdigest())
    (OUT / 'mix_manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: report[k] for k in ['duration', 'mix_peak_dbfs', 'global_gain', 'voice_rms', 'bed_qc']},
                     ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
