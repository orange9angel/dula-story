"""Verify the scene-directed revision against its retained production baseline."""
from pathlib import Path
import hashlib,json,re,subprocess,zipfile,shutil
import numpy as np
from scipy.io import wavfile
from PIL import Image,ImageDraw

EP=Path(__file__).resolve().parents[1];W=EP/'tmp/natural_audio';F=W/'final';P=W/'physics';C=EP/'storyboard/episode_current'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
save=lambda p,x:p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
video=EP/'output/natural_candidate.mp4'
if not video.exists():video=EP/'output/current.mp4'
build=read(F/'render_build.json')
for item in build['build']['inputs']:assert sha(Path(item['path']))==item['sha256'],item['path']
motion=read(P/'imported_motion_report.json');contact=read(P/'imported_contact_report.json');seek=read(F/'seek_check.json')
equivalence=read(F/'state_equivalence.json')
assert motion['error_count']==contact['error_count']==0
assert motion['frames']==contact['frames']==2460 and seek['passed'] and equivalence['passed']
assert build['runtimeProfile']['edgeQuality']=='stable' and build['runtimeProfile']['titleCards']=='series-ink'
assert build['runtimeProfile']['renderSize']==[2560,1440] and build['runtimeProfile']['imageFormat']=='png'
baseline=read(W/'baseline.json');preserved=[]
for name in ['assets3d/LeiXiao_stem.wav','config/viseme_leixiao.json','assets3d/sfx_stem.wav','assets3d/ambience_stem.wav','config/cards.json','performance_tripo.js']:
    assert sha(EP/name)==baseline[name],name;preserved.append(name)
for entry in [3,5,7,9,11,14,16]:
    for name in [f'assets3d/dialogue_r3/entry_{entry}.mp3',f'assets3d/processed/entry_{entry}.wav']:
        assert sha(EP/name)==baseline[name],name;preserved.append(name)
with zipfile.ZipFile(EP/'output/archive/before_natural_audio.zip') as z:
    assert hashlib.sha256(z.read('output/current.mp4')).hexdigest()==baseline['output/current.mp4']
    old_story=z.read('script.story').decode('utf-8').replace('\r\n','\n');new_story=(EP/'script.story').read_text(encoding='utf-8')
    assert re.findall(r'^\[.*$',old_story,re.M)==re.findall(r'^\[.*$',new_story,re.M)
    assert re.findall(r'^\d\d:.*$',old_story,re.M)==re.findall(r'^\d\d:.*$',new_story,re.M)
    old_build=json.loads(z.read('storyboard/episode_current/render_build.json'))
asset_inputs=[r for r in old_build['build']['inputs'] if '/dula-assets/' in r['path'].replace('\\','/') or r['path'].endswith('.glb')]
assert asset_inputs
for item in asset_inputs:assert sha(Path(item['path']))==item['sha256'],item['path']
plan=read(EP/'config/audio_direction.json');timing=read(EP/'config/audio_timing.json')
assert plan['music'][0]['provider']=='Suno' and not plan['ambience']
assert timing['mix_sha256']==sha(EP/'assets3d/mixed.wav')
assert plan['characters']['LeiXiao']['voice']=='zh_male_shaonianzixin_uranus_bigtts'
assert plan['characters']['QianTangKui']['voice']=='ICL_uranus_zh_female_tianmeihuopo_tob'
frames=read(F/'trace.json')['frames'];attention=[]
head_rates={}
for actor in ['lei','aoi']:
    rates=[(float(np.linalg.norm(np.array(b['attention'][actor]['head'])-np.array(a['attention'][actor]['head'])))*30*180/np.pi,b['t']) for a,b in zip(frames,frames[1:])]
    value,at=max(rates);assert value<400,(actor,value,at)
    head_rates[actor]={'maxEulerDegreesPerSecond':value,'at':at,'limit':400,'scope':'Detect discontinuities in authored head rotation; not an anatomical guarantee'}
