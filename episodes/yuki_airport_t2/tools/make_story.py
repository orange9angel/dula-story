"""《小雪游 T2》剧本时间轴生成（Phase 1 估算；Phase 2 由 build_audio.py 用实测音频重跑同一 layout）。

LINES/BEATS 是唯一数据源：make_story.py（估算）与 build_audio.py（实测）共用。
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
LINES = json.loads((Path(__file__).parent / 'lines.json').read_text(encoding='utf-8'))

# (beat, shot, line_id or None, kind)
BEATS = [
    ('establish',    'establish', None,             'action'),
    ('guide_wave',   'wide',      '01_yuki_open',   'dialogue'),
    ('beg',          'cat',       '02_mochi_fee',   'dialogue'),
    ('point_up',     'roof',      '03_yuki_roof',   'dialogue'),
    ('cat_climb',    'cat',       '04_mochi_climb', 'dialogue'),
    ('point_up2',    'ceiling',   '05_yuki_leaves', 'dialogue'),
    ('cat_kiosk',    'cat',       '06_mochi_gate',  'dialogue'),
    ('sea_point',    'sea',       '07_yuki_sea',    'dialogue'),
    ('sea_listen',   'sea',       '08_mochi_logic', 'dialogue'),
    ('gtc_ask',      'gtc',       '09_mochi_gtc',   'dialogue'),
    ('gtc_tell',     'gtc',       '10_yuki_gtc',    'dialogue'),
    ('gtc_punch',    'gtc',       '11_mochi_cold',  'dialogue'),
    ('checkin_push', 'checkin',   '09_yuki_belt',   'dialogue'),
    ('checkin_idle', 'checkin',   '10_mochi_ship',  'dialogue'),
    ('seat_usb',     'seat',      '11_yuki_usb',    'dialogue'),
    ('seat_talk',    'seat',      '12_mochi_phone', 'dialogue'),
    ('explain',      'restroom',  '13_yuki_toilet', 'dialogue'),
    ('press_watch',  'pad',       '14_mochi_paw',   'dialogue'),
    ('finale_proud', 'wide',      '15_yuki_numbers','dialogue'),
    ('peek',         'cat',       '16_mochi_shop',  'dialogue'),
    ('speechless',   'yuki',      '17_yuki_retort', 'dialogue'),
    ('smug',         'cat',       '18_mochi_life',  'dialogue'),
    ('outro',        'pullback',  '19_pa_welcome',  'voiceover'),
]
ESTABLISH_DUR = 1.5
GAP = 0.04
OUTRO_TAIL = 1.0  # PA 说完后的收束空镜


def estimate_durations():
    """Phase 1 估算：CJK 4.4 字/s + 0.5s 基底 + 拉丁按 0.6 字折算。"""
    import re
    durs = {}
    for line in LINES:
        cjk = len(re.findall(r'[\u4e00-\u9fff]', line['text']))
        latin = len(re.findall(r'[A-Za-z0-9]', line['text']))
        durs[line['id']] = round(0.5 + (cjk + latin * 0.6) / 4.4, 2)
    return durs


def layout(durations):
    """durations: line_id -> 语音时长。返回 (entries, total)。entries: dict 列表。"""
    t = 0.0
    entries = []
    for beat, shot, line_id, kind in BEATS:
        if kind == 'action':
            dur = ESTABLISH_DUR
        elif kind == 'voiceover':
            dur = durations[line_id] + OUTRO_TAIL
        else:
            dur = durations[line_id] + 0.05  # 句尾余韵
        entries.append(dict(beat=beat, shot=shot, line_id=line_id, kind=kind,
                            start=round(t, 3), end=round(t + dur, 3)))
        t = entries[-1]['end'] + (GAP if beat != 'outro' else 0.0)
    return entries, round(entries[-1]['end'], 3)


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
            body += '@ChangleAirportScene'
        body += (f"{{Event:Animate|character=Yuki|action=ReachOut|move={e['beat']}"
                 f"|shot={e['shot']}|kind={e['kind']}}}")
        body += '{Camera:Static|position=0.2,1.7,5.6|lookAt=-0.1,1.0,-0.4}'
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
