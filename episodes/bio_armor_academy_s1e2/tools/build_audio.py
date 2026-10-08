"""Build aligned dialogue timing and visemes, then mix the R2 Suno/Seed-Audio soundtrack.
For music/SFX-only changes run tools/remix_audio.py to preserve dialogue alignment.
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
    # R2 mixing uses verified Suno/Seed-Audio sources via remix_audio.py.
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
    subprocess.run([sys.executable, str(EP / 'tools/remix_audio.py')], check=True)
    print(f'R2 timeline and mix complete: {duration}s')


if __name__ == '__main__':
    main()
