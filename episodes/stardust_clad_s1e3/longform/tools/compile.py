"""Build the authoritative .story from measured voice, then compile its timings."""
from pathlib import Path
import json,hashlib,re,subprocess,sys
import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d
sys.path.insert(0,str(Path(__file__).parent))
from audio_jobs import ROOT,extract,save
SR=48000
CAST={'xiaozao':'Xiaozao','jianwang':'Jianwang','weihe':'Weihe','yabo':'Yabo','mideng':'Mideng'}
SCENES={'market':'WindwardMarket','courtyard':'WindwardCourt','store':'WindwardStore','greenhouse':'WindwardGreenhouse','bridge':'WindwardBridge','windwell':'WindwardWell'}
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def stamp(t):
 ms=round(t*1000);s,ms=divmod(ms,1000);m,s=divmod(s,60);h,m=divmod(m,60)
 return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'
def seconds(st):
 h,m,s,ms=map(int,re.split('[:,]',st));return h*3600+m*60+s+ms/1000
def prepare_voice(l):
 p=ROOT/'assets/audio/dialogue'/f"{l['id']}.wav"
 meta=json.loads(p.with_suffix('.source.json').read_text(encoding='utf-8'))
 assert meta['text']==l['text'] and meta['delivery']==l['delivery'],f"stale {l['id']}"
 assert digest(p)==meta['sha256']
 x,sr=sf.read(p,dtype='float32',always_2d=True);assert sr==SR
 hop=240;e=np.sqrt(np.mean(x[:len(x)//hop*hop].reshape(-1,hop,2)**2,axis=(1,2)))
 hit=np.flatnonzero(e>max(.0012,float(e.max())*.025))
 assert len(hit),f"silent {l['id']}"
 start=max(0,int(hit[0])*hop-960);end=min(len(x),int(hit[-1]+1)*hop+2880)
 x=x[start:end].copy();peak=float(np.max(np.abs(x)));x*=.52/max(peak,.001)
 n=min(240,len(x)//4);x[:n]*=np.linspace(0,1,n)[:,None];x[-n:]*=np.linspace(1,0,n)[:,None]
 out=ROOT/'assets/audio/voice_clean'/p.name;out.parent.mkdir(parents=True,exist_ok=True);sf.write(out,x,SR,subtype='PCM_16')
 mono=np.mean(x,axis=1);hop=480;y=np.pad(mono,(0,(-len(mono))%hop))
 rms=np.sqrt(np.mean(y.reshape(-1,hop)**2,axis=1));jaw=uniform_filter1d(np.clip((rms-.007)/.125,0,.93),size=3);jaw[rms<.007]=0
 return {'duration':len(x)/SR,'trim_start':start/SR,'source':str(out.relative_to(ROOT)).replace('\\','/'),
         'sha256':digest(out),'dt':.01,'jaw':np.round(jaw,3).tolist()}
def action_distribution(beat):
 n=len(beat['lines']);budget=beat['actionSeconds']
 if not n:return {0:budget}
 # Each pause has an actual silent action block consumed by the choreography.
 if beat['id']=='B40':return {0:7,2:12,6:12,9:16}
 if beat['id']=='B42':return {0:12,2:19,9:22}
 if beat['id']=='B31':return {0:11.2,4:2,8:16.8}
 if beat['id']=='B13':return {0:16,2:18,4:22,7:13}
 return {0:round(budget*.28,2),n//2:round(budget*.30,2),n:round(budget*.42,2)}
def compile_measured():
 beats,lines=extract();voice={l['id']:prepare_voice(l) for l in lines}
 entries=[];cursor=0;timing=[];events={};envelopes=[];placed=[]
 for beat in beats:
  begin=cursor;budget=action_distribution(beat);windows=[];start_entry=len(entries)+1
  def action(after):
   nonlocal cursor
   dur=budget.get(after,0)
   if dur<=0:return
   start=cursor;cursor=round(cursor+dur,3);aid=f"{beat['id']}_A{after:02d}"
   windows.append({'id':aid,'start':start,'end':cursor,'afterLine':after})
   tag=f"{{Event:Action|id={aid}|beat={beat['id']}|after={after}}}"
   entries.append({'start':start,'end':cursor,'text':f"@{SCENES[beat['scene']]}\n{tag}",'beat':beat['id'],'kind':'action','id':aid})
  action(0)
  for i,l in enumerate(beat['lines'],1):
   v=voice[l['id']];start=cursor;gap=.36 if l['tone'] not in ['danger','finale'] else .24
   if '……' in l['text']:gap+=.22
   cursor=round(start+v['duration']+gap,3)
   tag=f"{{Event:Act|id={l['id']}|beat={beat['id']}|tone={l['tone']}}}"
   entries.append({'start':start,'end':cursor,'text':f"@{SCENES[beat['scene']]}\n{tag}\n[{CAST[l['speaker']]}]{l['text']}",'beat':beat['id'],'kind':'dialogue','id':l['id']})
   placed.append({**l,'start':start,'audio_end':round(start+v['duration'],5),'end':cursor,'source':v['source'],'sha256':v['sha256']})
   envelopes.append({'id':l['id'],'speaker':l['speaker'],'t0':start,'dur':v['duration'],'dt':v['dt'],'jaw':v['jaw']})
   events[l['id']]=start;events[l['id']+'_end']=round(start+v['duration'],5)
   action(i)
  timing.append({k:v for k,v in beat.items() if k!='lines'}|{'start':begin,'end':cursor,'entry':start_entry,'lineIds':[l['id'] for l in beat['lines']],'actions':windows})
 # This file is the authoritative temporal source. JSON is read back from it below.
 story='\n\n'.join(f"{i}\n{stamp(e['start'])} --> {stamp(e['end'])}\n{e['text']}" for i,e in enumerate(entries,1))+'\n'
 (ROOT/'script.story').write_text(story,encoding='utf-8')
 sha=digest(ROOT/'script.story')
 for i,block in enumerate(re.split(r'\n\s*\n',story.strip())):
  rows=block.splitlines();start,end=rows[1].split(' --> ');entries[i]['start']=seconds(start);entries[i]['end']=seconds(end)
 assert all(entries[i]['end']<=entries[i+1]['start'] for i in range(len(entries)-1))
 save(ROOT/'config/timeline.json',{'source':'script.story','source_sha256':sha,'duration':cursor,'beats':timing,'entries':entries,'lines':placed,'events':events})
 save(ROOT/'config/voice_envs.json',{'sourceStorySha256':sha,'lines':envelopes})
 save(ROOT/'config/timing_report.json',{'duration':cursor,'minutes':cursor/60,'dialogueSeconds':sum(v['duration'] for v in voice.values()),'independentActionSeconds':sum(b['actionSeconds'] for b in beats),'lines':len(lines),'entries':len(entries),'overlaps':0,'measurement':'trimmed final placed PCM; no time stretch'})
 print(json.dumps({'duration':cursor,'minutes':cursor/60,'dialogue':sum(v['duration'] for v in voice.values()),'entries':len(entries)}))
if __name__=='__main__':compile_measured()
