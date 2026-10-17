import os,sys,json,re,hashlib,subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
EP=Path(__file__).resolve().parents[1]; STORY=EP.parents[1]; WORK=STORY.parent
sys.path.insert(0,str(WORK/'dula-skills/volc-voice-casting/scripts'))
from seedtts_say import synthesize
from seedaudio_gen import generate
for line in (STORY/'.env.speech').read_text(encoding='utf-8-sig').splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  k,v=line.split('=',1);os.environ.setdefault(k.strip(),v.strip().strip('"').strip("'"))
plan=json.loads((EP/'config/voice_direction.json').read_text(encoding='utf8'));assert plan['status']=='reviewed'
voices={'Girl':'zh_female_vv_uranus_bigtts','Boy':'zh_male_taocheng_uranus_bigtts'}
out=EP/'assets/audio';out.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def duration(p):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(p)]))
def run(item):
 ident,params=item;kind=params.pop('kind');p=out/('dialogue' if kind=='voice' else 'foley')/(ident+('.mp3' if kind=='voice' else '.wav'));p.parent.mkdir(exist_ok=True)
 meta=p.with_suffix('.source.json');fingerprint=hashlib.sha256(json.dumps(params,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
 if not(meta.exists() and p.exists() and json.loads(meta.read_text())['requestSha256']==fingerprint and json.loads(meta.read_text())['sha256']==sha(p)):
  if kind=='voice':synthesize(out_path=p,**params)
  else:generate(params['prompt'],p)
  meta.write_text(json.dumps({'requestSha256':fingerprint,'sha256':sha(p),'request':params,'duration':duration(p),'listening':'not performed'},ensure_ascii=False,indent=2),encoding='utf8')
 print(ident,round(duration(p),3),flush=True);return{'id':ident,'file':str(p.relative_to(EP)),'duration':duration(p),'sha256':sha(p)}
items=[]
for block in (EP/'script.story.draft').read_text(encoding='utf8').strip().split('\n\n'):
 lines=block.splitlines();m=re.search(r'\[(Girl|Boy)\](.*)',block)
 if not m:continue
 ident=lines[0];d=plan['directions'][ident];text=re.sub(r'\{[^}]+\}','',m[2]).strip();items.append((ident,dict(kind='voice',text=text,speaker=voices[m[1]],emotion=d['emotion'],emotion_scale=2,context_texts=[d['context']],speech_rate=0)))
items.extend((name,dict(kind='ambient',prompt=plan[name]['prompt'])) for name in ['ambience','foley'])
with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(run,items))
(EP/'config/audio_sources.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
