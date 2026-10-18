#!/usr/bin/env python3
"""《星屑战壳》OP R11 喊招合成：config/calls.json → seed-tts-2.0 逐条 → assets3d/calls/<id>.wav。
skip-if-exists 校验 text+voice（防陈旧）。喊招增益与 duck 由 build_audio.py 总线管。
用法（dula-story 根）：set -a && source .env.speech && set +a
  .venv/Scripts/python.exe episodes/stardust_clad_op/tools/gen_calls.py
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]
SEEDTTS = WORKSPACE / 'dula-skills/volc-voice-casting/scripts/seedtts_say.py'
OUT = EP / 'assets3d/calls'
PY = WORKSPACE / 'dula-story/.venv/Scripts/python.exe'

def main():
    cfg = json.loads((EP / 'config/calls.json').read_text(encoding='utf-8'))
    OUT.mkdir(parents=True, exist_ok=True)
    report = []
    for c in cfg['calls']:
        dlv = c.get('delivery', {})
        tag = hashlib.sha256(f"{c['text']}|{c['voice']}|{dlv}".encode()).hexdigest()[:12]
        wav = OUT / f"{c['id']}.wav"
        meta = OUT / f"{c['id']}.source.json"
        if wav.exists() and meta.exists() and json.loads(meta.read_text(encoding='utf-8')).get('tag') == tag:
            report.append({'id': c['id'], 'skipped': True})
            continue
        mp3 = OUT / f"{c['id']}.mp3"
        cmd = [str(PY), str(SEEDTTS), '--text', c['text'],
               '--speaker', c['voice'], '--out', str(mp3)]
        if dlv.get('rate'):
            cmd += ['--speech-rate', str(dlv['rate'])]
        if dlv.get('context'):
            cmd += ['--context', dlv['context']]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            print(f"FAIL {c['id']}: {r.stderr.strip()[:200]}")
            sys.exit(1)
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', str(mp3),
                               '-ar', '48000', '-ac', '2', str(wav)])
        meta.write_text(json.dumps({'id': c['id'], 'voice': c['voice'], 'text': c['text'],
                                    'tag': tag, 'provider': 'volcano-seedtts',
                                    'sha256': hashlib.sha256(wav.read_bytes()).hexdigest()},
                                   ensure_ascii=False, indent=1), encoding='utf-8')
        dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                                             'format=duration', '-of', 'csv=p=0', str(wav)]))
        report.append({'id': c['id'], 'dur': dur, 'generated': True})
        print(f"gen {c['id']} {dur:.2f}s")
    (EP / 'tmp').mkdir(exist_ok=True)
    (EP / 'tmp/calls_probe.json').write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print(json.dumps({'calls': len(report)}, ensure_ascii=False))

if __name__ == '__main__':
    main()
