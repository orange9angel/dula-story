"""Episode casting data; synthesis and optional listening use shared skill tools."""
from pathlib import Path
import json, os, subprocess, sys

EP = Path(__file__).resolve().parents[1]
ROOT = EP.parents[2]
PY = ROOT/'dula-story/.venv/Scripts/python.exe'
SK = ROOT/'dula-skills/volc-voice-casting/scripts'
OUT = EP/'tmp/voice_audition/r3'
OUT.mkdir(parents=True, exist_ok=True)
for raw in (ROOT/'dula-story/.env.speech').read_text(encoding='utf-8-sig').splitlines():
    raw=raw.strip().removeprefix('export ')
    if raw.startswith('#') or '=' not in raw: continue
    k,v=raw.split('=',1)
    if k.startswith('VOLC_'): os.environ.setdefault(k,v.strip().strip('\"\''))
lines=json.loads((EP/'config/dialogue.json').read_text(encoding='utf-8'))['lines']
candidates={'A':'ICL_uranus_zh_female_yuanqitianmei_tob','B':'zh_female_mengyatou_uranus_bigtts'}
results=[]
for label,voice in candidates.items():
    for lid in ['e01','e16','e17']:
        line=next(x for x in lines if x['id']==lid)
        out=OUT/f'{label}_{lid}.mp3'
        context='十一岁小女孩在和面前的人认真说话。自然、清楚，保留孩子短而轻的语气。'+line['delivery']['context'][-1]
        cmd=[str(PY),str(SK/'seedtts_say.py'),'--speaker',voice,'--text',line['tts_text'],'--context',context,'--speech-rate',str(12 if lid=='e17' else 0),'--out',str(out)]
        if not out.exists():
            r=subprocess.run(cmd,capture_output=True,text=True,encoding='utf-8',errors='replace')
            if r.returncode: print(label,lid,r.stderr[-250:],flush=True); continue
        dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(out)]))
        results.append(dict(label=label,voice=voice,line=lid,path=str(out),duration=dur,window=line['window'],context=context,rate=12 if lid=='e17' else 0))
        print(label,lid,round(dur,2),flush=True)
(OUT/'candidates.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
