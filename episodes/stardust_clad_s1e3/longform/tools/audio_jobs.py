"""Episode-local cached voice production; shared Seed TTS remains the backend."""
from pathlib import Path
import argparse, hashlib, importlib.util, json, os, re, subprocess, time
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT=Path(__file__).resolve().parents[1]
WS=ROOT.parents[3]
PY=WS/'dula-story/.venv/Scripts/python.exe'
CAST={'小凿':'xiaozao','缄网':'jianwang','苇禾':'weihe','崖伯':'yabo','弥灯':'mideng'}
VOICES={
 'xiaozao':'zh_male_gaolengchenwen_uranus_bigtts',
 'jianwang':'ICL_uranus_zh_male_diyinchenyu_tob',
 'weihe':'zh_female_wenrouxiaoya_uranus_bigtts',
 'yabo':'ICL_uranus_zh_male_youmodaye_tob',
 'mideng':'zh_female_qingchezizi_uranus_bigtts',
}
IDENTITY={
 'xiaozao':'年轻守卫，声音自然贴近人物，不要播音，内敛但能清楚表达关心。',
 'jianwang':'高瘦的成年敌手，冷静克制，话有压迫感，不是怪物，不用刻意低吼。',
 'weihe':'成年女跑桥人，结实爽快，话里有行动力与轻微调侃，不要娇柔撒娇。',
 'yabo':'年长造桥匠，沧桑温厚，干活时实在直接，幽默不过火，不是讲故事的旁白。',
 'mideng':'年轻成年守灯学徒，清亮自然，开始有一点迟疑，逐渐坚定，不要幼童嗓音。',
}
ACT_CONTEXT={
 'home':'生活场景中面对面交谈，温暖而有小动作，轻声自然，句尾不要拖长。',
 'danger':'救援危险正在发生，短句清楚有力，人在用力和观察，不是对观众宣讲。',
 'dispute':'双方在试探或争执，克制但态度明确，有具体对象，不夸张吼叫。',
 'intimate':'刚经历危险，呼吸稍重，距离近，真诚简短，不要哭腔或煽情朗诵。',
 'finale':'风声中紧急协作，果断喊给对方听，带身体发力感，保持字词清楚。',
 'memory':'说起具体往事，停顿来自难以开口，压住情绪，不要抒情朗诵。',
}
def mood(n):
 if n==49:return 'intimate'
 if n==50:return 'dispute'
 if n<=2 or n>=43:return 'home'
 if n in [20,22,25,27,34]:return 'intimate'
 if n in [21,23]:return 'memory'
 if n in [5,6,8,10,12,26,28,33,38]:return 'dispute'
 if n>=36:return 'finale'
 return 'danger'
def save(path,value):
 path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def extract():
 text=(ROOT/'draft.md').read_text(encoding='utf-8')
 beats=[];lines=[]
 for match in re.finditer(r'^## (B\d+|END) \| (\w+) \| ([^|]+) \| (\d+)\s*$(.*?)(?=^## |\Z)',text,re.M|re.S):
  bid,scene,title,extra,body=match.groups();n=int(bid[1:]) if bid!='END' else 49
  beat={'id':bid,'scene':scene,'title':title.strip(),'actionSeconds':int(extra),'description':'\n'.join(re.findall(r'^> (.+)',body,re.M)),'lines':[]}
  for i,(who,words) in enumerate(re.findall(r'^(小凿|缄网|苇禾|崖伯|弥灯)：(.+)$',body,re.M),1):
   name=CAST[who];tone=mood(n);rate=-3 if tone=='memory' else 0
   line={'id':f'{bid}_{i:02d}','beat':bid,'speaker':name,'displayName':who,'text':words.strip(),
    'delivery':{'rate':rate,'context':IDENTITY[name]+ACT_CONTEXT[tone]},'tone':tone}
   if re.fullmatch(r'[喝哈啊给我开压拉——！…]+',words) or '——' in words:
    line['delivery']['context']=IDENTITY[name]+'身体正在发力或承重的短促呼喊，气息从胸腹推出，有人类用力感，不是怪物叫声。'
   beat['lines'].append(line);lines.append(line)
  beats.append(beat)
 assert len(beats)==51 and len(lines)>300
 assert '?' not in ''.join(l['text'] for l in lines)
 save(ROOT/'config/draft_data.json',{'beats':beats,'lines':lines,'voices':VOICES,'draft_sha256':hashlib.sha256(text.encode()).hexdigest()})
 print(json.dumps({'beats':len(beats),'lines':len(lines),'characters':sum(len(l['text']) for l in lines),'action_seconds':sum(b['actionSeconds'] for b in beats)},ensure_ascii=False),flush=True)
 return beats,lines
