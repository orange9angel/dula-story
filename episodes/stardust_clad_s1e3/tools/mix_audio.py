"""Build four stems and speaking envelopes from the same placed PCM."""
from pathlib import Path
import json,hashlib,subprocess
import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d
from scipy.signal import butter,sosfilt
EP=Path(__file__).resolve().parents[1];SR=48000
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):
 return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar',str(SR),'-ac','2','-f','f32le','-']),np.float32).reshape(-1,2).copy()
def fade(x,a=.01,b=.06):
 na=min(round(a*SR),len(x)//2);nb=min(round(b*SR),len(x)//2)
 if na:x[:na]*=np.linspace(0,1,na)[:,None]
 if nb:x[-nb:]*=np.linspace(1,0,nb)[:,None]
 return x
def trim(x):
 hop=240;e=np.sqrt(np.mean(x[:len(x)//hop*hop].reshape(-1,hop,2)**2,axis=(1,2)))
 hit=np.flatnonzero(e>max(.0015,float(e.max())*.035))
 if not len(hit):raise ValueError('silent source')
 a=max(0,int(hit[0])*hop-240);b=min(len(x),int(hit[-1]+1)*hop+2400)
 return x[a:b].copy(),a/SR
def main():
 plan=read(EP/'config/audio_direction.json');tl=read(EP/'config/timeline.json');dlg=read(EP/'config/dialogue.json');cues=read(EP/'config/event_times.json')
 assert plan['status']=='reviewed'
 for s in plan['sources']:assert sha(EP/s['path'])==s['sha256']
 N=round(SR*tl['duration']);buses={k:np.zeros((N,2),np.float32) for k in ['voice','sfx','ambience','music']}
 envs=[];report={'sources':[],'dialogue':[],'sfx':[],'listening':'not performed; technical QC only'}
 def source(p):
  meta=p.with_suffix('.source.json');m=read(meta) if meta.exists() else {}
  if 'sha256'in m:assert sha(p)==m['sha256'],p
  report['sources'].append({'path':str(p.relative_to(EP)),'sha256':sha(p),'provider':m.get('provider','unknown')})
  return load(p)
 def place(bus,x,t,gain=1):
  a=round(t*SR);b=min(N,a+len(x));bus[a:b]+=x[:b-a]*gain
 speech=[]
 for l in dlg['lines']:
  x,cut=trim(source(EP/'assets3d/dialogue'/f"{l['id']}.wav"))
  x=fade(x);x*=.53/max(.01,float(np.max(np.abs(x))))
  t={'e01':cues['punch']-.10,'e02':cues['catch']-.12,'e03':cues['thread_cut']-.12}.get(l['id'],l['t']+.02)
  duration=len(x)/SR
  assert t+duration<=l['end']+.001,f"{l['id']} ends {t+duration:.3f} after {l['end']}"
  place(buses['voice'],x,t);speech.append((t,t+duration))
  hop=480;mono=np.mean(x,axis=1);padded=np.pad(mono,(0,(-len(mono))%hop));rms=np.sqrt(np.mean(padded.reshape(-1,hop)**2,axis=1))
  jaw=np.where(rms>.012,np.clip((rms-.008)/.16,0,.95),0)
  jaw=uniform_filter1d(jaw,size=3);jaw[rms<.008]=0
  envs.append({'id':l['id'],'speaker':l['speaker'],'t0':t,'dur':duration,'dt':.01,'jaw':np.round(jaw,3).tolist()})
  report['dialogue'].append({'id':l['id'],'t':t,'end':t+duration,'trim_start':cut,'duration':duration,'window_end':l['end']})
 for cue in plan['sfx']:
  x,cut=trim(source(EP/'assets3d/sfx'/f"{cue['name']}.wav"));x=fade(x[:int(SR*1.5)],.003,.08);x*=.6/max(.01,float(np.max(np.abs(x))))
  place(buses['sfx'],x,cue['startTime'],cue['volume'])
  report['sfx'].append({'id':cue['id'],'at':cue['startTime'],'source_trim':cut,'peak':float(np.max(np.abs(x))),'anchor':cue['anchor']})
 x=source(EP/'assets3d/sfx/wind_gorge.wav')
 x=sosfilt(butter(3,[65,1700],fs=SR,btype='bandpass',output='sos'),x,axis=0).astype(np.float32)
 rms=np.sqrt(uniform_filter1d(np.mean(x*x,axis=1),size=19200)+1e-9)
 x*=np.clip(.035/np.maximum(.008,rms),.35,3)[:,None]
 seam=min(SR,len(x)//4);w=np.linspace(0,1,seam)[:,None];x[:seam]=x[-seam:]*(1-w)+x[:seam]*w;x=x[:-seam]
 bed=np.tile(x,(int(np.ceil(N/len(x))),1))[:N];buses['ambience']=fade(bed,.8,2)*.35
 sec=np.sqrt(np.mean(x[:len(x)//SR*SR].reshape(-1,SR,2)**2,axis=(1,2)))
 report['ambience']={'rms_max_mean':float(sec.max()/sec.mean()),'processing':'65–1700Hz EQ and 0.4s gain envelope; source-tail crossfade'}
 for cue in plan['music']:
  x=source(EP/'assets3d/sfx'/f"{cue['asset']}.wav");a=round(cue['sourceStart']*SR);n=round((cue['endTime']-cue['startTime'])*SR)
  assert a+n<=len(x),cue['id']
  x=fade(x[a:a+n].copy(),cue['fadeIn'],cue['fadeOut'])
  place(buses['music'],x,cue['startTime'],cue['baseVolume'])
 duck=np.ones(N,np.float32)
 for a,b in speech:
  i=max(0,round((a-.10)*SR));j=min(N,round((b+.12)*SR));duck[i:j]=.36
 duck=uniform_filter1d(duck,size=7200)
 buses['music']*=duck[:,None];buses['ambience']*=np.maximum(.65,duck)[:,None]
 # The decision has a smaller environmental bed without an artificial mute.
 buses['ambience'][70*SR:77*SR]*=.4
 total=sum(buses.values());peak=float(np.max(np.abs(total)));gain=min(1,.74/max(peak,.001))
 total*=gain
 out=EP/'assets3d/stems';out.mkdir(exist_ok=True)
 for k,x in buses.items():sf.write(out/f'{k}.wav',x*gain,SR,subtype='PCM_16')
 sf.write(EP/'assets3d/mixed.wav',total,SR,subtype='PCM_16')
 save(EP/'config/voice_envs.json',{'lines':envs,'source_sha256':sha(out/'voice.wav')})
 report.update(duration=N/SR,peak=float(np.max(np.abs(total))),normalization=gain,mixed_sha256=sha(EP/'assets3d/mixed.wav'))
 save(EP/'assets3d/mix_report.json',report);print(json.dumps({k:report[k] for k in ['duration','peak','normalization']}))
if __name__=='__main__':main()
