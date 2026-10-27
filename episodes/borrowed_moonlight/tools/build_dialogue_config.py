"""P6：timeline.json + script.story {Event:Act} → config/dialogue.json（逐句演绎档）。

t=混音/口型共用的发声窗零点（placement）；window=seg.end-t 供 QC 超窗判定。
演绎指令链：seed-tts additions.context_texts = [角色人设, 逐句 context]（S1E4 审计教训：
导演描述必须进实际请求）；rate→audio_params.speech_rate；emotion→audio_params.emotion(scale 2)。
"""
from pathlib import Path
import json, re

EP = Path(__file__).resolve().parents[1]

VOICES = {'Narrator': 'narrator', 'Eileen': 'eileen', 'Alder': 'alder', 'LadyMoon': 'ladymoon'}
PERSONA = {
    'Narrator': '童话旁白，温厚的女声，像冬夜炉火边给孩子讲故事',
    'Eileen': '十一岁女孩艾琳，声音轻而坚定，天真但不奶气',
    'Alder': '七十岁老钟表匠奥尔德，苍老、沙哑、缓慢，嗓音里有旧伤',
    'LadyMoon': '月亮夫人，超然、疲惫而慈爱，声音轻得像从很远的地方传来',
}
# story emotion → seed-tts emotion 标签（E05 验证集：happy/calm/surprised/tenderness/sad/excited）
EMOTION = {'neutral': None, 'sad': 'sad', 'curious': None, 'gentle': 'calm', 'excited': 'excited',
           'surprised': 'surprised', 'determined': None, 'worried': 'sad', 'relieved': 'calm',
           'happy': 'happy'}
LEAD = {'Narrator': 1.2, 'Eileen': .5, 'Alder': .5, 'LadyMoon': .6}
# 特殊摆点：m49 夫人的回答必须等 TEAR_BREAK@369 泪碎之后；n04/e17 贴窗头争取时长余量
ABS_PLACE = {'m05': 369.6, 'n04': 451.3, 'e17': 352.0}
# QC 超窗/临界句的语速吸收（P6 首轮 QC：n03 +0.31 / a04 +0.02 / m03 +0.56 / e17 +2.52 / n04 +5.99）
RATE_OVERRIDE = {'n03': -2, 'a04': 8, 'm03': 0, 'e17': 25, 'n04': 35}
# e17 第三轮：sad 情感的拖沓停顿是超窗主因之一，摘下情感标签（哭腔由 context 承担）
EMO_OVERRIDE = {'e17': None}


def main():
    tl = json.loads((EP / 'config/timeline.json').read_text(encoding='utf-8'))
    story = (EP / 'script.story').read_text(encoding='utf-8')
    rates = dict(re.findall(r'\{Event:Act\|id=(\w+)\|rate=(-?\d+)', story))
    lines = []
    for seg in tl['segments']:
        if seg.get('kind') != 'dialogue':
            continue
        act = seg['act']
        aid = act['id']
        t = ABS_PLACE.get(aid, seg['start'] + LEAD[seg['character']])
        ctx = [PERSONA[seg['character']]]
        if act.get('context'):
            ctx.append(act['context'])
        lines.append({
            'id': aid, 'beat': seg['id'], 'speaker': VOICES[seg['character']],
            'character': seg['character'],
            't': round(t, 2), 'end': seg['end'], 'window': round(seg['end'] - t, 2),
            'segStart': seg['start'], 'segEnd': seg['end'],
            'text': seg['line'], 'tts_text': seg['line'],
            'delivery': {'rate': RATE_OVERRIDE.get(aid, int(rates.get(aid, 0))), 'context': ctx},
            'acting': {'emotion': act['emotion'],
                       'seedEmotion': EMO_OVERRIDE.get(aid, EMOTION.get(act['emotion']))
                       if aid in EMO_OVERRIDE else EMOTION.get(act['emotion']),
                       'gaze': act['gaze'], 'camera': act['camera']},
        })
    out = {'source': 'script.story + timeline.json {Event:Act}', 'voices': VOICES, 'lines': lines}
    (EP / 'config/dialogue.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    for l in lines:
        print(f"{l['id']:>4} {l['character']:<9} t={l['t']:7.2f} win={l['window']:5.2f} "
              f"rate={l['delivery']['rate']:+d} emo={l['acting']['seedEmotion'] or '-':<10} {l['text'][:18]}")
    print(f'{len(lines)} lines')


if __name__ == '__main__':
    main()