for t in [8,17,21.4,42.4,50.5,70.2,72.5,76.5]:
    frame=min(frames,key=lambda f:abs(f['t']-t));entry={'time':frame['t']}
    for actor in ['lei','aoi']:
        a=frame['attention'][actor]
        assert a['weights']['partner']>.99,(t,actor,a)
        assert a['remainingAngleDeg']<23,(t,actor,a)
        entry[actor]={'headResidualDeg':a['remainingAngleDeg'],'gaze':a['gaze']}
    attention.append(entry)
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,codec_type,width,height,avg_frame_rate,start_time,duration,nb_frames','-of','json',str(video)]))
v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
assert (v['width'],v['height'],v['nb_frames'],v['avg_frame_rate'])==(1280,720,'2460','30/1')
assert float(probe['format']['duration'])==82 and float(v['start_time'])==float(a['start_time'])==0
subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'],check=True)
decoded=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(video),'-vn','-f','f32le','-ac','2','-ar','48000','-']),np.float32).reshape(-1,2)
sr,pcm=wavfile.read(EP/'assets3d/mixed.wav');n=min(len(decoded),len(pcm));pcm=pcm[:n].astype(float)/32768
corr=float(np.corrcoef(decoded[:n].ravel(),pcm.ravel())[0,1]);assert corr>.98
times=[3.5,8,12.5,17,21.4,26.3,29.7,34,37,42.4,46,48.5,50.5,55.2,61.5,66,70.2,72.5,76.5,80.5]
board=Image.new('RGB',(1280,180*5),'#20251f');draw=ImageDraw.Draw(board)
for i,t in enumerate(times):
    dest=F/f'actual_{t}.png';subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(video),'-frames:v','1',str(dest)],check=True)
    im=Image.open(dest).convert('RGB').resize((320,180));xy=((i%4)*320,(i//4)*180);board.paste(im,xy);draw.text((xy[0]+6,xy[1]+6),f'{t:g}s',fill='white')
board.save(C/'scene_frames.jpg')
comparison=Image.new('RGB',(1280,360*4),'#20251f');d=ImageDraw.Draw(comparison)
for row,t in enumerate([17,21.4,50.5,72.5]):
    for col,p in enumerate([W/f'attention/before/{t}.png',F/f'actual_{t}.png']):
        im=Image.open(p).convert('RGB').resize((640,360));comparison.paste(im,(col*640,row*360));d.text((col*640+8,row*360+8),f'{"Before" if col==0 else "Current"} {t:g}s',fill='white')
comparison.save(C/'attention_comparison.jpg')
for name in ['render_build.json','seek_check.json','state_equivalence.json']:shutil.copy2(F/name,C/name)
for name in ['imported_motion_report.json','imported_contact_report.json']:shutil.copy2(P/name,C/name)
for name in ['voice_review.json','voice_comparison_map.json','voice_decision.json','music_review.json','final_audio_review.json','voice_production_qc.md']:shutil.copy2(W/name,C/('natural_'+name))
report={'status':'technical-checks-passed; user review pending','video':'output/current.mp4','videoSha256':sha(video),'duration':82,'frames':2460,'probe':probe,
 'runtimeProfile':build['runtimeProfile'],'rollback':{'archive':'output/archive/before_natural_audio.zip','videoSha256':baseline['output/current.mp4']},
 'preserved':preserved,'unchangedSharedAssetCount':len(asset_inputs),'dialogueTextAndTimingUnchanged':True,
 'audio':{'mixSha256':timing['mix_sha256'],'decodedAacToNewPcmCorrelation':corr,'dialogueLines':14,'femaleReperformedLines':7,'malePcmUnchanged':True,'roomBed':False,'footsteps':0,'music':plan['music'][0],'providerReceipt':read(EP/'config/romance_suno_receipt.json')},
 'attentionSamples':attention,'headContinuity':head_rates,'motion':motion['status'],'contact':contact['status'],'seekPassed':True,'seekCount':len(seek['checks']),'picturePhysicsEquivalence':equivalence,
 'visualReview':'Representative actual camera frames, ten-second interaction preview, final encoded 48-53.5s reply and 73.8-78.2s gaze-shift filmstrips, plus full encoded scene contact sheet inspected. No claim of normal-speed whole-video viewing.',
 'audioReview':'Model observations of complete reply comparisons, score and final mix are advisory. User rejected the prior praised score; no human listening or artistic approval claimed.'}
save(C/'verification.json',report)
print(json.dumps({'passed':True,'videoSha256':report['videoSha256'],'newAudioCorrelation':corr,'sharedAssetsPreserved':len(asset_inputs),'attentionSamples':len(attention),'seekCount':len(seek['checks'])}))
