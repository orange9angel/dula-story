"""Make anonymous, level-matched voice auditions and isolate opening audio roles."""
from pathlib import Path
import io, json, subprocess
import numpy as np
from scipy.io import wavfile
EP=Path(__file__).resolve().parents[1];WORK=EP/'tmp/romcom_revision';SR=24000
def pcm(path,start=None,duration=None):
    cmd=['ffmpeg','-v','error']
    if start is not None:cmd+=['-ss',str(start)]
    cmd+=['-i',str(path)]
    if duration is not None:cmd+=['-t',str(duration)]
    return np.frombuffer(subprocess.check_output(cmd+['-f','f32le','-ar',str(SR),'-ac','1','-']),np.float32).copy()
def write(name,y):wavfile.write(WORK/name,SR,np.int16(np.clip(y,-.98,.98)*32767))
mapping=[('A','sunny_simple'),('B','warm_classmate'),('C','playful_simple')]
all_audio=[];segments=[];cursor=0
for code,name in mapping:
    start=cursor
    for entry in [3,5]:
        path=EP/f'assets3d/dialogue_r3/entry_{entry}.mp3' if name=='baseline' else WORK/f'voices/{name}_{entry}.mp3'
        y=pcm(path);active=y[np.abs(y)>.012]
        y*=10**(-22/20)/max(float(np.sqrt(np.mean(active*active))),1e-8)
        y=np.concatenate([y,np.zeros(round(.65*SR),np.float32)]);all_audio.append(y);cursor+=len(y)/SR
    segments.append({'label':code,'start':round(start,2),'end':round(cursor,2),'candidate':name})
write('voice_blind.wav',np.concatenate(all_audio))
(WORK/'voice_blind_map.json').write_text(json.dumps(segments,indent=2),encoding='utf-8')
(WORK/'voice_prompt.txt').write_text('请实际听这段音频。四组同样的两句少年男主台词，组别时间：'+json.dumps([{k:v for k,v in s.items() if k!='candidate'} for s in segments])+'''。
只凭听感分别评价：1.有没有精神和气息支撑，是否气弱/低落；2.温暖亲近还是端着读稿；3.“泡进罐子里”是否有主动逗女生的笑意；4.像高中/大学年龄男生还是成年播报；5.发音是否自然、是否有怪声。选最适合校园恋爱喜剧的一组，并指出仍需改进之处。不要据音高自动判断性别，不要因为指令要求活泼就把每组都说成活泼；可以明确没有一组达标。输出简短中文。''',encoding='utf-8')
sections=[('final mix',pcm(EP/'output/current.mp4',0,6.5)),('room tone solo',np.concatenate([np.zeros(round(2.4*SR)),pcm(EP/'assets3d/ambience/biology_room_prepared.wav',0,4.1)])),('music solo',pcm(EP/'assets3d/music_stem.wav',0,6.5)),('Foley solo',pcm(EP/'assets3d/sfx_stem.wav',0,6.5))]
seq=[];meta=[];cursor=0
for label,y in sections:
    meta.append({'label':label,'start':cursor,'end':cursor+len(y)/SR,'rmsDb':float(20*np.log10(max(1e-9,np.sqrt(np.mean(y*y)))))})
    seq.extend([y,np.zeros(SR)]);cursor+=len(y)/SR+1
write('opening_layers.wav',np.concatenate(seq))
(WORK/'opening_layers.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
(WORK/'opening_prompt.txt').write_text('请听以下分轨比较，保持各轨实际成片的相对音量，没有把弱噪声归一放大。时间标注：'+json.dumps(meta)+'''。用户听到开头人物走路有轻微“沙沙声”。请判断原混音中沙沙声最可能对应哪个分轨，描述其连续性、节律、像通风还是脚步/衣物。分轨提示不是答案，不要因标签自行脑补声音。另评现有配乐听起来是轻快恋爱喜剧还是沉静忧郁。只报能听出的事实与不确定项。''',encoding='utf-8')
print(json.dumps({'voices':segments,'openingLayers':meta}))
