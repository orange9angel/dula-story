"""R2 mix only: keep the existing dialogue, story timeline and visemes byte-identical."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import numpy as np
import soundfile as sf
from scipy.ndimage import gaussian_filter1d, uniform_filter1d
from scipy.signal import butter, sosfilt, welch, correlate

EP = Path(__file__).resolve().parents[1]
SR = 48000
OUT = EP / 'assets3d/refinement'
SOURCE_FILES = {}


def load(path, provider):
    path = Path(path)
    SOURCE_FILES[str(path.relative_to(EP))] = dict(provider=provider, sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'])
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def rms(x):
    return float(np.sqrt(np.mean(x*x)))


def to_rms(x, target):
    return x * (target / max(rms(x), 1e-9))


def bed_metrics(x):
    y=x.mean(axis=1); blocks=len(y)//SR
    one=np.sqrt(np.mean(y[:blocks*SR].reshape(-1,SR)**2,axis=1))
    hop=SR//100
    env=np.sqrt(np.mean(y[:len(y)//hop*hop].reshape(-1,hop)**2,axis=1));env-=env.mean()
    corr=correlate(env,env,mode='full',method='fft')[len(env)-1:];corr/=max(corr[0],1e-12)
    f,p=welch(y,SR,nperseg=8192)
    return dict(rms_max_mean=float(one.max()/max(one.mean(),1e-12)), envelope_corr_05_1s=float(np.max(corr[50:101])), high_band_4_8k=float(p[(f>=4000)&(f<8000)].sum()/max(p.sum(),1e-12)))


def level_bed(x, low, high):
    x=sosfilt(butter(2,[low,high],fs=SR,btype='bandpass',output='sos'),x,axis=0)
    before=bed_metrics(x)
    # Stable broad envelope, preserve the generated stochastic texture and stereo field.
    power=uniform_filter1d(np.mean(x*x,axis=1),size=round(.4*SR),mode='reflect')
    floor=max(float(np.percentile(power,25))*.12,1e-10)
    x=x/np.sqrt(np.maximum(power,floor))[:,None]
    after=bed_metrics(x)
    return x,dict(before=before,after=after,treatment=f'bandpass {low}-{high}Hz; shared 0.4s RMS envelope normalization')


def assert_story_timeline(timeline):
    def sec(s):
        h,m,t=s.replace(',','.').split(':');return int(h)*3600+int(m)*60+float(t)
    pairs=re.findall(r'(\d\d:\d\d:\d\d,\d{3})\s*-->\s*(\d\d:\d\d:\d\d,\d{3})',(EP/'script.story').read_text(encoding='utf-8'))
    if len(pairs)!=len(timeline['segments']):raise RuntimeError('Story/timeline entry count differs')
    for (a,b),seg in zip(pairs,timeline['segments']):
        if abs(sec(a)-seg['start'])>.0011 or abs(sec(b)-seg['end'])>.0011:raise RuntimeError('Stale timeline: '+seg['id'])


def main():
    tl=json.loads((EP/'config/timeline.json').read_text(encoding='utf-8'))
    assert_story_timeline(tl)
    duration=tl['duration'];n=round(duration*SR);beats={s['move']:s for s in tl['segments']}
    stems={name:np.zeros((n,2)) for name in ['dialogue','ambience','effects','music']}
    reports={}

    def place(bus,x,start,gain=1,fade_in=.02,fade_out=.02):
        at=round(start*SR);m=min(len(x),n-at)
        if at<0 or m<=0:raise ValueError('Cue outside timeline')
        y=x[:m].copy()*gain
        for fade,head in [(fade_in,True),(fade_out,False)]:
            k=min(round(fade*SR),m//2)
            if k:
                if head:y[:k]*=np.linspace(0,1,k)[:,None]
                else:y[-k:]*=np.linspace(1,0,k)[:,None]
        bus[at:at+m]+=y

    active=np.zeros(n)
    for line in tl['dialogue']:
        x=load(EP/f"tmp/proc/{line['id']}.wav",'volcano/seed-tts-2.0 (existing processed take)')
        place(stems['dialogue'],x,line['start'],.55/max(float(np.abs(x).max()),1e-9))
        a=max(0,round((line['start']-.13)*SR));b=min(n,round((line['end']+.15)*SR));active[a:b]=1
    voice=stems['dialogue'];voiced=voice[np.max(np.abs(voice),axis=1)>.015]
    voice_rms=rms(voiced)
    duck=gaussian_filter1d(active,.08*SR)

    wind=load(OUT/'sfx/wind_dusk.wav','volcano/seed-audio-1.0')
    wind,reports['wind']=level_bed(wind,70,1700)
    sf.write(OUT/'sfx/wind_dusk_processed.wav',wind/max(float(np.abs(wind).max()),1e-9)*.8,SR,subtype='PCM_24')
    place(stems['ambience'],to_rms(wind[:n],voice_rms*10**(-26/20)),0,fade_in=1,fade_out=2)
    cic=load(EP/'assets3d/sfx/dusk_cicadas.wav','volcano/seed-audio-1.0 (S1E1 generation log)')
    cic,reports['cicadas']=level_bed(cic,450,5500)
    cic=to_rms(cic,voice_rms*10**(-32/20))
    # Equal-power overlapping windows; no abrupt loop restart.
    stride=len(cic)-SR*2
    for at in range(0,n,stride):place(stems['ambience'],cic,at/SR,fade_in=2,fade_out=2)

    def event(name,start,gain=1):
        path=OUT/f'sfx/{name}.wav'
        if not path.exists():path=EP/f'assets3d/sfx/{name}.wav'
        x=load(path,'volcano/seed-audio-1.0')
        place(stems['effects'],x,start,gain*.45/max(float(np.abs(x).max()),1e-9),fade_in=.004,fade_out=.12)

    b=beats
    def at(beat,u):return b[beat]['start']+(b[beat]['end']-b[beat]['start'])*u
    event('crow_caws',b['establish']['start']+.8,.22)
    event('ground_crater',at('hong_drop',.55),.85)
    event('wind_gust',b['hong_drop']['start']+.3,.2)
    event('wing_hum_rising',b['hong_armor']['start']+1.2,.26)
    for beat,gain in [('clash1',.8),('clash2',.5)]:
        event('dash_gale',at(beat,.15),.35);event('chitin_impact',at(beat,.65),gain)
    event('shield_deploy',at('clash1',.45),.5)
    event('shockwave_ring',at('clash1',.65),.4)
    event('cicada_wing_buzz',at('will_up',.35),.26)
    hit=at('will_up',.72)
    for name,off,gain in [('bio_impact_metal',0,.9),('floor_crack',.15,.65),('debris_scatter',.3,.4)]:event(name,hit+off,gain)
    event('heartbeat_core',b['first_mark']['start']+.3,.55)
    event('steps_fading',b['hook']['start']+.5,.25)
    event('wind_faint',b['hook']['start'],.15)

    plan=json.loads((EP/'config/music_cues_r2.json').read_text(encoding='utf-8'))
    music=load(EP/plan['file'],'suno/v6')
    resolved=[]
    for cue in plan['cues']:
        a=b[cue['start_beat']]['start'];z=b[cue['end_beat']][cue['end_edge']]
        i=round(cue['source_offset']*SR);m=round((z-a)*SR)
        x=music[i:i+m]
        if len(x)!=m:raise RuntimeError('Music source is too short')
        x=to_rms(x,voice_rms*10**(cue['relative_rms_db']/20))
        place(stems['music'],x,a,fade_in=cue['fade_in'],fade_out=cue['fade_out'])
        resolved.append(dict(cue,start=a,end=z))
    for a,z in zip(resolved,resolved[1:]):
        if a['end']>z['start']+1e-5:raise RuntimeError('Independent music cues overlap')
    stems['music']*=10**((plan['dialogue_duck_db']*duck)/20)[:,None]
    # Brief musical breath before the counterattack lands.
    a=round((hit-.24)*SR);z=round((hit-.03)*SR)
    stems['music'][a:z]*=.18
    # Hold ambience under dialogue without pumping on syllables.
    stems['ambience']*=10**((-2*duck)/20)[:,None]
    mix=sum(stems.values());peak=float(np.abs(mix).max())
    scale=min(1,10**(-1.8/20)/max(peak,1e-9))
    OUT.mkdir(parents=True,exist_ok=True)
    for name,x in stems.items():sf.write(OUT/(name+'_stem.wav'),x*scale,SR,subtype='PCM_24')
    sf.write(EP/'assets3d/mixed.wav',mix*scale,SR,subtype='PCM_24')
    report=dict(duration=duration,source_files=SOURCE_FILES,story_sha256=hashlib.sha256((EP/'script.story').read_bytes()).hexdigest(),
        music=resolved,suno_url=plan['song_url'],bed_qc=reports,mix_peak_dbfs=20*np.log10(peak*scale),global_gain=scale,
        dialogue_preserved='Existing processed takes, placement and per-take peak gain preserved; common mix headroom gain only.',
        mix_sha256=hashlib.sha256((EP/'assets3d/mixed.wav').read_bytes()).hexdigest())
    (OUT/'mix_manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:report[k] for k in ['duration','mix_peak_dbfs','global_gain','bed_qc']},ensure_ascii=False,indent=2))


if __name__=='__main__':main()