def setup():
 for raw in (WS/'dula-story/.env.speech').read_text(encoding='utf-8-sig').splitlines():
  raw=raw.strip().removeprefix('export ')
  if not raw or raw.startswith('#') or '=' not in raw:continue
  k,v=raw.split('=',1)
  if k.startswith('VOLC_'):os.environ.setdefault(k,v.strip().strip('"\''))
 spec=importlib.util.spec_from_file_location('seedtts',WS/'dula-skills/volc-voice-casting/scripts/seedtts_say.py')
 module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 return module
def synth(line,module,out,voice=None):
 out.mkdir(parents=True,exist_ok=True)
 speaker=voice or VOICES[line['speaker']]
 signature={'text':line['text'],'speaker':speaker,'delivery':line['delivery']}
 tag=hashlib.sha256(json.dumps(signature,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
 target=out/(line['id']+'.wav');meta=target.with_suffix('.source.json')
 if target.exists() and meta.exists():
  cached=json.loads(meta.read_text(encoding='utf-8'))
  if cached.get('tag')==tag and cached.get('sha256')==hashlib.sha256(target.read_bytes()).hexdigest():
   return {'id':line['id'],'cached':True,'duration':cached['duration']}
 mp3=target.with_suffix('.mp3')
 for attempt in range(3):
  try:
   module.synthesize(line['text'],speaker,mp3,context_texts=[line['delivery']['context']],speech_rate=line['delivery']['rate'],timeout=70)
   subprocess.run(['ffmpeg','-y','-v','error','-i',str(mp3),'-ar','48000','-ac','2',str(target)],check=True)
   duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(target)]))
   record={**signature,'id':line['id'],'tag':tag,'provider':'volcano-seedtts','duration':duration,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
   save(meta,record)
   return {'id':line['id'],'generated':True,'duration':duration}
  except Exception as error:
   # No tokens or credential-bearing request bodies in errors.
   reason=str(error)[:240]
   if any(w in reason.lower() for w in ['not granted','quota','balance','401','403']):break
   if attempt<2:time.sleep(2*(attempt+1))
 return {'id':line['id'],'error':reason}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--extract',action='store_true');ap.add_argument('--audition',action='store_true');ap.add_argument('--ids',nargs='*');ap.add_argument('--workers',type=int,default=2)
 args=ap.parse_args();beats,lines=extract()
 if args.extract:return
 module=setup()
 if args.audition:
  candidates={'yabo':['ICL_uranus_zh_male_youmodaye_tob','zh_male_dayi_uranus_bigtts'],
              'mideng':['zh_female_qingchezizi_uranus_bigtts','zh_female_xiaohe_uranus_bigtts']}
  results=[]
  for role,voices in candidates.items():
   examples=[next(l for l in lines if l['speaker']==role),next(l for l in lines if l['speaker']==role and l['tone']=='finale')]
   for j,voice in enumerate(voices):
    for l in examples:
     r=synth(l,module,ROOT/'assets/audio/audition'/f'{role}_{j}',voice);r.update(role=role,voice=voice);results.append(r);print(json.dumps(r,ensure_ascii=False),flush=True)
  save(ROOT/'assets/audio/audition/report.json',{'status':'provisional; generated and measured, no claim of listening','results':results})
  return
 if args.ids:lines=[l for l in lines if l['id'] in args.ids]
 results=[]
 with ThreadPoolExecutor(max_workers=args.workers) as pool:
  futures=[pool.submit(synth,l,module,ROOT/'assets/audio/dialogue') for l in lines]
  for f in as_completed(futures):
   r=f.result();results.append(r);print(json.dumps(r,ensure_ascii=False),flush=True)
 save(ROOT/'assets/audio/dialogue/production_report.json',results)
 if any('error'in r for r in results):raise SystemExit(1)
if __name__=='__main__':main()
