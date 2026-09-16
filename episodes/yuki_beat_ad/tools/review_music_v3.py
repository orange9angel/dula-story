"""Audio-model listening aid; scores are advisory, never human approval."""
from pathlib import Path
import base64
import json
import os
import subprocess
import sys
import urllib.request
import wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
MUSIC=ROOT/'assets/audio/music/v3'
parts=[]
pair='--pair' in sys.argv
files=['../../mixed_v3_bed.wav','../../mixed_v3_staccato.wav'] if pair else ['audition_a.wav','audition_b.wav','audition_c.wav','../source_v2.wav']
for file in files:
    raw=subprocess.run(['ffmpeg','-v','error','-i',str(MUSIC/file),'-t','14','-ar','24000','-ac','1','-f','s16le','-'],capture_output=True,check=True).stdout
    pcm=np.frombuffer(raw,np.int16)
    pcm=np.pad(pcm[:14*24000],(0,max(0,14*24000-len(pcm))))
    parts.extend([pcm,np.zeros(24000,np.int16)])
audition=MUSIC/('mix_comparison.wav' if pair else 'blind_comparison.wav')
with wave.open(str(audition),'wb') as w:
    w.setnchannels(1);w.setsampwidth(2);w.setframerate(24000);w.writeframes(np.concatenate(parts).tobytes())
prompt='''请实际聆听这个音频，四个候选片段为A=0-14秒、B=15-29秒、C=30-44秒、D=45-59秒，中间各1秒静音。不提供原始生成prompt，盲听比较。用途是一个可爱Q版人物在主要重音的瞬间突然戴墨镜、换装、换夸张表情；每个造型需要被看清。不要把有鼓、速度快、拍点多等同于适合卡点。
按每段听到的实际内容评估：1主要落点是否突出且轻重不同；2有没有可记忆的短hook；3停顿、蓄势、释放的听感；4可爱和装酷反差；5是否像平铺背景音乐。说明具体听到的乐器、节奏类型、人声情况。每段给0-10的适配评分和理由，选一个最适合这类变装卡点的，若四个都不合适就明确说没有。给出你选中的片段内最适合首次变装及连续换装的近似秒数（时间判断只是建议）。不要假装精确到毫秒。输出中文JSON，字段candidates[{id,score,heard,weakness}],selected,reason,approximate_reveal_times。'''
payload={'model':'qwen3-omni-flash','modalities':['text'],'stream':True,
         'messages':[{'role':'user','content':[{'type':'input_audio','input_audio':{'data':'data:audio/wav;base64,'+base64.b64encode(audition.read_bytes()).decode(),'format':'wav'}},{'type':'text','text':prompt}]}]}
if pair:
    prompt='请实际聆听这两段音乐剪辑：A=0-14秒，B=15-29秒，中间1秒静音。哪段更适合Q版女孩随主要重音突然戴墨镜、换装、换可爱表情？盲听比较，不知道哪个是新版。主要标准：落点明显、短句有记忆、停顿与重击的反差、轻巧可爱、听起来是否被生硬截断。不要因鼓点多就给高分。描述你实际听到的音色和节奏，指出各自不足，选A、B或两者都不适合。无需毫秒级时间推断。'
    payload['messages'][0]['content'][1]['text']=prompt
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
(MUSIC/('mix_listening_review.txt' if pair else 'model_listening_review.txt')).write_text(answer,encoding='utf-8')
(MUSIC/('mix_review_metadata.json' if pair else 'review_metadata.json')).write_text(json.dumps({'model':'qwen3-omni-flash','human_review':False,'prompt':prompt},ensure_ascii=False,indent=2),encoding='utf-8')
print(answer)
