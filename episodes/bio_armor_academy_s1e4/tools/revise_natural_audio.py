"""Reversible dialogue auditions for the user's scene-naturalness review."""
from pathlib import Path
import argparse, hashlib, json, os, shutil, subprocess, sys, zipfile
import numpy as np
from scipy.io import wavfile

EP=Path(__file__).resolve().parents[1]; STORY=EP.parents[1]; W=EP/'tmp/natural_audio'
W.mkdir(parents=True,exist_ok=True)
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,obj):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

NOTES={
4:'同学一边求助一边把手藏着，你已经看到了，随口让他把那只手伸出来，亲近自然。',
6:'同学刚开玩笑怕你把他泡进标本罐，你顺着他的玩笑随口回一句，说到放不下时自己有一点想笑。',
8:'你看见同学正使劲攥紧受伤的手，马上轻声提醒他松开，注意力在他的手上。',
10:'你发现他手上的印子变长了，先短促叫停，看清楚后把自己的发现告诉他。',
13:'面前的同学担心自己会一直这样。你刚仔细看过他的手，无奈地告诉他实情，轻声对他说，说完还在想着能帮他的办法。',
15:'刚才的事让他有点低落，你顺手请他帮忙拿叶子，让他留下来一起做点事，像平常聊天。',
17:'同学问自己是不是也要贴标签，你接住他的玩笑，顺口约他明天放学再来，其实希望明天还能见到他。'}

def backup():
    dest=EP/'output/archive/before_natural_audio.zip'
    if dest.exists():
        with zipfile.ZipFile(dest) as z:save(W/'baseline.json',json.loads(z.read('manifest.json')))
        print('Existing natural-audio rollback retained');return
    files=[EP/p for p in ['output/current.mp4','script.story','viewer.js','performance_remake.js','performance_tripo.js','render.mjs']]
    for folder in ['config','tools','storyboard/episode_current','assets3d/dialogue_r3','assets3d/processed','assets3d/music']:
        files.extend(p for p in (EP/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    files.extend((EP/'assets3d').glob('*.wav'))
    manifest={}
    with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=1) as z:
        for p in dict.fromkeys(files):
            key=p.relative_to(EP).as_posix();z.write(p,key);manifest[key]=sha(p)
        z.writestr('manifest.json',json.dumps(manifest,indent=2))
    save(W/'baseline.json',manifest)
    print(json.dumps({'archive':str(dest),'files':len(manifest),'videoSha256':manifest['output/current.mp4']}))

def audition():
    sys.path.insert(0,str(STORY.parent/'dula-skills/volc-voice-casting/scripts'))
    from seedtts_say import synthesize
    for raw in (STORY/'.env.speech').read_text(encoding='utf-8-sig').splitlines():
        if '=' in raw and not raw.strip().startswith('#'):
            k,v=raw.removeprefix('export ').split('=',1)
            if k.strip()=='VOLC_SPEECH_API_KEY':os.environ.setdefault(k.strip(),v.strip().strip('\"\''))
    plan=read(EP/'config/audio_direction.json')
    voices={'B':plan['characters']['QianTangKui']['voice'],'C':'zh_female_vv_uranus_bigtts'}
    rows=[]
    for label,speaker in voices.items():
        for entry in [6,13,17]:
            line=next(l for l in plan['dialogue'] if l['entry']==entry)
            req={'text':line['text'],'speaker':speaker,'emotion':None,'emotion_scale':None,
                 'provider':'seed-tts-2.0','wireVersion':2,'context_texts':[NOTES[entry]],'speech_rate':0}
            out=W/f'voices/{label}_{entry}.mp3';out.parent.mkdir(parents=True,exist_ok=True)
            key=hashlib.sha256(json.dumps(req,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
            meta=out.with_suffix('.source.json');old=read(meta) if meta.exists() else {}
            if not(out.exists() and old.get('input_sha256')==key and old.get('audio_sha256')==sha(out)):
                synthesize(req['text'],speaker,out,context_texts=req['context_texts'],speech_rate=0)
                save(meta,{'request':req,'input_sha256':key,'audio_sha256':sha(out)})
            duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(out)]))
            rows.append({'candidate':label,'entry':entry,'file':str(out),'expect_text':line['text'],'window_s':line['speechWindow'][1]-line['speechWindow'][0],'kind':'dialogue','duration':duration})
            print(label,entry,duration,flush=True)
    save(W/'voices/qc_manifest.json',rows)
    save(W/'voices/candidates.json',voices)
    montage()

