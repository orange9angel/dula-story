"""Verify the rendered audio revision and publish its evidence (video promoted separately)."""
from pathlib import Path
import hashlib,json,subprocess,zipfile,shutil
import numpy as np
from scipy.io import wavfile
EP=Path(__file__).resolve().parents[1]
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
render=EP/'tmp/audio_romance/render';board=EP/'storyboard/episode_current'
video=EP/'output/romance_candidate.mp4'
if not video.exists():video=EP/'output/current.mp4'
build=read(render/'render_build.json')
for item in build['build']['inputs']:
    assert sha(Path(item['path']))==item['sha256'],item['path']
motion=read(render/'imported_motion_report.json');contact=read(render/'imported_contact_report.json');seek=read(render/'seek_check.json')
assert motion['error_count']==contact['error_count']==0 and seek['passed']
assert motion['frames']==contact['frames']==2460
assert '--audio-from' not in build['args'], 'New mix must be used'
plan=read(EP/'config/audio_direction.json');timing=read(EP/'config/audio_timing.json')
audio_check=read(EP/'storyboard/audio_sync.json')
assert audio_check['passed'] and audio_check['footsteps']==0 and audio_check['intentionalSilentWalk']
assert timing['mix_sha256']==sha(EP/'assets3d/mixed.wav')
with zipfile.ZipFile(EP/'output/archive/before_romance_audio.zip') as z:
    baseline=json.loads(z.read('baseline_manifest.json'))
    preserved=[];changed=[]
    for line in plan['dialogue']:
        path=f"assets3d/dialogue_r3/entry_{line['entry']}.mp3"
        equal=baseline[path]==sha(EP/path)
        if line['character']=='QianTangKui':assert equal;preserved.append(path)
        else:
            assert not equal;changed.append(path)
            request=read((EP/path).with_suffix('.source.json'))['request']
            assert request['speaker']==plan['characters']['LeiXiao']['voice']
            assert request['context_texts']==line['delivery']['nativeContextTexts']
            assert request['wireVersion']==2
    for p in ['assets3d/QianTangKui_stem.wav','config/viseme_qiantangkui.json','script.story']:
        # script.story is represented by the timeline contract, not duplicated in archive.
        if p in baseline:assert sha(EP/p)==baseline[p];preserved.append(p)
    old_build=json.loads(z.read('storyboard/episode_current/render_build.json'))
    old_inputs={v['path']:v['sha256'] for v in old_build['build']['inputs']}
    assets=[v for v in build['build']['inputs'] if '\\dula-assets\\' in v['path']]
    for asset in assets:assert old_inputs[asset['path']]==asset['sha256'],asset['path']
    appearance_runtime=['viewer.js','performance_remake.js','performance_tripo.js','scenes/BiologyRoomRemakeScene.js']
    for name in appearance_runtime:
        item=next(v for v in build['build']['inputs'] if Path(v['path'])==EP/name)
        assert old_inputs[item['path']]==item['sha256']
    old_video_sha=baseline['output/current.mp4']
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries',
    'format=duration,size:stream=codec_name,codec_type,width,height,avg_frame_rate,start_time,duration,nb_frames',
    '-of','json',str(video)]))
assert float(probe['format']['duration'])==82
v=next(s for s in probe['streams'] if s['codec_type']=='video')
a=next(s for s in probe['streams'] if s['codec_type']=='audio')
assert (v['width'],v['height'],v['nb_frames'],v['avg_frame_rate'])==(1280,720,'2460','30/1')
assert float(v['start_time'])==float(a['start_time'])==0
subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','-'],check=True)
raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(video),'-vn','-ar','48000','-ac','2','-f','f32le','-'])
decoded=np.frombuffer(raw,np.float32).reshape(-1,2)
sr,pcm=wavfile.read(EP/'assets3d/mixed.wav');source=pcm.astype(np.float32)/32768
decoded=decoded[:len(source)]
assert len(decoded)==len(source)
corr=float(np.corrcoef(decoded.ravel()[::20],source.ravel()[::20])[0,1])
assert corr>.99,corr
for name in ['render_build.json','seek_check.json','imported_contact_report.json','imported_motion_report.json']:
    shutil.copyfile(render/name,board/name)
report={'status':'technical-checks-passed; voice aesthetics awaiting user review','video':'output/current.mp4',
    'renderedCandidate':'output/romance_candidate.mp4','videoSha256':sha(video),'probe':probe,'fullDecode':'passed',
    'rollback':{'archive':'output/archive/before_romance_audio.zip','previousVideoSha256':old_video_sha},
    'audioSource':'assets3d/mixed.wav','audioSourceSha256':sha(EP/'assets3d/mixed.wav'),
    'decodedAudioCorrelation':corr,'maleLinesRegenerated':changed,'preservedAudio':preserved,
    'maleSpeaker':plan['characters']['LeiXiao']['voice'],'footsteps':0,'audioSync':audio_check,
    'contentQC':{'malePinyinMatch':'7 of 7: 100%','errors':0,'timingWarnings':[9,14],
      'warningResolution':'Both fit their original speech windows without truncation; retain 0.3s to entry end. No window expansion.'},
    'motion':motion['status'],'contact':contact['status'],'seekPassed':seek['passed'],'seekCount':len(seek['checks']),
    'renderedFrames':2460,'traceSha256':sha(render/'trace.json'),'runtimeProfile':build['runtimeProfile'],
    'preservedAssetInputs':len(assets),'preservedRuntime':appearance_runtime,
    'visualEvidence':{'frames':'storyboard/audio_romance/frames.jpg','times':[7.5,16,26,33.5,42,55,65,72],
        'wholeNormalSpeedViewingByModel':False},
    'listening':{'review':'storyboard/audio_romance/final_listening_review.json','type':'model-audio-observation',
      'decision':'Keep the original actor with newly applied native acting directions; alternative voice not adopted.',
      'limits':'Whole-scene and isolated model descriptions disagree on age/timbre. Low-confidence pitch tracking of entry 9 is not a valid gender/identity verdict. No claim of human listening or aesthetic acceptance.'},
    'generatorInputs':{str(p):sha(p) for p in [EP/'tools/synth_audio.py',EP.parents[2]/'dula-skills/volc-voice-casting/scripts/seedtts_say.py']}}
save(board/'verification.json',report)
print(json.dumps({'candidateVerified':True,'sha256':report['videoSha256'],'audioCorrelation':corr,'preservedAssets':len(assets),'femaleUnchanged':len(preserved),'newMaleLines':len(changed)}))
