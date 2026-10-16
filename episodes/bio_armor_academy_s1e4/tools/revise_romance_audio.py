"""Episode-specific preparation/audition; keep one recoverable audio baseline."""
from pathlib import Path
import argparse, hashlib, json, os, shutil, sys, zipfile, subprocess
import numpy as np
from scipy.io import wavfile

EP=Path(__file__).resolve().parents[1]
STORY=EP.parents[1]
WORK=EP/'tmp/audio_romance'
sys.path.insert(0,str(STORY.parent/'dula-skills/volc-voice-casting/scripts'))
from seedtts_say import synthesize

def load(p): return json.loads(p.read_text(encoding='utf-8'))
def save(p,v):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

BASE='在安静教室里与喜欢的女同学近距离交谈。少年声音温暖清亮，精神饱满，带自然的笑意，真诚亲近。语速自然利落，轻声但有气息支撑，不虚弱，不低沉叹气，不用播报腔。只念台词。'
NOTES={
 3:('带着信任向她求助','想靠近她，也相信她有办法','温柔地问她，尾音带一点期待和好奇。',.53),
 5:('逗她笑，接住她的直接','跟她待在一起很自在','笑着开个小玩笑，亲切俏皮，最后几个字轻轻逗她，不要苦笑。',.64),
 7:('兴致勃勃地提出一个办法','想和她一起试试','有精神地商量办法，疑问轻快上扬，前半句只短暂停顿，不要叹息。',.58),
 9:('尝试后意外地向她求助','愿意让她看见自己出糗','前半句有点顽皮，后半句自然惊讶，像被同桌逮住的小失误，不喊叫不恐惧。',.65),
 11:('认真询问，等待她回应','我相信你，不急着把担心说重','温和、真诚地追问，稍带担心和期待，声音有支撑，尾音上扬，不悲伤不沮丧。',.50),
 14:('听她的话，顺势约明天再见','那我们明天还能见面','轻轻释然地笑着说，明天再看带着期待，今天不试了是温柔的配合，不是认输。',.58),
 16:('用玩笑拉近两个人的距离','想听到她说我和标本不一样','带笑意、温柔俏皮地逗她，贴个标签轻轻上扬，自信又有一点害羞，不刻意拖长。',.65),
}

def prepare():
    archive=EP/'output/archive/before_romance_audio.zip'
    if not archive.exists():
        files=[EP/'output/current.mp4']
        files+=list((EP/'config').glob('*.json'))
        files+=list((EP/'assets3d/dialogue_r3').glob('*'))
        files+=list((EP/'assets3d/processed').glob('*.wav'))
        files+=list((EP/'assets3d').glob('*.wav'))
        files+=list((EP/'storyboard/episode_current').glob('*'))
        files+=[EP/'storyboard/audio_sync.json',EP/'storyboard/audio_qc_manifest.json']
        files=[p for p in files if p.is_file()]
        archive.parent.mkdir(parents=True,exist_ok=True)
        with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=3) as z:
            for p in files:z.write(p,p.relative_to(EP).as_posix())
            z.writestr('baseline_manifest.json',json.dumps({p.relative_to(EP).as_posix():digest(p) for p in files},indent=2))
        print('Archived',len(files),'files',archive)
    plan=load(EP/'config/audio_direction.json')
    plan['sfx']=[c for c in plan['sfx'] if c['id']!='step']
    if not any(e['id']=='no_indoor_footsteps' for e in plan['exclusions']):
        plan['exclusions'].append({'id':'no_indoor_footsteps','scope':'BiologyRoomScene, entire episode','sound':'step','reason':'用户要求这场室内走路不加声音；取消随落脚反复触发的沙沙拟音，不用衣料声替代。'})
    plan['policies']['relationshipDirection']='青春恋爱场景：温暖、主动、信任、带笑意；蚀纹的短暂担心不压倒亲近感。'
    for line in plan['dialogue']:
        if line['character']!='LeiXiao':continue
        intent,subtext,instruction,energy=NOTES[line['entry']]
        line.update(intent=intent,subtext=subtext)
        line['delivery'].update(tone='warm_teasing' if line['entry'] in [5,16] else 'warm_engaged',
            nativeEmotion=None,nativeEmotionScale=None,nativeContextTexts=[BASE+instruction],
            nativeSpeechRate=0,pace=1.0,energy=energy,volume=.96,distance='near')
    save(EP/'config/audio_direction.json',plan)

