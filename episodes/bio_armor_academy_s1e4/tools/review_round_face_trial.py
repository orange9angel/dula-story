"""Review and package the rounder face using the exact previous dialogue sound."""
from pathlib import Path
import argparse,hashlib,json,shutil,subprocess,sys,zipfile
from PIL import Image,ImageDraw,ImageFont
EP=Path(__file__).resolve().parents[1];W=EP/'tmp/round_face';PREV=EP/'tmp/natural_look'
PUBLIC=EP/'storyboard/naturalness_trial'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,obj):
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def run(*args):subprocess.run([str(x) for x in args],cwd=EP,check=True)

def boards():
    for actor in ['lei','aoi']:
        cfg=read(PREV/f'{actor}_parts.json')
        cfg.update(before=f'tmp/round_face/before/{actor}/baseline',after=f'tmp/round_face/balanced/{actor}/baseline',
            out=f'tmp/round_face/parts/{actor}',column_labels=['关系参考（并非精确投影）','上一轮已改善版本','本轮圆润候选'],
            whole_frame_note='上一轮与本轮使用同机位和表情；头身转角相同，头部落位有小幅调整。',
            whole_frame_groups={'whole':['front','turn_45','turn_minus45','turn_65','turn_minus65','turn_90','turn_minus90'],
                'shallow':['front','turn_15','turn_20','turn_25','turn_30','turn_35','turn_45']})
        rows=cfg['boards'][0]['rows']
        if actor=='lei':rows[0]['label']='原始身份参考：下颊—下巴；本轮不继续追求原画的尖脸'
        for row in rows:
            if actor=='lei' and row['frame']=='front' and '眉眼' in row['label']:
                row['model_crop'][3]+=24
        rows.insert(0,{'frame':'front','label':'眼—颊—下巴（小雪仅作比例参考）',
            'reference':'tmp/yuki_comparison/yuki_112.png','reference_crop':[40,132,218,251],
            'model_crop':[250,370,650,690]})
        cfg['boards'][0]['title']=('男主' if actor=='lei' else '女主')+'：完整下脸比例、局部细节与连接'
        path=W/f'{actor}_parts.json';save(path,cfg)
        run(sys.executable,EP/'tools/build_oblique_feature_review.py','--comparison',path)
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',26)
    board=Image.new('RGB',(1200,1290),'#f1f0ea');draw=ImageDraw.Draw(board)
    for row,actor in enumerate(['lei','aoi']):
        for col,phase in enumerate(['before','balanced']):
            im=Image.open(W/f'{phase}/{actor}/baseline/front.png').convert('RGB');im.thumbnail((600,600))
            x=col*600;y=row*645
            label=('男主' if actor=='lei' else '女主')+(' · 上一轮' if col==0 else ' · 本轮圆润候选')
            draw.text((x+22,y+8),label,font=font,fill='#253629');board.paste(im,(x,y+45))
    board.save(W/'face_comparison.jpg',quality=94)
    board=Image.new('RGB',(1280,800),'#f1f0ea');draw=ImageDraw.Draw(board)
    for row,t in enumerate([41.3,65.4]):
        for col,folder in enumerate([PREV/'scene_combined',W/'scene']):
            im=Image.open(folder/f'scene_{t}.jpg').convert('RGB');im.thumbnail((640,360))
            x=640*col;y=400*row;draw.text((x+18,y+6),'上一轮' if col==0 else '本轮',font=font,fill='#253629');board.paste(im,(x,y+40))
    board.save(W/'scene_comparison.jpg',quality=94)
    board=Image.new('RGB',(1500,1320),'#f1f0ea');draw=ImageDraw.Draw(board)
    for actor_index,actor in enumerate(['lei','aoi']):
        for pitch_index,pitch in enumerate([-15,15]):
            for col,yaw in enumerate([-90,-45,0,45,90]):
                im=Image.open(W/f'pitch/{actor}/baseline/pitch_{pitch}_{yaw}.png').convert('RGB')
                im.thumbnail((300,300));x=col*300;y=(actor_index*2+pitch_index)*330
                draw.text((x+5,y+3),f'{actor} pitch {pitch} yaw {yaw}',font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18),fill='#253629')
                board.paste(im,(x,y+30))
    board.save(W/'pitch_contact.jpg',quality=94)

