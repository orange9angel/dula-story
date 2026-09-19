"""Fish musical: assemble the full timeline from measured material durations.

Reads song/dialogue alignments + VC vocals, then writes:
  assets/audio/mixed.wav      — dialogue + VC songs + instrumental underscore
  config/timeline.json        — segments, absolute char spans, beat grid
  config/viseme_yuki.json     — V17-method keyframes (dialogue 01/03 + song B)
  config/viseme_mochi.json    — jaw-only keyframes (dialogue 02/04/05 + song A)
  script.story                — two-lane entries (Yuki + Mochi), AdPose tags

Mix design ("说着说着唱起来"): the underscore bed before each song segment is
the SAME instrumental audio that continues into the segment, so the music
swells into the song instead of cutting. Opening bed repeats the song intro
(a vamp); the mid bed is the A-section tail leading into B at the seam.
"""
from pathlib import Path
import json
import subprocess
import wave
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly, correlate
from scipy.ndimage import gaussian_filter1d
from pypinyin import lazy_pinyin, Style
from viseme_core import beat_grid, build_viseme_track

ROOT = Path(__file__).resolve().parents[1]
SR = 48000
BED_GAIN = 10 ** (-18 / 20)   # underscore level under dialogue

# layout gaps (seconds)
T0, GAP_D12, GAP_PRE_A = 0.3, 0.4, 0.8
GAP_MID, GAP_D34, GAP_PRE_B = 0.7, 0.35, 0.7
GAP_POST_B, FREEZE = 0.6, 1.8

DIALOGUE = [
    ('01_yuki_angry', 'Yuki', '年糕我的小鱼干呢', 'talk_angry', 'medium', '年糕！我的小鱼干呢？！'),
    ('02_mochi_meh', 'Mochi', '喵', 'cat_talk', 'medium', '……喵？'),
    ('03_yuki_press', 'Yuki', '是吗那你嘴角的是什么', 'talk_press', 'close', '是吗？那你嘴角的是什么？'),
    ('04_mochi_art', 'Mochi', '这是艺术', 'cat_talk', 'medium', '这是……艺术。'),
    ('05_mochi_defeat', 'Mochi', '喵呜', 'cat_talk', 'medium', '喵呜……'),
]
# Song B (Yuki) per-line performance moves; A (Mochi) is one cat_sing span.
B_MOVES = ['sing_joy', 'joy_expand', 'sparkle', 'cheer']
B_EMOTIONS = ['belting', 'delight', 'delight', 'triumph']
B_SHOTS = ['medium', 'medium', 'wide', 'wide']


def load(path, sr=SR, channels=2):
    x, rate = sf.read(path, always_2d=True)
    if rate != sr:
        x = resample_poly(x, sr, rate, axis=0)
    if channels == 1:
        return x.mean(axis=1)
    if x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    return x


