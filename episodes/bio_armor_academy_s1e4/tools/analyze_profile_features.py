"""Auditable, image-space measurements for the Aoi profile study.

Original artwork is never changed. Crops/plots are analysis artifacts, not
replacement artwork. Annotations are explicit and remain reviewable.
"""
from pathlib import Path
import argparse
import hashlib
import json
import numpy as np
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.ndimage import median_filter, gaussian_filter1d

EP = Path(__file__).resolve().parents[1]
ROOT = EP / 'storyboard/hybrid_character'
OUT = ROOT / 'profile_feature_study_v1'
plt.rcParams.update({'font.family': 'Microsoft YaHei', 'axes.unicode_minus': False})

SOURCES = {
    'reference_right': ('face_design_turnaround_v1/aoi_nine_views.png', (440, 400, 870, 795), False),
    'reference_left': ('face_design_turnaround_v1/aoi_nine_views.png', (0, 0, 435, 400), True),
    'model_right': ('profile_polish_v4/final/turn_90.png', (200, 250, 650, 650), False),
    'model_left': ('profile_polish_v4/final/turn_minus90.png', (200, 250, 650, 650), True),
    'reference_oblique': ('face_design_turnaround_v1/aoi_nine_views.png', (0, 400, 435, 795), False),
    'model_oblique': ('profile_polish_v4/final/turn_45.png', (200, 250, 650, 650), False),
}

def load_view(key):
    name, crop, flip = SOURCES[key]
    im = Image.open(ROOT/name).convert('RGB').crop(crop)
    return im.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if flip else im

def inspect():
    fig, axes = plt.subplots(2, 3, figsize=(16, 11), constrained_layout=True)
    for ax, key in zip(axes.flat, SOURCES):
        im = load_view(key)
        ax.imshow(im)
        ax.set_title(key)
        ax.set_xticks(np.arange(0, im.width, 25))
        ax.set_yticks(np.arange(0, im.height, 25))
        ax.grid(alpha=.35)
    fig.savefig(OUT/'annotation_grid.png', dpi=130)
    plt.close(fig)

def extract(im, spec, rg=12):
    """Trace only a reviewed visible anterior-face ROI, not hidden forehead.

    Warm-skin threshold excludes neutral background and blue hair. It measures
    the skin-side boundary; no claim of subpixel accuracy at the ink line.
    """
    arr = np.asarray(im).astype(float)
    x0, y0, x1, y1 = spec['trace_roi']
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    mask = (r > 155) & (r-g > rg) & (g-b > 7)
    points = []
    for y in range(y0, y1):
        xs = np.flatnonzero(mask[y, x0:x1])
        if len(xs):
            points.append([x0+int(xs[-1]), y])
    points = np.asarray(points, dtype=float)
    if len(points) < .95*(y1-y0):
        raise ValueError('Face contour ROI has gaps; review annotation')
    points[:, 0] = median_filter(points[:, 0], size=3)
    def extreme(bounds, maximum):
        q = points[(points[:, 1] >= bounds[0]) & (points[:, 1] <= bounds[1])]
        return q[np.argmax(q[:, 0]) if maximum else np.argmin(q[:, 0])].copy()
    nose = extreme(spec['nose_rows'], True)
    root = extreme(spec['root_rows'], False)
    lip = extreme(spec['lip_rows'], True)
    landmarks = {k: np.asarray(v, float) for k, v in spec['landmarks'].items()}
    landmarks.update(nose=nose, visible_upper=root, lip=lip)
    height = landmarks['chin'][1]-nose[1]
    norm = lambda p: (np.asarray(p)-nose)/height
    p = {k: norm(v) for k, v in landmarks.items()}
    metrics = {
        'lip_recession_H': float(-p['lip'][0]),
        'chin_recession_H': float(-p['chin'][0]),
        'mouth_height_H': float(p['mouth'][1]),
        'eye_height_H': float((landmarks['eye_bottom'][1]-landmarks['eye_top'][1])/height),
        'eye_to_ear_horizontal_H': float((landmarks['eye'][0]-landmarks['ear'][0])/height),
        'eye_to_tip_horizontal_H': float(-p['eye'][0]),
    }
    down = landmarks['chin']-nose
    length = np.linalg.norm(down)
    down /= length
    forward = np.array([down[1], -down[0]])
    transform = np.stack([forward,down],axis=1)/length
    chord = (points-nose)@transform
    lip_chord = (lip-nose)@transform
    sample=chord[(chord[:,1]>.12)&(chord[:,1]<.56)]
    metrics['nose_to_lip_inward_chord_D'] = float(max(0,-sample[:,0].min()))
    metrics['lip_forward_of_chord_D'] = float(lip_chord[0])
    return {'points':points, 'landmarks':landmarks, 'norm':norm(points), 'normalized_landmarks':p,
            'chord_normalized':chord,'chord_transform':transform,
            'height_px':float(height), 'metrics':metrics}

