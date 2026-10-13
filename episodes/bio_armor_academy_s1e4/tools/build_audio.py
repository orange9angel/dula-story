"""Mix isolated speech and derive mouth energy from the final placed PCM stems."""
from pathlib import Path
import hashlib, json, subprocess
import numpy as np
from scipy.io import wavfile

EP=Path(__file__).resolve().parents[1];SR=48000
def read_json(p):return json.loads(p.read_text(encoding='utf-8'))
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
tl=read_json(EP/'config/timeline.json');plan=read_json(EP/'config/audio_direction.json')
assert tl['source']['sha256']==digest(EP/'script.story')==plan['sources'][0]['sha256']
directions={l['entry']:l['delivery'] for l in plan['dialogue']}
n=round(tl['duration']*SR);stems={key:np.zeros(n,dtype=np.float32) for key in plan['characters']}
rows=[];qc=[];out=EP/'assets3d';(out/'processed').mkdir(exist_ok=True,parents=True)
for line in tl['dialogue']:
    raw=out/f"dialogue_r3/{line['id']}.mp3";tempo=directions[line['entry']]['pace']
    data=subprocess.run(['ffmpeg','-v','error','-i',str(raw),'-af',f'atempo={tempo}',
        '-f','f32le','-ac','1','-ar',str(SR),'pipe:1'],capture_output=True,check=True).stdout
    y=np.frombuffer(data,dtype='<f4').copy()
    # Remove only external digital quiet; retain natural internal pauses.
    active=np.flatnonzero(np.abs(y)>max(.003,float(np.max(np.abs(y)))*.012))
    if not len(active):raise ValueError('Empty voice '+line['id'])
    begin=max(0,int(active[0]) - round(.04*SR));end=min(len(y),int(active[-1])+round(.10*SR))
    y=y[begin:end];duration=len(y)/SR;window=line['end']-line['start']
    if duration>window:raise ValueError(f"{line['id']}: final {duration:.3f}s > {window:.3f}s; change story window, never truncate speech")
    y*=.60/max(float(np.max(np.abs(y))),1e-9)*directions[line['entry']]['volume']
    fade=min(round(.007*SR),len(y)//2);y[:fade]*=np.linspace(0,1,fade);y[-fade:]*=np.linspace(1,0,fade)
    processed=out/f"processed/{line['id']}.wav";wavfile.write(processed,SR,(y*32767).astype(np.int16))
    # Re-read quantized final PCM so analysis and playback use the same signal.
    _,pcm=wavfile.read(processed);y=pcm.astype(np.float32)/32768
    start=round(line['start']*SR);stems[line['character']][start:start+len(y)]+=y
    rows.append({**line,'audioEnd':line['start']+duration,'duration':duration,'tempo':tempo,
        'raw_sha256':digest(raw),'processed':str(processed.relative_to(EP)).replace('\\','/'),'processed_sha256':digest(processed)})
    qc.append({'file':str(processed),'expect_text':line['text'],'window_s':window,'kind':'dialogue'})
mix=np.zeros((n,2),np.float32);features={'step':.01,'duration':tl['duration'],'sourceStory':tl['source'],'characters':{},'stems':{}}
for key,pcm in stems.items():
    path=out/f'{key}_stem.wav';wavfile.write(path,SR,(pcm*32767).astype(np.int16));_,quantized=wavfile.read(path);pcm=quantized.astype(np.float32)/32768
    pan=-.12 if key=='LeiXiao' else .12;mix[:,0]+=pcm*np.sqrt((1-pan)/2);mix[:,1]+=pcm*np.sqrt((1+pan)/2)
    hop=480;rms=np.sqrt(np.mean(pcm.reshape(-1,hop)**2,axis=1));active=rms[rms>.004]
    scale=float(np.percentile(active,90)) if len(active) else 1
    jaw=np.where(rms>.004,np.clip(rms/(scale+1e-9),0,1)*.60,0)
    features['characters'][key]=np.round(jaw,4).tolist()+[0]
    features['stems'][key]={'path':str(path.relative_to(EP)).replace('\\','/'),'sha256':digest(path),'rmsGate':.004,'rmsScale':scale}
ambience=None
if plan['ambience']:
    cue=plan['ambience'][0];ambience=out/'ambience/biology_room_prepared.wav'
    rate,room=wavfile.read(ambience);assert rate==SR and room.ndim==2
    room=room.astype(np.float32)/32768
    expected=round((cue['endTime']-cue['startTime'])*SR);assert len(room)==expected
    fade=round(SR*.8);room[:fade]*=np.linspace(0,1,fade)[:,None];room[-fade:]*=np.linspace(1,0,fade)[:,None]
    start=round(cue['startTime']*SR);mix[start:start+len(room)]+=room
    ambience_cue=cue.copy()
def load_audio(path,channels=2):
    b=subprocess.run(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-ac',str(channels),'-ar',str(SR),'pipe:1'],capture_output=True,check=True).stdout
    return np.frombuffer(b,dtype='<f4').reshape(-1,channels).copy()
def fades(y,seconds):
    k=min(round(seconds*SR),len(y)//2)
    y[:k]*=np.linspace(0,1,k)[:,None];y[-k:]*=np.linspace(1,0,k)[:,None]
    return y
music_bus=np.zeros_like(mix);sfx_bus=np.zeros_like(mix)
music_meta=[];sfx_meta=[]
for cue in plan['music']:
    source=EP/cue['asset'];y=load_audio(source)
    length=round((cue['endTime']-cue['startTime'])*SR)
    if len(y)<length:raise ValueError('Music too short; choose a complete source phrase')
    y=y[:length];y*=10**(cue['targetRmsDb']/20)/max(float(np.sqrt(np.mean(y*y))),1e-8)
    times=np.arange(len(y))/SR+cue['startTime']
    # An explicit dramatic silence, not a promise to a generative model.
    mute=np.interp(times,[0,42.6,44.5,53.2,55.2,79,82],[1,1,0,0,1,1,0])
    duck=np.ones(len(y),np.float32)
    for row in rows:
        env=np.interp(times,[row['start']-.16,row['start'],row['audioEnd']+.05,row['audioEnd']+.4],[1,.48,.48,1])
        duck=np.minimum(duck,env)
    y=fades(y,.8)*mute[:,None]*duck[:,None]
    start=round(cue['startTime']*SR);music_bus[start:start+len(y)]+=y
    music_meta.append({'id':cue['id'],'source':cue['asset'],'sha256':digest(source),'targetRmsDb':cue['targetRmsDb'],'silence':[44.5,53.2]})
for cue in plan['sfx']:
    source=EP/cue['asset'];raw=load_audio(source)
    # Place the strongest bounded event, with 30 ms lead. No looped footsteps.
    mono=np.mean(raw*raw,axis=1);hop=480
    env=np.array([mono[i:i+hop].mean() for i in range(0,len(mono),hop)])
    active=np.flatnonzero(env>max(env.max()*.16,1e-8))
    begin=max(0,(int(active[0])*hop if len(active) else 0)-round(.03*SR))
    y=raw[begin:begin+round(cue['trimSeconds']*SR)]
    y=fades(y,.015);y*=cue['gain']/max(float(np.max(np.abs(y))),1e-8)
    for time in cue['times']:
        start=round(time*SR);sfx_bus[start:start+len(y)]+=y
    sfx_meta.append({'id':cue['id'],'source':cue['asset'],'sha256':digest(source),'times':cue['times'],'sourceTrimStart':begin/SR,'duration':len(y)/SR})
mix+=music_bus+sfx_bus
wavfile.write(out/'music_stem.wav',SR,(music_bus*32767).astype(np.int16))
wavfile.write(out/'sfx_stem.wav',SR,(sfx_bus*32767).astype(np.int16))
(EP/'config/sound_cues.json').write_text(json.dumps({'music':music_meta,'sfx':sfx_meta},ensure_ascii=False,indent=2),encoding='utf-8')
if np.max(np.abs(mix))>=.98:raise ValueError('Mix clipping')
wavfile.write(out/'mixed.wav',SR,(mix*32767).astype(np.int16))
for path,obj in [(EP/'config/voice_features.json',features),(EP/'config/audio_timing.json',{'sourceStory':tl['source'],'lines':rows,'mix_sha256':digest(out/'mixed.wav'),'sampleRate':SR,'duration':n/SR,'peak':float(np.max(np.abs(mix))),'ambience':{'path':str(ambience.relative_to(EP)).replace('\\','/'),'sha256':digest(ambience),'window':[ambience_cue['startTime'],ambience_cue['endTime']]} if ambience else None}),(EP/'storyboard/audio_qc_manifest.json',qc)]:
    path.parent.mkdir(exist_ok=True,parents=True);path.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'duration':n/SR,'lines':len(rows),'peak':float(np.max(np.abs(mix))),'maxLine':max(r['duration'] for r in rows)}))
