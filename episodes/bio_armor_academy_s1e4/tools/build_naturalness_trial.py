"""Isolated two-exchange audition. Never promotes or rewrites the current episode."""
from pathlib import Path
import argparse, hashlib, json, os, shutil, subprocess, sys
import numpy as np
from scipy.io import wavfile

EP=Path(__file__).resolve().parents[1]
STORY=EP.parents[1]
W=EP/'tmp/natural_look'
D=W/'dialogue'
SR=48000
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()

def save(p,obj):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def run(*args):
    subprocess.run([str(a) for a in args],cwd=EP,check=True)

LINES={
    6:('装叶子的呀。你这么大，哪儿放得下。','同学怕你把他泡进标本罐，正在跟你开玩笑。你看看小罐子，又看看他，忍着笑随口回他。'),
    17:('你又不是叶子。明天放学再过来吧。','他拿着标本罐，问自己是不是也得贴标签。你笑着接一句，再顺口约他明天放学过来，希望他答应。'),
}

def prepare():
    plan=read(EP/'config/audio_direction.json')
    text=(EP/'script.story').read_text(encoding='utf-8')
    for line in plan['dialogue']:
        if line['entry'] in LINES:
            new,note=LINES[line['entry']]
            old=line['text'];assert text.count(old)==1
            text=text.replace(old,new);line['text']=new
            line['delivery'].update(nativeContextTexts=[note],nativeSpeechRate=0,pace=1.0)
    D.mkdir(parents=True,exist_ok=True)
    (D/'script.story').write_text(text,encoding='utf-8')
    plan['sources'][0]['sha256']=sha(D/'script.story')
    # Retain accepted score/SFX by absolute source paths; only outputs are isolated.
    for cue in plan['music']+plan['sfx']:
        cue['asset']=str((EP/cue['asset']).resolve())
    save(D/'config/audio_direction.json',plan)
    for folder in ['dialogue_r3','ambience']:
        dest=D/'assets3d'/folder;dest.mkdir(parents=True,exist_ok=True)
        for source in (EP/'assets3d'/folder).glob('*'):
            if source.is_file() and (folder!='dialogue_r3' or int(source.stem.split('_')[-1].split('.')[0]) not in LINES):
                shutil.copy2(source,dest/source.name)
    cache=D/'tmp/alignment_r3';cache.mkdir(parents=True,exist_ok=True)
    for source in (EP/'tmp/alignment_r3').glob('*.json'):
        if source.stem not in ['entry_6','entry_17']:shutil.copy2(source,cache/source.name)
    run('node',EP/'tools/compile_story.mjs','--episode-dir',D)
    sys.path.insert(0,str(STORY.parent/'dula-skills/volc-voice-casting/scripts'))
    from seedtts_say import synthesize
    for raw in (STORY/'.env.speech').read_text(encoding='utf-8-sig').splitlines():
        if '=' in raw and not raw.strip().startswith('#'):
            k,v=raw.removeprefix('export ').split('=',1)
            if k.strip()=='VOLC_SPEECH_API_KEY':os.environ.setdefault(k.strip(),v.strip().strip('\"\''))
    speaker=plan['characters']['QianTangKui']['voice']
    for entry,(text,note) in LINES.items():
        req={'text':text,'speaker':speaker,'context_texts':[note],'speech_rate':0,'provider':'seed-tts-2.0','wireVersion':2}
        out=D/f'assets3d/dialogue_r3/entry_{entry}.mp3';meta=out.with_suffix('.source.json')
        key=hashlib.sha256(json.dumps(req,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
        old=read(meta) if meta.exists() else {}
        if not(out.exists() and old.get('input_sha256')==key and old.get('audio_sha256')==sha(out)):
            synthesize(text,speaker,out,context_texts=[note],speech_rate=0)
            save(meta,{'request':req,'input_sha256':key,'audio_sha256':sha(out)})
        print('Trial line',entry,'ready',flush=True)
    run(sys.executable,EP/'tools/build_audio.py','--episode-dir',D)
    run(sys.executable,EP/'tools/build_visemes.py','--episode-dir',D)
    overrides=read(W/'combined.json')
    for name in ['timeline','voice_features','viseme_leixiao','viseme_qiantangkui']:
        overrides[f'/config/{name}.json']=f'tmp/natural_look/dialogue/config/{name}.json'
    save(W/'scene_trial.json',overrides)

def boards():
    for actor in ['aoi','lei']:
        cfg=read(EP/('config/turn_volume_comparison.json' if actor=='aoi' else 'config/lei_character_comparison.json'))
        rows=cfg['boards'][0]['rows']
        rows=[rows[i] for i in ([1,3,4] if actor=='aoi' else [0,2,3])]
        if actor=='aoi':
            rows[1]['model_crop']=[475,440,615,603]
            rows[2]['model_crop']=[285,440,425,603]
        if actor=='lei':
            rows.insert(0,{'frame':'front','label':'正面下颊—嘴—下巴：避免收成针尖',
                'reference':'storyboard/hybrid_character/lei/references/lei_production_front.png',
                'reference_crop':[380,650,840,970],'model_crop':[270,480,610,690]})
        for row in rows:
            row.pop('reference_label',None)
            row['label']=row['label'].split('\n')[0]
        cfg.update(review_scope='local',turn_mode='head',before=f'tmp/natural_look/before/{actor}/baseline',
            after=f'tmp/natural_look/shape/{actor}/baseline',out=f'tmp/natural_look/parts/{actor}',
            whole_frames=True,whole_frame_groups={'whole':['front','turn_45','turn_minus45','turn_90','turn_minus90']},
            whole_frame_note='头转、身体固定；前后使用相同机位和表情。只验证本轮脸型，不声明完整角色已通过。',
            column_labels=['绘画参考（姿态未标定）','当前正片基线','隔离候选'],
            display_note='各裁切保持长宽比；绘画与模型姿态不同，只比较结构关系，不进行像素拟合。',
            boards=[{'id':'parts','title':('女主' if actor=='aoi' else '男主')+'：原画 / 基线 / 候选的局部结构', 'rows':rows}])
        for key in ['turn_sequence','preserve','required_regions']:cfg.pop(key,None)
        p=W/f'{actor}_parts.json';save(p,cfg)
        run(sys.executable,EP/'tools/build_oblique_feature_review.py','--comparison',p)
    from PIL import Image,ImageDraw,ImageFont
    board=Image.new('RGB',(1200,1290),'#f1f0ea');draw=ImageDraw.Draw(board)
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',26)
    for row,actor in enumerate(['lei','aoi']):
        for col,phase in enumerate(['before','shape']):
            im=Image.open(W/f'{phase}/{actor}/baseline/front.png').convert('RGB');im.thumbnail((600,600))
            x=col*600;y=row*645
            label=('男主' if actor=='lei' else '女主')+(' · 当前脸型' if col==0 else ' · 候选脸型')
            draw.text((x+22,y+8),label,font=font,fill='#253629');board.paste(im,(x,y+45))
    dest=EP/'storyboard/naturalness_trial';dest.mkdir(parents=True,exist_ok=True)
    board.save(dest/'face_comparison.jpg',quality=94)

def pcm(path):
    rate,x=wavfile.read(path);assert rate==SR
    return x.astype(np.float32)/32768

def assemble():
    # Cut only idle holds, at the existing shot cuts. Retain the full jar lift (ends 67.4s).
    rows={x['entry']:x for x in read(D/'config/audio_timing.json')['lines']}
    runs=[[(15,17.7333333333),(20.2,min(24.3,round((rows[6]['audioEnd']+.55)*30)/30))],
          [(64.2,67.5),(69.4,min(74.4,round((rows[17]['audioEnd']+.6)*30)/30))]]
    plan=read(D/'config/audio_direction.json');cue=plan['music'][0]
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',cue['asset'],'-f','f32le','-ac','2','-ar',str(SR),'-'])
    music=np.frombuffer(raw,np.float32).reshape(-1,2).copy()
    music*=10**(cue['targetRmsDb']/20)/max(float(np.sqrt(np.mean(music*music))),1e-8)
    voices={name:pcm(D/f'assets3d/{name}_stem.wav') for name in ['LeiXiao','QianTangKui']}
    other=pcm(D/'assets3d/ambience_stem.wav')+pcm(D/'assets3d/sfx_stem.wav')
    clips=[];review=[]
    for i,((start,end),cuts) in enumerate(zip([(15,24.3),(64.2,74.4)],runs),1):
        base=W/f'baseline_{i}.mp4'
        run('ffmpeg','-y','-v','error','-ss',start,'-t',end-start,'-i',EP/'output/current.mp4',
            '-vf',"drawtext=text='A  CURRENT':x=24:y=24:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=10",
            '-c:v','libx264','-crf','18','-c:a','aac','-ar',SR,'-ac','2',base)
        clips.append(base)
        voice_chunks=[];other_chunks=[];visual=[]
        for j,(a,b) in enumerate(cuts):
            sl=slice(round(a*SR),round(b*SR))
            block=np.zeros((round(b*SR)-round(a*SR),2),np.float32)
            for name,y in voices.items():
                pan=-.12 if name=='LeiXiao' else .12
                block[:,0]+=y[sl]*np.sqrt((1-pan)/2);block[:,1]+=y[sl]*np.sqrt((1+pan)/2)
            voice_chunks.append(block);other_chunks.append(other[sl])
            visual.append(f'[0:v]trim=start={a-start:.8f}:end={b-start:.8f},setpts=PTS-STARTPTS[v{j}]')
        voice=np.concatenate(voice_chunks);n=len(voice)
        # Keep the selected music continuous across the shortened exchange, then duck to actual speech.
        m0=round((start-cue['startTime'])*SR);score=music[m0:m0+n].copy()
        hop=480;padded=np.pad(voice,((0,(-n)%hop),(0,0)))
        activity=np.sqrt(np.mean(padded.reshape(-1,hop,2)**2,axis=(1,2)))>.004
        from scipy.ndimage import maximum_filter1d,gaussian_filter1d
        duck=1-(1-cue.get('dialogueDuck',.48))*gaussian_filter1d(maximum_filter1d(activity.astype(float),size=25),sigma=6)
        score*=np.repeat(duck,hop)[:n,None]
        mix=voice+np.concatenate(other_chunks)+score
        f=min(round(.08*SR),n//2);mix[:f]*=np.linspace(0,1,f)[:,None];mix[-f:]*=np.linspace(1,0,f)[:,None]
        assert np.max(np.abs(mix))<.98
        wav=W/f'trial_{i}.wav';wavfile.write(wav,SR,(mix*32767).astype(np.int16))
        visual.append('[v0][v1]concat=n=2:v=1:a=0,drawtext=text=\'B  TRIAL\':x=24:y=24:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=10[v]')
        dest=W/f'trial_{i}.mp4'
        run('ffmpeg','-y','-v','error','-i',W/f'render_{i}.mp4','-i',wav,
            '-filter_complex',';'.join(visual),'-map','[v]','-map','1:a','-c:v','libx264','-crf','18',
            '-c:a','aac','-ar',SR,'-ac','2','-t',n/SR,dest)
        clips.append(dest)
        prior=5 if i==1 else 16;response=6 if i==1 else 17
        review.append({'exchange':i,'sourceCuts':cuts,'duration':n/SR,
            'replyGap':cuts[0][1]-rows[prior]['audioEnd']+rows[response]['start']-cuts[1][0],
            'music':'same selected Suno asset; continuous within exchange','response':rows[response]})
    concat=W/'comparison.txt';concat.write_text(''.join(f"file '{p.as_posix()}'\n" for p in clips),encoding='utf-8')
    run('ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',concat,'-c','copy','-movflags','+faststart',EP/'output/naturalness_trial.mp4')
    # A candidate-only link for normal viewing, without the longer baseline holds.
    concat=W/'candidate.txt';concat.write_text(''.join(f"file '{p.as_posix()}'\n" for p in clips[1::2]),encoding='utf-8')
    run('ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',concat,'-c','copy','-movflags','+faststart',EP/'output/naturalness_candidate.mp4')
    baseline=read(W/'baseline.json')
    unchanged={name:sha(Path(name) if Path(name).is_absolute() else EP/name)==digest for name,digest in baseline.items()}
    assert all(unchanged.values()),unchanged
    save(W/'review.json',{'status':'isolated candidate; user review pending','exchanges':review,
        'baselineUnchanged':unchanged,'outputSha256':sha(EP/'output/naturalness_trial.mp4')})
    print(json.dumps({'outputs':['naturalness_trial.mp4','naturalness_candidate.mp4'],'replyGaps':[r['replyGap'] for r in review],'baselineUnchanged':all(unchanged.values())}))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['prepare','boards','assemble'])
    globals()[parser.parse_args().action]()
