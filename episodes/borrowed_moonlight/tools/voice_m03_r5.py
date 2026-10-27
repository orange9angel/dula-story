"""Episode direction adapter; synthesis uses the shared Volcano driver."""
from pathlib import Path
import sys,json,hashlib,subprocess
EP=Path(__file__).resolve().parents[1];WORK=EP.parents[2]
sys.path.insert(0,str(WORK/'dula-skills/volc-voice-casting/scripts'))
from seedtts_say import synthesize
secrets={}
for row in (WORK/'dula-story/.env.speech').read_text(encoding='utf-8-sig').splitlines():
 row=row.strip().removeprefix('export ')
 if row and not row.startswith('#') and '=' in row:
  k,v=row.split('=',1);secrets[k.strip()]=v.strip().strip('\"\'')
out=EP/'assets3d/dialogue/cinema_r5';out.mkdir(parents=True,exist_ok=True)
speaker=json.loads((EP/'config/voice_config.json').read_text(encoding='utf-8'))['LadyMoon']['voice']
text='会的……每当一个人，不再相信明天……我就失去一缕光。每当一个人，忘记仰望天空……我就失去一颗星。'
context=['保持月亮夫人原来的声线，疲惫、慈爱，轻声对眼前的孩子说话。','这是缓慢袒露伤口，不是讲解：会的之后停一拍；相信明天之后停顿；一缕光之后让悲伤沉下来，再说后半句。末尾一颗星轻轻落下，不赶字，不催促。']
mp3=out/'m03_slow.mp3'
if not mp3.exists():synthesize(text,speaker,mp3,api_key=secrets['VOLC_SPEECH_API_KEY'],speech_rate=-25,emotion='sad',emotion_scale=2,context_texts=context)
wav=out/'m03_slow.wav';subprocess.run(['ffmpeg','-y','-v','error','-i',str(mp3),'-ar','48000','-ac','2',str(wav)],check=True)
duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(wav)]))
record={'id':'m03','provider':'volcano/seed-tts-2.0','speaker':speaker,'tts_text':text,'speech_rate':-25,'context':context,'emotion':'sad','duration':duration,'sha256':hashlib.sha256(wav.read_bytes()).hexdigest(),'listening':'not_claimed'}
(out/'m03_slow.source.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'duration':duration,'file':str(wav)}))
