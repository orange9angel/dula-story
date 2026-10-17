"""Check the actual 3D dance exports and record source/body reuse honestly."""
from pathlib import Path
import json,hashlib,subprocess
EP=Path(__file__).resolve().parents[1];WORK=EP.parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.loads((EP/p).read_text(encoding='utf-8-sig'))
def write(p,d):(EP/p).write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
result={'route':'Skinned 3D bodies, curved painted heads and hair, source-art clothing projection; illustrated table dialogue retained','artisticStatus':'candidate, not approved; hairstyle side volume and wardrobe differ from original reference','exports':[]}
for name,reportName,expected in [('half_beat_sunshine_craft3d_v2.mp4','craft3d_full',107.5),('cafe_craft3d_dance_v1.mp4','craft3d',None)]:
 p=EP/'output'/name;probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)],text=True))
 video=next(s for s in probe['streams'] if s['codec_type']=='video');audio=next(s for s in probe['streams'] if s['codec_type']=='audio');check=load(f'storyboard/{reportName}/render.json')
 assert not check['errors'] and not check['seek']['mismatches']
 assert video['width']==1920 and video['height']==1080 and video['avg_frame_rate']=='30/1'
 assert abs(float(video['duration'])-float(audio['duration']))<.04
 if expected is not None:assert int(video['nb_frames'])==round(expected*30) and abs(float(video['duration'])-expected)<.04
 assert check['footAudit']['samples']>0 and not check['footAudit']['warnings']
 assert check['footAudit']['minSoleY']>-.005
 subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(p),'-f','null','-'],check=True)
 result['exports'].append({'file':str(p.relative_to(EP)),'sha256':sha(p),'bytes':p.stat().st_size,'duration':float(video['duration']),'audioDuration':float(audio['duration']),'frames':int(video['nb_frames']),'fullDecode':'passed','seek':check['seek'],'soleAudit':check['footAudit']})
body=[]
for kind,key in [('girl','aoi'),('boy','lei')]:
 source=WORK/f'dula-story/episodes/bio_armor_academy_s1e4/assets3d/tripo_{key}_trial/{key}_h31_lod160k_v2.glb';target=EP/f'assets/models/{kind}_body_base.glb';assert sha(source)==sha(target)
 body.append({'file':str(target.relative_to(EP)),'sha256':sha(target),'source':str(source.relative_to(WORK)),'reuse':'existing locally rigged body; not newly generated from the cafe reference; runtime head replacement, wardrobe palette/projection and local geometry adaptation'})
write('config/craft3d_body_sources.json',body)
result['bodies']=body;result['audioSha256']=sha(EP/'assets/audio/final/mixed.wav')
assert result['audioSha256']==load('config/delivery_qc.json')['audio']['mixed']['sha256']
files=['craft3d/viewer.js','craft3d/bootstrap.js','craft3d/performance.js','script.story','tools/render.mjs','assets/images/girl_portrait_v1.png','assets/images/boy_portrait_v1.png','assets/images/girl_hair_v1.png','assets/images/boy_hair_v1.png','assets/images/girl_body_v1.png','assets/images/boy_body_v1.png']
result['episodeSources']={f:sha(EP/f) for f in files}
result['assetSources']={f:sha(WORK/'dula-assets'/f) for f in ['characters/sunprint/CafeKid.js','characters/sunprint/RiggedCafeKid.js','lib/craft3d/imported-performer.js','lib/craft3d/illustrated-import.js','lib/craft3d/drawn-head.js','lib/craft3d/painted-hair-shell.js']}
write('config/craft3d_delivery_qc.json',result)
production=load('config/production.json');production['status']='3D dance revision exported; appearance still a candidate';production['selectedVideo']='output/half_beat_sunshine_craft3d_v2.mp4';production['rejectedRoute']='Whole-image 2D deformation was not the requested 2D-to-3D dance';production['qualityStatus'].update(animatedIdentity='Rigged 3D body with painted curved head; source reference resemblance incomplete',continuousActing='Raised arms, torso turns and side-steps; skinned sole samples and reverse seek checked',finalVideo='107.5s mixed illustrated-dialogue/3D-dance revision, full decode passed; normal-speed review pending');write('config/production.json',production)
print(json.dumps({'exports':result['exports'],'audioUnchanged':True},ensure_ascii=False,indent=2))
