"""Final-media and actual runtime evidence for the unified 3D revision."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
from scipy.signal import correlate,correlation_lags
EP=Path(__file__).resolve().parents[1];WORK=EP.parents[2]
def read(p):return json.loads((EP/p).read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,d):(EP/p).write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
def pcm(p,t):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(p),'-t','3','-ac','1','-ar','8000','-f','f32le','-']),dtype=np.float32)
grid=read('config/dance_beats_v3.json');mix=EP/'assets/audio/final/mixed.wav';assert sha(mix)==read('config/turn_delivery_qc_v3.json')['audioSha256']
raw=read('config/visemes.json');cues={k:[v for v in raw if v['character']==k] for k in ['Girl','Boy']}
qc={'revision':'v5: source-sized head envelope, closed waist and released dance arms','audioSha256':sha(mix),'audioUnchanged':True,'normalSpeedListeningReview':False,'exports':[],'scope':'Decoded-video samples and finite mesh/contact samples; not full self-collision or artistic approval'}
for name,folder,duration in [('half_beat_sunshine_craft3d_v5.mp4','craft3d_full_v5',107.5),('cafe_3d_dialogue_v5.mp4','craft3d_dialogue_v5',23)]:
 p=EP/'output'/name;r=read(f'storyboard/{folder}/render.json')
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(p)],text=True));v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
 assert (v['width'],v['height'],v['avg_frame_rate'])==(1920,1080,'30/1')
 assert int(v['nb_frames'])==round(duration*30) and abs(float(v['duration'])-duration)<.001
 assert abs(float(v['duration'])-float(a['duration']))<.04
 assert not r['errors'] and not r['footAudit']['warnings'],r['footAudit']
 seek=r['seek'];retry=seek.get('recheck',{})
 assert not seek['mismatches'] or (retry.get('samples')==seek['samples'] and retry.get('mismatches')==[]),seek
 assert r['footAudit']['minSoleY']>-.005
 subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(p),'-f','null','-'],check=True)
 x,y=pcm(mix,3),pcm(p,3);lags=correlation_lags(len(y),len(x));lag=int(lags[np.argmax(correlate(y,x,method='fft'))]);assert abs(lag)<=8
 dialogue=[];wrists=[];feet=[];garments=[]
 for shot in r['trace']:
  assert shot['actorsVisible'] is True
  garment=shot['limbs']['Girl']['garment'];assert garment['minClearance']>=.006,garment;garments.append(garment)
  for kind in ['Girl','Boy']:
   actor=shot['limbs'][kind];assert actor['route']=='skinned-three-dimensional-body-and-painted-head'
   for j in actor['joints'].values():
    values=np.asarray(j['wristActual']+j['actual'],float);assert np.isfinite(values).all()
    wrists.append(float(np.linalg.norm(np.array(j['wristActual'])-j['wristTarget'])))
   feet.extend(abs(f['y']) for f in actor['feet'] if f['planted'])
   if shot['state']['mode']=='dialogue':
    actual=shot['state'][kind]['face']['jaw'];expected=cues[kind][int(shot['time']*100)].get('jaw',0);assert abs(actual-expected)<1e-6
  if shot['state']['mode']=='dialogue':dialogue.append(shot['time'])
 assert len(dialogue)>=(14 if duration>23 else 9)
 assert max(wrists)<.005,max(wrists)
 hits={hit['beat']:hit for hit in r['beatHits'] if 0<=hit['beat']<len(grid['beats']) and abs(hit['absoluteTime']-grid['songStart']-grid['beats'][hit['beat']])<.001 and hit['time']<duration-.0001}
 expected=[k for k,t in enumerate(grid['beats']) if grid['songStart']+t<duration-.0001];assert sorted(hits)==expected,(len(hits),len(expected))
 qc['exports'].append({'file':str(p.relative_to(EP)),'sha256':sha(p),'duration':duration,'frames':int(v['nb_frames']),'fullDecode':'passed','audioCorrelationLagMs':lag/8,'seek':r['seek'],'soleAudit':r['footAudit'],'dialogue3dSamples':len(dialogue),'beatsChecked':len(hits),'maxWristError':max(wrists),'maxPlantedSoleHeight':max(feet),'skirt':{'samples':len(garments),'minCapsuleClearance':min(g['minClearance'] for g in garments),'maxCorrection':max(g['maxPush'] for g in garments),'scope':garments[0]['scope']}})
wardrobe=EP/'output/cafe_wardrobe_v5.mp4';wr=read('storyboard/craft3d_wardrobe_v5/render.json')
wp=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(wardrobe)],text=True))
wv=next(s for s in wp['streams'] if s['codec_type']=='video');assert int(wv['nb_frames'])==825 and abs(float(wv['duration'])-27.5)<.001
assert not wr['errors'] and not wr['seek']['mismatches'] and min(s['limbs']['Girl']['garment']['minClearance'] for s in wr['trace'])>.006
x,y=pcm(mix,18.5),pcm(wardrobe,3);lags=correlation_lags(len(y),len(x));wlag=int(lags[np.argmax(correlate(y,x,method='fft'))]);assert abs(wlag)<=8
subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(wardrobe),'-f','null','-'],check=True)
qc['wardrobePreview']={'file':str(wardrobe.relative_to(EP)),'sha256':sha(wardrobe),'sourceInterval':[15.5,43],'duration':27.5,'frames':825,'fullDecode':'passed','audioCorrelationLagMs':wlag/8,'seek':wr['seek']}
qc['sourceHashes']={f:sha(EP/f) for f in ['craft3d/bootstrap.js','craft3d/viewer.js','craft3d/dialogue-v4.js','craft3d/dance-v5.js','scenes/CafeTable3D.js','tools/render.mjs','script.story']}
qc['assetHashes']={f:sha(WORK/'dula-assets'/f) for f in ['characters/sunprint/CafeKid.js','characters/sunprint/RiggedCafeKid.js','characters/sunprint/CafeFaceIntegration.js','characters/sunprint/CafeSkirt.js','characters/sunprint/CafeHairIntegration.js','characters/sunprint/CafeRearHair.js']}
write('config/unified_delivery_qc_v5.json',qc)
print(json.dumps(qc['exports'],ensure_ascii=False,indent=2))
