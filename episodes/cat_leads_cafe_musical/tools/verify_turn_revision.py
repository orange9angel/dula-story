"""Validate delivered v3 media, rendered contacts and measured beat alignment."""
from pathlib import Path
import json,hashlib,subprocess
import numpy as np
from scipy.signal import correlate,correlation_lags
EP=Path(__file__).resolve().parents[1];WORK=EP.parents[2]
def read(p):return json.loads((EP/p).read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,d):(EP/p).write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
def pcm(p,t):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(p),'-t','3','-ac','1','-ar','8000','-f','f32le','-']),dtype=np.float32)
grid=read('config/dance_beats_v3.json');mix=EP/'assets/audio/final/mixed.wav'
assert sha(mix)==grid['audioSha256']==read('config/delivery_qc.json')['audio']['mixed']['sha256']
qc={'revision':'v3 full turning and beat-driven dance','acceptedBaseline':'User accepted craft3d v2 before requesting side/rear refinement, turning and lighter beat-synced action','audioUnchanged':True,'audioSha256':sha(mix),'exports':[],'artisticScope':'Front/side/back sampled, final video decoded; no normal-speed audiovisual listening review claimed'}
for name,folder,full in [('half_beat_sunshine_craft3d_v3.mp4','craft3d_full_v3',True),('cafe_craft3d_dance_v3.mp4','craft3d_v3',False)]:
 p=EP/'output'/name;r=read(f'storyboard/{folder}/render.json');probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)],text=True))
 v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
 assert (v['width'],v['height'],v['avg_frame_rate'])==(1920,1080,'30/1')
 assert abs(float(v['duration'])-float(a['duration']))<.04
 if full:assert int(v['nb_frames'])==3225 and abs(float(v['duration'])-107.5)<.001
 assert not r['errors'] and not r['seek']['mismatches'] and not r['footAudit']['warnings']
 assert r['footAudit']['minSoleY']>-.005
 subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(p),'-f','null','-'],check=True)
 offset=25 if full else 2;source=pcm(mix,offset+r['audioStart']);encoded=pcm(p,offset)
 c=correlate(encoded,source,mode='full',method='fft');lags=correlation_lags(len(encoded),len(source));lag=int(lags[np.argmax(c)]);assert abs(lag)<=8
 hits={}
 for hit in r['beatHits']:
  k=hit['beat']
  if hit['time']<float(v['duration'])-.0001 and 0<=k<len(grid['beats']) and abs(hit['absoluteTime']-grid['songStart']-grid['beats'][k])<.001:hits[k]=hit
 expected=[k for k,t in enumerate(grid['beats']) if r['audioStart']-.001<=grid['songStart']+t<r['audioStart']+r['duration']-.001]
 assert sorted(hits)==expected,(len(hits),len(expected))
 heights=[abs(f['y']) for hit in hits.values() for actor in ['Girl','Boy'] for f in hit['limbs'][actor]['feet']]
 wrist=[np.linalg.norm(np.array(j['wristActual'])-j['wristTarget']) for hit in hits.values() for actor in ['Girl','Boy'] for j in hit['limbs'][actor]['joints'].values()]
 assert max(heights)<.005
 assert max(wrist)<.005
 qc['exports'].append({'file':str(p.relative_to(EP)),'sha256':sha(p),'duration':float(v['duration']),'frames':int(v['nb_frames']),'fullDecode':'passed','audioCorrelationLagMs':lag/8,'seek':r['seek'],'soleAudit':r['footAudit'],'beatsChecked':len(hits),'maxSoleHeightOnBeat':max(heights),'maxWristTargetErrorOnBeat':max(wrist)})
qc['beatGrid']={'beats':len(grid['beats']),'maxAttackToFrameErrorMs':grid['maxFrameErrorMs'],'method':grid['method']}
qc['sourceHashes']={f:sha(EP/f) for f in ['craft3d/dance-v3.js','craft3d/viewer.js','craft3d/bootstrap.js','config/dance_beats_v3.json','script.story','assets/images/girl_rear_hair_v2.png','assets/images/girl_side_hair_v2.png','assets/images/boy_rear_hair_v2.png']}
qc['assetHashes']={f:sha(WORK/'dula-assets'/f) for f in ['characters/sunprint/CafeKid.js','characters/sunprint/CafeRearHair.js','characters/sunprint/RiggedCafeKid.js','lib/craft3d/locomotion.js']}
write('config/turn_delivery_qc_v3.json',qc)
production=read('config/production.json');production['selectedVideo']='output/half_beat_sunshine_craft3d_v3.mp4';production['status']='v3 delivered: full turns and beat-aligned steps; side/rear artistic review pending';production['userConfirmed']['craft3dV2']='User: 不错，效果可以，继续细化，还有需要转身，所以不能只处理正面';production['qualityStatus']['continuousActing']='130 measured pulses drive foot landings and two-beat hand accents; two complete opposite-direction 360-degree turns; actual mesh contacts checked';production['qualityStatus']['animatedIdentity']='Accepted front retained; rear painted volumes and side hair projection added; side/rear continuation is a new candidate';production['qualityStatus']['finalVideo']='107.5s 1080p30 v3 fully decoded; original audio preserved';write('config/production.json',production)
print(json.dumps({'exports':qc['exports'],'beatGrid':qc['beatGrid']},ensure_ascii=False,indent=2))
