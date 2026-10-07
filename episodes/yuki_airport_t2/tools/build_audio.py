"""《小雪游 T2》音频构建：对齐 → 实测排时（回写 script.story）→ 视素轨道 → 特征 → 混音。

产出（viewer 的数据链）：
  config/timeline.json              — segments + 逐字绝对时间 + 字幕
  config/viseme_yuki.json           — V17 连续视素（小雪全部台词）
  config/viseme_mochi.json          — jaw-only 20ms（年糕，角色设定如此，与 cel 一致）
  config/final_voice_features.json  — 10ms 帧级 amplitude/gate
  assets3d/mixed.wav                — 台词 + PA(低通+回声广播感) + 程序化大厅底噪
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
# 锁定台词的语音下限（≈107.6s）超过 95s 目标：小雪 1.12x（元气导游语速快不违和）、
# 年糕 1.05x（保住慵懒拖腔）、PA 原速。对齐/口型/混音全部用变速后的音频，同步天然一致。
TEMPO = {'Yuki': 1.12, 'Mochi': 1.05, 'PA': 1.0}


def proc_path(line):
    """变速后的 wav（幂等）：returns Path"""
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
        path = proc_path(line)
        chars, duration = align_text(model, make_tok, path, line['text'])
        out[line['id']] = dict(chars=chars, measured=duration)
        print(f"{line['id']}: {duration:.2f}s {len(chars)} chars (tempo {TEMPO[line['character']]})",
              flush=True)
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

    # ── 逐字绝对时间 + 包络 ──
    dia_env, abs_chars = {}, {}
    dialogue_json, subtitles = [], []
    for line in LINES:
        seg = seg_of[line['id']]
        x = load(proc_path(line), channels=1)
        dia_env[line['id']] = envelope16k(x)
        chars = [dict(c, start=round(c['start'] + seg['start'], 3),
                      end=round(c['end'] + seg['start'], 3)) for c in aligned[line['id']]['chars']]
        if line['character'] != 'PA':
            cjk = [c for c in chars if '\u4e00' <= c['ch'] <= '\u9fff']
            abs_chars[line['id']] = pinyin_of(cjk)
        dialogue_json.append(dict(id=line['id'], character=line['character'], text=line['text'],
                                  display=line['display'], start=seg['start'], end=seg['end'],
                                  chars=chars))
        subtitles.append(dict(character=line['character'], text=line['display'],
                              start=seg['start'] + .05, end=seg['end'] - .05,
                              kind='voiceover' if line['character'] == 'PA' else 'dialogue'))
    duration = round(entries[-1]['end'], 3)

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

    yuki_ids = [l['id'] for l in LINES if l['character'] == 'Yuki']
    mochi_ids = [l['id'] for l in LINES if l['character'] == 'Mochi']

    # ── 视素轨道 ──
    yuki_chars = sorted((c for i in yuki_ids for c in abs_chars[i]), key=lambda c: c['start'])
    yuki_track = build_viseme_track(yuki_chars, amp_for(yuki_ids), duration)
    mochi_amp = amp_for(mochi_ids)
    mochi_keys = []
    emit = lambda tt, j: mochi_keys.append({'t': round(tt, 2), 'jaw': round(min(max(j, 0), 1), 4),
        'width': 0, 'rounding': 0, 'seal': 0, 'labiodental': 0, 'teeth': 0, 'purse': 0,
        'amplitude': round(min(max(j, 0), 1), 4)})
    emit(0.0, 0)
    tcur = 0.0
    for i in sorted(mochi_ids, key=lambda i: seg_of[i]['start']):  # 必须按时间序（lines.json 可乱序追加）
        s, e = seg_of[i]['start'], seg_of[i]['end']
        if s - tcur > .06:
            emit(tcur + .1, 0); emit(s, 0)
        tt = s + .02
        while tt < e:
            emit(tt, mochi_amp(tt) * .85)
            tt += .02
        emit(e + .04, 0)  # 句尾零点不得超过下一句起点（GAP=.04）
        tcur = e + .04
    if duration - tcur > .06:
        emit(duration - .05, 0)
    print(f'viseme: yuki {len(yuki_track)} keys, mochi {len(mochi_keys)} keys')

    # ── 帧级特征 ──
    step = .01
    n = int(round(duration / step)) + 1
    features = {}
    for name, ids in (('Yuki', yuki_ids), ('Mochi', mochi_ids)):
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
    voice = np.zeros((total_n, 2))  # 仅人声（测 BGM 对白电平差用）
    def place(x, t0, gain=1.0, fade=.02, bus=None):
        k = round(t0 * SR)
        m = min(len(x), total_n - k)
        if m <= 0:
            return
        seg = x[:m] * gain
        f = min(round(fade * SR), m // 2)
        if f > 0:
            r = np.linspace(0, 1, f)[:, None]
            seg[:f] *= r; seg[-f:] *= r[::-1]
        (mix if bus is None else bus)[k:k + m] += seg
        if bus is not None:
            mix[k:k + m] += seg
    for line in LINES:
        seg = seg_of[line['id']]
        if line['character'] == 'PA':
            continue
        x = load(proc_path(line))
        peak = float(np.abs(x).max())
        place(x, seg['start'], .55 / max(peak, 1e-9), bus=voice)  # 与逐字对齐同一零点，口型不偏移
    # PA：低通+回声 → 广播感
    pa = '19_pa_welcome'
    pa_wav = EP / 'tmp/pa_processed.wav'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(proc_path(by_id[pa])),
                    '-af', 'highpass=f=300,lowpass=f=2600,aecho=0.7:0.5:45|70:0.28|0.18',
                    '-ar', str(SR), '-ac', '2', str(pa_wav)], check=True)
    x = load(pa_wav)
    place(x, seg_of[pa]['start'] + .1, .42 / max(float(np.abs(x).max()), 1e-9), fade=.1, bus=voice)
    # ── BGM 铺底（Seed-Audio 器乐，assets3d/bgm_src.wav；无歌词已抽段转写验证）──
    # 电平口径：BGM 未 duck 时 RMS ≈ 人声 RMS -12dB；对白段 duck 再 -7dB（gate 包络 150ms
    # 平滑）→ 台词下约 -19dB；PA 彩蛋段整体再收到 0.7。
    bgm_path = EP / 'assets3d/bgm_src.wav'
    bgm_report = None
    if bgm_path.exists():
        from scipy.ndimage import gaussian_filter1d as _gf
        bgm = load(bgm_path)
        if len(bgm) < total_n:  # 不够长就 1.5s 交叉淡化接环
            xf = round(1.5 * SR)
            parts, cur = [], 0
            while cur < total_n:
                seg_len = min(len(bgm), total_n - cur + (xf if parts else 0))
                chunk = bgm[:seg_len]
                if parts:
                    prev = parts[-1]
                    a = prev[-xf:] * np.linspace(1, 0, xf)[:, None]
                    b = chunk[:xf] * np.linspace(0, 1, xf)[:, None]
                    parts[-1] = np.vstack([prev[:-xf], a + b])
                    parts.append(chunk[xf:])
                else:
                    parts.append(chunk)
                cur += seg_len - xf
            bgm = np.vstack(parts)[:total_n]
        else:
            bgm = bgm[:total_n]
        gate = np.maximum(np.array([f['gate'] for f in features['Yuki']]),
                          np.array([f['gate'] for f in features['Mochi']]))
        duck = np.interp(np.arange(total_n) / SR, np.arange(len(gate)) * step, gate)
        duck = _gf(duck, .15 * SR)
        env = 1 - .68 * np.clip(duck, 0, 1)
        pa_seg = seg_of[pa]
        i0, i1 = round(pa_seg['start'] * SR), round(pa_seg['end'] * SR)
        ramp = round(.6 * SR)
        pa_env = np.ones(total_n)
        s0, s1 = max(0, i0 - ramp), min(total_n, i1 + ramp)
        pa_env[s0:i0] = np.linspace(1, .7, i0 - s0)
        pa_env[i0:i1] = .7
        pa_env[i1:s1] = np.linspace(.7, 1, s1 - i1)
        voice_rms = float(np.sqrt(np.mean(voice ** 2)))
        bgm_rms = float(np.sqrt(np.mean(bgm ** 2)))
        bgm *= (voice_rms * 10 ** (-12 / 20)) / max(bgm_rms, 1e-9)
        bgm = bgm * env[:, None] * pa_env[:, None]
        place(bgm, 0, 1.0, fade=1.0)
        bgm_report = {'source': 'Seed-Audio 1.0（seedaudio_gen.py，器乐 prompt，无歌声）',
                      'src_duration_s': round(len(load(bgm_path)) / SR, 2),
                      'bgm_rms_db_vs_voice': round(-12 - 7 * float(np.mean(duck)), 1),
                      'duck_max_db': -7.0, 'pa_dip': 0.7}
        print(f"BGM: voice_rms {voice_rms:.4f}, bgm base -12dB + duck ≤-7dB, PA ×0.7")
    # 程序化大厅底噪：低通过滤棕噪 + 缓慢起伏
    rng = np.random.default_rng(20260916)
    brown = np.cumsum(rng.standard_normal((total_n, 2), dtype=np.float32), axis=0)
    brown /= max(float(np.abs(brown).max()), 1e-9)
    from scipy.signal import sosfilt, butter
    bed = sosfilt(butter(2, [90, 500], btype='bandpass', fs=SR, output='sos'), brown, axis=0)
    swell = 0.7 + 0.3 * np.sin(np.arange(total_n) / SR * 2 * np.pi / 23)
    bed = bed * swell[:, None]
    bed *= .012 / max(float(np.abs(bed).max()), 1e-9)
    place(bed, 0, 1.0, fade=1.2)
    peak = float(np.abs(mix).max())
    if peak > .89:
        mix *= .89 / peak
    (EP / 'assets3d').mkdir(exist_ok=True)
    sf.write(EP / 'assets3d/mixed.wav', mix, SR, subtype='PCM_24')

    # ── 落盘 ──
    cfg = EP / 'config'
    cfg.mkdir(exist_ok=True)
    (cfg / 'timeline.json').write_text(json.dumps({
        'duration': duration, 'step': step,
        'segments': [dict(id=e['line_id'] or e['beat'], entry=i + 1, kind=e['kind'],
                          character=by_id[e['line_id']]['character'] if e['line_id'] else None,
                          start=e['start'], end=e['end'], move=e['beat'], shot=e['shot'])
                     for i, e in enumerate(entries)],
        'dialogue': dialogue_json,
        'subtitles': sorted(subtitles, key=lambda s: s['start']),
    }, ensure_ascii=False, indent=1), encoding='utf-8')
    (cfg / 'viseme_yuki.json').write_text(json.dumps(
        {'sample_step': step, 'keyframes': yuki_track,
         'method': 'V17 continuous viseme track (fish musical viseme_core)'},
        ensure_ascii=False), encoding='utf-8')
    (cfg / 'viseme_mochi.json').write_text(json.dumps(
        {'sample_step': step, 'keyframes': mochi_keys,
         'method': 'jaw-only envelope (cat mouth: open/close, no viseme detail)'},
        ensure_ascii=False), encoding='utf-8')
    (cfg / 'final_voice_features.json').write_text(json.dumps(
        {'step': step, 'characters': features}, ensure_ascii=False), encoding='utf-8')
    (EP / 'storyboard/audio_check.json').write_text(json.dumps({
        'duration': duration, 'mix_peak_dbfs': round(20 * np.log10(float(np.abs(mix).max())), 2),
        'lines': {l['id']: round(durations[l['id']], 3) for l in LINES},
        'bgm': bgm_report,
        'note': 'PA 低通2600+高通300+aecho；底噪为程序化棕噪（无外部素材）',
    }, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'mixed.wav {duration}s peak {peak:.3f}')


if __name__ == '__main__':
    main()
