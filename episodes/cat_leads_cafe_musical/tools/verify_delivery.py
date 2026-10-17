"""Verify decoded media, final-stem mouth gating, source hashes and export timing."""
from pathlib import Path
import hashlib,json,subprocess,sys
import numpy as np
import soundfile as sf

EP=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.loads((EP/p).read_text(encoding='utf8'))
def save(p,d):(EP/p).write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
timing=load('config/timing.json');alignment=load('config/alignment.json');cues=load('config/visemes.json')
report={'scope':'Decoded media and numerical sync checks; normal-speed listening and singer-role review pending','audio':{},'mouth':{}}
assert sha(EP/'script.story')==timing['storySha256']
for name in ['mixed','Girl','Boy','music','ambience','foley']:
 p=EP/f'assets/audio/final/{name}.wav';x,sr=sf.read(p,dtype='float32',always_2d=True)
 assert sr==48000 and len(x)==round(timing['duration']*sr) and x.shape[1]==2
 assert np.isfinite(x).all() and np.max(np.abs(x))<.999
 report['audio'][name]={'duration':len(x)/sr,'peak':float(np.max(np.abs(x))),'rmsDbFS':float(20*np.log10(max(1e-9,np.sqrt(np.mean(x*x))))),'sha256':sha(p)}
 if name in alignment:
  assert sha(p)==alignment[name]['sourceSha256']
  track=[c for c in cues if c['character']==name];t=np.array([c['start'] for c in track]);jaw=np.array([c['jaw'] for c in track])
  assert len(t)==round(timing['duration']*100) and np.allclose(np.diff(t),.01,atol=1e-8)
  mono=np.mean(x,axis=1);rms=np.sqrt(np.mean(mono.reshape(-1,480)**2,axis=1));threshold=alignment[name]['silenceThreshold']
  quiet=rms<threshold-2/32768;violations=np.flatnonzero(quiet&(jaw>0))
  report['mouth'][name]={'quietFrames':int(quiet.sum()),'quietMouthViolations':len(violations),'firstViolations':t[violations[:10]].tolist(),'speakingFrames':int((jaw>0).sum()),'sourceHashMatches':True}
  assert not len(violations)
qc=load('config/dialogue_qc.json');assert len(qc)==9 and all(c['pinyinSimilarity']==1 for c in qc)
report['dialogueAsr']={'matched':9,'total':9,'evidence':'config/dialogue_qc.json','limitation':'ASR does not judge performance or timbre'}
save('config/audio_qc.json',report)
if '--audio-only' in sys.argv:
 print(json.dumps({'audio':{k:{'peak':v['peak'],'duration':v['duration']} for k,v in report['audio'].items()},'mouth':report['mouth']}));sys.exit()

video=EP/'output/half_beat_sunshine_v1.mp4'
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)],text=True))
v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
assert v['width']==1920 and v['height']==1080 and v['avg_frame_rate']=='30/1' and int(v['nb_frames'])==3225
assert abs(float(v['duration'])-timing['duration'])<.034 and abs(float(a['duration'])-timing['duration'])<.05
subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(video),'-f','null','-'],check=True)
# Compare a decoded dialogue window with the final PCM to catch mux offsets.
raw=subprocess.check_output(['ffmpeg','-v','error','-ss','2.6','-i',str(video),'-t','3','-vn','-ac','1','-ar','16000','-f','f32le','pipe:1'])
src=subprocess.check_output(['ffmpeg','-v','error','-ss','2.6','-i',str(EP/'assets/audio/final/mixed.wav'),'-t','3','-ac','1','-ar','16000','-f','f32le','pipe:1'])
from scipy.signal import correlate,correlation_lags
decoded=np.frombuffer(raw,np.float32);reference=np.frombuffer(src,np.float32);c=correlate(decoded,reference,mode='full',method='fft');lags=correlation_lags(len(decoded),len(reference));near=np.abs(lags)<=1600;lag=int(lags[near][np.argmax(c[near])]);assert abs(lag)<=160
render=load('storyboard/render.json');assert not render['errors'] and not render['seek']['mismatches']
report.update(video={'file':str(video.relative_to(EP)),'sha256':sha(video),'bytes':video.stat().st_size,'width':1920,'height':1080,'frames':int(v['nb_frames']),'fps':30,'duration':float(v['duration']),'audioDuration':float(a['duration']),'audioCorrelationLagMs':lag/16,'fullDecode':'passed'},renderChecks={'seek':render['seek'],'footAudit':render['footAudit']})
sources=['viewer.js','performance.js','bootstrap.js','script.story','scenes/CafeMusicalScene.js','tools/render.mjs','config/timing.json','config/visemes.json','config/subtitles.json']
report['sources']={s:sha(EP/s) for s in sources}
save('config/delivery_qc.json',report)
production=load('config/production.json');production['status']='107.5s first version exported; artistic/audio review pending';production['qualityStatus'].update(continuousActing='Small side-steps; reverse-seek hashes checked; sole-anchor audit in delivery_qc.json; no large turns',finalVideo='1080p30 exported and fully decoded; normal-speed review pending');save('config/production.json',production)
print(json.dumps({'video':report['video'],'renderChecks':report['renderChecks']},ensure_ascii=False,indent=2))
