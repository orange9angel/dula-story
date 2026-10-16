"""Validate the new picture/audio build and prepare the single current review entry."""
from pathlib import Path
import hashlib,json,subprocess,zipfile,shutil
import numpy as np
from scipy.io import wavfile
from PIL import Image,ImageDraw
EP=Path(__file__).resolve().parents[1];W=EP/'tmp/romcom_revision';F=W/'final';P=W/'final_physics';C=EP/'storyboard/episode_current'
VIDEO=EP/'output/romcom_candidate.mp4'
if not VIDEO.exists():VIDEO=EP/'output/current.mp4'
load=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
build=load(F/'render_build.json')
for item in build['build']['inputs']:assert sha(Path(item['path']))==item['sha256'],item['path']
motion=load(P/'imported_motion_report.json');contact=load(P/'imported_contact_report.json');seek=load(F/'seek_check.json')
equivalence=load(F/'state_equivalence.json');assert equivalence['passed'] and equivalence['frames']==2460
assert motion['error_count']==contact['error_count']==0 and seek['passed']
assert motion['frames']==contact['frames']==2460
assert build['runtimeProfile']['edgeQuality']=='stable' and build['runtimeProfile']['titleCards']=='series-ink'
assert build['runtimeProfile']['renderSize']==[2560,1440] and build['runtimeProfile']['imageFormat']=='png'
neutral=load(W/'neutral_invariance.json');assert all(v==0 for v in neutral.values())
plan=load(EP/'config/audio_direction.json');audio=load(EP/'config/audio_timing.json')
assert plan['characters']['LeiXiao']['voice']=='zh_male_shaonianzixin_uranus_bigtts'
assert plan['music'][0]['provider']=='Suno' and not plan['ambience']
assert audio['mix_sha256']==sha(EP/'assets3d/mixed.wav')
for name in ['ambience','sfx']:
    sr,y=wavfile.read(EP/f'assets3d/{name}_stem.wav');assert not np.any(y[:int(6.5*sr)])
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries',
    'format=duration:stream=codec_name,codec_type,width,height,avg_frame_rate,start_time,duration,nb_frames','-of','json',str(VIDEO)]))
v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
assert (v['width'],v['height'],v['nb_frames'],v['avg_frame_rate'])==(1280,720,'2460','30/1')
assert float(probe['format']['duration'])==82 and float(v['start_time'])==float(a['start_time'])==0
subprocess.run(['ffmpeg','-v','error','-i',str(VIDEO),'-f','null','-'],check=True)
# Compare decoded final AAC to the NEW PCM. This catches accidental old-audio muxing.
decoded=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(VIDEO),'-vn','-f','f32le','-ac','2','-ar','48000','-']),np.float32).reshape(-1,2)
sr,pcm=wavfile.read(EP/'assets3d/mixed.wav');n=min(len(decoded),len(pcm));pcm=pcm[:n].astype(float)/32768
corr=float(np.corrcoef(decoded[:n].ravel(),pcm.ravel())[0,1]);assert corr>.98,corr
with zipfile.ZipFile(EP/'output/archive/before_romcom_revision.zip') as z:
    manifest=json.loads(z.read('manifest.json'))
    old_video_sha=manifest['episode/output/current.mp4']
    assert hashlib.sha256(z.read('episode/output/current.mp4')).hexdigest()==old_video_sha
    for name in ['script.story','performance_tripo.js','config/cards.json']:
        assert sha(EP/name)==manifest['episode/'+name],name
times=[1.3,4.5,8.1,17,18.2,22,34,40,55,66,72.5,76,80.5]
board=Image.new('RGB',(1280,240*5),'#20251f');d=ImageDraw.Draw(board)
for i,t in enumerate(times):
    out=F/f'actual_{t}.png'
    subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(VIDEO),'-frames:v','1',str(out)],check=True)
    im=Image.open(out).convert('RGB').resize((426,240));board.paste(im,((i%3)*426,(i//3)*240));d.text(((i%3)*426+8,(i//3)*240+8),f'{t:g} s',fill='white')
board.save(C/'romcom_frames.jpg')
for name in ['lei_expression_comparison.jpg','aoi_expression_comparison.jpg','lei_angle_comparison.jpg','aoi_angle_comparison.jpg','neutral_invariance.json','voice_blind_map.json','voice_review3.json','final_audio_review.json','score_review.json','voice_qc.md']:
    shutil.copy2(W/name,C/name)
for name in ['render_build.json','seek_check.json','state_equivalence.json']:
    shutil.copy2(F/name,C/name)
for name in ['imported_motion_report.json','imported_contact_report.json']:
    shutil.copy2(P/name,C/name)
report={'status':'technical-checks-passed; artistic review pending user','video':'output/current.mp4','videoSha256':sha(VIDEO),
    'duration':82,'frames':2460,'probe':probe,'runtimeProfile':build['runtimeProfile'],
    'rollback':{'archive':'output/archive/before_romcom_revision.zip','videoSha256':old_video_sha},
    'audio':{'mixSha256':audio['mix_sha256'],'decodedAacToNewPcmCorrelation':corr,'maleSpeaker':plan['characters']['LeiXiao']['voice'],
        'dialogueLines':14,'roomBed':False,'footsteps':0,'music':plan['music'][0],'providerReceipt':load(EP/'config/romcom_suno_receipt.json')},
    'neutralPixelsChanged':neutral,'motion':motion['status'],'contact':contact['status'],'seekPassed':True,'seekCount':len(seek['checks']),
    'physicsSource':'tmp/romcom_revision/final_physics/trace.json','picturePhysicsEquivalence':equivalence,
    'visualReview':'16 isolated expression/angle frames compared; dialogue preview filmstrip and actual encoded keyframes inspected. No claim of watching the whole video at normal speed.',
    'audioReview':'Complete new mix plus blind native-voice comparisons observed with an audio model; advisory only. Some model timing/ambience claims conflict with actual timeline/stems. No human listening or user acceptance claimed.'}
(C/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':True,'videoSha256':report['videoSha256'],'newAudioCorrelation':corr,'seekCount':len(seek['checks'])}))
