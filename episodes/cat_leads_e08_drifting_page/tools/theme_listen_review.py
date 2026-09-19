#!/usr/bin/env python3
"""E08 主题曲候选盲听评审：送 qwen3-omni 实际聆听，输出气质判断。

评审对象：3 条真采样（埙/笛）+ 2 条混合 demo + 2 条 AI 候选。
分数只是 advisory，不作人工验收。
"""
from pathlib import Path
import base64
import json
import os
import subprocess
import urllib.request
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / 'assets/audio/theme'

SR = 24000

# (标签, 文件, 起, 截取秒)
SEGMENTS = [
    ('A=埙采样', 'samples/xun_200419.mp3', 0, 10),
    ('B=笛子采样1', 'samples/dizi_594071.mp3', 5, 10),
    ('C=笛子采样2', 'samples/dizi_320223.mp3', 30, 10),
    ('D=混合demo1(埙+人声歌谣)', 'demo1_xun_intro_ballad.wav', 6, 12),
    ('E=混合demo2(埙+纯音乐)', 'demo2_xun_bgm.wav', 6, 12),
    ('F=AI人声候选a', 'candidate_a.wav', 0, 10),
    ('G=AI纯音乐候选e', 'candidate_e_bgm.wav', 0, 10),
]

def load(path, start, dur):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(start), '-t', str(dur),
                          '-i', str(path), '-ar', str(SR), '-ac', '1', '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    pcm = np.frombuffer(raw, np.int16)
    return np.pad(pcm[:dur * SR], (0, max(0, dur * SR - len(pcm))))

parts = []
markers = []
t = 0.0
for label, rel, start, dur in SEGMENTS:
    parts.append(load(THEME / rel, start, dur))
    markers.append(f"{label}: {t:.0f}-{t + dur:.0f}秒")
    t += dur
    parts.append(np.zeros(SR, np.int16))  # 1s 静音
    t += 1
blind = THEME / 'blind_theme_review.wav'
with wave.open(str(blind), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(np.concatenate(parts).tobytes())

prompt = f'''请实际聆听这个音频，共7个片段，中间各1秒静音：{"；".join(markers)}。
这是一部"物哀"气质的动画主题曲选料：目标是哀而不伤、思念、温暖、浪漫（参考气质：和田薰的民乐弦乐叙事、久石让的留白钢琴）。
逐段回答：
1. 实际听到了什么乐器？（特别判断：是不是真埙/真竹笛，还是合成仿制品）
2. 气质是"哀而不伤"吗？还是偏口水流行/偏冥想氛围/偏喜庆？
3. D、E 两个混合段里，真采样和后面的 AI 底衔接自然吗？有没有调性冲突或情绪断裂？
4. 如果要拼一首主题曲（真埙/真笛 + AI 底），哪几段值得用、怎么用（开场/间奏/尾奏）？
输出中文 JSON，字段 segments[{{id,instruments,vibe,is_ethnic_real,sync_issue}}],recommendation。'''

payload = {'model': 'qwen3-omni-flash', 'modalities': ['text'], 'stream': True,
           'messages': [{'role': 'user', 'content': [
               {'type': 'input_audio', 'input_audio': {
                   'data': 'data:audio/wav;base64,' + base64.b64encode(blind.read_bytes()).decode(),
                   'format': 'wav'}},
               {'type': 'text', 'text': prompt}]}]}
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
(THEME / 'theme_listening_review.txt').write_text(answer, encoding='utf-8')
print(answer)
