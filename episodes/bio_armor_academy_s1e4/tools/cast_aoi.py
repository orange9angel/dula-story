"""Two dry heroine candidates; retain blind-labelled samples and safe provenance."""
from pathlib import Path
import json,os,sys,hashlib,subprocess
EP=Path(__file__).resolve().parents[1];STORY=EP.parents[1]
sys.path.insert(0,str(STORY.parent/'dula-skills/volc-voice-casting/scripts'))
from seedtts_say import synthesize
for raw in (STORY/'.env.speech').read_text(encoding='utf-8-sig').splitlines():
 if '=' in raw and not raw.strip().startswith('#'):
  k,v=raw.removeprefix('export ').split('=',1)
  if k.strip()=='VOLC_SPEECH_API_KEY':os.environ.setdefault(k.strip(),v.strip().strip('\"\''))
dest=EP/'assets3d/voice_audition_r3';dest.mkdir(exist_ok=True)
voices={'A':'ICL_uranus_zh_female_tianmeihuopo_tob','B':'ICL_uranus_zh_female_nuanxinxuejie_tob'}
lines=[('tease','装叶子的。你这么大，放不下。','happy',3.6),('stop','停。新长的那截，留下了。','angry',4.5)]
rows=[]
for key,voice in voices.items():
 for tag,text,emotion,window in lines:
  out=dest/f'{key}_{tag}.mp3';meta=out.with_suffix('.source.json')
  req={'provider':'seed-tts-2.0','speaker':voice,'text':text,'emotion':emotion,'emotion_scale':2}
  if not(out.exists() and meta.exists() and json.loads(meta.read_text(encoding='utf-8')).get('request')==req):
   synthesize(text,voice,out,emotion=emotion,emotion_scale=2)
   meta.write_text(json.dumps({'request':req,'audio_sha256':hashlib.sha256(out.read_bytes()).hexdigest()},ensure_ascii=False,indent=2),encoding='utf-8')
  duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(out)]))
  rows.append({'candidate':key,'file':str(out),'expect_text':text,'window_s':window,'kind':'dialogue','duration':duration})
  print(key,tag,duration,flush=True)
(dest/'qc_manifest.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
(dest/'casting.json').write_text(json.dumps({'candidates':voices,'selection':'A','reason':'角色目录明确为清甜灵动的少女；替换用户否决的清冷沉稳声线。先以此候选接片，不能声称已完成主观盲听。','auditionedByAgent':False},ensure_ascii=False,indent=2),encoding='utf-8')
