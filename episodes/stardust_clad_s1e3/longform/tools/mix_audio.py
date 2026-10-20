"""Deterministic longform mix from final dialogue and runtime contact cues."""
from pathlib import Path
import hashlib,json,subprocess,math
import numpy as np
import soundfile as sf
from scipy.signal import butter,sosfiltfilt,find_peaks
from scipy.ndimage import uniform_filter1d

ROOT=Path(__file__).resolve().parents[1]
EP=ROOT.parent
SR=48000
OUT=ROOT/'assets/audio/final'
OUT.mkdir(parents=True,exist_ok=True)
T=json.loads((ROOT/'config/timeline.json').read_text(encoding='utf-8'))
E=json.loads((ROOT/'config/runtime_audio_events.json').read_text(encoding='utf-8'))
assert E['sourceStorySha256']==T['source_sha256'],'Runtime audio cues are from an older story'
B={b['id']:b for b in T['beats']}
N=round(T['duration']*SR)
def save(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while b:=f.read(1048576):h.update(b)
 return h.hexdigest()
def relative(p):return str(p.relative_to(EP)).replace('\\','/')
def decode(p):
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-vn','-ar',str(SR),'-ac','2','-f','f32le','-'])
 return np.frombuffer(raw,np.float32).reshape(-1,2).copy()
def rms(x):return float(np.sqrt(np.mean(x.astype(np.float64)**2)))
def fade(x,a=.02,b=.10):
 x=x.copy();na=min(len(x)//2,round(a*SR));nb=min(len(x)//2,round(b*SR))
 if na:x[:na]*=np.linspace(0,1,na,dtype=np.float32)[:,None]
 if nb:x[-nb:]*=np.linspace(1,0,nb,dtype=np.float32)[:,None]
 return x
def filt(x,lo=60,hi=6500):
 return sosfiltfilt(butter(3,[lo,hi],btype='bandpass',fs=SR,output='sos'),x,axis=0).astype(np.float32)
sources={}
def source(name):
 p=ROOT/'assets/audio/sfx'/f'{name}.wav'
 if not p.exists():p=EP/'assets3d/sfx'/f'{name}.wav'
 meta=p.with_suffix('.source.json');data=json.loads(meta.read_text(encoding='utf-8'))
 assert data['provider']=='volcano-seedaudio',f'wrong source {p}'
 assert data['sha256']==sha(p),f'source hash changed {p}'
 sources[name]={'path':relative(p),'sha256':data['sha256'],'provider':data['provider'],'metadata':relative(meta)}
 return decode(p)
def transient(x,name):
 x=filt(x,55,8000)
 hop=240;y=np.mean(x,axis=1);env=np.sqrt(np.mean(y[:len(y)//hop*hop].reshape(-1,hop)**2,axis=1))
 peaks,_=find_peaks(env,height=max(.008,float(env.max())*.27),distance=round(.18*SR/hop),prominence=float(env.max())*.18)
 center=int(peaks[0]) if len(peaks) else int(np.argmax(env))
 onset=center
 while onset>0 and env[onset]>.13*env[center]:onset-=1
 start=max(0,onset*hop-144)
 length={'bell_tap':.42,'wood_step':.38,'boot_step':.40,'buckle_click':.40,'string_snap':.55,'armor_impact':.65,'blade_shield':.85}.get(name,.75)
 z=fade(x[start:min(len(x),start+round(length*SR))],.003,.08)
 return z,{'originalOnset':start/SR,'duration':len(z)/SR,'peakOffset':(center*hop-start)/SR}
def event_source(x,name):
 y=filt(x,55,9000);hop=480;v=np.sqrt(np.mean(y[:len(y)//hop*hop].reshape(-1,hop,2)**2,axis=(1,2)))
 hit=np.flatnonzero(v>max(.001,float(v.max())*.07))
 start=max(0,int(hit[0])*hop-480) if len(hit) else 0
 maximum={'sickle_whoosh':.85,'wood_creak':2.0,'gate_grind':4.0,'wind_release':7.0,'chain_tension':3.5}.get(name,2.)
 return fade(y[start:start+round(maximum*SR)],.035,.35),{'originalOnset':start/SR}
def bed_source(x,name):
 x=filt(x,70,2400 if name!='well_air' else 1900)
 # Slow measured-gain correction removes unwanted generated swells without inventing audio.
 block=2400;mono=np.mean(x,axis=1);count=len(mono)//block
 env=np.sqrt(np.mean(mono[:count*block].reshape(-1,block)**2,axis=1))
 smooth=uniform_filter1d(env,size=17,mode='nearest')
 gain=np.clip(np.median(smooth)/np.maximum(smooth,.0001),.25,3.0)
 gain=np.interp(np.arange(len(x))/block,np.arange(count)+.5,gain).astype(np.float32)
 x*=gain[:,None]
 overlap=round(1.5*SR)
 # Fold the recorded tail into the beginning of one period; no duplicated seam.
 period=x[:-overlap].copy();u=np.linspace(0,1,overlap,dtype=np.float32)[:,None]
 period[:overlap]=x[-overlap:]*(1-u)+x[:overlap]*u
 period*=.02/max(rms(period),1e-6)
 frames=period[:len(period)//SR*SR].reshape(-1,SR,2)
 one=np.sqrt(np.mean(frames**2,axis=(1,2)))
 mono=np.mean(period,axis=1)
 spectrum=np.abs(np.fft.rfft(mono))**2;freq=np.fft.rfftfreq(len(mono),1/SR)
 ratio=float(spectrum[(freq>=4000)&(freq<8000)].sum()/max(spectrum.sum(),1e-12))
 env20=np.sqrt(np.mean(period[:len(period)//2400*2400].reshape(-1,2400,2)**2,axis=(1,2)))
 ac=[]
 for lag in range(10,21):
  if np.std(env20)>1e-7:ac.append(abs(float(np.corrcoef(env20[:-lag],env20[lag:])[0,1])))
 return period,{'duration':len(period)/SR,'oneSecondMaxOverMean':float(one.max()/one.mean()),'highBandEnergyRatio':ratio,'shortEnvelopeCorrelationMax':max(ac,default=0),'auditoryReview':'not performed; measurements do not certify sound semantics'}

stems={n:np.memmap(OUT/f'{n}.f32',dtype=np.float32,mode='w+',shape=(N,2)) for n in ['dialogue','ambience','foley','music']}
for stem in stems.values():stem[:]=0
def place(bus,x,t,gain=1):
 start=round(t*SR);a=max(0,start);b=min(N,start+len(x))
 if b>a:stems[bus][a:b]+=x[a-start:b-start]*gain

direction={'version':1,'status':'reviewed','sources':[{'path':'script.story','sha256':T['source_sha256']}],
 'reviewScope':'creative timing and routing reviewed from script and runtime; sound listening remains unverified',
 'policies':{'priority':['dialogue','storySfx','ambience','music'],'musicMode':'directed','ambienceMode':'directed','breath':'native-tts-no-layered-breath'},
 'mix':{'dialogueVolume':1,'bgmVolume':1,'sfxVolume':1,'useDucking':True,'duckDepth':.40},
 'characters':{},'dialogue':[],'ambience':[],'sfx':[],'music':[],
 'exclusions':[{'id':'no-previous-episode-score','scope':'whole-film','sound':'previous episode BGM','reason':'new original episode score requested'},
 {'id':'no-camera-whoosh','scope':'all camera cuts','sound':'camera transition whoosh','reason':'sound follows physical events'},
 {'id':'no-added-breath','scope':'all dialogue','sound':'generic breath recordings','reason':'exertion is performed inside character voice'}]}
draft=json.loads((ROOT/'config/draft_data.json').read_text(encoding='utf-8'))
for name,voice in draft['voices'].items():direction['characters'][name]={'voice':voice,'locale':'zh-CN','identityPolicy':'native-voice-no-pitch-shift'}
for l in T['lines']:
 p=ROOT/l['source'];assert sha(p)==l['sha256']
 x,sr=sf.read(p,dtype='float32',always_2d=True);assert sr==SR
 place('dialogue',x,l['start'])
 direction['dialogue'].append({'id':l['id'],'character':l['speaker'],'text':l['text'],'startTime':l['start'],'endTime':l['audio_end'],'scene':B[l['beat']]['scene'],'intent':l['tone'],'delivery':l['delivery'],'source':relative(p),'sha256':l['sha256']})
print('dialogue placed',len(T['lines']),flush=True)

names=set(e['source'] for e in E['events'])|{'wind_gorge','store_air','glasshouse_air','well_air'}
raw={n:source(n) for n in names}
beds={};bedQC={}
for name in ['wind_gorge','store_air','glasshouse_air','well_air']:beds[name],bedQC[name]=bed_source(raw[name],name)
mapping={'market':('wind_gorge',.012),'courtyard':('wind_gorge',.016),'bridge':('wind_gorge',.019),
 'store':('store_air',.008),'greenhouse':('glasshouse_air',.011),'windwell':('well_air',.018)}
# Merge adjacent beats in the same place to avoid accidental restarts at every dialogue block.
runs=[]
for b in T['beats']:
 if runs and runs[-1]['scene']==b['scene']:runs[-1]['end']=b['end']
 else:runs.append({'scene':b['scene'],'start':b['start'],'end':b['end'],'beat':b['id']})
for run in runs:
 name,level=mapping[run['scene']];x=beds[name];start=max(0,round((run['start']-.3)*SR));end=min(N,round((run['end']+.3)*SR));count=end-start
 for a in range(start,end,SR*20):
  b=min(end,a+SR*20);ix=np.arange(a,b,dtype=np.int64)%len(x);gain=np.ones(b-a,dtype=np.float32)*(level/.02)
  gain*=np.minimum(1,np.maximum(0,(np.arange(a,b)-start)/(.6*SR)))
  gain*=np.minimum(1,np.maximum(0,(end-np.arange(a,b))/(.6*SR)))
  stems['ambience'][a:b]+=x[ix]*gain[:,None]
 direction['ambience'].append({'id':'air-'+run['beat'],'name':name,'startTime':run['start'],'endTime':run['end'],'targetRMS':level,'role':'bed','priority':'ambience'})
print('ambience placed',len(runs),flush=True)
eventCache={};eventQC={}
for e in E['events']:
 name=e['source'];key=(name,e['transient'])
 if key not in eventCache:
  z,detail=transient(raw[name],name) if e['transient'] else event_source(raw[name],name)
  z/=max(float(np.max(np.abs(z))),1e-6);eventCache[key]=z;eventQC[str(key)]=detail
 x=eventCache[key];gain=e['gain']
 # Exertion and lines have priority; keep a softer object transient under actual speech.
 inSpeech=any(l['start']<=e['time']<l['audio_end'] for l in T['lines'])
 if inSpeech:gain*=.72
 place('foley',x,e['time'],gain)
 direction['sfx'].append({'id':e['id'],'name':name,'startTime':e['time'],'volume':gain,'role':'event','priority':'storySfx'})
print('foley placed',len(E['events']),flush=True)

musicSpec=[
 ('home-opening','windhome','B01','B02',0,0,0,.022,3,4,'日常交通与守灯人的生活'),
 ('enemy-arrival','webpressure','B05','B06',0,0,12,.026,2,4,'细线封住风路，威胁显形'),
 ('bridge-rescue','borrowwind','B13','B14',0,0,0,.032,2.2,5,'接人过桥的持续行动'),
 ('failed-force','webpressure','B18','B20',0,-8,28,.027,2,4,'强开风井造成温室代价'),
 ('old-name','windhome','B21','B21',4,-2,109,.018,4,5,'旧桥姓名与未说出的亲人'),
 ('ropes','windhome','B27','B28',0,-12,30,.023,2,4,'协作前的准备和财物取舍'),
 ('duel','webpressure','B29','B30',0,0,35,.032,1,3,'掩护同伴进入风井'),
 ('working-gate','borrowwind','B31','B33',0,-8,15,.028,3,5,'三处机关必须配合'),
 ('open-wind','borrowwind','B36','B40',0,-2,0,.034,3,4,'开闸的力量与付出的代价'),
 ('jump-trust','borrowwind','B42','B43',24,-3,90,.031,2,5,'跳起后把自己的重量交给别人'),
 ('home-return','windhome','B45','B48',0,0,0,.023,4,6,'修理与吃饭，生活回来'),
 ('credits','windhome','END','END',2,-3,110,.025,3,5,'片尾日常尾声')]
musicRaw={}
for name in ['windhome','webpressure','borrowwind']:
 p=ROOT/'assets/audio/suno'/name/f'{name}.wav';musicRaw[name]=decode(p)
 sources[name]={'path':relative(p),'sha256':sha(p),'provider':'suno','metadata':relative(p.parent/'generation_receipts.json')}
for cid,name,b0,b1,lead,tail,offset,level,fi,fo,purpose in musicSpec:
 start=B[b0]['start']+lead;end=B[b1]['end']+tail;x=musicRaw[name];startAt=round(offset*SR)
 available=(len(x)-startAt)/SR;wanted=end-start
 # A reprise can end early; never loop a theme indefinitely to fill a scene.
 end=min(end,start+available);z=x[startAt:startAt+round((end-start)*SR)].copy()
 z*=level/max(rms(z),1e-6);z=fade(z,fi,fo);place('music',z,start)
 direction['music'].append({'id':cid,'source':name,'startTime':start,'endTime':end,'sourceOffset':offset,'targetRMS':level,'fadeIn':fi,'fadeOut':fo,'purpose':purpose,'requestedEnd':start+wanted})
save(ROOT/'config/audio_direction.json',direction)
print('music placed',len(direction['music']),flush=True)

# A 100 Hz side-chain uses the exact placed dialogue, with a 130 ms attack/release smoothing.
hop=480;gate=np.zeros(math.ceil(N/hop),np.float32)
for a in range(0,N,SR*30):
 b=min(N,a+SR*30);x=np.asarray(stems['dialogue'][a:b]);pad=np.pad(x,((0,(-len(x))%hop),(0,0)))
 e=np.sqrt(np.mean(pad.reshape(-1,hop,2)**2,axis=(1,2)))
 gate[a//hop:a//hop+len(e)]=np.clip((e-.008)/.020,0,1)
gate=uniform_filter1d(gate,size=27,mode='nearest')
for a in range(0,N,SR*20):
 b=min(N,a+SR*20);g=np.interp(np.arange(a,b)/hop,np.arange(len(gate)),gate).astype(np.float32)
 stems['music'][a:b]*=(1-.62*g[:,None]);stems['ambience'][a:b]*=(1-.32*g[:,None])

mixPeak=0;stats={n:{'peak':0,'squareSum':0} for n in stems};voiceVs=[]
for a in range(0,N,SR*10):
 b=min(N,a+SR*10);parts={n:np.asarray(x[a:b]) for n,x in stems.items()};total=sum(parts.values())
 mixPeak=max(mixPeak,float(np.max(np.abs(total))))
 for n,x in parts.items():stats[n]['peak']=max(stats[n]['peak'],float(np.max(np.abs(x))));stats[n]['squareSum']+=float(np.sum(x.astype(np.float64)**2))
 vox=np.mean(parts['dialogue'],axis=1);other=sum(parts[n] for n in ['ambience','music','foley']);mask=np.abs(vox)>.018
 if mask.any():voiceVs.append(20*np.log10(max(rms(parts['dialogue'][mask]),1e-8)/max(rms(other[mask]),1e-8)))
master=min(1,.74/max(mixPeak,1e-6))
lineSNR=[]
for line in T['lines']:
 a=round(line['start']*SR);b=round(line['audio_end']*SR)
 vox=np.asarray(stems['dialogue'][a:b]);mask=np.abs(np.mean(vox,axis=1))>.018
 if mask.any():
  other=sum(np.asarray(stems[n][a:b]) for n in ['ambience','music','foley'])
  ratio=20*np.log10(max(rms(vox[mask]),1e-8)/max(rms(other[mask]),1e-8))
  lineSNR.append({'id':line['id'],'start':line['start'],'text':line['text'],'tone':line['tone'],'snrDB':float(ratio)})
files={n:sf.SoundFile(OUT/f'{n}.wav','w',samplerate=SR,channels=2,subtype='PCM_24') for n in stems}
final=sf.SoundFile(OUT/'mixed.wav','w',samplerate=SR,channels=2,subtype='PCM_24')
maxSumError=0
try:
 for a in range(0,N,SR*10):
  b=min(N,a+SR*10);mix=np.zeros((b-a,2),np.float32)
  for n,x in stems.items():
   part=np.asarray(x[a:b])*master;files[n].write(part);mix+=part
  final.write(mix)
finally:
 for f in files.values():f.close()
 final.close()
for n in stats:
 stats[n]['rms']=math.sqrt(stats[n].pop('squareSum')/(N*2))*master;stats[n]['peak']*=master
with sf.SoundFile(OUT/'mixed.wav') as f:
 readers=[sf.SoundFile(OUT/f'{n}.wav') for n in stems]
 try:
  while True:
   x=f.read(SR*10,dtype='float32',always_2d=True)
   if not len(x):break
   y=sum(r.read(len(x),dtype='float32',always_2d=True) for r in readers)
   maxSumError=max(maxSumError,float(np.max(np.abs(x-y))))
 finally:
  for r in readers:r.close()
report={'duration':N/SR,'sampleRate':SR,'channels':2,'storySha256':T['source_sha256'],'runtimeEventSources':E['sources'],
 'sources':sources,'stems':stats,'masterGain':master,'mixPeak':mixPeak*master,'stemSumMaxError':maxSumError,
 'voicedTenSecondSNRMedianDB':float(np.median(voiceVs)),'voicedTenSecondSNRMinimumDB':float(np.min(voiceVs)),
 'perLineVoicedSNRMedianDB':float(np.median([l['snrDB'] for l in lineSNR])),
 'lowestVoicedLineSNR':sorted(lineSNR,key=lambda l:l['snrDB'])[:20],
 'bedMeasurements':bedQC,'eventEdits':eventQC,'musicSeconds':sum(m['endTime']-m['startTime'] for m in direction['music']),
 'reviewLimits':['No claim of auditory audition or semantic sound acceptance.','Bed envelope correlation is reported, not silently treated as a passing musicality metric.'],
 'outputs':{n:{'path':relative(OUT/f'{n}.wav'),'sha256':sha(OUT/f'{n}.wav')} for n in [*stems,'mixed']}}
save(OUT/'mix_report.json',report)
for stem in stems.values():stem.flush()
print(json.dumps({k:report[k] for k in ['duration','mixPeak','masterGain','stemSumMaxError','voicedTenSecondSNRMedianDB','musicSeconds']}),flush=True)
