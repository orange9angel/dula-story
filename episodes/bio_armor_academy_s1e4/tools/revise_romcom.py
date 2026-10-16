"""Reversible episode audition and production handoff for the romantic-comedy pass."""
from pathlib import Path
import argparse, hashlib, json, os, sys, zipfile, subprocess

EP=Path(__file__).resolve().parents[1]; STORY=EP.parents[1]; WORK=EP/'tmp/romcom_revision'
WORK.mkdir(parents=True,exist_ok=True)
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,data):
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def backup():
    dest=EP/'output/archive/before_romcom_revision.zip'
    if dest.exists():print('Existing baseline retained');return
    files=[EP/'output/current.mp4',EP/'script.story',EP/'viewer.js',EP/'performance_remake.js',EP/'performance_tripo.js']
    for folder in ['config','tools','cards','storyboard/episode_current','assets3d/dialogue_r3','assets3d/processed','assets3d/ambience','assets3d/music','assets3d/sfx']:
        files.extend(p for p in (EP/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    files.extend((EP/'assets3d').glob('*.wav'))
    assets=STORY.parent/'dula-assets'
    shared=[assets/p for p in ['lib/craft3d/drawn-head.js','lib/craft3d/generated-portrait-paint.js','lib/craft3d/generated-face-paint.js','characters/bioarmor/lei-generated-paint.js','characters/bioarmor/aoi-generated-paint.js']]
    manifest={}
    with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=3) as z:
        for p in dict.fromkeys(files+shared):
            key=('episode/'+p.relative_to(EP).as_posix()) if p.is_relative_to(EP) else 'dula-assets/'+p.relative_to(assets).as_posix()
            z.write(p,key);manifest[key]=sha(p)
        z.writestr('manifest.json',json.dumps(manifest,indent=2))
    print(json.dumps({'baseline':str(dest),'files':len(manifest),'videoSha256':sha(EP/'output/current.mp4')}))

def audition():
    sys.path.insert(0,str(STORY.parent/'dula-skills/volc-voice-casting/scripts'))
    from seedtts_say import synthesize
    for raw in (STORY/'.env.speech').read_text(encoding='utf-8-sig').splitlines():
        if '=' in raw:
            k,v=raw.removeprefix('export ').split('=',1)
            if k.strip()=='VOLC_SPEECH_API_KEY':os.environ.setdefault(k.strip(),v.strip().strip('\"\''))
    plan=read(EP/'config/audio_direction.json')
    # Both a request and a joke must work. A new actor is an explicit candidate,
    # not silently installed in the episode before the audible comparison.
    voices=[('sunny_simple','zh_male_shaonianzixin_uranus_bigtts'),
            ('playful_simple','ICL_uranus_zh_male_huoliqingnian_tob')]
    context='阳光开朗的少年，正开心地和喜欢的女同学聊天。声音明亮，有明显笑意，语调活泼，亲切自然。'
    notes={3:'有精神地向她求助，带好奇和信任，像终于找到能帮自己的同学。',5:'忍着笑开玩笑：“你先保证”轻快认真，“不把我泡进罐子里”是故意逗她，不是真的害怕。'}
    manifest=[]
    for name,speaker in voices:
        for entry in [3,5]:
            text=next(l['text'] for l in plan['dialogue'] if l['entry']==entry)
            out=WORK/f'voices/{name}_{entry}.mp3';out.parent.mkdir(parents=True,exist_ok=True)
            req={'text':text,'speaker':speaker,'context_texts':[context+notes[entry]],'speech_rate':5}
            try:
                if not out.exists():synthesize(text,speaker,out,context_texts=req['context_texts'],speech_rate=5)
                save(out.with_suffix('.source.json'),{'request':req,'sha256':sha(out)})
                duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(out)]))
                manifest.append({'candidate':name,'entry':entry,'speaker':speaker,'path':str(out.relative_to(EP)), 'duration':duration})
                print(name,entry,duration,flush=True)
            except Exception as e:
                manifest.append({'candidate':name,'entry':entry,'error':str(e)[:300]});print(name,entry,'unavailable',flush=True)
    save(WORK/'voices/manifest.json',manifest)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['backup','audition']);a=p.parse_args()
    {'backup':backup,'audition':audition}[a.action]()
