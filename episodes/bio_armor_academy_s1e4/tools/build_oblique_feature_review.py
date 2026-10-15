"""Diagnostic contact sheets; source art is never retouched or used as a render."""
import hashlib
import json
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
    ax.set_title(title, fontsize=13, pad=10)
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


if __name__ == '__main__':
    main()
