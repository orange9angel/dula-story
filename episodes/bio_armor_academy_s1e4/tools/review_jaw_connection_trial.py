"""Local jaw/cheek review using the established independent-reference boards."""
from pathlib import Path
import argparse,hashlib,json,shutil,subprocess,sys,zipfile
from PIL import Image,ImageDraw,ImageFont
import numpy as np
EP=Path(__file__).resolve().parents[1];W=EP/'tmp/jaw_connection';BEFORE=EP/'tmp/head_proportion'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def run(*args):subprocess.run([str(a) for a in args],cwd=EP,check=True)
def board():
    checks={}
    for actor in ['lei','aoi']:
        cfg=read(EP/f'tmp/natural_look/{actor}_parts.json')
        cfg.update(before=f'tmp/head_proportion/balanced/{actor}/baseline',after=f'tmp/jaw_connection/shape/{actor}/baseline',
            out=f'tmp/jaw_connection/parts/{actor}',column_labels=['原画（姿态未标定）','上一轮：仅男主眼部获认可' if actor=='lei' else '上一轮：女主脸型被否决','下颌/面颊局部试样'],
            whole_frame_groups={'whole':['front','turn_45','turn_minus45','turn_65','turn_minus65','turn_90','turn_minus90']},
            whole_frame_note='同机位与表情；保留上一轮眼部。下颌、脸颊仍在试验，未作整体美术验收。')
        rows=cfg['boards'][0]['rows']
        cfg['boards'][0]['title']=('男主' if actor=='lei' else '女主')+'局部结构对照'
        rows[0]['label']='眼下—面颊—下巴：曲线与留白' if actor=='aoi' else '正面下颊—下巴：与眼部一起检查'
        if actor=='lei':
            rows[1]['model_crop']=[290,420,625,512]
            rows.insert(0,{'frame':'turn_45','label':'斜面远眼—颊弧—下巴（参考只有近似姿态）',
                'reference_crop':[200,600,350,748],'model_crop':[450,442,640,660]})
        rows.append({'frame':'turn_minus90' if actor=='aoi' else 'turn_90',
            'label':'完整眼—鼻口—颌缘—耳根—颈部',
            'reference_crop':[65,165,245,350] if actor=='aoi' else [570,585,778,785],
            'model_crop':[330,375,565,655] if actor=='aoi' else [420,410,665,720]})
        save(W/f'{actor}_parts.json',cfg)
        subprocess.run([sys.executable,str(EP/'tools/build_oblique_feature_review.py'),'--comparison',str(W/f'{actor}_parts.json')],check=True,cwd=EP)
        for frame in ['front','turn_45','turn_minus45','turn_65','turn_minus65','turn_90','turn_minus90']:
            a=np.array(Image.open(BEFORE/f'balanced/{actor}/baseline/{frame}.png').convert('RGB'))
            b=np.array(Image.open(W/f'shape/{actor}/baseline/{frame}.png').convert('RGB'))
            # Full top band includes both eyes and hair; no alignment or resampling.
            region=[0,0,900,505]
            delta=np.abs(a[:505].astype(int)-b[:505].astype(int))
            checks[f'{actor}/{frame}']={'crop':region,'differentPixels':int(np.any(delta,axis=2).sum()),'maxChannelDelta':int(delta.max())}
    save(W/'upper_face_regression.json',checks)
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',22)
    im=Image.new('RGB',(1100,870),'#f1f0ea');draw=ImageDraw.Draw(im)
    for row,(actor,frame,box) in enumerate([('lei','turn_45',(295,385,655,665)),('aoi','turn_minus90',(315,340,590,655))]):
        for col,base in enumerate([BEFORE/f'balanced/{actor}/baseline',W/f'shape/{actor}/baseline']):
            tile=Image.open(base/(frame+'.png')).convert('RGB').crop(box);tile.thumbnail((510,370))
            im.paste(tile,(col*550+(550-tile.width)//2,row*435+55))
            draw.text((col*550+24,row*435+12),('男主' if actor=='lei' else '女主')+(' · 上一轮' if col==0 else ' · 局部试样'),font=font,fill='#26352c')
    im.save(W/'face_comparison.jpg',quality=94)
    print(json.dumps(checks,ensure_ascii=False))
def package():
    baseline=read(W/'baseline.json');expected=read(W/'candidate.json');checks={}
    def same_inputs(r):
        rows=r['moduleOverrides']
        return {x['suffix'] for x in rows}==set(expected) and all(x['sha256']==sha(EP/expected[x['suffix']]) for x in rows)
    for actor in ['lei','aoi']:
        for phase in ['shape','pitch']:
            r=read(W/f'{phase}/{actor}/baseline/report.json')
            checks[f'{actor}_{phase}']=same_inputs(r) and not r['errors'] and all(f['finite'] and f.get('reverseSeekEqual',True) for f in r['frames'].values())
        r=read(W/f'turn_{actor}/turn_video_build.json')
        checks[f'{actor}_turn']=same_inputs(r) and not r['errors'] and not r['changedInputs']
    r=read(W/'scene/report.json')
    checks['scene']=same_inputs(r) and not r['errors'] and all(f['seekEqual'] for states in r['actors'].values() for f in states.values()) and all(f['seekEqual'] and f['stateEqual'] for f in r['scene']['frames'].values())
    checks['male_upper_face_preserved']=all(v['differentPixels']==0 for k,v in read(W/'upper_face_regression.json').items() if k.startswith('lei/'))
    checks['main_unchanged']=sha(EP/'output/current.mp4')==baseline['mainSha256']
    for i in [1,2]:
        rows=read(W/f'render_{i}/render_build.json')['build']['overrides'];full=read(W/'scene_trial.json')
        checks[f'render_{i}_inputs']={r['suffix'] for r in rows}==set(full) and all(r['sha256']==sha(EP/full[r['suffix']]) for r in rows)
    assert all(checks.values()),checks
    public=EP/'storyboard/naturalness_trial';archive=EP/'output/archive/before_jaw_connection.zip'
    if not archive.exists():
        assert sha(EP/'output/naturalness_candidate.mp4')==baseline['previousCandidateSha256']
        with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
            for p in [EP/'output/naturalness_candidate.mp4',EP/'output/naturalness_trial.mp4',*public.glob('*')]:
                if p.is_file():z.write(p,p.relative_to(EP).as_posix())
    old=W/'previous_candidate.mp4'
    with zipfile.ZipFile(archive) as z:old.write_bytes(z.read('output/naturalness_candidate.mp4'))
    assert sha(old)==baseline['previousCandidateSha256']
    exchanges=read(EP/'tmp/natural_look/review.json')['exchanges'];chunks=[]
    for i,row in enumerate(exchanges,1):
        start=row['sourceCuts'][0][0]
        graph=';'.join([f'[0:v]trim=start={a-start:.9f}:end={b-start:.9f},setpts=PTS-STARTPTS[v{j}]' for j,(a,b) in enumerate(row['sourceCuts'])]+['[v0][v1]concat=n=2:v=1:a=0[v]'])
        p=W/f'clip_{i}.mp4';chunks.append(p)
        run('ffmpeg','-y','-v','error','-i',W/f'render_{i}.mp4','-filter_complex',graph,'-map','[v]','-an','-c:v','libx264','-crf','18','-t',row['duration'],p)
    listing=W/'candidate.txt';listing.write_text(''.join(f"file '{p.as_posix()}'\n" for p in chunks),encoding='utf-8')
    candidate=W/'candidate.mp4';comparison=W/'comparison.mp4'
    run('ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',listing,'-i',old,'-map','0:v','-map','1:a','-c','copy','-movflags','+faststart',candidate)
    graph="[0:v]drawbox=x=0:y=0:w=190:h=75:color=black:t=fill,drawtext=text='BEFORE':x=24:y=24:fontsize=26:fontcolor=white,scale=640:360[a];[1:v]drawbox=x=0:y=0:w=190:h=75:color=black:t=fill,drawtext=text='AFTER':x=24:y=24:fontsize=26:fontcolor=white,scale=640:360[b];[a][b]hstack=inputs=2[v]"
    run('ffmpeg','-y','-v','error','-i',old,'-i',candidate,'-filter_complex',graph,'-map','[v]','-map','0:a','-c:v','libx264','-crf','18','-c:a','copy','-movflags','+faststart',comparison)
    def audio_hash(p):return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:a','-c','copy','-f','hash','-hash','sha256','-'],text=True).strip()
    checks['encoded_audio_unchanged']=audio_hash(old)==audio_hash(candidate)==audio_hash(comparison)
    assert checks['encoded_audio_unchanged']
    for p in [candidate,comparison]:run('ffmpeg','-v','error','-i',p,'-f','null','-')
    run('ffmpeg','-y','-v','error','-i',comparison,'-vf',"select='eq(n,36)+eq(n,90)+eq(n,210)+eq(n,320)',tile=1x4",'-frames:v','1','-q:v','2',W/'delivered_comparison.jpg')
    result={'status':'Local jaw/cheek candidate. Male eye improvement preserved; both whole faces remain unaccepted.',
        'acceptedScope':baseline['acceptedScope'],'checks':checks,'candidateSha256':sha(candidate),'comparisonSha256':sha(comparison),
        'priorReviewArchive':archive.relative_to(EP).as_posix(),'mainSha256':baseline['mainSha256'],
        'inputOverrides':{s:{'file':f,'sha256':sha(EP/f)} for s,f in read(W/'scene_trial.json').items()},
        'exchanges':exchanges,'limits':'Sparse visual review and unchanged upper-face pixels do not establish natural appearance. Prior head-proportion one-pixel reverse-seek discrepancy remains unresolved.'}
    save(W/'review.json',result);print(json.dumps(checks))

def publish():
    r=read(W/'review.json')
    assert sha(W/'candidate.mp4')==r['candidateSha256'] and sha(W/'comparison.mp4')==r['comparisonSha256']
    assert sha(EP/'output/current.mp4')==r['mainSha256']
    for v in r['inputOverrides'].values():assert sha(EP/v['file'])==v['sha256']
    for src,dst in [('candidate.mp4','output/naturalness_candidate.mp4'),('comparison.mp4','output/naturalness_trial.mp4'),('face_comparison.jpg','storyboard/naturalness_trial/face_comparison.jpg'),('review.json','storyboard/naturalness_trial/verification.json')]:
        shutil.copy2(W/src,EP/dst)
    with zipfile.ZipFile(EP/'output/archive/jaw_connection_sources.zip','w',zipfile.ZIP_DEFLATED) as z:
        files=[*W.glob('*.js'),*W.glob('*.json'),*W.glob('user_*.png'),EP/'tools/prepare_jaw_connection_trial.mjs',Path(__file__),*(EP/v['file'] for v in r['inputOverrides'].values())]
        for p in sorted(set(files)):z.write(p,p.relative_to(EP).as_posix())
    print('Updated isolated review entry; live assets and main episode unchanged.')

def reference():
    public=EP/'storyboard/naturalness_trial'
    male='storyboard/hybrid_character/archive/history/face_design_turnaround_v1/lei_nine_views.png'
    female='storyboard/hybrid_character/references/aoi_original_views.png'
    rows=[
        ('男主：斜面脸型与头颈',male,[18,422,405,805],'tmp/jaw_connection/shape/lei/baseline/turn_45.png',[265,180,665,770]),
        ('女主：侧面体积与头颈',female,[40,5,432,395],'tmp/jaw_connection/shape/aoi/baseline/turn_minus90.png',[310,120,745,700]),
        ('男主：耳垂—下颌—颈根',male,[555,570,770,792],'tmp/jaw_connection/shape/lei/baseline/turn_90.png',[435,450,650,710]),
        ('女主：耳垂—下颌—颈根',female,[75,160,275,345],'tmp/jaw_connection/shape/aoi/baseline/turn_minus90.png',[335,390,580,650]),
    ]
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',25)
    small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',19)
    image=Image.new('RGB',(1200,1900),'#f1f0ea');draw=ImageDraw.Draw(image)
    draw.text((24,10),'文生图与当前模型：姿态近似，独立等比显示',font=font,fill='#28362e')
    for i,(title,ref,refbox,current,box) in enumerate(rows):
        y=50+i*450
        for col,(file,crop,label) in enumerate([(ref,refbox,'文生图'),(current,box,'当前模型')]):
            tile=Image.open(EP/file).convert('RGB').crop(crop)
            scale=min(550/tile.width,370/tile.height)
            tile=tile.resize((round(tile.width*scale),round(tile.height*scale)),Image.Resampling.LANCZOS)
            image.paste(tile,(col*600+(600-tile.width)//2,y+55))
            draw.text((col*600+20,y+10),label+' · '+title,font=small,fill='#28362e')
    draw.text((24,1860),'只作结构诊断；没有改变任何原画、角色资产或视频。原画角度未标定。',font=small,fill='#28362e')
    image.save(public/'reference_comparison.jpg',quality=95)
    save(W/'diagnosis/reference_crops.json',{'rows':rows,'sources':{p:sha(EP/p) for row in rows for p in [row[1],row[3]]},'output':'storyboard/naturalness_trial/reference_comparison.jpg'})
    layers=['full','no_hair','no_neck','ears_only'];image=Image.new('RGB',(1440,780),'#f1f0ea');draw=ImageDraw.Draw(image)
    for i,(actor,box) in enumerate([('lei',[420,445,535,600]),('aoi',[455,385,565,535])]):
        for col,layer in enumerate(layers):
            tile=Image.open(W/f'diagnosis/{actor}_{layer}.png').convert('RGB').crop(box);tile=tile.resize((tile.width*2,tile.height*2))
            image.paste(tile,(col*360+(360-tile.width)//2,i*390+45))
            draw.text((col*360+12,i*390+10),actor+' · '+['完整','隐藏头发','隐藏颈部','只有耳朵'][col],font=small,fill='#28362e')
    image.save(W/'diagnosis/ear_layers.jpg',quality=95)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['board','package','publish','reference'],default='board',nargs='?')
    globals()[parser.parse_args().action]()
