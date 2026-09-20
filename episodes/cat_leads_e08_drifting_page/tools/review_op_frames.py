"""E08 OP 抽帧内容复核：送 qwen3-omni 逐帧看画面是否贴合段落意图。

模式参照 theme_listen_review.py（dashscope compatible-mode + 环境变量 key），
载荷换成图片（image_url data URL）。分数只是 advisory，不作人工验收。
"""
from pathlib import Path
import base64
import json
import os
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
FRAMES = ROOT / 'tmp/op2/final'

# (帧文件, op时间, 段落意图)
INTENTS = [
    ('f_3.jpg', 3, '前奏静景：河堤/柳树/远景，可有角色入画'),
    ('f_8.jpg', 8, '前奏静景：河/柳树/远景'),
    ('f_14.jpg', 14, '前奏收尾：双人建立镜头'),
    ('f_18.7.jpg', 18.7, '主歌：人物/猫日常（歌词「雨停了河面泛着光」）'),
    ('f_24.jpg', 24, '主歌：人物/猫日常（歌词「那张画顺着水流向远方」）'),
    ('f_29.3.jpg', 29.3, '主歌：人物/猫日常'),
    ('f_34.5.jpg', 34.5, '主歌：人物/猫日常（歌词「画里的你还在微笑吗」）'),
    ('f_39.8.jpg', 39.8, '主歌收尾：速写本/画（歌词「风把答案吹成了浪」）'),
    ('f_44.5.jpg', 44.5, '副歌：画页飞起/动感（歌词「漂吧漂吧别怕路太长」）'),
    ('f_49.7.jpg', 49.7, '副歌：画页贴水漂流（歌词「碎玻璃里映着你的模样」）'),
    ('f_55.jpg', 55, '副歌：人物动感（歌词「当春风又吹动我的头发」）'),
    ('f_60.jpg', 60, '副歌：画页特写（歌词「你还会回到我身旁」）'),
    ('f_64.5.jpg', 64.5, '尾奏：远景收尾'),
    ('f_69.5.jpg', 69.5, '片名卡「漂走的那张画」'),
]


def main():
    content = []
    for fname, t, intent in INTENTS:
        p = FRAMES / fname
        content.append({'type': 'image_url', 'image_url': {
            'url': 'data:image/jpeg;base64,' + base64.b64encode(p.read_bytes()).decode()}})
        content.append({'type': 'text', 'text': f'帧 {t}s（意图：{intent}）'})
    prompt = ('这是动画片头 OP 的抽帧，每帧前有一行"帧号+段落意图"说明。'
              '这是一部"物哀、思念、温暖"气质的动画片头：河堤、柳树、画画的男孩阿澈、蓝发女孩小蓝、橘猫小橘、'
              '一张被风吹走漂在河面的画。'
              '逐帧回答：1) 实际画面内容是什么？2) 与标注的段落意图是否匹配？'
              '3) 画面底部歌词/字幕条有没有出现两条文字叠在一起的混乱？'
              '最后总评：前奏/主歌/副歌/尾奏的节奏走向是否成立，有没有出戏的镜头（比如不属于这个故事的角色）。'
              '输出中文 JSON：frames[{t,content,fit,subtitle_issue}],overall,off_notes')
    payload = {'model': 'qwen3-omni-flash', 'modalities': ['text'], 'stream': True,
               'messages': [{'role': 'user', 'content': content + [{'type': 'text', 'text': prompt}]}]}
    req = urllib.request.Request('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        data=json.dumps(payload).encode(),
        headers={'Authorization': 'Bearer ' + os.environ['DASHSCOPE_API_KEY'],
                 'Content-Type': 'application/json'})
    answer = ''
    with urllib.request.urlopen(req, timeout=300) as resp:
        for line in resp:
            if not line.startswith(b'data:'):
                continue
            data = line[5:].strip()
            if data == b'[DONE]':
                break
            for c in json.loads(data).get('choices', []):
                answer += c.get('delta', {}).get('content') or ''
    out = ROOT / 'volcano/op/frame_review.txt'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(answer, encoding='utf-8')
    print(answer)


if __name__ == '__main__':
    main()
