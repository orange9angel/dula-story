"""《9章》S1E2 音频构建：对齐 → 实测排时（回写 script.story）→ 视素轨道 → 特征 → 混音。

产出（viewer 数据链）：
  config/timeline.json / viseme_leixiao.json / viseme_honggang.json / final_voice_features.json
  assets3d/mixed.wav
混音结构：inkblaze_theme 全片铺底 + furyu_fight_theme 打斗段（hong_armor→will_up 末）+
  SFX 事件总线（S1E1 音效库拷贝 assets3d/sfx/）+ 暮蝉/晚风环境床 + 台词（零点=对齐零点）。
BGM ducking 口径：基准 RMS=人声−12dB，对白段 gate 包络再 duck −7dB（150ms 平滑）。
"""
from pathlib import Path
import json, subprocess, sys
import numpy as np
import soundfile as sf

EP = Path(__file__).resolve().parents[1]
STORY = EP.parents[1]
FISH_TOOLS = STORY / 'episodes/yuki_fish_musical/tools'
sys.path.insert(0, str(FISH_TOOLS))
sys.path.insert(0, str(Path(__file__).parent))
from build_timeline import envelope16k, pinyin_of, SR  # noqa: E402
from viseme_core import build_viseme_track  # noqa: E402
from make_story import BEATS, LINES, layout, write_story  # noqa: E402

DIA = EP / 'assets3d/dialogue'
PROC = EP / 'tmp/proc'
TEMPO = {'LeiXiao': 1.05, 'HongGang': 1.0}  # 雷晓沿用 S1E1 基准 rate 1.05


def proc_path(line):
    out = PROC / f"{line['id']}.wav"
    if not out.exists():
        rate = TEMPO[line['character']]
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(DIA / f"{line['id']}.mp3"),
                        '-af', f'atempo={rate}', '-ar', str(SR), '-ac', '1', str(out)],
                       check=True)
    return out


def load(path, channels=2):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(SR),
                          '-ac', str(channels), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    return x.reshape(-1, 2).copy() if channels == 2 else x.copy()


def align_lines():
    from faster_whisper import WhisperModel
    from faster_whisper.tokenizer import Tokenizer
    from align_all import align_text
    PROC.mkdir(parents=True, exist_ok=True)
    model = WhisperModel('small', device='cpu', compute_type='int8', local_files_only=True)
    make_tok = lambda: Tokenizer(model.hf_tokenizer, model.model.is_multilingual,
                                 task='transcribe', language='zh')
    out = {}
    for line in LINES:
        chars, duration = align_text(model, make_tok, proc_path(line), line['text'])
        out[line['id']] = dict(chars=chars, measured=duration)
        print(f"{line['id']}: {duration:.2f}s {len(chars)} chars", flush=True)
    return out


