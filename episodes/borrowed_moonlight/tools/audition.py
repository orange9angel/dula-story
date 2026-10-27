"""P6 选声试听：四角色候选音色 × 代表台词，seed-tts-2.0 合成 + ffprobe 时长窗对比。

选声纪律（volc-voice-casting）：先查目录气质（演绎型/叙事型，禁播音腔），
本环境无音频听审——按目录气质+时长窗+拼音 QC 暂定接片，报告里明确标"未听审"。
"""
from pathlib import Path
import json, os, subprocess, sys

EP = Path(__file__).resolve().parents[1]
WORKSPACE = EP.parents[2]
SEEDTTS = WORKSPACE / 'dula-skills/volc-voice-casting/scripts/seedtts_say.py'
PY = WORKSPACE / 'dula-story/.venv/Scripts/python.exe'
OUT = EP / 'tmp/voice_audition/v1'

for raw in (WORKSPACE / 'dula-story/.env.speech').read_text(encoding='utf-8-sig').splitlines():
    raw = raw.strip().removeprefix('export ')
    if raw.startswith('#') or '=' not in raw:
        continue
    k, v = raw.split('=', 1)
    if k.strip().startswith('VOLC_'):
        os.environ.setdefault(k.strip(), v.strip().strip('"\''))

CANDIDATES = {
    'Narrator': ['zh_female_shaoergushi_uranus_bigtts', 'zh_female_xiaoxue_uranus_bigtts',
                 'zh_female_vv_uranus_bigtts'],
    'Eileen': ['zh_female_mengyatou_uranus_bigtts', 'zh_female_linjianvhai_uranus_bigtts',
               'zh_female_yingtaowanzi_uranus_bigtts'],
    'Alder': ['zh_male_tangseng_uranus_bigtts', 'zh_male_baqiqingshu_uranus_bigtts',
              'zh_male_shenyeboke_uranus_bigtts'],
    'LadyMoon': ['zh_female_linxiao_uranus_bigtts', 'zh_female_gufengshaoyu_uranus_bigtts',
                 'zh_female_cancan_uranus_bigtts'],
}
LINES = {
    'Narrator': [('n01', '很久很久以前，有一个王国，那里一年四季都下着雪。', 10.2, -8),
                 ('n03', '可真正的原因是……再也没有人记得，春天是什么模样了。', 7.4, -8)],
    'Eileen': [('e01', '月亮，你今晚怎么这么暗呀？', 7.4, 0),
               ('e09', '那我们去把它点亮！', 5.4, 5)],
    'Alder': [('a01', '我没有关住它们。是它们的主人，忘记了怎么发光。', 8.4, -8),
              ('a09', '原来……我也还可以发光。', 7.4, -8)],
    'LadyMoon': [('m01', '很久，没有人来这里了。', 8.4, -8),
                 ('m05', '原来……还有人在等我。', 4.4, -8)],
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for char, voices in CANDIDATES.items():
        for voice in voices:
            for lid, text, window, rate in LINES[char]:
                out = OUT / f'{char}_{lid}_{voice}.mp3'
                cmd = [str(PY), str(SEEDTTS), '--text', text, '--speaker', voice,
                       '--out', str(out), '--speech-rate', str(rate),
                       '--context', '童话《借走月光的女孩》角色演绎']
                r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
                if r.returncode != 0 or not out.exists():
                    err = (r.stderr or r.stdout).strip()[:160]
                    rows.append(dict(char=char, line=lid, voice=voice, ok=False, err=err))
                    print(f'FAIL {char}/{lid} {voice}: {err}', flush=True)
                    continue
                p = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                    '-of', 'csv=p=0', str(out)], capture_output=True, text=True)
                dur = float(p.stdout.strip())
                fit = '✅' if dur <= window - .2 else ('⚠️' if dur <= window + .2 else '❌')
                rows.append(dict(char=char, line=lid, voice=voice, ok=True,
                                 dur=round(dur, 2), window=window, fit=fit))
                print(f'{fit} {char}/{lid} {voice}: {dur:.2f}s / {window}s', flush=True)
    (OUT / 'report.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
    fails = [r for r in rows if not r['ok']]
    print(f'\ndone: {len(rows) - len(fails)}/{len(rows)} synthesized; fails={len(fails)}')


if __name__ == '__main__':
    main()
