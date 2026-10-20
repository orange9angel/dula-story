"""Compile the trial's story, place existing source audio and preserve provenance."""
from pathlib import Path
import re,json,hashlib,importlib.util
import numpy as np
import soundfile as sf
HERE=Path(__file__).resolve().parent
EP=HERE.parents[1]
spec=importlib.util.spec_from_file_location('mix',EP/'tools/mix_audio.py')
mix=importlib.util.module_from_spec(spec);spec.loader.exec_module(mix)
SR=48000
def save(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def seconds(s):
 h,m,s,ms=map(int,re.split('[:,]',s));return h*3600+m*60+s+ms/1000
story=HERE/'script.story';beats=[];lines=[];cues={}
for b in re.split(r'\n\s*\n',story.read_text(encoding='utf-8').strip()):
 rows=b.splitlines();start,end=map(seconds,rows[1].split(' --> '));body='\n'.join(rows[2:]);act=None
 for event in re.findall(r'\{Event:([^}]+)\}',body):
  kind,*fields=event.split('|');o=dict(f.split('=',1) for f in fields)
  if kind=='Beat':beats.append(dict(o,start=start,end=end))
  elif kind=='Cue':cues[o['name']]=round(start+float(o.get('offset',0)),3)
  elif kind=='Act':act=o
 for speaker,words in re.findall(r'\[(\w+)\]([^\n]+)',body):
  lines.append(dict(id=act['id'],speaker=speaker.lower(),text=words,start=start,end=end))
duration=beats[-1]['end'];N=round(duration*SR)
buses={k:np.zeros((N,2),np.float32) for k in ['voice','sfx','music','ambience']}
sources=[];envelopes=[]
def load(file):
 p=EP/file;meta=p.with_suffix('.source.json')
 receipt=json.loads(meta.read_text(encoding='utf-8-sig')) if meta.exists() else {}
 if 'sha256' in receipt:assert sha(p)==receipt['sha256']
 sources.append({'path':file,'sha256':sha(p),'receipt':str(meta.relative_to(EP)) if meta.exists() else None})
 return mix.load(p)
def place(bus,x,t,gain=1):
 a=round(t*SR);b=min(N,a+len(x));buses[bus][a:b]+=x[:b-a]*gain
for line in lines:
 x,trim=mix.trim(load(f"assets3d/dialogue/{line['id']}.wav"));x=mix.fade(x)
 x*=.49/max(.01,float(abs(x).max()))
 t={'e01':cues['block']-.14,'e03':cues['cut_hit']-.14}.get(line['id'],line['start']+.08)
 assert t+len(x)/SR<=line['end'],line
 place('voice',x,t);line['t']=t;line['audio_end']=t+len(x)/SR
 mono=x.mean(axis=1);mono=np.pad(mono,(0,(-len(mono))%480))
 rms=np.sqrt(np.mean(mono.reshape(-1,480)**2,axis=1))
 jaw=mix.uniform_filter1d(np.clip((rms-.008)/.16,0,.95),size=3);jaw[rms<.008]=0
 envelopes.append(dict(id=line['id'],speaker=line['speaker'],t0=t,dt=.01,jaw=np.round(jaw,3).tolist()))
events=[('block','blade_shield',.40),('bind','cloth_pull',.28),('plant','boot_step',.27),
        ('lock','chain_tension',.25),('pull','cloth_pull',.33),('cut_hit','string_snap',.45),('land','boot_step',.32)]
for cue,asset,gain in events:
 x,_=mix.trim(load(f'assets3d/sfx/{asset}.wav'));x=mix.fade(x[:int(SR*1.15)],.004,.09)
 x*=.6/max(.01,float(abs(x).max()));place('sfx',x,cues[cue],gain)
music=load('assets3d/sfx/bgm_nightbattle.wav')
assert len(music)>=N
place('music',mix.fade(music[:N].copy(),.7,1.5),0,.12)
wind=load('assets3d/sfx/wind_gorge.wav');wind=np.tile(wind,(int(np.ceil(N/len(wind))),1))[:N]
place('ambience',mix.fade(wind,.8,1.5),0,.07)
duck=np.ones(N,np.float32)
for line in lines:duck[max(0,int((line['t']-.08)*SR)):min(N,int((line['audio_end']+.12)*SR))]=.34
buses['music']*=mix.uniform_filter1d(duck,size=4800)[:,None]
audio=sum(buses.values());audio*=min(1,.78/max(.01,float(abs(audio).max())))
sf.write(HERE/'mixed.wav',audio,SR,subtype='PCM_16')
data=dict(duration=duration,source_sha256=sha(story),beats=beats,lines=lines,cues=cues,envelopes=envelopes)
save(HERE/'timeline.json',data)
(HERE/'timing.js').write_text('export const T='+json.dumps(cues)+';\nexport const B='+json.dumps({b['id']:b['start'] for b in beats})+';\n',encoding='utf-8')
save(HERE/'audio_receipt.json',dict(source_sha256=sha(story),duration=duration,sources=sources,events=events,mixed_sha256=sha(HERE/'mixed.wav'),peak=float(abs(audio).max()),listening='not performed; technical validation only'))
print(json.dumps(dict(duration=duration,lines=len(lines),cues=cues)))
