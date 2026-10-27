"""Render independent act windows through the shared runner, then shared assembly."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json,subprocess,time,sys,hashlib
EP=Path(__file__).resolve().parents[1];WORK=EP.parents[2]
cfg=json.loads((EP/'hybrid/config/cinema_r4_full.json').read_text())
windows=[(0,91),(91,184),(184,276),(276,374),(374,478)];configs=[]
reuse=set()
def reusable(existing,det):
 if not existing.exists() or not det.exists() or not json.loads(det.read_text())['passed']:return False
 old=json.loads(existing.read_text());build=EP/old['pilot']['board']/'build.json'
 if not (EP/old['pilot']['output']).exists() or not build.exists():return False
 b=json.loads(build.read_text())
 return old==b['pipeline']['config'] and all((EP/v['path']).exists() and hashlib.sha256((EP/v['path']).read_bytes()).hexdigest()==v['sha256'] for v in b['source'])
for i,(start,end) in enumerate(windows):
 c=json.loads(json.dumps(cfg));p=c['pilot'];p.update(start=start,end=end,board=f'storyboard/cinema_r4/act_{i}',output=f'output/cinema_r4_act_{i}.mp4',silent=True)
 p['samples']=[t for t in p['samples'] if start<=t<end];p['repeatSamples']=[t for t in p['repeatSamples'] if start<=t<end]
 name=f'hybrid/config/cinema_r4_act_{i}.json';existing=EP/name;det=EP/p['board']/'determinism.json'
 if '--resume' in sys.argv and reusable(existing,det):
  reuse.add(i)
 else:
  if '--resume' in sys.argv:p['settleBeforeCapture']=True
  existing.write_text(json.dumps(c,indent=2),encoding='utf-8')
 configs.append(name)
def render(i):
 if i in reuse:return i
 log=EP/f'tmp/cinema_r4_act_{i}.log'
 with log.open('w',encoding='utf-8') as out:
  subprocess.run(['node',str(WORK/'dula-skills/draw-over-animation/scripts/pipeline.mjs'),'--episode',str(EP),'--config',configs[i],'--step','render','--render'],stdout=out,stderr=subprocess.STDOUT,check=True)
 return i
start=time.monotonic()
with ThreadPoolExecutor(max_workers=3) as pool:
 jobs=[pool.submit(render,i) for i in range(len(windows))]
 while not all(j.done() for j in jobs):
  done=[i for i,j in enumerate(jobs) if j.done()];print(json.dumps({'seconds':round(time.monotonic()-start),'completed_acts':done}),flush=True);time.sleep(15)
 for j in jobs:j.result()
assembly={'source':cfg['source']['video'],'source_sha256':cfg['source']['sha256'],'output':'output/borrowed_moonlight_cinema_r4_final.mp4','base_config':configs[0],'patches':[{'config':c} for c in configs],'report':'storyboard/cinema_r4/assembly.json','crf':17}
(EP/'hybrid/config/cinema_r4_assembly.json').write_text(json.dumps(assembly,indent=2),encoding='utf-8')
subprocess.run([sys.executable,str(WORK/'dula-skills/draw-over-animation/scripts/replace_windows.py'),'--episode',str(EP),'--config','hybrid/config/cinema_r4_assembly.json'],check=True)
print(json.dumps({'complete':True,'seconds':round(time.monotonic()-start),'output':assembly['output']}),flush=True)
