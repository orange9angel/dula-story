"""Four audio buses from reviewed direction, measured voice PCM, and actual foot contacts."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
import soundfile as sf

EP=Path(__file__).resolve().parents[1]
SR=48000
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def load(path):
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-ar',str(SR),'-ac','2','-f','f32le','-'])
    return np.frombuffer(raw,np.float32).reshape(-1,2).copy()
def fade(x,fi=.02,fo=.08):
    a=min(len(x)//2,round(fi*SR));b=min(len(x)//2,round(fo*SR))
    if a:x[:a]*=np.linspace(0,1,a,dtype=np.float32)[:,None]
    if b:x[-b:]*=np.linspace(1,0,b,dtype=np.float32)[:,None]
    return x
def crop_event(x):
    hop=240
    mono=np.max(np.abs(x),axis=1)
    frames=len(mono)//hop
    env=np.sqrt(np.mean(mono[:frames*hop].reshape(-1,hop)**2,axis=1))
    hit=np.flatnonzero(env>max(.002,float(env.max())*.07))
    begin=max(0,int(hit[0])*hop-240) if len(hit) else 0
    return fade(x[begin:].copy(),.003,.045),begin/SR
def place(bus,x,t,gain):
    i=round(t*SR);j=min(len(bus),i+len(x))
    if j>i:bus[i:j]+=x[:j-i]*gain
def bed(x,length):
    seam=min(round(1.2*SR),len(x)//4)
    if seam:
        w=np.linspace(0,1,seam,dtype=np.float32)[:,None]
        x=x.copy();x[:seam]=x[-seam:]*(1-w)+x[:seam]*w;x=x[:-seam]
    return np.tile(x,(int(np.ceil(length/len(x))),1))[:length].copy()
def duck(bus,windows,gain,ramp=.18):
    envelope=np.ones(len(bus),np.float32);r=round(ramp*SR)
    for a,b in windows:
        i=max(0,round((a-.10)*SR));j=min(len(bus),round((b+.12)*SR))
        if j<=i:continue
        shape=np.full(j-i,gain,np.float32);rr=min(r,len(shape)//2)
        if rr:
            shape[:rr]=np.linspace(1,gain,rr);shape[-rr:]=np.linspace(gain,1,rr)
        envelope[i:j]=np.minimum(envelope[i:j],shape)
    bus*=envelope[:,None]
def main():
    plan=read(EP/'config/audio_direction.json');tl=read(EP/'config/timeline.json')
    assert plan['status']=='reviewed'
    for item in plan['sources']:assert digest(EP/item['path'])==item['sha256'],item['path']
    duration=tl['duration'];n=round(duration*SR)
    buses={k:np.zeros((n,2),np.float32) for k in ['voice','music','ambience','sfx']}
    sources={};placed=[];envs=[];voice_windows=[]
    def source(name):
        path=EP/'assets3d/sfx'/f'{name}.wav'
        meta=path.with_suffix('.source.json')
        m=read(meta) if meta.exists() else {}
        sources[name]={'path':str(path.relative_to(EP)),'sha256':digest(path),'provider':m.get('provider','existing-accepted-asset')}
        return load(path)
    for cue in plan['ambience']:
        i=round(cue['startTime']*SR);j=round(cue['endTime']*SR)
        x=fade(bed(source(cue['name']),j-i),.9,1.2)
        buses['ambience'][i:j]+=x*cue['volume']
    for cue in plan['music']:
        x=source(cue['asset']);start=round(cue.get('sourceStart',0)*SR)
        length=round((cue['endTime']-cue['startTime'])*SR)
        assert start+length<=len(x),f"score source too short: {cue['id']}"
        x=fade(x[start:start+length].copy(),cue['fadeIn'],cue['fadeOut'])
        place(buses['music'],x,cue['startTime'],cue['baseVolume'])
    foley=read(EP/'config/foley_contacts.json')
    assert foley['storySha256']==tl['source_sha256'],'stale Foley contacts'
    assert foley.get('performanceSha256')==digest(EP/'duel_performance.js'),'stale footsteps for current movement paths'
    assert foley.get('locomotionSha256')==digest(EP/'palace_locomotion.js'),'stale footsteps for current gait'
    events=plan['sfx']+foley['cues'];event_cache={}
    for cue in events:
        name=cue['name'];assert not name.startswith('beast_') and name!='claw_scrape'
        if name not in event_cache:event_cache[name]=crop_event(source(name))
        x,onset=event_cache[name]
        if name=='boot_step':x=fade(x[:round(.45*SR)].copy(),.003,.10)
        place(buses['sfx'],x,cue['startTime'],cue['volume'])
        placed.append(dict(cue,sourceLeadingTrim=round(onset,4)))
    dlg=read(EP/'config/dialogue.json')
    for i,line in enumerate(dlg['lines']):
        path=EP/'assets3d/dialogue'/f"{line['id']}.wav";x=load(path)
        x*=.50/max(float(np.abs(x).max()),1e-8)
        t=line['t'];dur=len(x)/SR
        next_start=dlg['lines'][i+1]['t'] if i+1<len(dlg['lines']) else duration
        assert t+dur<=next_start-.05,f"voice overlap: {line['id']}"
        place(buses['voice'],x,t,1.3);voice_windows.append((t,t+dur))
        mono=x.mean(axis=1);hop=round(.02*SR)
        framed=np.pad(mono,(0,(-len(mono))%hop)).reshape(-1,hop)
        energy=np.sqrt(np.mean(framed*framed,axis=1));threshold=max(.005,float(np.max(energy))*.035)
        hi=max(float(np.percentile(energy,92)),threshold+.001)
        jaw=np.where(energy>threshold,np.clip((energy-threshold)/(hi-threshold)*.85,0,.85),0)
        envs.append({'id':line['id'],'speaker':line['speaker'],'t0':t,'dur':round(dur,4),'dt':.02,
                     'jaw':np.round(jaw,3).tolist(),'sha256':digest(path)})
        sources[line['id']]={'path':str(path.relative_to(EP)),'sha256':digest(path),'provider':'volcano-seedtts'}
    duck(buses['music'],voice_windows,.32,.2);duck(buses['ambience'],voice_windows,.72,.2)
    # Story effects remain legible under speech; the score carries most of the ducking.
    duck(buses['sfx'],voice_windows,.80,.10)
    mixed=sum(buses.values());peak=float(np.max(np.abs(mixed)));ceiling=10**(-2.2/20)
    scale=min(1,ceiling/max(peak,1e-8));mixed*=scale
    out=EP/'assets3d/mixed.wav';sf.write(out,mixed,SR,subtype='PCM_16')
    stemdir=EP/'assets3d/stems_palace';stemdir.mkdir(exist_ok=True)
    for name,bus in buses.items():sf.write(stemdir/f'{name}.wav',bus*scale,SR,subtype='PCM_16')
    (EP/'config/voice_envs.json').write_text(json.dumps({'source':str(out.relative_to(EP)),'source_sha256':digest(out),'lines':envs},ensure_ascii=False),encoding='utf-8')
    report={'duration':duration,'sr':SR,'source_story_sha256':tl['source_sha256'],'sources':sources,
      'events':placed,'music':plan['music'],'ambience':plan['ambience'],
      'dialogue':[{'id':e['id'],'t':e['t0'],'dur':e['dur']} for e in envs],
      'mix_peak':float(np.abs(mixed).max()),'peak_before':peak,'scale':scale,'sha256':digest(out)}
    (EP/'assets3d/mix_report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'mixed':str(out),'duration':duration,'events':len(placed),'peak':report['mix_peak'],'scale':scale}))
if __name__=='__main__':main()
