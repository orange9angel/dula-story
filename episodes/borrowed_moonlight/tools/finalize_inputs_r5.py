from pathlib import Path
import json,hashlib,shutil,subprocess
from build_voice_envs import load,jaw_track,DT,SR
EP=Path(__file__).resolve().parents[1]
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
archive=EP/'assets3d/dialogue/_archive/r4';archive.mkdir(parents=True,exist_ok=True)
for ext in ['wav','mp3','source.json']:
 old=EP/f'assets3d/dialogue/m03.{ext}'
 if old.exists() and not (archive/old.name).exists():shutil.copyfile(old,archive/old.name)
for ext in ['wav','mp3']:shutil.copyfile(EP/f'assets3d/dialogue/cinema_r5/m03_slow.{ext}',EP/f'assets3d/dialogue/m03.{ext}')
record=read(EP/'assets3d/dialogue/cinema_r5/m03_slow.source.json');record['text']=next(x for x in read(EP/'config/dialogue.json')['lines'] if x['id']=='m03')['text'];write(EP/'assets3d/dialogue/m03.source.json',record)
env=read(EP/'config/voice_envs.json');line=next(x for x in env['lines'] if x['id']=='m03');x=load(EP/'assets3d/dialogue/cinema_r5/m03_placed.wav')
line.update(dur=round(len(x)/SR,3),jaw=jaw_track(x),dt=DT,source_pcm='assets3d/dialogue/cinema_r5/m03_placed.wav');env['source_files']['m03']=sha(EP/'assets3d/dialogue/m03.wav');env['r5_note']='m03 derived from the final filtered, normalized and faded placed PCM; other lines retain R3 timing.';write(EP/'config/voice_envs.json',env)
carrier=EP/'output/cinema_r5_audio_source.mp4'
subprocess.run(['ffmpeg','-y','-v','error','-i',str(EP/'output/borrowed_moonlight_cinema_r4_final.mp4'),'-i',str(EP/'assets3d/mixed_r5.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-movflags','+faststart',str(carrier)],check=True)
cfg=read(EP/'hybrid/config/cinema_r4_full.json');cfg['source']={'video':'output/cinema_r5_audio_source.mp4','sha256':sha(carrier)}
p=cfg['pilot'];p.update(viewer='hybrid/art_pass_r5.html?capture=1',board='storyboard/cinema_r5/full',output='output/cinema_r5_full.mp4',settleBeforeCapture=True)
p['sourceFiles']+=['hybrid/art_pass_r5.html','hybrid/art_pass_r5.js','hybrid/config/art_cast_r5.json','hybrid/config/art_shots_r5.json','hybrid/assets/manifest_r5.json','config/audio_patch_r5.json','assets3d/dialogue/cinema_r5/m03_placed.wav']
p['sourceFiles']+=['hybrid/assets/cinema_r5/'+f.name for f in (EP/'hybrid/assets/cinema_r5').glob('*.png')]
p['sourceFiles'].append('hybrid/config/cinema_staging_r5.json');cfg['probe']['output']='storyboard/cinema_r5/probe.json'
p['samples']=sorted(set(p['samples']+[120.4,123.5,241.3,241.3666667,245.1,249,255.2,318,325.5,328.5,329,436,436.2,437,440]))
write(EP/'hybrid/config/cinema_r5_full.json',cfg)
script=(EP/'tools/render_cinema_r4.py').read_text(encoding='utf-8').replace('cinema_r4','cinema_r5')
(EP/'tools/render_cinema_r5.py').write_text(script,encoding='utf-8')
print('Updated final voice envelope, audio carrier, and five-act render recipe')