def audition():
    for raw in (STORY/'.env.speech').read_text(encoding='utf-8-sig').splitlines():
        if '=' in raw and not raw.lstrip().startswith('#'):
            k,v=raw.removeprefix('export ').split('=',1)
            if k.strip()=='VOLC_SPEECH_API_KEY':os.environ.setdefault(k.strip(),v.strip().strip('\"\''))
    plan=load(EP/'config/audio_direction.json')
    candidates={'A':plan['characters']['LeiXiao']['voice'],
                'B':'ICL_uranus_zh_male_wenrounantongzhuo_tob'}
    for label,speaker in candidates.items():
        for entry in [3,16]:
            line=next(l for l in plan['dialogue'] if l['entry']==entry)
            out=WORK/f'{label}_{entry}.mp3'
            request={'speaker':speaker,'text':line['text'],'context_texts':line['delivery']['nativeContextTexts'],'speech_rate':0}
            meta=out.with_suffix('.json')
            if out.exists() and meta.exists() and load(meta).get('request')==request:
                print('cached',out.name,flush=True);continue
            synthesize(request['text'],speaker,out,context_texts=request['context_texts'],speech_rate=0)
            save(meta,{'request':request,'sha256':digest(out)})
            print('generated',out.name,flush=True)
    with zipfile.ZipFile(EP/'output/archive/before_romance_audio.zip') as z:
        for entry in [3,16]:
            (WORK/f'C_{entry}.mp3').write_bytes(z.read(f'assets3d/dialogue_r3/entry_{entry}.mp3'))

def select(label):
    plan=load(EP/'config/audio_direction.json')
    for entry in [3,16]:
        source=WORK/f'{label}_{entry}.mp3';meta=load(source.with_suffix('.json'))
        line=next(l for l in plan['dialogue'] if l['entry']==entry)
        speaker=meta['request']['speaker'];plan['characters']['LeiXiao']['voice']=speaker
        request={'text':line['text'],'speaker':speaker,'emotion':None,'emotion_scale':None,'provider':'seed-tts-2.0',
                 'wireVersion':2,'context_texts':line['delivery']['nativeContextTexts'],'speech_rate':0}
        out=EP/f'assets3d/dialogue_r3/entry_{entry}.mp3';shutil.copyfile(source,out)
        save(out.with_suffix('.source.json'),{'request':request,'input_sha256':hashlib.sha256(json.dumps(request,ensure_ascii=False,sort_keys=True).encode()).hexdigest(),'audio_sha256':digest(out)})
    save(EP/'config/audio_direction.json',plan)

def blind():
    clips=[];markers=[];t=0
    for index,name in enumerate(['B_3','C_3','A_3','A_16','B_16','C_16'],1):
        raw=subprocess.run(['ffmpeg','-v','error','-i',str(WORK/(name+'.mp3')),'-ar','24000','-ac','1','-f','f32le','-'],capture_output=True,check=True).stdout
        y=np.frombuffer(raw,np.float32).copy();active=np.abs(y)>.005
        rms=np.sqrt(np.mean(y[active]**2));y*=min(.12/max(rms,1e-6),.9/max(abs(y).max(),1e-6))
        dur=len(y)/24000;markers.append({'id':index,'start':round(t,3),'end':round(t+dur,3),'file':name})
        clips.extend([y,np.zeros(24000,np.float32)]);t+=dur+1
    wavfile.write(WORK/'blind.wav',24000,(np.concatenate(clips)*32767).astype(np.int16))
    save(WORK/'blind_map.json',markers)
    timing='；'.join(f"片段{m['id']}={m['start']}至{m['end']}秒" for m in markers)
    (WORK/'blind_prompt.txt').write_text('请实际聆听六段中文男声干声，同一句话有三种演绎，各段之间一秒静音。'+timing+
        '。不要从文件名猜测。逐段说明实际听到的台词、听感年龄、声线、精神状态、亲近感、笑意、尾音，是否有虚弱拖气、悲观、战损或播音腔。'
        '场景是少年与喜欢的女同学在教室里交流，不是战斗。第一句话轻轻求助，第二句话开玩笑。分别选择前三段和后三段中最自然、温柔而有精神的一段，说明缺点。不要只因音量较大就判热情；没有明显差别就直接写没有。最后比较各候选声线是否像同一个角色，哪些仍不符合场景。',encoding='utf-8')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['prepare','audition','select','blind']);p.add_argument('--candidate',choices=['A','B']);a=p.parse_args()
    WORK.mkdir(parents=True,exist_ok=True)
    if a.action=='prepare':prepare()
    elif a.action=='audition':audition()
    elif a.action=='blind':blind()
    else:
        if not a.candidate:p.error('--candidate required')
        select(a.candidate)
