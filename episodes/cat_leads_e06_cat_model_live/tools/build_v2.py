"""Deterministic local E06 edit. No ML imports or provider requests.

--preview permits the two explicitly marked V1 placeholders. Without it,
missing or unreviewed replacement shots fail before rendering.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

EP = Path(__file__).resolve().parents[1]
TMP = EP / 'tmp/v2_build'
STEMS = EP / 'assets/audio/v2'
FPS = 30


def run(args):
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y','-filter_complex_threads','1',*map(str,args)],check=True,timeout=180)


def jread(path):
    return json.loads(path.read_text(encoding='utf-8'))


def codec():
    return ['-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-an']


def normalize(shot, preview):
    frames = round(shot['end']*FPS)-round(shot['start']*FPS)
    duration = frames/FPS
    source = EP/shot['source']
    pending = shot.get('pending',False)
    if pending:
        if not preview:
            raise ValueError(f"{shot['id']} needs generation and alignment review")
        source = EP/shot['fallback']
    out = TMP/(shot['id']+'.mp4')
    base = 'scale=1280:720:flags=lanczos,setsar=1'
    grade = ','+shot['grade'] if shot.get('grade') else ''
    if 'generatedSpeech' in shot and not pending:
        gs,ge = shot['generatedSpeech']
        ts,te = shot['targetSpeech']
        # Keep the natural speed of the lead/tail; retime only the spoken part.
        # Silence handles are taken from this same generated shot.
        segments = [(max(0,gs-ts),gs,ts), (gs,ge,te-ts), (ge,ge+(duration-te),duration-te)]
        filters = []
        labels = []
        for n,(start,end,target) in enumerate(segments):
            count = round((ts if n==0 else te if n==1 else duration)*FPS) - round((0 if n==0 else ts if n==1 else te)*FPS)
            if count <= 0:
                continue
            target = count/FPS
            factor = target/(end-start)
            label = f'p{n}'
            filters.append(f'[0:v]trim=start={start:.6f}:end={end:.6f},setpts=(PTS-STARTPTS)*{factor:.8f},{base}{grade},fps={FPS},tpad=stop_mode=clone:stop_duration=2,trim=end_frame={count},setpts=PTS-STARTPTS[{label}]')
            labels.append(f'[{label}]')
        filters.append(''.join(labels)+f'concat=n={len(labels)}:v=1:a=0[v]')
        run(['-i',source,'-filter_complex',';'.join(filters),'-map','[v]','-frames:v',frames,*codec(),out])
    elif shot.get('tailExtension'):
        # Preserve the existing V1 closing shot and its 85% speed tail.
        run(['-sseof','-2.125','-i',source,'-vf',base+',setpts=(PTS-STARTPTS)/0.85,fps=30,tpad=stop_mode=clone:stop_duration=0.1,fade=t=out:st=2:d=0.5','-frames:v',frames,*codec(),out])
    else:
        label = ",drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='V1 placeholder - replacement pending':x=20:y=20:fontsize=25:fontcolor=white:box=1:boxcolor=black@0.6" if pending else ''
        run(['-i',source,'-vf',base+grade+',fps=30,tpad=stop_mode=clone:stop_duration=2'+label,'-frames:v',frames,*codec(),out])
    return out


def make_mix(edit, direction):
    STEMS.mkdir(parents=True,exist_ok=True)
    # Bird recording is shorter than the scene: one crossfaded continuation,
    # independent of all shot boundaries and speech activity.
    birds = EP/'assets/audio/sfx/morning_birds.wav'
    run(['-i',birds,'-i',birds,'-filter_complex','[0:a][1:a]acrossfade=d=0.8:c1=tri:c2=tri,atrim=0:60,asetpts=PTS-STARTPTS[a]', '-map','[a]','-ar','48000','-c:a','pcm_s24le',TMP/'birds60.wav'])
    run(['-i',EP/'assets/audio/sfx/wind_leaves.wav','-af','dynaudnorm=f=400:g=7:p=0.8:m=5:r=0.025','-c:a','pcm_s24le',TMP/'wind_stable.wav'])
    args=[];filters=[];labels=[]
    for i,cue in enumerate(direction['ambience']):
        path=TMP/'birds60.wav' if cue['name']=='morning_birds' else EP/f"assets/audio/sfx/{cue['name']}.wav"
        if cue['name']=='wind_leaves':
            path=TMP/'wind_stable.wav'
        args+=['-i',path]
        filters.append(f'[{i}:a]aresample=48000,volume={cue["volume"]},atrim=0:60[a{i}]')
        labels.append(f'[a{i}]')
    filters.append(''.join(labels)+f'amix=inputs={len(labels)}:normalize=0:duration=longest,afade=t=in:d=0.15,afade=t=out:st=58.5:d=1.5[a]')
    run([*args,'-filter_complex',';'.join(filters),'-map','[a]','-c:a','pcm_s24le',STEMS/'ambience.wav'])

    spoken=[s for s in edit['shots'] if 'audio' in s]
    args=[];filters=[];labels=[]
    for i,s in enumerate(spoken):
        args+=['-i',EP/s['audio']]
        delay=round(1000*(s['start']+s.get('audioOffset',0)))
        filters.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=stereo,volume={edit["dialogueGain"]},adelay={delay}|{delay}[d{i}]')
        labels.append(f'[d{i}]')
    filters.append(''.join(labels)+f'amix=inputs={len(labels)}:duration=longest:normalize=0,apad,atrim=0:60[a]')
    run([*args,'-filter_complex',';'.join(filters),'-map','[a]','-c:a','pcm_s24le',STEMS/'dialogue.wav'])

    args=[];filters=[];labels=[]
    for i,cue in enumerate(direction['sfx']):
        args+=['-i',EP/f"assets/audio/sfx/{cue['name']}.wav"]
        delay=round(cue['startTime']*1000)
        cue_duration = {'pencil_scratch':2.0,'paper_flutter':2.5,'cat_purr_sleep':3.0}[cue['name']]
        filters.append(f'[{i}:a]aresample=48000,afade=t=in:d=0.02,afade=t=out:st={cue_duration-.2}:d=0.2,volume={cue["volume"]},adelay={delay}|{delay}[s{i}]')
        labels.append(f'[s{i}]')
    filters.append(''.join(labels)+f'amix=inputs={len(labels)}:normalize=0,apad,atrim=0:60[a]')
    run([*args,'-filter_complex',';'.join(filters),'-map','[a]','-c:a','pcm_s24le',STEMS/'foley.wav'])
    # Music alone ducks smoothly. The environment is never sidechained.
    run(['-i',EP/'assets/audio/cat_model_theme.wav','-i',STEMS/'dialogue.wav','-filter_complex',f'[0:a]volume={edit["musicGain"]},afade=t=in:d=1,afade=t=out:st=55:d=5[m];[m][1:a]sidechaincompress=threshold=0.025:ratio=3:attack=80:release=450:makeup=1:mix=0.7[a]','-map','[a]','-ar','48000','-c:a','pcm_s24le',STEMS/'music.wav'])
    run(['-i',STEMS/'ambience.wav','-i',STEMS/'dialogue.wav','-i',STEMS/'foley.wav','-i',STEMS/'music.wav','-filter_complex','[0:a][1:a][2:a][3:a]amix=inputs=4:normalize=0:duration=longest,alimiter=limit=0.95:level=false:latency=true,atrim=0:60[a]','-map','[a]','-c:a','pcm_s24le',STEMS/'mixed.wav'])


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--preview',action='store_true')
    p.add_argument('--mix-only',action='store_true')
    args=p.parse_args()
    edit=jread(EP/'config/v2_edit.json'); direction=jread(EP/'config/audio_direction.json')
    TMP.mkdir(parents=True,exist_ok=True)
    if not args.preview and any(s.get('pending') for s in edit['shots']):
        raise SystemExit('V2 still has unreviewed pending shots; use --preview for the explicit provisional edit')
    make_mix(edit,direction)
    print('Continuous ambience and separate dialogue, Foley, music stems built.',flush=True)
    if args.mix_only:
        return
    outputs=[]
    for s in edit['shots']:
        outputs.append(normalize(s,args.preview))
        print('Rendered '+s['id'],flush=True)
    listing=TMP/'concat.txt'
    listing.write_text('\n'.join(f"file '{x.name}'" for x in outputs)+'\n',encoding='utf-8')
    run(['-f','concat','-safe','0','-i',listing,'-c','copy',TMP/'picture.mp4'])
    out=EP/'output'/('v2_review_preview.mp4' if args.preview else 'output_v2.mp4')
    run(['-i',TMP/'picture.mp4','-i',STEMS/'mixed.wav','-map','0:v','-map','1:a','-vf','scale=1920:1080:flags=lanczos','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t','60','-movflags','+faststart',out])
    provenance={s['id']:{'source':s['source'],'sha256':hashlib.sha256((EP/s['source']).read_bytes()).hexdigest()} for s in edit['shots'] if s.get('reuse')}
    (TMP/'reused_sources.json').write_text(json.dumps(provenance,indent=2),encoding='utf-8')
    shutil.copyfile(EP/'tools/compare_v1_v2.html', EP/'output/compare_v1_v2.html')
    print(str(out),flush=True)


if __name__=='__main__':
    main()