def main():
    aligned = align_lines()
    durations = {k: v['measured'] for k, v in aligned.items()}
    entries, total = layout(durations)
    print(f'timeline: {total:.2f}s ({len(entries)} entries)')

    old = EP / 'tmp/script_pre_audio.story'
    if not old.exists():
        old.write_bytes((EP / 'script.story').read_bytes())
    write_story(entries)

    by_id = {l['id']: l for l in LINES}
    seg_of = {e['line_id']: e for e in entries if e['line_id']}
    beat_of = {e['beat']: e for e in entries}
    duration = round(entries[-1]['end'], 3)

    dia_env, abs_chars = {}, {}
    dialogue_json, subtitles = [], []
    for line in LINES:
        seg = seg_of[line['id']]
        x = load(proc_path(line), channels=1)
        dia_env[line['id']] = envelope16k(x)
        chars = [dict(c, start=round(c['start'] + seg['start'], 3),
                      end=round(c['end'] + seg['start'], 3)) for c in aligned[line['id']]['chars']]
        cjk = [c for c in chars if '\u4e00' <= c['ch'] <= '\u9fff']
        abs_chars[line['id']] = pinyin_of(cjk)
        dialogue_json.append(dict(id=line['id'], character=line['character'], text=line['text'],
                                  display=line['display'], start=seg['start'], end=seg['end'],
                                  chars=chars))
        subtitles.append(dict(character=line['character'], text=line['display'],
                              start=seg['start'] + .05, end=seg['end'] - .05, kind='dialogue'))

    def env_at(env, lt):
        f = min(max(lt / .01, 0), len(env) - 1)
        i = int(f)
        return float(env[i] + (env[min(i + 1, len(env) - 1)] - env[i]) * (f - i))

    def amp_for(ids):
        table = sorted(((seg_of[i]['start'], i) for i in ids), key=lambda x: -x[0])
        def amp(t):
            for start, i in table:
                if t >= start - .05:
                    return env_at(dia_env[i], t - start)
            return 0.0
        return amp

    # ── 视素轨道（两个都是人形口，全 V17）──
    tracks = {}
    for name, ids in (('LeiXiao', [l['id'] for l in LINES if l['character'] == 'LeiXiao']),
                      ('HongGang', [l['id'] for l in LINES if l['character'] == 'HongGang'])):
        chars = sorted((c for i in ids for c in abs_chars[i]), key=lambda c: c['start'])
        tracks[name] = build_viseme_track(chars, amp_for(ids), duration)
        ts = [k['t'] for k in tracks[name]]
        assert all(ts[i] <= ts[i+1] for i in range(len(ts)-1)), 'viseme track not sorted'
        print(f'viseme {name}: {len(tracks[name])} keys')

    # ── 帧级特征 ──
    step = .01
    n = int(round(duration / step)) + 1
    features = {}
    for name, ids in (('LeiXiao', [l['id'] for l in LINES if l['character'] == 'LeiXiao']),
                      ('HongGang', [l['id'] for l in LINES if l['character'] == 'HongGang'])):
        frames = [{'t': round(i * step, 2), 'amplitude': 0.0, 'gate': 0.0} for i in range(n)]
        for i in ids:
            seg = seg_of[i]
            i0, i1 = int(round(seg['start'] / step)), int(round(seg['end'] / step))
            for k in range(i0, min(i1, n)):
                a = env_at(dia_env[i], k * step - seg['start'])
                frames[k] = {'t': round(k * step, 2), 'amplitude': round(a, 4),
                             'gate': 1.0 if a > .06 else 0.0}
        features[name] = frames

    # ── 混音 ──
    total_n = int(round(duration * SR))
    mix = np.zeros((total_n, 2))
    voice = np.zeros((total_n, 2))
    def place(x, t0, gain=1.0, fade=.02, bus=None, skip_mix=False):
        k = round(t0 * SR)
        m = min(len(x), total_n - k)
        if m <= 0:
            return
        seg = x[:m] * gain
        f = min(round(fade * SR), m // 2)
        if f > 0:
            r = np.linspace(0, 1, f)[:, None]
            seg[:f] *= r; seg[-f:] *= r[::-1]
        if not skip_mix:
            mix[k:k + m] += seg
        if bus is not None:
            bus[k:k + m] += seg

    for line in LINES:  # 台词，零点=对齐零点
        seg = seg_of[line['id']]
        x = load(proc_path(line))
        peak = float(np.abs(x).max())
        place(x, seg['start'], .55 / max(peak, 1e-9), bus=voice)

    # 环境床：晚风 + 暮蝉循环
    def loop_to(path, gain_db):
        x = load(EP / f'assets3d/sfx/{path}')
        out = np.zeros((total_n, 2))
        stride = len(x) - round(.8 * SR)
        x = x * np.r_[np.linspace(0, 1, round(.8 * SR)), np.ones(len(x) - round(.8 * SR))][:, None]
        for at in range(0, total_n, stride):
            m = min(len(x), total_n - at)
            out[at:at + m] += x[:m]
        return out * (10 ** (gain_db / 20))
    mix += loop_to('wind_dusk.wav', -26) + loop_to('dusk_cicadas.wav', -30)

    # BGM：inkblaze 全片铺底 + furyu 打斗段——先入 bgm bus，统一 duck 后入 mix
    bgm = np.zeros((total_n, 2))
    ink = load(EP / 'assets3d/inkblaze_theme.mp3')
    ink *= .10 / max(float(np.abs(ink).max()), 1e-9)
    place(ink, 0, 1.0, fade=2.0, bus=bgm, skip_mix=True)
    furyu = load(EP / 'assets3d/furyu_fight_theme.wav')
    furyu *= .30 / max(float(np.abs(furyu).max()), 1e-9)
    fa, fb = beat_of['hong_armor']['start'], beat_of['will_up']['end']
    fl = min(len(furyu), round((fb - fa) * SR))
    place(furyu[:fl], fa, 1.0, fade=.6, bus=bgm, skip_mix=True)

    # SFX 事件总线（S1E1 音效库）
    def sfx(name, t0, gain=1.0):
        x = load(EP / f'assets3d/sfx/{name}.wav')
        x *= .5 / max(float(np.abs(x).max()), 1e-9)
        place(x, t0, gain, fade=.03)
    b = beat_of
    sfx('crow_caws', b['establish']['start'] + .8, .8)
    sfx('ground_crater', b['hong_drop']['start'] + (b['hong_drop']['end'] - b['hong_drop']['start']) * .55, 1.0)
    sfx('wind_gust', b['hong_drop']['start'] + .3, .5)
    sfx('wing_hum_rising', b['hong_armor']['start'] + 1.2, .7)
    for beat, hit_gain in (('clash1', 1.0), ('clash2', .6)):
        e = b[beat]
        sfx('dash_gale', e['start'] + (e['end'] - e['start']) * .15, .7)
        sfx('chitin_impact', e['start'] + (e['end'] - e['start']) * .65, hit_gain)
    sfx('shockwave_ring', b['clash1']['start'] + (b['clash1']['end'] - b['clash1']['start']) * .65, .8)
    sfx('cicada_wing_buzz', b['will_up']['start'] + (b['will_up']['end'] - b['will_up']['start']) * .35, .7)
    wu = b['will_up']
    hit_t = wu['start'] + (wu['end'] - wu['start']) * .72
    sfx('bio_impact_metal', hit_t, 1.0)
    sfx('floor_crack', hit_t + .15, .8)
    sfx('debris_scatter', hit_t + .3, .6)
    sfx('heartbeat_core', b['first_mark']['start'] + .3, .9)
    sfx('steps_fading', b['hook']['start'] + .5, .6)
    sfx('wind_faint', b['hook']['start'], .7)

    # BGM ducking（人声 gate 包络）后入 mix；心跳段 BGM 稍收
    gate = np.maximum(np.array([f['gate'] for f in features['LeiXiao']]),
                      np.array([f['gate'] for f in features['HongGang']]))
    from scipy.ndimage import gaussian_filter1d as _gf
    duck = np.interp(np.arange(total_n) / SR, np.arange(len(gate)) * step, gate)
    duck = _gf(duck, .15 * SR)
    bgm_env = (1 - .68 * np.clip(duck, 0, 1))[:, None]
    mk = beat_of['first_mark']
    i0, i1 = round(mk['start'] * SR), round(mk['end'] * SR)
    bgm_env[i0:i1] *= .7
    mix += bgm * bgm_env

    peak = float(np.abs(mix).max())
    if peak > .89:
        mix *= .89 / peak
    sf.write(EP / 'assets3d/mixed.wav', mix, SR, subtype='PCM_24')

    cfg = EP / 'config'
    (cfg / 'timeline.json').write_text(json.dumps({
        'duration': duration, 'step': step,
        'segments': [dict(id=e['line_id'] or e['beat'], entry=i + 1, kind=e['kind'],
                          character=by_id[e['line_id']]['character'] if e['line_id'] else None,
                          start=e['start'], end=e['end'], move=e['beat'], shot=e['shot'])
                     for i, e in enumerate(entries)],
        'dialogue': dialogue_json,
        'subtitles': sorted(subtitles, key=lambda s: s['start']),
    }, ensure_ascii=False, indent=1), encoding='utf-8')
    for name in ('LeiXiao', 'HongGang'):
        (cfg / f"viseme_{name.lower()}.json").write_text(json.dumps(
            {'sample_step': step, 'keyframes': tracks[name],
             'method': 'V17 continuous viseme track (fish musical viseme_core)'},
            ensure_ascii=False), encoding='utf-8')
    (cfg / 'final_voice_features.json').write_text(json.dumps(
        {'step': step, 'characters': features}, ensure_ascii=False), encoding='utf-8')
    (EP / 'storyboard/audio_check.json').write_text(json.dumps({
        'duration': duration, 'mix_peak_dbfs': round(20 * np.log10(float(np.abs(mix).max())), 2),
        'lines': {l['id']: round(durations[l['id']], 3) for l in LINES},
        'bgm': {'bed': 'inkblaze_theme（S1E1）铺底 -20dB 级', 'fight': 'furyu_fight_theme（S1E1）打斗段',
                'ducking': 'gate 包络 -7dB/150ms'},
        'sfx': 'S1E1 音效库 16 支拷贝 assets3d/sfx/，事件表见 build_audio.py',
    }, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'mixed.wav {duration}s peak {peak:.3f}')


if __name__ == '__main__':
    main()
