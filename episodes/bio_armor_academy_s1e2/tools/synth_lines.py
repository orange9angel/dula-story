"""S1E2 逐句 TTS（seed-tts-2.0，凭证 dula-story/.env.speech）+ qc_lines 验收。

雷晓 ICL_uranus_zh_male_chanruoshaoye_tob（S1E1 声线锁），轰刚 paoxiaoxiaoge（试听选定）。
已存在的 mp3 跳过。QC 窗口 = 估算 + 1.2s。
"""
from pathlib import Path
import json, subprocess, sys

EP = Path(__file__).resolve().parents[1]
STORY = EP.parents[1]
SKILL = STORY.parent / 'dula-skills/volc-voice-casting/scripts'
PY = STORY / '.venv/Scripts/python.exe'
SPEAKERS = {'LeiXiao': 'ICL_uranus_zh_male_chanruoshaoye_tob',
            'HongGang': 'ICL_uranus_zh_male_rexueshaonian_tob'}

lines = json.loads((Path(__file__).parent / 'lines.json').read_text(encoding='utf-8'))
sys.path.insert(0, str(Path(__file__).parent))
from make_story import estimate_durations  # noqa: E402
est = estimate_durations()

out_dir = EP / 'assets3d/dialogue'
out_dir.mkdir(parents=True, exist_ok=True)
manifest = []
for line in lines:
    out = out_dir / f"{line['id']}.mp3"
    if not out.exists():
        cmd = [str(PY), str(SKILL / 'seedtts_say.py'), '--text', line.get('tts_text', line['text']),
               '--speaker', SPEAKERS[line['character']],
               '--emotion', line['emotion'], '--emotion-scale', '2',
               '--out', str(out)]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            print(f"FAIL {line['id']}: {r.stderr.strip()[:200]}")
            continue
        print(f"OK   {line['id']}")
    else:
        print(f"SKIP {line['id']}")
    manifest.append({'file': str(out), 'expect_text': line['text'],
                     'window_s': round(est[line['id']] + 1.2, 2), 'kind': 'dialogue'})
qc_manifest = EP / 'tmp/qc_manifest.json'
qc_manifest.parent.mkdir(exist_ok=True)
qc_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')
r = subprocess.run([str(PY), str(SKILL / 'qc_lines.py'), '--manifest', str(qc_manifest),
                    '--out-report', str(out_dir / 'qc_report.md')],
                   capture_output=True, text=True)
print(r.stdout[-1200:])
sys.exit(r.returncode)
