"""逐句 TTS（seed-tts-2.0，凭证 dula-story/.env.speech）+ qc_lines 验收。

小雪 zh_female_vv_uranus_bigtts（happy/calm），年糕 ICL_uranus_zh_male_youmodaye_tob
（ICL 音色在 seed-tts-2.0 resource 下可合成——fish musical 实测），PA 用小雪音色 calm。
已存在的 mp3 跳过（要重生先删文件）。QC 窗口 = Phase 1 估算 + 1.0s 余量。
"""
from pathlib import Path
import json, subprocess, sys

EP = Path(__file__).resolve().parents[1]          # episodes/yuki_airport_t2
STORY = EP.parents[1]                             # dula-story
SKILL = STORY.parent / 'dula-skills/volc-voice-casting/scripts'
PY = STORY / '.venv/Scripts/python.exe'
SPEAKERS = {'Yuki': 'zh_female_vv_uranus_bigtts', 'Mochi': 'ICL_uranus_zh_male_youmodaye_tob',
            'PA': 'zh_female_vv_uranus_bigtts'}

lines = json.loads((Path(__file__).parent / 'lines.json').read_text(encoding='utf-8'))
sys.path.insert(0, str(Path(__file__).parent))
from make_story import estimate_durations  # noqa: E402
est = estimate_durations()

out_dir = EP / 'assets3d/dialogue'
out_dir.mkdir(parents=True, exist_ok=True)
manifest = []
for line in lines:
    out = out_dir / f"{line['id']}.mp3"
    speaker = SPEAKERS[line['character']]
    if not out.exists():
        cmd = [str(PY), str(SKILL / 'seedtts_say.py'), '--text', line['text'],
               '--speaker', speaker, '--emotion', line['emotion'], '--emotion-scale', '2',
               '--out', str(out)]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            print(f"FAIL {line['id']}: {r.stderr.strip()[:200]}")
            continue
        print(f"OK   {line['id']} -> {out.name}")
    else:
        print(f"SKIP {line['id']} (exists)")
    manifest.append({'file': str(out), 'expect_text': line['text'],
                     'window_s': round(est[line['id']] + 1.0, 2), 'kind': 'dialogue'})

qc_manifest = EP / 'tmp/qc_manifest.json'
qc_manifest.parent.mkdir(exist_ok=True)
qc_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')
r = subprocess.run([str(PY), str(SKILL / 'qc_lines.py'), '--manifest', str(qc_manifest),
                    '--out-report', str(out_dir / 'qc_report.md')],
                   capture_output=True, text=True)
print(r.stdout[-3000:])
print(r.stderr[-1000:], file=sys.stderr)
sys.exit(r.returncode)
