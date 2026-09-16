"""Audio-model listening aid for V4; scores are advisory, never human approval."""
from pathlib import Path
import base64
import json
import os
import subprocess
import urllib.request
import wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
MUSIC=ROOT/'assets/audio/music/v4'
parts=[]
for file in ['audition_d.wav','audition_e.wav','audition_f.wav']:
    raw=subprocess.run(['ffmpeg','-v','error','-i',str(MUSIC/file),'-t','14','-ar','24000','-ac','1','-f','s16le','-'],capture_output=True,check=True).stdout
    pcm=np.frombuffer(raw,np.int16)
    pcm=np.pad(pcm[:14*24000],(0,max(0,14*24000-len(pcm))))
    parts.extend([pcm,np.zeros(24000,np.int16)])
audition=MUSIC/'blind_comparison.wav'
with wave.open(str(audition),'wb') as w:
    w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(np.concatenate(parts).tobytes())
prompt='''请实际聆听这个音频，三个候选片段为A=0-14秒、B=15-29秒、C=30-44秒，中间各1秒静音。不提供原始生成prompt，盲听比较。用途是一支俏皮可爱的Q版女孩换装跳舞卡点视频：人物在主要重音的瞬间换装、转圈、跳起、换夸张表情，每个造型需要被看清。目标气质是俏皮、可爱、糖果感，让人想跟着点头。
按每段听到的实际内容评估：1主要落点是否突出且轻重不同；2有没有可记忆的短hook，是否够俏皮可爱；3停顿、蓄势、释放的听感；4轻重反差是否夸张；5是否像平铺背景配乐或健身鼓点。说明具体听到的乐器、节奏类型、人声情况。每段给0-10的适配评分和理由，选一个最适合的，若都不合适就明确说没有。给出你选中的片段内最适合做主要变化点的近似秒数（时间判断只是建议）。不要假装精确到毫秒。输出中文JSON，字段candidates[{id,score,heard,weakness}],selected,reason,approximate_reveal_times。'''
payload={'model':'qwen3-omni-flash','modalities':['text'],'stream':True,
         'messages':[{'role':'user','content':[{'type':'input_audio','input_audio':{'data':'data:audio/wav;base64,'+base64.b64encode(audition.read_bytes()).decode(),'format':'wav'}},{'type':'text','text':prompt}]}]}
request=urllib.request.Request('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
 data=json.dumps(payload).encode(),headers={'Authorization':'Bearer '+os.environ['DASHSCOPE_API_KEY'],'Content-Type':'application/json'})
answer=''
with urllib.request.urlopen(request,timeout=180) as response:
    for line in response:
        if not line.startswith(b'data:'):continue
        data=line[5:].strip()
        if data==b'[DONE]':break
        obj=json.loads(data)
        for c in obj.get('choices',[]):answer+=c.get('delta',{}).get('content') or ''
(MUSIC/'model_listening_review.txt').write_text(answer,encoding='utf-8')
(MUSIC/'review_metadata.json').write_text(json.dumps({'model':'qwen3-omni-flash','human_review':False,'prompt':prompt},ensure_ascii=False,indent=2),encoding='utf-8')
print(answer)