def envelope16k(mono):
    """V14 anti-vibrato amplitude envelope at 10ms frames on a mono signal."""
    x = resample_poly(mono, 16000, SR)
    hop, size = 160, 320
    n = int(np.ceil(len(x) / hop))
    padded = np.pad(x, (size // 2, size))
    rms = np.array([np.sqrt(np.mean(padded[i*hop:i*hop+size]**2)) for i in range(n)])
    rms = gaussian_filter1d(rms, .7)
    a, r = 1-np.exp(-.01/.020), 1-np.exp(-.01/.250)
    env = np.empty_like(rms)
    prev = 0.0
    for i, v in enumerate(rms):
        prev += (r if v < prev else a) * (v-prev)
        env[i] = prev
    env = gaussian_filter1d(env, 10)
    reference = float(np.quantile(env, .99)); floor = reference*.026
    return np.clip((env-floor)/(reference-floor), 0, 1)**.58


def pinyin_of(chars):
    text = ''.join(c['ch'] for c in chars)
    for c, initial, final in zip(chars,
            lazy_pinyin(text, style=Style.INITIALS, strict=False),
            lazy_pinyin(text, style=Style.FINALS, strict=False)):
        c['initial'], c['final'] = initial, final
    return chars


def main():
    song_al = json.loads((ROOT / 'config/song_alignment.json').read_text(encoding='utf-8'))
    dia_al = json.loads((ROOT / 'config/dialogue_alignment.json').read_text(encoding='utf-8'))['dialogue']
    b = song_al['ab_boundary']
    song_chars = song_al['chars']
    counts = song_al['line_char_counts']
    song_lines = song_al['lines']
    song_dur = song_al['duration']

    # ---- measured dialogue durations ----
    dia_audio = {}
    for name, character, text, move, shot, display in DIALOGUE:
        x = load(ROOT / f'assets/audio/dialogue/{name}.mp3')
        dia_audio[name] = x
        dia_al[name]['measured'] = round(len(x) / SR, 3)

    # ---- timeline layout ----
    segs = []
    t = T0
    for name, character, text, move, shot, display in DIALOGUE[:2]:
        segs.append(dict(id=name, kind='dialogue', character=character, text=text,
                         move=move, shot=shot, start=round(t, 3), display=display,
                         end=round(t + dia_al[name]['measured'], 3)))
        t = segs[-1]['end'] + (GAP_D12 if name.endswith('angry') else GAP_PRE_A)
    songA_start = round(t, 3); songA_end = round(t + b, 3)
    segs.append(dict(id='songA', kind='song', character='Mochi', move='cat_sing', shot='wide',
                     start=songA_start, end=songA_end, song_range=[0.0, b]))
    t = songA_end + GAP_MID
    for name, character, text, move, shot, display in DIALOGUE[2:4]:
        segs.append(dict(id=name, kind='dialogue', character=character, text=text,
                         move=move, shot=shot, start=round(t, 3), display=display,
                         end=round(t + dia_al[name]['measured'], 3)))
        t = segs[-1]['end'] + (GAP_D34 if name.endswith('press') else GAP_PRE_B)
    songB_start = round(t, 3); songB_end = round(t + (song_dur - b), 3)
    segs.append(dict(id='songB', kind='song', character='Yuki', move='sing', shot='wide',
                     start=songB_start, end=songB_end, song_range=[b, song_dur]))
    t = songB_end + GAP_POST_B
    name, character, text, move, shot, display = DIALOGUE[4]
    segs.append(dict(id=name, kind='dialogue', character=character, text=text,
                     move=move, shot=shot, start=round(t, 3),
                     end=round(t + dia_al[name]['measured'], 3)))
    freeze_start = segs[-1]['end']
    duration = round(freeze_start + FREEZE, 3)
    segs.append(dict(id='freeze', kind='freeze', character=None, move='finale', shot='wide',
                     start=freeze_start, end=duration))
    print(f'timeline: {duration}s')
    for s in segs:
        print(f"  {s['start']:6.2f}-{s['end']:6.2f} {s['id']:18s} {s.get('character') or '-'}")

    # ---- absolute character spans ----
    a0 = counts[0] * 0 + sum(counts[:4])  # == 44, A/B seam char index
    charsA, charsB = song_chars[:a0], song_chars[a0:]
    def offset_chars(chars, off):
        return [dict(c, start=round(c['start'] + off, 3), end=round(c['end'] + off, 3)) for c in chars]
    mochi_song_chars = pinyin_of(offset_chars(charsA, songA_start))
    yuki_song_chars = pinyin_of(offset_chars(charsB, songB_start - b))
    dia_chars = {}
    for name, character, text, move, shot, display in DIALOGUE:
        seg = next(s for s in segs if s['id'] == name)
        dia_chars[name] = pinyin_of(offset_chars(dia_al[name]['chars'], seg['start']))

    # ---- amplitude envelopes (V14 method) per source ----
    vocals = load(ROOT / 'assets/audio/stems/vocals.wav', channels=1)
    song_env = envelope16k(vocals)
    dia_env = {name: envelope16k(load(ROOT / f'assets/audio/dialogue/{name}.mp3', channels=1))
               for name, *_ in DIALOGUE}

    def env_at(env, local_t):
        f = min(max(local_t / .01, 0), len(env) - 1)
        i = int(f)
        return float(env[i] + (env[min(i+1, len(env)-1)] - env[i]) * (f - i))

    def amp_router(table):
        def amp(t):
            for start, fn in table:
                if t >= start - .05:
                    return fn(t)
            return 0.0
        return amp
    # tables ordered by start descending; each entry covers [start, next_start)
    def seg_amp_fn(seg_start, env, off):
        return lambda t: env_at(env, t - seg_start + off)
    # Yuki: d1, d3 dialogue + song B
    d1 = next(s for s in segs if s['id'] == '01_yuki_angry')
    d3 = next(s for s in segs if s['id'] == '03_yuki_press')
    yuki_table = [(songB_start, seg_amp_fn(songB_start, song_env, b)),
                  (d3['start'], seg_amp_fn(d3['start'], dia_env['03_yuki_press'], 0)),
                  (d1['start'], seg_amp_fn(d1['start'], dia_env['01_yuki_angry'], 0))]
    # Mochi: d2, d4, d5 + song A
    d2 = next(s for s in segs if s['id'] == '02_mochi_meh')
    d4 = next(s for s in segs if s['id'] == '04_mochi_art')
    d5 = next(s for s in segs if s['id'] == '05_mochi_defeat')
    mochi_table = [(d5['start'], seg_amp_fn(d5['start'], dia_env['05_mochi_defeat'], 0)),
                   (d4['start'], seg_amp_fn(d4['start'], dia_env['04_mochi_art'], 0)),
                   (songA_start, seg_amp_fn(songA_start, song_env, 0)),
                   (d2['start'], seg_amp_fn(d2['start'], dia_env['02_mochi_meh'], 0))]
    yuki_amp = amp_router(yuki_table)
    mochi_amp = amp_router(mochi_table)

    # ---- viseme tracks ----
    yuki_chars = sorted(dia_chars['01_yuki_angry'] + dia_chars['03_yuki_press'] + yuki_song_chars,
                        key=lambda c: c['start'])
    yuki_track = build_viseme_track(yuki_chars, yuki_amp, duration)
    # Mochi: jaw-only, 20ms frames across his segments, gated by his envelope.
    mochi_keys = []
    mochi_segs = [s for s in segs if s.get('character') == 'Mochi']
    t = 0.0
    def mochi_emit(tt, jaw):
        mochi_keys.append({'t': round(tt, 2), 'jaw': round(min(max(jaw, 0), 1), 4),
                           'width': 0, 'rounding': 0, 'seal': 0, 'labiodental': 0,
                           'teeth': 0, 'purse': 0, 'amplitude': round(min(max(jaw, 0), 1), 4)})
    mochi_emit(0.0, 0)
    for s in mochi_segs:
        if s['start'] - t > .06:
            mochi_emit(t + .1, 0); mochi_emit(s['start'], 0)
        tt = s['start'] + .02
        while tt < s['end']:
            mochi_emit(tt, mochi_amp(tt) * .85)
            tt += .02
        mochi_emit(s['end'] + .1, 0)
        t = s['end'] + .1
    if duration - t > .06:
        mochi_emit(duration - .05, 0)
    print(f"viseme: yuki {len(yuki_track)} keys, mochi {len(mochi_keys)} keys")

    # ---- beat grid (song-time -> absolute) ----
    import librosa
    ya = librosa.load(str(ROOT / 'assets/audio/song_master.wav'), sr=22050, mono=True)[0]
    grid = beat_grid(ya, 22050)
    beats_abs = ([round(x + songA_start, 3) for x in grid['beats'] if x <= b] +
                 [round(x - b + songB_start, 3) for x in grid['beats'] if x >= b])
    down_abs = ([round(x + songA_start, 3) for x in grid['downbeats'] if x <= b] +
                [round(x - b + songB_start, 3) for x in grid['downbeats'] if x >= b])
    if len(beats_abs) > 1:
        period = float(np.median(np.diff(beats_abs)))
        while beats_abs[-1] + period <= duration + .1:
            beats_abs.append(round(beats_abs[-1] + period, 3))
        while down_abs and down_abs[-1] + 4 * period <= duration + .1:
            down_abs.append(round(down_abs[-1] + 4 * period, 3))
    grid_abs = {'bpm': grid['bpm'], 'beats': beats_abs, 'downbeats': down_abs}

    # ---- mix ----
    base = load(ROOT / 'assets/audio/song_master.wav')
    vocal_st = load(ROOT / 'assets/audio/stems/vocals.wav')
    n_song = len(base)
    assert abs(len(vocal_st) - n_song) < SR * .02, 'vocals/master 长度不一致'
    vocal_st = vocal_st[:n_song] if len(vocal_st) > n_song else np.pad(vocal_st, ((0, n_song - len(vocal_st)), (0, 0)))
    instrumental = base - vocal_st
    cut = round(b * SR)

    vc = {}
    gains = {}
    for tag, ref_path, seg_vocals in (
            ('A', 'assets/audio/voice_vc/vc_vocals_A_mochi_reference_1.0_30_0.65.wav', vocal_st[:cut]),
            ('B', 'assets/audio/voice_vc/vc_vocals_B_yuki_reference_1.0_30_0.65.wav', vocal_st[cut:])):
        x = load(ROOT / ref_path, channels=1)
        ref = seg_vocals.mean(axis=1)
        # envelope xcorr zero-lag assertion (10ms hop grid)
        hop = round(.01 * SR)
        def env_of(v):
            m = len(v) // hop
            return np.sqrt(np.mean(v[:m*hop].reshape(m, hop) ** 2, axis=1))
        er, ed = env_of(ref), env_of(x)
        m = min(len(er), len(ed))
        win = 5
        corr = correlate(er[:m], ed[:m], mode='full', method='fft')
        lag = int(np.argmax(corr[len(corr)//2 - win: len(corr)//2 + win + 1])) - win
        drift_ms = (len(x) - len(ref)) / SR * 1000
        assert abs(drift_ms) < 20, f'VC {tag} 时长漂移 {drift_ms:.1f}ms'
        assert abs(lag) <= 1, f'VC {tag} 包络偏移 {lag * 10}ms'
        if len(x) < len(ref):
            x = np.pad(x, (0, len(ref) - len(x)))
        else:
            x = x[:len(ref)]
        gains[tag] = float(np.sqrt(np.mean(ref ** 2)) / max(np.sqrt(np.mean(x ** 2)), 1e-8))
        vc[tag] = x * gains[tag]
        print(f'VC {tag}: lag {lag * 10}ms, drift {drift_ms:.1f}ms, gain {gains[tag]:.3f}')

    n = round(duration * SR)
    mix = np.zeros((n, 2))
    voice_bus = np.zeros((n, 2))
    music_bus = np.zeros((n, 2))

    def place(clip, t0, gain=1.0, fade_in=0.0, fade_out=0.0, gain_env=None, voice=False):
        i0 = round(t0 * SR)
        m = min(len(clip), n - i0)
        if m <= 0:
            return
        g = np.full(m, gain)
        if fade_in > 0:
            k = min(m, round(fade_in * SR)); g[:k] *= np.linspace(0, 1, k)
        if fade_out > 0:
            k = min(m, round(fade_out * SR)); g[-k:] *= np.linspace(1, 0, k)
        if gain_env is not None:
            g *= gain_env(np.arange(m) / SR + t0)
        (voice_bus if voice else music_bus)[i0:i0+m] += clip[:m] * g[:, None]

    # opening vamp: song intro instrumental under the first dialogue
    place(instrumental[:round(songA_start * SR)], 0.0, BED_GAIN, fade_in=.4,
          fade_out=max(.3, 0))
    # song A full
    place(instrumental[:cut], songA_start, 1.0, fade_in=.05, fade_out=.4)
    place(np.repeat(vc['A'][:, None], 2, axis=1), songA_start, 1.0, fade_in=.05, fade_out=.3, voice=True)
    # mid bed: the A-tail instrumental leading seamlessly into B at the seam;
    # it extends 0.3s PAST the seam with a fade-out, so it crossfades against
    # the identical content at the head of the full B placement (fade-in 0.3).
    pre = songB_start - (songA_end + .3)
    place(instrumental[cut - round(pre * SR):cut + round(.3 * SR)], songB_start - pre, BED_GAIN,
          fade_in=.4, fade_out=.3)
    # song B full (crossfade in over the bed tail)
    place(instrumental[cut:], songB_start, 1.0, fade_in=.3, fade_out=.15)
    place(np.repeat(vc['B'][:, None], 2, axis=1), songB_start, 1.0, fade_in=.05, fade_out=.3, voice=True)
    # ending bed: final cadence under the defeat line + freeze
    tail = duration - songB_end + .3
    place(instrumental[n_song - round(tail * SR):], songB_end - .3, BED_GAIN, fade_in=.3,
          fade_out=1.2)
    # dialogue on top
    for name, character, text, move, shot, display in DIALOGUE:
        seg = next(s for s in segs if s['id'] == name)
        x = dia_audio[name]
        peak = float(np.abs(x).max())
        place(x, seg['start'], .55 / max(peak, 1e-9), fade_in=.01, fade_out=.05, voice=True)

    # Leave the deadpan excuse exposed; transitions are ramped to avoid clicks.
    art=next(s for s in segs if s['id']=='04_mochi_art')
    tt=np.arange(n)/SR
    duck=np.minimum(np.clip((tt-art['start']+.12)/.12,0,1),np.clip((art['end']+.25-tt)/.15,0,1))
    music_bus*= (1-.85*duck)[:,None]
    mix=voice_bus+music_bus

    peak = float(np.abs(mix).max())
    common = min(1.0, .92 / max(peak, 1e-9))
    mix *= common
    sf.write(ROOT/'assets/audio/voice_bus.wav',voice_bus*common,SR,subtype='FLOAT')
    sf.write(ROOT/'assets/audio/music_bus.wav',music_bus*common,SR,subtype='FLOAT')
    with wave.open(str(ROOT / 'assets/audio/mixed.wav'), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype('<i2').tobytes())
    print(f'mixed.wav {duration}s peak {float(np.abs(mix).max()):.3f} (x{common:.3f})')

    # ---- timeline.json ----
    def pack_lines(line_range, chars_abs, offset_counts):
        lines, idx = [], 0
        for li in line_range:
            cnt = counts[li]
            group = chars_abs[idx:idx + cnt]
            lines.append({'text': song_lines[li], 'line': li, 'char0': idx, 'n_chars': cnt,
                          'start': group[0]['start'], 'end': group[-1]['end']})
            idx += cnt
        return lines
    timeline = {
        'duration': duration, 'fps': 60, 'bpm': grid['bpm'],
        'segments': segs,
        'beat_grid': grid_abs,
        'songA': {'start': songA_start, 'end': songA_end, 'song_offset': 0.0,
                  'lines': pack_lines(range(0, 4), mochi_song_chars, counts),
                  'chars': mochi_song_chars},
        'songB': {'start': songB_start, 'end': songB_end, 'song_offset': b,
                  'lines': pack_lines(range(4, 8), yuki_song_chars, counts),
                  'chars': yuki_song_chars},
        'dialogue': [dict(id=name, character=character, text=text, display=display,
                          start=next(s for s in segs if s['id'] == name)['start'],
                          end=next(s for s in segs if s['id'] == name)['end'],
                          chars=dia_chars[name])
                     for name, character, text, move, shot, display in DIALOGUE],
        'vc': {'A': {'gain': gains['A'], 'reference': 'voice_ref/mochi_reference.wav'},
               'B': {'gain': gains['B'], 'reference': 'voice_ref/yuki_reference.wav'}},
        'mix': {'bed_gain_db': -18, 'final_peak': float(np.abs(mix).max()), 'common_gain': common},
    }
    (ROOT / 'config/timeline.json').write_text(json.dumps(timeline, ensure_ascii=False, indent=2), encoding='utf-8')
    (ROOT / 'config/viseme_yuki.json').write_text(json.dumps(
        {'sample_step': .01, 'keyframes': yuki_track,
         'method': 'V17 continuous viseme track; sources: dialogue 01/03 TTS + song B vocals'},
        ensure_ascii=False, indent=2), encoding='utf-8')
    (ROOT / 'config/viseme_mochi.json').write_text(json.dumps(
        {'sample_step': .01, 'keyframes': mochi_keys,
         'method': 'jaw-only envelope (cat mouth: open/close + sway, no viseme detail)'},
        ensure_ascii=False, indent=2), encoding='utf-8')

    # ---- script.story (two lanes, AdPose contract) ----
    def stamp(tt):
        ms = round(tt * 1000)
        return f'00:{ms // 60000:02d}:{ms % 60000 // 1000:02d},{ms % 1000:03d}'
    blocks = []
    idx = 0
    def emit(character, start, end, move, shot, role, extra=None, prefix=''):
        nonlocal idx
        idx += 1
        opts = dict(pose='hello', duration=f'{end - start:.3f}', expression='smile',
                    emotion='calm', focus='audience', motif='none', hit=round(start + .2, 3),
                    land=round(start + .2, 3), edit='hold', outfit='original', accessory='none',
                    gesture='ta_da', move=move, outgoing='none', scene='diva', snap=0,
                    card='none', swipe='none', ghost=0, shot=shot, line=0, role=role)
        if extra:
            opts.update(extra)
        tags = '|'.join(f'{k}={v}' for k, v in opts.items())
        blocks.append(f'{idx}\n{stamp(start)} --> {stamp(end)}\n{prefix}'
                      f'{{Event:Animate|character={character}|action=AdPose|{tags}}}\n'
                      f'{{Camera:AdCamera|shot=hello}}')
    prefix0 = ('@BeatStudioScene\n{Position:Yuki|x=0|y=-0.03|z=0|face=forward}\n'
               '{Position:Mochi|x=0.58|y=0|z=-0.50|face=forward}\n')
    for si, s in enumerate(segs):
        start, end = s['start'], s['end']
        if s['id'] == 'songB':
            # one Yuki entry per lyric line (4 lines)
            linesB = timeline['songB']['lines']
            for qi, line in enumerate(linesB):
                e2 = linesB[qi + 1]['start'] if qi + 1 < len(linesB) else end
                emit('Yuki', line['start'], round(e2, 3), B_MOVES[qi], B_SHOTS[qi], 'verse',
                     dict(emotion=B_EMOTIONS[qi], hit=round(line['start'] + .2, 3),
                          land=round(min(beats_abs, key=lambda x: abs(x - line['start'] - .4)), 3),
                          motif='sparkles' if qi == 2 else 'none'))
            continue
        if s['kind'] == 'freeze':
            emit('Yuki', start, end, 'finale', 'wide', 'outro',
                 dict(pose='finale', card='小鱼干案 · 告破', emotion='warm'), prefix='')
            emit('Mochi', start, end, 'cat_freeze', 'wide', 'outro')
            continue
        # dialogue / songA segments: one entry per character per segment
        if s['character'] == 'Yuki':
            emit('Yuki', start, end, s['move'], s['shot'], 'verse', prefix=prefix0 if si == 0 else '')
            emit('Mochi', start, end, 'cat_idle', s['shot'], 'verse', prefix=prefix0 if si == 0 else '')
        else:
            emit('Mochi', start, end, s['move'], s['shot'], 'verse', prefix=prefix0 if si == 0 else '')
            emit('Yuki', start, end,
                 'idle_listen' if s['id'] in ('02_mochi_meh', '04_mochi_art') else
                 'idle_listen' if s['id'] == 'songA' else 'idle_smug',
                 s['shot'], 'verse', prefix=prefix0 if si == 0 else '')
        prefix0 = ''
    (ROOT / 'script.story').write_text('\n\n'.join(blocks) + '\n', encoding='utf-8')
    (ROOT / 'assets/audio/manifest.json').write_text(json.dumps({'entries': []}), encoding='utf-8')
    print(f'script.story: {len(blocks)} entries')


if __name__ == '__main__':
    main()