def package():
    previous=read(PREV/'review.json');baseline=read(W/'baseline.json')
    # Freeze the old review entry before refreshing its familiar public filenames.
    archive=EP/'output/archive/before_round_face.zip';archive.parent.mkdir(parents=True,exist_ok=True)
    old=W/'previous_candidate.mp4'
    if not archive.exists():
        assert sha(EP/'output/naturalness_candidate.mp4')==baseline['files'][str(EP/'output/naturalness_candidate.mp4')]
        files=[EP/'output/naturalness_candidate.mp4',EP/'output/naturalness_trial.mp4',*PUBLIC.glob('*')]
        with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
            for p in files:
                if p.is_file():z.write(p,p.relative_to(EP).as_posix())
    with zipfile.ZipFile(archive) as z:old.write_bytes(z.read('output/naturalness_candidate.mp4'))
    assert sha(old)==baseline['files'][str(EP/'output/naturalness_candidate.mp4')]
    chunks=[]
    for i,row in enumerate(previous['exchanges'],1):
        cuts=row['sourceCuts'];start=cuts[0][0]
        filters=[f'[0:v]trim=start={a-start:.9f}:end={b-start:.9f},setpts=PTS-STARTPTS[v{j}]' for j,(a,b) in enumerate(cuts)]
        filters.append('[v0][v1]concat=n=2:v=1:a=0[v]')
        path=W/f'clip_{i}.mp4'
        # PCM is the exact preceding candidate's mix: no new casting, timing, music or volume.
        run('ffmpeg','-y','-v','error','-i',W/f'render_{i}.mp4','-i',PREV/f'trial_{i}.wav',
            '-filter_complex',';'.join(filters),'-map','[v]','-map','1:a',
            '-c:v','libx264','-crf','18','-c:a','aac','-ar','48000','-ac','2','-t',row['duration'],path)
        chunks.append(path)
    listing=W/'candidate.txt';listing.write_text(''.join(f"file '{p.as_posix()}'\n" for p in chunks),encoding='utf-8')
    candidate=W/'candidate.mp4'
    # Copy the preceding candidate's encoded sound, avoiding another audio generation
    # or an extra AAC encode. The picture cuts and duration are unchanged.
    run('ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',listing,'-i',old,
        '-map','0:v','-map','1:a','-c','copy','-movflags','+faststart',candidate)
    # Side-by-side synchronized picture uses the old candidate's exact AAC stream.
    comparison=W/'comparison.mp4'
    graph="[0:v]drawbox=x=0:y=0:w=190:h=75:color=black:t=fill,drawtext=text='BEFORE':x=24:y=24:fontsize=26:fontcolor=white,scale=640:360[a];[1:v]drawbox=x=0:y=0:w=190:h=75:color=black:t=fill,drawtext=text='AFTER':x=24:y=24:fontsize=26:fontcolor=white,scale=640:360[b];[a][b]hstack=inputs=2[v]"
    run('ffmpeg','-y','-v','error','-i',old,'-i',candidate,'-filter_complex',graph,
        '-map','[v]','-map','0:a','-c:v','libx264','-crf','18','-c:a','copy','-movflags','+faststart',comparison)
    checks={}
    expected=read(W/'balanced.json')
    def current_inputs(report):
        rows=report.get('moduleOverrides',[])
        return {r['suffix'] for r in rows}==set(expected) and all(
            r['sha256']==sha(EP/expected[r['suffix']]) for r in rows)
    def audio_hash(path):
        return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-map','0:a',
            '-c','copy','-f','hash','-hash','sha256','-'],text=True).strip()
    checks['identical_encoded_audio']=audio_hash(old)==audio_hash(candidate)==audio_hash(comparison)
    for p,digest in baseline['files'].items():
        if p==str(EP/'output/naturalness_candidate.mp4'):continue
        checks[p]=sha(Path(p))==digest
    scene=read(W/'scene/report.json')
    checks['scene_current_inputs']=current_inputs(scene)
    checks['scene_no_errors']=not scene['errors']
    checks['scene_reverse_equal']=all(s['seekEqual'] and s['stateEqual'] for s in scene['scene']['frames'].values())
    for i in [1,2]:
        report=read(W/f'render_{i}/render_build.json')
        rows=report['build']['overrides'];expected_scene=read(W/'scene_trial.json')
        checks[f'render_{i}_current_inputs']={r['suffix'] for r in rows}==set(expected_scene) and all(
            r['sha256']==sha(EP/expected_scene[r['suffix']]) for r in rows)
    for actor in ['lei','aoi']:
        for phase in ['balanced','pitch']:
            report=read(W/f'{phase}/{actor}/baseline/report.json')
            checks[f'{actor}_{phase}_current_inputs']=current_inputs(report)
            checks[f'{actor}_{phase}']=not report['errors'] and all(f['finite'] and f.get('reverseSeekEqual',True) for f in report['frames'].values())
        turn=read(W/f'turn_{actor}/turn_video_build.json')
        checks[actor+'_turn_current_inputs']=current_inputs(turn)
        checks[actor+'_turn']=not turn['errors'] and not turn['changedInputs']
    assert all(checks.values()),checks
    for p in [candidate,comparison]:run('ffmpeg','-v','error','-i',p,'-f','null','-')
    # Publish only to the isolated review entry, never output/current.mp4 or live modules.
    shutil.copy2(candidate,EP/'output/naturalness_candidate.mp4')
    shutil.copy2(comparison,EP/'output/naturalness_trial.mp4')
    shutil.copy2(W/'face_comparison.jpg',PUBLIC/'face_comparison.jpg')
    overrides=read(W/'scene_trial.json')
    result={'status':'round-face candidate; user review pending','priorReviewArchive':archive.relative_to(EP).as_posix(),
        'previousVideoSha256':sha(old),'candidateSha256':sha(candidate),'comparisonSha256':sha(comparison),
        'inputOverrides':{suffix:{'file':f,'sha256':sha(EP/f)} for suffix,f in overrides.items()},
        'audioPcmSha256':{f'trial_{i}.wav':sha(PREV/f'trial_{i}.wav') for i in [1,2]},
        'checks':checks,'exchanges':previous['exchanges'],
        'limits':'Rendered sparse-frame visual review plus deterministic state checks; not user acceptance or a complete anatomy guarantee.'}
    save(W/'review.json',result);save(PUBLIC/'verification.json',result)
    freeze=EP/'output/archive/round_face_sources.zip'
    with zipfile.ZipFile(freeze,'w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted(set([*W.glob('*.js'),*W.glob('*.json'),*(EP/f for f in overrides.values()),
                EP/'tools/prepare_round_face_trial.mjs',EP/'tools/review_round_face_trial.py'])):
            z.write(p,p.relative_to(EP).as_posix())
    print(json.dumps({'duration':sum(r['duration'] for r in previous['exchanges']),'checks':len(checks),'currentUnchanged':checks[str(EP/'output/current.mp4')]},ensure_ascii=False))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['boards','package'])
    globals()[parser.parse_args().action]()
