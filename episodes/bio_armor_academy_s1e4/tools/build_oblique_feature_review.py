"""Diagnostic contact sheets; source art is never retouched or used as a render."""
import hashlib
import json
import sys
import textwrap
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from PIL import Image

EP = Path(__file__).resolve().parents[1]
OUT = EP / 'storyboard/hybrid_character/oblique_feature_study_v2'
REF = OUT / 'references'
font_manager.fontManager.addfont('C:/Windows/Fonts/msyh.ttc')
plt.rcParams.update({'font.family': 'Microsoft YaHei', 'axes.unicode_minus': False})

PANELS = [
    {'id': 'right45', 'frame': 'turn_45', 'angle': 45, 'label': '右向 45°',
     'file': 'draft_02.png', 'crop': [0, 0, 655, 505], 'target': 45},
    {'id': 'left45', 'frame': 'turn_minus45', 'angle': -45, 'label': '左向 45°',
     'file': 'draft_02.png', 'crop': [0, 584, 655, 1088], 'target': -45},
    {'id': 'right60', 'frame': 'turn_60', 'angle': 60, 'label': '右向 60°',
     'file': 'draft_03_oblique.png', 'crop': [0, 0, 925, 755], 'target': 60},
    {'id': 'left60', 'frame': 'turn_minus60', 'angle': -60, 'label': '左向 60°',
     'file': 'draft_03_oblique.png', 'crop': [925, 0, 1851, 755], 'target': -60},
]
REGIONS = [
    {'id': 1, 'name': '刘海 / 颅顶', 'status': '未解决',
     'observation': '刘海向上拱起、聚成厚束；目标图是向额前自然垂落的分束。',
     'right': [433, 225], 'left': [440, 170]},
    {'id': 2, 'name': '后脑 / 耳后', 'status': '未解决',
     'observation': '后脑大块纹理拉伸；耳后出现三角形裸露区，发缘收口生硬。',
     'right': [315, 480], 'left': [584, 464]},
    {'id': 3, 'name': '马尾 / 发根', 'status': '未解决',
     'observation': '右转时只露颈后短束；左转能见马尾，但根部硬接、发梢卷成管状。',
     'right': [339, 595], 'left': [700, 221]},
    {'id': 4, 'name': '鼻口 / 下巴', 'status': '仅局部拟合',
     'observation': '鼻下候选只改一个局部；斜面面长、颊面和整体神态仍未匹配。',
     'right': [557, 527], 'left': [342, 520]},
    {'id': 5, 'name': '眼眉 / 叶饰', 'status': '继续核对',
     'observation': '保持琥珀眼与叶饰身份；没有独立眼球前凸的诊断证据。',
     'right': [476, 431], 'left': [429, 426]},
    {'id': 6, 'name': '头颈 / 领口', 'status': '未解决',
     'observation': '颈部色块转折硬，白色领片及灰色边界仍有缺口与碎片。',
     'right': [499, 647], 'left': [500, 646]},
]


