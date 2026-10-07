"""《9章》S1E2《碎岩》剧本时间轴生成（Phase 1 估算；Phase 2 实测重跑同一 layout）。

LINES/BEATS 唯一数据源；make_story.py（估算）与 build_audio.py（实测）共用。
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
LINES = json.loads((Path(__file__).parent / 'lines.json').read_text(encoding='utf-8'))

# (beat, shot, line_id or None, kind, extra_opts)
BEATS = [
    ('card_open',    'wide',      None,              'card',     {'card': 'open'}),
    ('establish',    'establish', None,              'action',   {}),
    ('walk_in',      'walk',      '01_lei_mutter',   'dialogue', {}),
    ('hong_drop',    'hong_drop', None,              'action',   {}),
    ('hong_declare', 'hong',      '02_hong_challenge','dialogue', {}),
    ('lei_panic',    'lei',       '03_lei_panic',    'dialogue', {}),
    ('hong_armor',   'hong',      '04_hong_rules',   'dialogue', {}),
    ('clash1',       'block',     None,              'action',   {}),
    ('lei_shocked',  'lei',       '05_lei_shocked',  'dialogue', {}),
    ('clash2',       'block',     None,              'action',   {}),
    ('will_up',      'shout',     '06_lei_will',     'dialogue', {}),
    ('hong_laugh',   'laugh',     '07_hong_laugh',   'dialogue', {}),
    ('first_mark',   'mark',      '08_lei_mark',     'dialogue', {}),
    ('hook',         'hook',      None,              'action',   {}),
]
CARD_DUR = 2.4
ESTABLISH_DUR = 4.5
GAP = 0.25
ACTION_DUR = {'hong_drop': 2.6, 'clash1': 3.4, 'clash2': 4.0, 'hook': 6.5}


def estimate_durations():
    import re
    durs = {}
    for line in LINES:
        cjk = len(re.findall(r'[\u4e00-\u9fff]', line['text']))
        durs[line['id']] = round(0.45 + cjk / 4.0, 2)
    return durs


def layout(durations):
    t = 0.0
    entries = []
    for beat, shot, line_id, kind, extra in BEATS:
        if kind == 'card':
            dur = CARD_DUR
        elif kind == 'action':
            dur = ACTION_DUR.get(beat, ESTABLISH_DUR)
        else:
            dur = durations[line_id] + 0.5
        entries.append(dict(beat=beat, shot=shot, line_id=line_id, kind=kind, extra=extra,
                            start=round(t, 3), end=round(t + dur, 3)))
        t = entries[-1]['end'] + GAP
    return entries, round(entries[-1]['end'] - GAP, 3)


def stamp(t):
    ms = round(t * 1000)
    return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}'


def write_story(entries, path=None):
    lines_by_id = {l['id']: l for l in LINES}
    blocks = []
    for i, e in enumerate(entries):
        rows = [str(i + 1), f"{stamp(e['start'])} --> {stamp(e['end'])}"]
        body = ''
        if i == 0:
            body += '@RuinsDuskScene'
        body += (f"{{Event:Animate|character=LeiXiao|action=ReachOut|move={e['beat']}"
                 f"|shot={e['shot']}|kind={e['kind']}")
        for k, v in e['extra'].items():
            body += f'|{k}={v}'
        body += '}'
        body += '{Camera:Static|position=0.5,1.9,6.2|lookAt=0.4,1.2,-3.6}'
        if e['line_id']:
            line = lines_by_id[e['line_id']]
            body += f"[{line['character']}]{line['display']}"
        rows.append(body)
        blocks.append('\n'.join(rows))
    out = '\n\n'.join(blocks) + '\n'
    (path or (ROOT / 'script.story')).write_text(out, encoding='utf-8')
    return out


def main():
    entries, total = layout(estimate_durations())
    write_story(entries)
    print(f'script.story: {len(entries)} entries, estimated {total:.1f}s')


if __name__ == '__main__':
    main()
