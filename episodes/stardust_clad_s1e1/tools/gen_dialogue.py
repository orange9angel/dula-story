#!/usr/bin/env python3
"""《星屑战壳》S1E1 对白合成：config/dialogue.json 单源 → seed-tts-2.0 逐句 mp3 → 48k wav。
skip-if-exists 校验 text+speaker 一致（防陈旧缓存）。QC 由 qc_lines.py 另行执行。
用法（dula-story 根）：
  set -a && source .env.speech && set +a
  .venv/Scripts/python.exe episodes/stardust_clad_s1e1/tools/gen_dialogue.py
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]
SEEDTTS = WORKSPACE / 'dula-skills/volc-voice-casting/scripts/seedtts_say.py'
OUT = EP / 'assets3d/dialogue'
PY = WORKSPACE / 'dula-story/.venv/Scripts/python.exe'

def main():
    dlg = json.loads((EP / 'config/dialogue.json').read_text(encoding='utf-8'))
    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    for line in dlg['lines']:
        speaker = dlg['voices'][line['speaker']]
        dlv = line.get('delivery', {})
        tag = hashlib.sha256(f"{line['text']}|{speaker}|{dlv}".encode()).hexdigest()[:12]
        wav = OUT / f"{line['id']}.wav"
        meta = OUT / f"{line['id']}.source.json"
        if wav.exists() and meta.exists() and json.loads(meta.read_text(encoding='utf-8')).get('tag') == tag:
            results.append({'id': line['id'], 'skipped': True})
            continue
        mp3 = OUT / f"{line['id']}.mp3"
        cmd = [str(PY), str(SEEDTTS), '--text', line['text'],
               '--speaker', speaker, '--out', str(mp3)]
        if dlv.get('rate'):
            cmd += ['--speech-rate', str(dlv['rate'])]
        if dlv.get('context'):
            cmd += ['--context', dlv['context']]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            print(f"FAIL {line['id']}: {r.stderr.strip()[:200]}")
            sys.exit(1)
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', str(mp3),
                               '-ar', '48000', '-ac', '2', str(wav)])
        meta.write_text(json.dumps({'id': line['id'], 'speaker': speaker, 'text': line['text'],
                                    'tag': tag, 'provider': 'volcano-seedtts',
                                    'sha256': hashlib.sha256(wav.read_bytes()).hexdigest()},
                                   ensure_ascii=False, indent=1), encoding='utf-8')
        results.append({'id': line['id'], 'generated': True})
        print(f"gen {line['id']} {speaker}")
    print(json.dumps({'lines': len(results),
                      'generated': sum(1 for r in results if r.get('generated'))}, ensure_ascii=False))

if __name__ == '__main__':
    main()