def study():
    annotations = json.loads((EP/'config/profile_feature_annotations.json').read_text(encoding='utf8'))
    data = {}
    fig, axes = plt.subplots(2, 2, figsize=(13, 11), constrained_layout=True)
    for ax, key in zip(axes.flat, list(SOURCES)[:4]):
        spec = annotations['views'][key]
        im = load_view(key)
        d = extract(im, spec)
        data[key] = d
        ax.imshow(im)
        ax.plot(*d['points'].T, color='#df4c48', lw=2, label='提取的可见皮肤边界')
        for name, p in d['landmarks'].items():
            if name in ['eye_top','eye_bottom','eye_back','eye_front']: continue
            ax.plot(*p, 'o', ms=4, color='#009b9c')
            ax.annotate(name, p, xytext=(4, -6), textcoords='offset points', fontsize=9, color='#005b67')
        ax.set_title(spec['label'])
        ax.set_xlim(100 if 'reference' in key else 30, im.width)
        ax.set_ylim(365, 100)
        ax.grid(alpha=.15)
    fig.suptitle('侧脸边界提取与人工特征点｜边界误差约2–3像素；遮挡部分不补画', fontsize=16)
    fig.savefig(OUT/'01_extraction.png', dpi=160)
    plt.close(fig)

    fig, axes = plt.subplots(1, 3, figsize=(15, 7), constrained_layout=True)
    colors = {'reference_right':'#008f94','reference_left':'#62b8a8','model_right':'#de4c46','model_left':'#e69355'}
    for key, d in data.items():
        for ax in axes[:2]:
            if ax == axes[0] and key.endswith('left'): continue
            ax.plot(*d['norm'].T, color=colors[key], lw=2, linestyle='--' if key.endswith('left') else '-', label=annotations['views'][key]['label'])
        if key.endswith('right'):
            for name in ['nose','visible_upper','lip','chin','eye','mouth']:
                p = d['normalized_landmarks'][name]
                axes[0].plot(*p, 'o', color=colors[key], ms=5)
                axes[0].annotate(name, p, xytext=(5, 0), textcoords='offset points', fontsize=8, color=colors[key])
    for ax in axes[:2]:
        ax.set_aspect('equal')
        ax.set_xlim(-.75, .2)
        ax.set_ylim(1.12, -.85)
        ax.axhline(0, color='grey', lw=.6); ax.axhline(1, color='grey', lw=.6)
        ax.axvline(0, color='grey', lw=.6)
        ax.set_xlabel('前后位置 / H（向右为前）')
        ax.set_ylabel('高度 / H（向下）')
        ax.grid(alpha=.2)
        ax.legend(fontsize=8, loc='upper left')
    axes[0].set_title('同尺度曲线叠加＋五官位置')
    axes[1].set_title('两侧同时检查：避免只拟合一张图')
    r, m = data['reference_right'], data['model_right']
    ymin=max(r['norm'][0,1],m['norm'][0,1]); ymax=min(r['norm'][-1,1],m['norm'][-1,1])
    yy=np.linspace(ymin,ymax,160)
    dx=np.interp(yy,m['norm'][:,1],m['norm'][:,0])-np.interp(yy,r['norm'][:,1],r['norm'][:,0])
    axes[2].fill_betweenx(yy,0,dx,where=dx<0,color='#de4c46',alpha=.25,label='模型相对内收')
    axes[2].fill_betweenx(yy,0,dx,where=dx>=0,color='#008f94',alpha=.25,label='模型相对前伸')
    axes[2].plot(dx,yy,color='#555555');axes[2].axvline(0,color='grey',lw=.7)
    axes[2].set_ylim(1.12,-.85);axes[2].grid(alpha=.2)
    axes[2].set_xlabel('模型边界 − 原画边界 / H');axes[2].set_title('匹配高度的轮廓差（右向）');axes[2].legend(fontsize=9)
    fig.suptitle('统一鼻尖与鼻尖至下巴高度 H｜只做等比缩放和平移，不拉宽、不逐段变形',fontsize=14)
    fig.savefig(OUT/'02_contour_overlay.png',dpi=170)
    plt.close(fig)

    metric_labels = {
        'lip_recession_H':'唇缘相对鼻尖的后收 / H','chin_recession_H':'下巴相对鼻尖的后收 / H',
        'mouth_height_H':'嘴线高度（鼻尖=0，下巴=1）','eye_height_H':'可见眼高',
        'eye_to_ear_horizontal_H':'眼心到耳心横向间距 / H','eye_to_tip_horizontal_H':'眼心相对鼻尖的后收 / H',
        'nose_to_lip_inward_chord_D':'消除倾斜：鼻下轮廓凹入连线 / D',
        'lip_forward_of_chord_D':'消除倾斜：唇缘在线前（+）或后（−）/ D'}
    table=[]
    for k,label in metric_labels.items():
        table.append([label]+[f"{data[v]['metrics'][k]:.2f}" for v in list(data)])
    fig,ax=plt.subplots(figsize=(13,5.4),layout='constrained');ax.axis('off')
    tab=ax.table(cellText=table,colLabels=['特征（单位 H）','原画右向','原画左向','模型右向','模型左向'],cellLoc='center',colWidths=[.43,.14,.14,.14,.14],loc='center')
    tab.auto_set_font_size(False);tab.set_fontsize(11);tab.scale(1,2)
    ax.set_title('多个特征一起看｜最后两行以鼻尖—下巴连线为轴，消除平面倾斜\nH=鼻尖至下巴垂直高度；D=两点距离。原画鼻根被挡，不推断完整鼻根。',fontsize=13,pad=15)
    fig.savefig(OUT/'03_feature_metrics.png',dpi=160);plt.close(fig)

    fig,axes=plt.subplots(1,2,figsize=(10,7),layout='constrained')
    for key,d in data.items():
        axes[0].plot(*d['chord_normalized'].T,color=colors[key],lw=2,linestyle='--' if key.endswith('left') else '-',label=annotations['views'][key]['label'])
    axes[0].set_aspect('equal');axes[0].set_ylim(1.06,-.8);axes[0].set_xlim(-.35,.45)
    axes[0].axvline(0,color='grey',lw=.8);axes[0].grid(alpha=.2);axes[0].legend(fontsize=8)
    axes[0].set_xlabel('离鼻尖—下巴连线的距离 / D（右为前）');axes[0].set_ylabel('沿连线位置 / D')
    axes[0].set_title('增加刚性旋转，排除头部倾斜影响')
    for key,d in data.items():
        q=d['chord_normalized'];axes[1].plot(*q.T,color=colors[key],lw=2,linestyle='--' if key.endswith('left') else '-')
    axes[1].axvline(0,color='grey',lw=.8);axes[1].set_ylim(.7,0);axes[1].set_xlim(-.12,.12);axes[1].grid(alpha=.2)
    axes[1].set_title('鼻下—唇部放大：模型凹到连线后侧')
    axes[1].set_xlabel('← 内陷 | 鼻尖—下巴连线 | 向前 →')
    fig.suptitle('第二种独立对齐：仅平移＋旋转＋等比缩放；不改变任何曲线形状',fontsize=12)
    fig.savefig(OUT/'04_pose_neutral_contours.png',dpi=170);plt.close(fig)

    serial = {'annotations':annotations,'sources':{},'profiles':{},'limitations':[
        'Reference views are drawings with unknown yaw/pitch/perspective, not calibrated orthographic scans.',
        'Visible upper endpoint is not an anatomical nose-root measurement. Reference nose root is hair-occluded.',
        'Both translations and uniform scale are removed; no separate x/y scaling or deformable alignment.',
        'Threshold boundary traces the skin edge inside ink, approximately 2–3 pixel uncertainty.',
        'Illustrated cheek surfaces cannot be recovered from silhouettes; test actual model geometry separately.',
        'Oblique view differences require pose alignment before quantitative shape conclusions.'
    ]}
    for key,(name,crop,flip) in SOURCES.items():
        serial['sources'][key]={'file':name,'sha256':hashlib.sha256((ROOT/name).read_bytes()).hexdigest(),'crop':crop,'mirrored':flip}
    for key,d in data.items():
        serial['profiles'][key]={k:({n:v.tolist() for n,v in val.items()} if k in ['landmarks','normalized_landmarks'] else val.tolist() if isinstance(val,np.ndarray) else val) for k,val in d.items()}
        perturb=[extract(load_view(key),annotations['views'][key],rg=q)['metrics'] for q in [9,12,15]]
        serial['profiles'][key]['threshold_sensitivity']={k:[min(p[k] for p in perturb),max(p[k] for p in perturb)] for k in metric_labels}
    (OUT/'measurements.json').write_text(json.dumps(serial,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({k:d['metrics'] for k,d in data.items()},ensure_ascii=False,indent=2))

def build_candidate():
    """Fit only the measured lower silhouette; preserve nose/chin endpoints.

    This is a browser-only experiment, never writes the shared character file.
    Local profile points are mapped through the actual renderer's projection.
    """
    import re
    baseline=OUT/'baseline/report.json'
    if not baseline.exists(): return
    data=json.loads((OUT/'measurements.json').read_text(encoding='utf8'))['profiles']
    m=data['model_right'];nose=np.array(m['landmarks']['nose'])+np.array(SOURCES['model_right'][1][:2])
    chin=np.array(m['landmarks']['chin'])+np.array(SOURCES['model_right'][1][:2])
    down=chin-nose;length=np.linalg.norm(down);down/=length
    forward=np.array([down[1],-down[0]])
    tt=np.linspace(0,1,201)
    curves=[]
    for key in ['reference_right','reference_left']:
        q=np.array(data[key]['chord_normalized']);order=np.argsort(q[:,1]);q=q[order]
        xx=np.interp(tt,q[:,1],q[:,0]);xx=gaussian_filter1d(xx,2)
        # Endpoints are exact anchors; no bump should shift the nose/chin.
        xx-=xx[0]*(1-tt)+xx[-1]*tt
        curves.append(xx)
    xx=np.mean(curves,axis=0)
    target=nose+length*(tt[:,None]*down+xx[:,None]*forward)
    base=json.loads(baseline.read_text(encoding='utf8'))
    local=np.array([p['local'] for p in base['median90']]);pixel=np.array([p['pixel'] for p in base['median90']])
    design=np.column_stack([local[:,1],local[:,2],np.ones(len(local))])
    coefficients=np.linalg.lstsq(design,pixel,rcond=None)[0]
    source=Path(base['sourcePath']).read_text(encoding='utf8')
    literal=re.search(r'^    profileContour:(\[.*\]),$',source,re.M)[1]
    points=json.loads(re.sub(r'(?<![\d.])(-?)\.(\d)',r'\g<1>0.\2',literal))
    adjusted=[];changes=[]
    for y,z in points:
        px=np.array([y,z,1.])@coefficients
        new=z
        if 1.391<y<1.441 and target[0,1]<px[1]<target[-1,1]:
            desired=np.interp(px[1],target[:,1],target[:,0])
            dz=(desired-px[0])/coefficients[1,0]
            # Smallest direct correction to fill the measured hollow. Keep
            # unsupported forehead/eyes untouched, limit any one edit to 9 mm.
            new=z+.85*np.clip(dz,-.009,.009)
        adjusted.append([y,round(float(new),6)])
        if abs(new-z)>1e-6:changes.append({'y':y,'old_z':z,'new_z':new,'delta_mm':1000*(new-z)})
    candidate={'profileContour':adjusted,'method':'Two-reference mean lower contour, similarity-normalized; 85% bounded correction; no eye change',
               'changes':changes,'baseline_source_sha256':base['originalSha256']}
    (OUT/'fit_candidate.json').write_text(json.dumps(candidate,ensure_ascii=False,indent=2),encoding='utf8')
    print('Browser-only fit candidate:',json.dumps(changes))

def experiment_review():
    annotations=json.loads((EP/'config/profile_feature_annotations.json').read_text(encoding='utf8'))
    names=['baseline','eye_relief','contour_fit']
    if not all((OUT/n/'turn_90.png').exists() for n in names):return
    fit_report=json.loads((OUT/'contour_fit/report.json').read_text(encoding='utf8'))
    fit_config=json.loads((OUT/'fit_candidate.json').read_text(encoding='utf8'))
    if fit_report['overrides']['profileContour']!=fit_config['profileContour']:
        raise RuntimeError('Candidate configuration changed: re-render contour_fit before reviewing.')
    states=['front','turn_45','turn_65','turn_90']
    labels=['V4基线','仅减小眼面后压（诊断）','轮廓拟合样例（待复看）']
    fig,axes=plt.subplots(3,4,figsize=(15,12),layout='constrained')
    for row,(name,label) in enumerate(zip(names,labels)):
        for col,state in enumerate(states):
            im=Image.open(OUT/name/(state+'.png')).crop((200,270,650,640))
            axes[row,col].imshow(im);axes[row,col].axis('off')
            axes[row,col].set_title(label+' · '+['正面','45°','65°','90°'][col],fontsize=11)
    fig.suptitle('控制变量：眼面后压 vs 鼻下—唇部轮廓｜全部为实际渲染，原资产未覆盖',fontsize=15)
    fig.savefig(OUT/'05_controlled_experiments.jpg',dpi=150);plt.close(fig)
    result={}
    base=np.asarray(Image.open(OUT/'baseline/front.png')).astype(float)
    data={}
    for name in names:
        d=extract(Image.open(OUT/name/'turn_90.png').convert('RGB').crop(SOURCES['model_right'][1]),annotations['views']['model_right'])
        data[name]=d
        current=np.asarray(Image.open(OUT/name/'front.png')).astype(float)
        contour_metrics={k:v for k,v in d['metrics'].items() if not k.startswith('eye_')}
        result[name]={'profile_metrics':contour_metrics,'front_full_image_mean_abs_rgb':float(abs(current-base).mean()),'front_pixel_identical':bool(np.array_equal(current,base))}
        left=Image.open(OUT/name/'turn_minus90.png').convert('RGB').crop(SOURCES['model_left'][1]).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        dl=extract(left,annotations['views']['model_left'])
        result[name]['other_side_profile_metrics']={k:v for k,v in dl['metrics'].items() if not k.startswith('eye_')}
    for name in names[1:]:
        result[name]['profile_max_boundary_change_px']=float(np.max(abs(data[name]['points'][:,0]-data['baseline']['points'][:,0])))
        a=json.loads((OUT/'baseline/report.json').read_text())['frames']['turn_90']['projectedFeatures']
        b=json.loads((OUT/name/'report.json').read_text())['frames']['turn_90']['projectedFeatures']
        result[name]['projected_eye_shift_px']=(np.array(b['eye'])-a['eye']).tolist()
    # Similarity-normalized uncertainty from contour extraction + manual
    # endpoint annotation; it cannot include unknown camera yaw.
    rng=np.random.default_rng(20261015)
    uncertainty={}
    samples={k:extract(load_view(k),annotations['views'][k]) for k in ['reference_right','reference_left','model_right']}
    samples['contour_fit']=data['contour_fit']
    for key,d in samples.items():
        values=[]
        for _ in range(400):
            nose=d['landmarks']['nose']+rng.uniform(-3,3,2)
            chin=d['landmarks']['chin']+rng.uniform(-3,3,2)
            down=chin-nose;length=np.linalg.norm(down);down/=length
            transform=np.stack([[down[1],-down[0]],down],axis=1)/length
            points=d['points'].copy();points[:,0]+=rng.uniform(-2,2,len(points))
            q=(points-nose)@transform
            q=q[(q[:,1]>.12)&(q[:,1]<.56)]
            values.append(max(0,-q[:,0].min()))
        uncertainty[key]=np.percentile(values,[2.5,50,97.5]).tolist()
    result['uncertainty_inward_chord_D']=uncertainty
    (OUT/'experiment_metrics.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    fig,ax=plt.subplots(figsize=(6,8),layout='constrained')
    raw=json.loads((OUT/'measurements.json').read_text(encoding='utf8'))
    for key,color in [('reference_right','#008f94'),('reference_left','#62b8a8')]:
        q=np.array(raw['profiles'][key]['chord_normalized']);q[:,0]=gaussian_filter1d(q[:,0],1)
        ax.plot(*q.T,color=color,lw=2,label=annotations['views'][key]['label'])
    for name,color,label in [('baseline','#df4c48','V4基线'),('contour_fit','#7664c5','轮廓拟合样例')]:
        q=data[name]['chord_normalized'].copy();q[:,0]=gaussian_filter1d(q[:,0],1)
        ax.plot(*q.T,color=color,lw=2,label=label)
    ax.axvline(0,color='grey',lw=.7);ax.set_ylim(1.04,0);ax.set_xlim(-.13,.13);ax.grid(alpha=.2);ax.legend(fontsize=10)
    ax.set_title('鼻下凹口的实测变化｜鼻尖、下巴保持原几何\n曲线轻度平滑用于展示；数值使用原始提取结果',fontsize=11)
    ax.set_xlabel('离鼻尖—下巴连线的距离 / D（右为前）');ax.set_ylabel('沿连线位置 / D')
    fig.savefig(OUT/'06_fitted_contour.png',dpi=150);plt.close(fig)
    oblique_review(annotations)
    print('Experiment metrics:',json.dumps(result,ensure_ascii=False))

def oblique_review(annotations):
    base=json.loads((OUT/'baseline/report.json').read_text(encoding='utf8'))
    ref=annotations['views']['reference_oblique']['landmarks']
    def normalize(features):
        origin=np.array(features['eye']);eye_line=np.array(features['far_eye'])-origin
        length=np.linalg.norm(eye_line);right=eye_line/length;down=np.array([-right[1],right[0]])
        transform=np.stack([right,down],axis=1)/length
        return {k:(np.array(v)-origin)@transform for k,v in features.items() if k!='ear'}
    normal={'reference':normalize(ref)}
    for angle in [15,25,35,45,55,65]:
        normal[str(angle)]=normalize(base['frames']['turn_'+str(angle)]['projectedFeatures'])
    fig,axes=plt.subplots(1,4,figsize=(17,6),layout='constrained')
    images=[load_view('reference_oblique'),Image.open(OUT/'baseline/turn_15.png').crop((200,250,650,650)),load_view('model_oblique')]
    for ax,im,title in zip(axes,images,['原画斜面：实际角度未知','模型15°：角度诊断样本','模型45°：原来用于对照的角度']):
        ax.imshow(im);ax.axis('off');ax.set_title(title,fontsize=11)
    ax=axes[3]
    for key,color,label in [('reference','#008f94','原画人工标点'),('15','#b48a38','模型15°投影'),('45','#df4c48','模型45°投影')]:
        points=normal[key]
        for name in ['eye','far_eye','nose','mouth','chin']:
            ax.scatter(*points[name],color=color,s=24)
            ax.annotate(name,points[name],xytext=(4,2),textcoords='offset points',fontsize=8,color=color)
        q=np.array([points[k] for k in ['eye','nose','mouth','chin']]);ax.plot(*q.T,color=color,lw=1,label=label)
    ax.set_aspect('equal');ax.set_ylim(1.9,-.25);ax.set_xlim(-.2,1.3);ax.grid(alpha=.2);ax.legend(fontsize=8)
    ax.set_title('两眼连线对齐后的特征位置',fontsize=11);ax.set_xlabel('两眼中心间距=1')
    fig.suptitle('斜面不能按“看起来像45°”直接打分：先处理姿态，再判断造型\n仅作姿态敏感性演示；原画鼻点与模型几何鼻尖不是严格同名点，未反推出真实角度',fontsize=12)
    fig.savefig(OUT/'07_oblique_pose_check.png',dpi=150);plt.close(fig)
    (OUT/'oblique_features.json').write_text(json.dumps({k:{n:v.tolist() for n,v in d.items()} for k,d in normal.items()},ensure_ascii=False,indent=2),encoding='utf8')

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--phase',choices=['measure','fit','review'],default='measure')
    args=parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if args.phase=='measure':inspect();study()
    if args.phase=='fit':build_candidate()
    if args.phase=='review':experiment_review()
