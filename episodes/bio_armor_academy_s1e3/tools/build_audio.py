"""S1E3：对白 DTW 对齐 → V17 视素轨 → 帧级特征 → 回写 timeline.json 的 dialogue → 混音。

动画时序已锁定：段落/字幕窗不动，只按实测句长校验窗口（超窗则调 TEMPO 后删 tmp/proc 重跑）。
工艺同 S1E2 V17（fish musical viseme_core + faster-whisper DTW）。
"""
from pathlib import Path
import json, subprocess, sys
import numpy as np

EP = Path(__file__).resolve().parents[1]
STORY = EP.parents[1]
FISH_TOOLS = STORY / 'episodes/yuki_fish_musical/tools'
sys.path.insert(0, str(FISH_TOOLS))
sys.path.insert(0, str(Path(__file__).parent))
from build_timeline import envelope16k, pinyin_of, SR  # noqa: E402
from viseme_core import build_viseme_track  # noqa: E402

DIA = EP / 'assets3d/dialogue'
PROC = EP / 'tmp/proc'
TEMPO = {'LeiXiao': 1.05, 'HongGang': 1.0}  # 雷晓沿用 S1E1/S1E2 基准 rate 1.05
LINES = json.loads((Path(__file__).parent / 'lines.json').read_text(encoding='utf-8'))


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


def main():
    tl = json.loads((EP / 'config/timeline.json').read_text(encoding='utf-8'))
    duration = tl['duration']
    seg_of = {d['id']: d for d in tl['dialogue']}

    from faster_whisper import WhisperModel
    from faster_whisper.tokenizer import Tokenizer
    from align_all import align_text
    PROC.mkdir(parents=True, exist_ok=True)
    model = WhisperModel('small', device='cpu', compute_type='int8', local_files_only=True)
    make_tok = lambda: Tokenizer(model.hf_tokenizer, model.model.is_multilingual,
                                 task='transcribe', language='zh')
    aligned = {}
    for line in LINES:
        chars, measured = align_text(model, make_tok, proc_path(line), line['text'])
        aligned[line['id']] = dict(chars=chars, measured=measured)
        seg = seg_of[line['id']]
        fit = seg['end'] - seg['start']
        status = 'OK' if measured <= fit + .2 else 'OVER'
        print(f"{line['id']}: measured {measured:.2f}s / window {fit:.2f}s [{status}]", flush=True)
        if status == 'OVER':
            raise SystemExit(f"{line['id']} 超窗 {measured - fit:.2f}s：调 TEMPO 后删 tmp/proc 重跑")

    dia_env, abs_chars = {}, {}
    dialogue_json = []
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

    # ── 视素轨道（V17 连续视素轨）──
    cfg = EP / 'config'
    for name, ids in (('LeiXiao', [l['id'] for l in LINES if l['character'] == 'LeiXiao']),
                      ('HongGang', [l['id'] for l in LINES if l['character'] == 'HongGang'])):
        chars = sorted((c for i in ids for c in abs_chars[i]), key=lambda c: c['start'])
        track = build_viseme_track(chars, amp_for(ids), duration)
        ts = [k['t'] for k in track]
        assert all(ts[i] <= ts[i + 1] for i in range(len(ts) - 1)), 'viseme track not sorted'
        (cfg / f"viseme_{name.lower()}.json").write_text(json.dumps(
            {'sample_step': .01, 'keyframes': track,
             'method': 'V17 continuous viseme track (fish musical viseme_core)'},
            ensure_ascii=False), encoding='utf-8')
        print(f'viseme {name}: {len(track)} keys', flush=True)

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
    (cfg / 'final_voice_features.json').write_text(json.dumps(
        {'step': step, 'characters': features}, ensure_ascii=False), encoding='utf-8')

    # 回写 timeline.json 的 dialogue（segments/subtitles 动画侧时序不动）
    tl['dialogue'] = dialogue_json
    (cfg / 'timeline.json').write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding='utf-8')
    subprocess.run([sys.executable, str(EP / 'tools/remix_audio.py')], check=True)
    print(f'S1E3 dialogue alignment + visemes + mix complete: {duration}s')


if __name__ == '__main__':
    main()
