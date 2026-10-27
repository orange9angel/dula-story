"""P6 逐句 TTS：config/dialogue.json → seed-tts-2.0 → assets3d/dialogue/*.wav + qc_lines 验收。

缓存三元组 tag = text|speaker|delivery（含 emotion）；任一改动才重录。
emotion 被拒（音色不支持）时降级为无 emotion 重试并在元数据记 emotionDropped=true。
超窗句不重试：QC 报告后由人工调 dialogue.json 的 delivery.rate 再跑（删对应 wav）。
"""
from pathlib import Path
import hashlib, json, os, subprocess, sys

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]
SKILL = WORKSPACE / 'dula-skills/volc-voice-casting/scripts'
PY = WORKSPACE / 'dula-story/.venv/Scripts/python.exe'
OUT = EP / 'assets3d/dialogue'
VOICE_CFG = json.loads((EP / 'config/voice_config.json').read_text(encoding='utf-8'))

for raw in (WORKSPACE / 'dula-story/.env.speech').read_text(encoding='utf-8-sig').splitlines():
    raw = raw.strip().removeprefix('export ')
    if raw.startswith('#') or '=' not in raw:
        continue
    k, v = raw.split('=', 1)
    if k.strip().startswith('VOLC_'):
        os.environ.setdefault(k.strip(), v.strip().strip('"\''))


def synth(line, speaker, use_emotion):
    mp3 = OUT / f"{line['id']}.mp3"
    dlv = line['delivery']
    cmd = [str(PY), str(SKILL / 'seedtts_say.py'), '--text', line['tts_text'],
           '--speaker', speaker, '--out', str(mp3)]
    if dlv.get('rate'):
        cmd += ['--speech-rate', str(dlv['rate'])]
    for c in dlv.get('context', []):
        cmd += ['--context', c]
    emo = line['acting'].get('seedEmotion')
    if use_emotion and emo:
        cmd += ['--emotion', emo, '--emotion-scale', '2']
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return r.returncode == 0 and mp3.exists(), (r.stderr or r.stdout).strip()[:200]


def main():
    ids = sys.argv[1:]
    dlg = json.loads((EP / 'config/dialogue.json').read_text(encoding='utf-8'))
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for line in dlg['lines']:
        if ids and line['id'] not in ids:
            continue
        speaker = VOICE_CFG[line['character']]['voice']
        emo = line['acting'].get('seedEmotion')
        dlv_full = dict(line['delivery'], emotion=emo)
        tag = hashlib.sha256(f"{line['text']}|{speaker}|{dlv_full}".encode()).hexdigest()[:12]
        wav, meta = OUT / f"{line['id']}.wav", OUT / f"{line['id']}.source.json"
        if wav.exists() and meta.exists():
            c = json.loads(meta.read_text(encoding='utf-8'))
            if c.get('tag') == tag and c.get('sha256') == hashlib.sha256(wav.read_bytes()).hexdigest():
                print(f"SKIP {line['id']}")
                continue
        ok, err = synth(line, speaker, use_emotion=True)
        dropped = False
        if not ok and emo:
            print(f"emotion rejected {line['id']} ({emo}): {err} → retry without", flush=True)
            ok, err = synth(line, speaker, use_emotion=False)
            dropped = ok
        if not ok:
            print(f"FAIL {line['id']}: {err}", flush=True)
            sys.exit(1)
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', str(OUT / f"{line['id']}.mp3"),
                               '-ar', '48000', '-ac', '2', str(wav)])
        meta.write_text(json.dumps({'id': line['id'], 'character': line['character'], 'speaker': speaker,
                                    'text': line['text'], 'delivery': dlv_full, 'emotionDropped': dropped,
                                    'tag': tag, 'provider': 'volcano/seed-tts-2.0',
                                    'sha256': hashlib.sha256(wav.read_bytes()).hexdigest()},
                                   ensure_ascii=False, indent=1), encoding='utf-8')
        print(f"gen  {line['id']} {speaker}{' (emotion dropped)' if dropped else ''}", flush=True)
    # QC manifest：窗口=发声窗（end-t）−0.1
    for line in dlg['lines']:
        wav = OUT / f"{line['id']}.wav"
        if wav.exists():
            manifest.append({'file': str(wav), 'expect_text': line['text'],
                             'window_s': round(line['window'] - .1, 2), 'kind': 'dialogue'})
    qc = EP / 'tmp/qc_manifest.json'
    qc.parent.mkdir(exist_ok=True)
    qc.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')
    r = subprocess.run([str(PY), str(SKILL / 'qc_lines.py'), '--manifest', str(qc),
                        '--out-report', str(OUT / 'qc_report.md')],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    print(r.stdout[-2500:])
    sys.exit(r.returncode)


if __name__ == '__main__':
    main()
