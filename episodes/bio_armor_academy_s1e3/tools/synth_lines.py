"""S1E3 逐句 TTS（seed-tts-2.0，凭证 dula-story/.env.speech）+ qc_lines 验收。

声线锁 S1E2 voice_config.json（雷晓孱弱少年 rate 1.05 / 轰刚热血少年）。
TTS 输入保留标点（标点=停顿，S1E1 教训）。QC 窗口=timeline.json dialogue 窗+0.8s。
已存在的 mp3 跳过。超窗时调 tools/build_audio.py 的 TEMPO 后删 tmp/proc 重来。
"""
from pathlib import Path
import json, os, subprocess, sys

EP = Path(__file__).resolve().parents[1]
STORY = EP.parents[1]
SKILL = STORY.parent / 'dula-skills/volc-voice-casting/scripts'
PY = STORY / '.venv/Scripts/python.exe'
# 语音控制台 key 从 .env.speech 注入本进程环境（子进程继承），与 S1E2 generate_refinement_audio 同款
for raw in (STORY / '.env.speech').read_text(encoding='utf-8-sig').splitlines():
    if raw.strip().startswith('#') or '=' not in raw:
        continue
    key, value = raw.removeprefix('export ').split('=', 1)
    if key.strip() == 'VOLC_SPEECH_API_KEY':
        os.environ.setdefault(key.strip(), value.strip().strip('"\''))
SPEAKERS = {'LeiXiao': 'ICL_uranus_zh_male_chanruoshaoye_tob',
            'HongGang': 'ICL_uranus_zh_male_rexueshaonian_tob'}

lines = json.loads((Path(__file__).parent / 'lines.json').read_text(encoding='utf-8'))
tl = json.loads((EP / 'config/timeline.json').read_text(encoding='utf-8'))
window = {d['id']: d['end'] - d['start'] + .8 for d in tl['dialogue']}

out_dir = EP / 'assets3d/dialogue'
out_dir.mkdir(parents=True, exist_ok=True)
manifest = []
for line in lines:
    out = out_dir / f"{line['id']}.mp3"
    if not out.exists():
        cmd = [str(PY), str(SKILL / 'seedtts_say.py'), '--text', line['tts_text'],
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
                     'window_s': round(window[line['id']], 2), 'kind': 'dialogue'})
qc_manifest = EP / 'tmp/qc_manifest.json'
qc_manifest.parent.mkdir(exist_ok=True)
qc_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')
r = subprocess.run([str(PY), str(SKILL / 'qc_lines.py'), '--manifest', str(qc_manifest),
                    '--out-report', str(out_dir / 'qc_report.md')],
                   capture_output=True, text=True)
print(r.stdout[-1500:])
sys.exit(r.returncode)