def audio(path):
    x=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac','1','-ar','24000','-']),np.float32).copy()
    active=np.flatnonzero(np.abs(x)>.004)
    if len(active):x=x[max(0,active[0]-960):min(len(x),active[-1]+2400)]
    x*=.09/max(float(np.sqrt(np.mean(x*x))),1e-8)
    return np.clip(x,-.95,.95)

def montage():
    # Compare complete exchanges, same male prompt each time. No score or SFX.
    chunks=[];mapping=[];pos=0
    for label in ['A','B','C']:
        for entry,prior in [(13,11),(6,5),(17,16)]:
            p=EP/f'assets3d/processed/entry_{prior}.wav'
            q=W/f'voices/original_{entry}.wav' if label=='A' else W/f'voices/{label}_{entry}.mp3'
            if label=='A':
                with zipfile.ZipFile(EP/'output/archive/before_natural_audio.zip') as z:
                    q.write_bytes(z.read(f'assets3d/processed/entry_{entry}.wav'))
            parts=[audio(p),np.zeros(6000),audio(q),np.zeros(24000)]
            length=sum(len(v) for v in parts)/24000
            mapping.append({'group':label,'entry':entry,'start':pos,'end':pos+length,'femaleFile':str(q.relative_to(EP)),'sha256':sha(q)})
            chunks.extend(parts);pos+=length
        chunks.append(np.zeros(36000));pos+=1.5
    wavfile.write(W/'voice_comparison.wav',24000,(np.concatenate(chunks)*32767).astype(np.int16))
    save(W/'voice_comparison_map.json',mapping)

def adopt_voice():
    assert (W/'baseline.json').exists(), 'Back up before adopting'
    plan=read(EP/'config/audio_direction.json')
    for line in plan['dialogue']:
        if line['character']!='QianTangKui':continue
        entry=line['entry'];d=line['delivery']
        d.update(nativeContextTexts=[NOTES[entry]],nativeSpeechRate=0,nativeEmotion=None,nativeEmotionScale=None,pace=1.0)
        d['tone']={4:'casual_request',6:'dry_teasing',8:'concerned',10:'firm_concern',13:'honest_concern',15:'casual_invitation',17:'warm_invitation'}[entry]
        if entry in [6,13,17]:
            src=W/f'voices/B_{entry}.mp3';dest=EP/f'assets3d/dialogue_r3/entry_{entry}.mp3'
            shutil.copy2(src,dest);shutil.copy2(src.with_suffix('.source.json'),dest.with_suffix('.source.json'))
    save(EP/'config/audio_direction.json',plan)
    voice=read(EP/'config/voice_config.json')
    voice['characters']['QianTangKui']['castingStatus']='same-native-actor-scene-directed; user-review-pending'
    save(EP/'config/voice_config.json',voice)
    save(W/'voice_decision.json',{'selected':'B','identityChanged':False,'entriesAdoptedExactly':[6,13,17],
         'reason':'User rejected explanatory delivery. Replace genre/voice-quality instructions with concrete listener, observation and response for each line.',
         'limits':'Model comparison is advisory and not human listening or user acceptance.'})
    print('Same actress; contextual direction adopted; selected audition bytes retained.')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['backup','audition','montage','adopt_voice']);a=p.parse_args()
    globals()[a.action]()