def show(ax, im, title):
    ax.imshow(im)
    ax.set_title('\n'.join(textwrap.fill(line, 24) for line in title.splitlines()), fontsize=11, pad=10)
    ax.axis('off')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    # Each source is shown at its original aspect ratio. No landmark warping.
    for angle in [45, 60]:
        fig, axes = plt.subplots(2, 3, figsize=(15, 11))
        for row, panel in enumerate(p for p in PANELS if abs(p['angle']) == angle):
            reference = Image.open(REF / panel['file']).crop(panel['crop'])
            show(axes[row, 0], reference, f"新增绘画：{panel['label']}目标（未标定）")
            for col, variant in enumerate(['baseline', 'contour_fit'], 1):
                title = '原 V4 实际渲染' if variant == 'baseline' else '仅鼻下拟合：实际渲染'
                show(axes[row, col], Image.open(OUT / variant / (panel['frame'] + '.png')),
                     f"{title} · {panel['label']}")
        fig.suptitle(f'{angle}°斜面：看完整头发、脸和颈领，不用局部改善代替整体通过', fontsize=18, y=.98)
        fig.text(.5, .025, '参考角度来自生成意图，未做相机标定；60°参考仍偏浅。禁止由此计算同角度拟合分数。\n'
                 '模型是头部转动、躯干朝前；绘画是半身转向。保留整幅渲染，服装只检查连接与碎片。',
                 ha='center', fontsize=11)
        fig.subplots_adjust(left=.025, right=.975, top=.92, bottom=.09, wspace=.055, hspace=.12)
        fig.savefig(OUT / f'comparison_{angle}.jpg', dpi=130, pil_kwargs={'quality': 94})
        plt.close(fig)

    fig = plt.figure(figsize=(15, 13))
    grid = fig.add_gridspec(2, 2, height_ratios=[3.5, 1.65])
    for side, frame, col in [('right', 'turn_60', 0), ('left', 'turn_minus60', 1)]:
        ax = fig.add_subplot(grid[0, col])
        show(ax, Image.open(OUT / 'baseline' / (frame + '.png')),
             ('右向' if side == 'right' else '左向') + '60° · 原 V4 全幅渲染')
        for region in REGIONS:
            x, y = region[side]
            ax.text(x, y, str(region['id']), ha='center', va='center', color='white', fontsize=12,
                    bbox={'boxstyle': 'circle,pad=.32', 'fc': '#ba3427', 'ec': 'white', 'lw': 1.5})
    table_ax = fig.add_subplot(grid[1, :])
    table_ax.axis('off')
    cells = [[str(r['id']) + ' ' + r['name'], r['status'], r['observation']] for r in REGIONS]
    table = table_ax.table(cellText=cells, colLabels=['检查区域', '本轮状态', '具体观察'],
                           colWidths=[.17, .12, .71], loc='center', cellLoc='left')
    table.auto_set_font_size(False)
    table.set_fontsize(11)
    table.scale(1, 2.2)
    for (row, col), cell in table.get_celld().items():
        cell.set_edgecolor('#d7dce0')
        cell.set_facecolor('#e9eff3' if row == 0 else ('#fafafa' if row % 2 else '#ffffff'))
    fig.suptitle('整图复查：先记录看得见的问题，再讨论具体修法', fontsize=21, y=.98)
    fig.text(.5, .02, '红色编号是人工观察位置；不是自动识别结果。所有头发缺陷在鼻下拟合候选中仍存在。',
             ha='center', fontsize=12)
    fig.subplots_adjust(left=.035, right=.965, top=.93, bottom=.055, hspace=.025, wspace=.025)
    fig.savefig(OUT / 'whole_frame_review.jpg', dpi=130, pil_kwargs={'quality': 94})
    plt.close(fig)

    reports = {v: json.loads((OUT / v / 'report.json').read_text()) for v in ['baseline', 'contour_fit']}
    # Compare pixel data, not PNG metadata; this is evidence of unchanged areas only.
    import numpy as np
    changes = {}
    for frame in ['front'] + [p['frame'] for p in PANELS]:
        a = np.array(Image.open(OUT / 'baseline' / (frame + '.png')).convert('RGB'))
        b = np.array(Image.open(OUT / 'contour_fit' / (frame + '.png')).convert('RGB'))
        yy, xx = np.nonzero(np.any(a != b, axis=2))
        changes[frame] = {'changed_pixels': len(xx), 'bbox_xyxy': None if not len(xx) else
                          [int(xx.min()), int(yy.min()), int(xx.max())+1, int(yy.max())+1]}
    manifest = {
        'status': 'diagnostic_only_not_accepted_character',
        'canonical_reference': 'storyboard/hybrid_character/face_design_turnaround_v1/aoi_nine_views.png',
        'generator': 'built-in image_gen; 3 sequential single-image requests',
        'requested_artifacts': 3, 'returned_artifacts': 3,
        'reference_reviews': {
            'draft_01_rejected.png': 'Rejected: both rows face left; labels wrong; 60 targets near profile.',
            'draft_02.png': 'Screen directions and anatomical hairstyle side corrected. 45 cells usable as drawing candidates; 60 cells rejected for near-profile pose.',
            'draft_03_oblique.png': 'Both eyes and correct screen directions visible. Visually too shallow to establish 60 degrees. Uncalibrated oblique art candidate only.',
        },
        'panel_selection': PANELS,
        'reference_geometry_use': 'No measured yaw or cross-view correspondence; no exact-yaw fitting target or similarity score.',
        'regions': REGIONS,
        'review_scope': 'Full head, all hair, face, neck and visible clothing; not full-body or animation approval.',
        'current_hair_fixed': False,
        'pixel_change': changes,
        'render_validation': {v: {'frames': len(r['frames']), 'browser_errors': r['errors'],
                                  'all_finite': all(f['finite'] for f in r['frames'].values()),
                                  'reverse_seek': {f: r['frames'][f]['reverseSeekEqual'] for f in ['front', 'turn_90']}}
                              for v, r in reports.items()},
        'hashes': {str(p.relative_to(OUT)): sha(p) for p in sorted(OUT.rglob('*.png'))},
    }
    (OUT / 'review.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'pixel_changes': changes, 'render_validation': manifest['render_validation']}, ensure_ascii=False))


def parts_review():
    """Semantic comparison panels plus measured evidence, without beauty scores.

    Crops and observations are authored by the reviewer. Pixel differences and
    actual pose checks are computed; neither is automatic aesthetic acceptance.
    """
    import numpy as np
    from matplotlib.patches import Rectangle
    study = EP / 'storyboard/hybrid_character/face_support_study_v1'
    old = EP / 'storyboard/hybrid_character/eye_orbit_study_v1/applied_body/baseline'
    new = study / 'applied/baseline'
    master = EP / 'storyboard/hybrid_character/face_design_turnaround_v1/aoi_nine_views.png'
    dest = study / 'parts'; dest.mkdir(exist_ok=True)
    specs = [
        ('01_eyes', [
            ('近侧眼：鼻侧留白、内外睫毛', study/'user_eye_reference.png', [0,20,257,214], 'turn_45', [415,371,548,477]),
            ('远侧眼：内侧弧线与外角遮挡', study/'user_eye_reference.png', [333,18,447,206], 'turn_45', [584,369,665,477]),
        ]),
        ('02_face_relations', [
            ('额头—眉眼：保留上方皮肤与刘海边界', master, [497,79,671,203], 'turn_minus45', [238,277,483,448]),
            ('眼下—腮部—下巴：平顺段与低位饱满', master, [511,196,693,312], 'turn_minus45', [252,423,528,608]),
            ('鼻—嘴—下巴：连续关系', master, [519,204,614,308], 'turn_minus45', [263,455,386,602]),
        ]),
        ('03_ear_hair', [
            ('耳朵＋太阳穴＋下颌：位置与单一耳廓', master, [646,143,748,276], 'turn_minus45', [499,360,650,553]),
            ('刘海＋额头：发束转折与遮挡', master, [463,24,690,215], 'turn_minus45', [204,171,503,445]),
            ('后脑＋马尾根：体积与连接', master, [644,7,863,332], 'turn_minus45', [482,128,855,648]),
        ]),
    ]
    crops = []
    for filename, rows in specs:
        fig, axes = plt.subplots(len(rows), 3, figsize=(13.2, 4.2*len(rows)), squeeze=False)
        for row, (label, reference, rcrop, frame, mcrop) in enumerate(rows):
            for col, (path, crop, title) in enumerate([
                (reference, rcrop, '用户参考 / 原始人设'),
                (old/(frame+'.png'), mcrop, '本轮修改前'),
                (new/(frame+'.png'), mcrop, '当前实际渲染')]):
                show(axes[row,col], Image.open(path).crop(crop), title+'\n'+label)
            crops.append({'region':label,'reference':str(reference.relative_to(EP)), 'reference_crop_xyxy':rcrop,
                          'frame':frame,'model_crop_xyxy':mcrop, 'crop_method':'manual semantic regions; aspect ratio preserved'})
        fig.suptitle('部位与相邻结构拆分对照', fontsize=20, y=.99)
        fig.text(.5,.015,'各裁切独立等比放大，不作形变；参考相机未标定。局部形状对照不能替代完整头脸判断。',ha='center',fontsize=10)
        fig.subplots_adjust(left=.025,right=.975,top=.90,bottom=.065,wspace=.08,hspace=.28)
        fig.savefig(dest/(filename+'.jpg'),dpi=135,pil_kwargs={'quality':95});plt.close(fig)

    # Return to the whole frame after the parts. Keep body/hair in every panel.
    fig, axes = plt.subplots(2,4,figsize=(16,8.6))
    for row, folder in enumerate([old,new]):
        for col, frame in enumerate(['turn_45','turn_60','turn_minus45','turn_minus60']):
            data=json.loads((folder/'report.json').read_text())['frames'][frame]
            show(axes[row,col],Image.open(folder/(frame+'.png')),
                 ('修改前' if row==0 else '当前')+f" · 头{data['actualYaw']:.0f}° / 身{data['actualBodyYaw']:.0f}°")
    fig.suptitle('返回整体：脸、所有头发、耳颈与肩身一起检查',fontsize=19,y=.99)
    fig.text(.5,.012,'仍有后发纹理拉伸、鼻下轮廓及颈领碎边；本轮不是完整造型验收。',ha='center',fontsize=11)
    fig.subplots_adjust(left=.01,right=.99,top=.92,bottom=.055,wspace=.025,hspace=.14)
    fig.savefig(dest/'04_whole_frame.jpg',dpi=125,pil_kwargs={'quality':94});plt.close(fig)

    # A visual index tells the reader which original image each crop belongs to.
    fig,axes=plt.subplots(1,2,figsize=(12,7))
    show(axes[0],Image.open(master),'原始人设 · 上排中间斜面（角度未标定）')
    axes[0].set_xlim(437,871);axes[0].set_ylim(403,0)
    show(axes[1],Image.open(new/'turn_minus45.png'),'当前模型 · 左向45°，头身同转')
    for i, item in enumerate(crops[2:],1):
        color=plt.get_cmap('tab10')(i)
        for ax, rect in zip(axes,[item['reference_crop_xyxy'],item['model_crop_xyxy']]):
            x0,y0,x1,y1=rect;ax.add_patch(Rectangle((x0,y0),x1-x0,y1-y0,fill=False,ec=color,lw=1.5))
            ax.text(x0,y0,str(i),color='white',fontsize=11,bbox={'fc':color,'ec':'none','pad':2})
    fig.suptitle('拆分位置索引：分区沿结构，不沿固定方格',fontsize=18)
    fig.tight_layout();fig.savefig(dest/'00_region_map.jpg',dpi=130,pil_kwargs={'quality':94});plt.close(fig)

    after=json.loads((new/'report.json').read_text()); changes={}
    for frame in ['front','turn_45','turn_60','turn_minus45','turn_minus60','turn_90','turn_minus90']:
        a=np.array(Image.open(old/(frame+'.png')).convert('RGB'));b=np.array(Image.open(new/(frame+'.png')).convert('RGB'))
        yy,xx=np.nonzero(np.any(a!=b,axis=2));changes[frame]={'changed_pixels':len(xx),
            'changed_bbox_xyxy':None if not len(xx) else [int(xx.min()),int(yy.min()),int(xx.max())+1,int(yy.max())+1]}
    checks={'head_and_body_yaw_match':all(abs(v['actualYaw']-v['actualBodyYaw'])<1e-4 for v in after['frames'].values()),
            'no_browser_errors':not after['errors'], 'finite_vertices':all(v['finite'] for v in after['frames'].values()),
            'all_requested_reverse_seeks_match':all(v.get('reverseSeekEqual',True) for v in after['frames'].values())}
    result={'status':'mixed_review_candidate_not_user_accepted', 'crops':crops,
            'algorithm_evidence':{'render_checks':checks,'pixel_changes':changes,
              'note':'Differences locate changes, not quality. CPU landmarks exclude GPU sculpt; no visibility or similarity score.'},
            'reviewer_observations':{
              'user_reported':['far forehead/cheek missing','far outer corner protrudes','ear too far back and double-ear reading',
                               'nasal white too broad, inner arc too large','nasal lashes missing','fullness belongs below the flat upper cheek'],
              'agent_detected_during_revision':['early corner fold hid far iris again at60','narrow fold bent bangs into waves',
                   '10mm lower-cheek trial created a conspicuous bulge','CPU visibility samples did not include shader sculpt'],
              'current_changes':['nasal eye edge close to iris; short nasal lashes','lower-cheek shift reduced to3.5mm coefficient',
                                 'ear centre forward28mm and up7mm; connected concha','broader hair transition avoids local eye-band kink'],
              'remaining':['far face support still differs from target','rear hair and ponytail texture/shape','nose-underlip profile',
                           'near iris rounder than reference; temporal lashes form a thick color wedge',
                           'ear inner folds still simplified','neck/collar broken color boundaries','full dynamic performance not reviewed'],
              'skill_evaluation':'Guided iteration, not blind testing. User still found missed nasal-eye and ear-shape issues; no claim of stable independent detection.'},
            'hashes':{str(p.relative_to(EP)):sha(p) for p in [master,study/'user_eye_reference.png',study/'user_eye_before.png',new/'report.json']}}
    (dest/'review.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    if not all(checks.values()):raise RuntimeError(checks)
    print(json.dumps({'parts':len(crops),'render_checks':checks,'changes':changes},ensure_ascii=False))


def configured_comparison(config_path):
    """Reuse semantic crops for later revisions without relabelling old evidence."""
    import numpy as np
    cfg = json.loads(Path(config_path).read_text(encoding='utf-8'))
    default_groups = {'04_whole_frame':['front','turn_45','turn_minus45','turn_minus60'],
                      '05_profiles':['turn_60','turn_90','turn_minus90']}
    whole_groups = cfg.get('whole_frame_groups', default_groups)
    covered_regions = {row.get('region') for board in cfg['boards'] for row in board['rows']}
    required_regions = set(cfg.get('required_regions', []))
    required_frames = set()
    if cfg.get('review_scope') == 'whole_head':
        required_regions.update(['fringe_crown','posterior_side','posterior_oblique',
                                 'posterior_back','ear_hair','nape','face_neck'])
        required_frames.update(['front','turn_45','turn_minus45','turn_90','turn_minus90',
                                'turn_135','turn_minus135','turn_180'])
        if not cfg.get('discovery_review', {}).get('issues'):
            raise ValueError('Whole-head review requires observed issues before candidate comparison')
    included_frames = {frame for frames in whole_groups.values() for frame in frames} if cfg.get('whole_frames', True) else set()
    missing_regions = sorted(required_regions-covered_regions)
    missing_frames = sorted(required_frames-included_frames)
    if missing_regions or missing_frames:
        raise ValueError({'incomplete_review_coverage': {'regions':missing_regions,'frames':missing_frames}})
    old, new, dest = [EP / cfg[k] for k in ['before', 'after', 'out']]
    dest.mkdir(parents=True, exist_ok=True)
    sources = set()
    for board in cfg['boards']:
        rows = board['rows']
        fig, axes = plt.subplots(len(rows), 3, figsize=(13.5, 3.7*len(rows)), squeeze=False)
        for r, row in enumerate(rows):
            ref = EP / row.get('reference', cfg['reference'])
            before = EP / row.get('before', cfg['before'])
            labels = cfg.get('column_labels', ['参考绘画（斜面角度未标定）', '修改前 / 指定阶段', '本轮修改后'])
            items = [(ref, row['reference_crop'], row.get('reference_label', labels[0])),
                     (before/(row['frame']+'.png'), row['model_crop'], labels[1]),
                     (new/(row['frame']+'.png'), row['model_crop'], labels[2])]
            for c, (path, crop, label) in enumerate(items):
                sources.add(path)
                show(axes[r,c], Image.open(path).crop(crop), label+'\n'+row['label'])
                # Reviewer-authored visible landmarks, never automatic detections.
                for mark in row.get('markers', {}).get(['reference','before','after'][c], []):
                    name, x, y = mark
                    axes[r,c].plot(x-crop[0], y-crop[1], 'o', ms=3, color='#008f9c')
                    axes[r,c].annotate(name, (x-crop[0],y-crop[1]), xytext=(4,4), textcoords='offset points', fontsize=8, color='#006a75')
        fig.suptitle(board['title'], fontsize=19, y=.99)
        fig.text(.5,.012,cfg.get('display_note','参考与模型独立等比显示；裁切仅供分析，不改变原图或实际渲染。'),ha='center',fontsize=10)
        fig.subplots_adjust(left=.025,right=.975,top=.94 if len(rows)>3 else .86,bottom=.04,wspace=.08,hspace=.29)
        fig.savefig(dest/(board['id']+'.jpg'), dpi=135, pil_kwargs={'quality':95}); plt.close(fig)
    reports = [json.loads((folder/'report.json').read_text()) for folder in [old,new]]
    for group, frames in whole_groups.items():
        if not cfg.get('whole_frames', True): continue
        fig,axes=plt.subplots(2,len(frames),figsize=(4*len(frames),8.8),squeeze=False)
        for r,folder in enumerate([old,new]):
            for c,frame in enumerate(frames):
                f=reports[r]['frames'][frame];p=folder/(frame+'.png');sources.add(p)
                show(axes[r,c],Image.open(p),('修改前' if r==0 else '修改后')+f" · 头{f['actualYaw']:.0f}° / 身{f['actualBodyYaw']:.0f}°")
        fig.suptitle('完整画面回查：头脸、前后发、耳颈及肩部',fontsize=19,y=.99)
        fig.text(.5,.01,cfg['whole_frame_note'],ha='center',fontsize=10)
        fig.subplots_adjust(left=.01,right=.99,top=.92,bottom=.05,wspace=.025,hspace=.12)
        fig.savefig(dest/(group+'.jpg'),dpi=125,pil_kwargs={'quality':94});plt.close(fig)
    if cfg.get('turn_sequence'):
        seq=cfg['turn_sequence'];angles=seq['angles'];prior=EP/seq['before']
        fig,axes=plt.subplots(2,len(angles),figsize=(2.7*len(angles),7),squeeze=False)
        for r,folder in enumerate([prior,new]):
            for c,angle in enumerate(angles):
                p=folder/f'turn_{angle}.png';sources.add(p)
                show(axes[r,c],Image.open(p).crop(seq['crop']),('修改前' if r==0 else '修改后')+f' · {angle}°')
        fig.suptitle('连续转面：检查整脸身份与鼻—嘴—下巴关系',fontsize=19)
        fig.subplots_adjust(left=.01,right=.99,top=.9,bottom=.02,wspace=.025,hspace=.10)
        fig.savefig(dest/'09_turn_identity.jpg',dpi=140,pil_kwargs={'quality':95});plt.close(fig)
    preservation={}
    if cfg.get('preserve'):
        keep=cfg['preserve'];prior=EP/keep['before']
        for frame in keep['frames']:
            p=prior/(frame+'.png');q=new/(frame+'.png');sources.update([p,q])
            a=np.array(Image.open(p).convert('RGB'));b=np.array(Image.open(q).convert('RGB'))
            if frame in keep.get('crops', {}):
                x0,y0,x1,y1=keep['crops'][frame]
                a=a[y0:y1,x0:x1];b=b[y0:y1,x0:x1]
            preservation[frame]=int(np.any(a!=b,axis=2).sum())
    checks={'head_body_angles_match':all(abs(v['actualYaw']-v['actualBodyYaw'])<1e-4 for v in reports[1]['frames'].values()),
            'no_browser_errors':not reports[1]['errors'],
            'finite_vertices':all(v['finite'] for v in reports[1]['frames'].values()),
            'reverse_seeks_equal':all(v.get('reverseSeekEqual',True) for v in reports[1]['frames'].values())}
    changes={}
    for frame in ['front','turn_45','turn_minus45','turn_60','turn_minus60','turn_90','turn_minus90']:
        if any(frame not in r['frames'] for r in reports): continue
        a=np.array(Image.open(old/(frame+'.png')).convert('RGB'));b=np.array(Image.open(new/(frame+'.png')).convert('RGB'))
        yy,xx=np.nonzero(np.any(a!=b,axis=2))
        changes[frame]={'changed_pixels':len(xx),'bbox':None if not len(xx) else [int(xx.min()),int(yy.min()),int(xx.max())+1,int(yy.max())+1],
            'ear_centres_before':reports[0]['frames'][frame]['projectedEars'],
            'ear_centres_after':reports[1]['frames'][frame]['projectedEars']}
    result={'config':cfg,'status':'candidate_pending_visual_judgment','render_checks':checks,'change_locations':changes,'preserved_view_changed_pixels':preservation,
            'review_coverage':{'scope':cfg.get('review_scope','local'), 'regions':sorted(r for r in covered_regions if r),
                               'whole_frames':sorted(included_frames),'meaning':'Declared evidence coverage only; not a beauty or completeness score.'},
            'limitations':'Pixel changes and rigid ear centres locate edits, not aesthetic quality. CPU eye probes exclude GPU sculpt; no beauty/visibility score.',
            'source_hashes':{str(p.relative_to(EP)):sha(p) for p in sorted(sources)}}
    (dest/'evidence.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    if not all(checks.values()) or any(preservation.values()):raise RuntimeError({'checks':checks,'preservation':preservation})
    print(json.dumps({'boards':len(cfg['boards'])+(len(whole_groups) if cfg.get('whole_frames',True) else 0)+bool(cfg.get('turn_sequence')),'checks':checks,'preservation':preservation},ensure_ascii=False))


if __name__ == '__main__':
    if '--comparison' in sys.argv:
        configured_comparison(sys.argv[sys.argv.index('--comparison')+1])
    else:
        parts_review() if '--parts' in sys.argv else main()
