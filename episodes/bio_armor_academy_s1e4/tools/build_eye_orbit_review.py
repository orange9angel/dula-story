"""Review real, whole-body turns and the isolated eye-region depth correction."""
import hashlib
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from PIL import Image
import numpy as np

EP = Path(__file__).resolve().parents[1]
OUT = EP / 'storyboard/hybrid_character/eye_orbit_study_v1'
OLD = OUT / 'baseline'
NEW = OUT / 'applied_body/baseline'
font_manager.fontManager.addfont('C:/Windows/Fonts/msyh.ttc')
plt.rcParams.update({'font.family': 'Microsoft YaHei', 'axes.unicode_minus': False})


def report(path):
    return json.loads((path / 'report.json').read_text())


def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    before, after = report(OLD), report(NEW)
    for negative, label in [(False, '右'), (True, '左')]:
        fig, axs = plt.subplots(2, 3, figsize=(15, 10.5))
        for col, angle in enumerate([45, 60, 90]):
            frame = 'turn_' + ('minus' if negative else '') + str(angle)
            for row, folder in enumerate([OLD, NEW]):
                ax = axs[row, col]
                ax.imshow(Image.open(folder / (frame + '.png')))
                actual = (before if row == 0 else after)['frames'][frame]
                ax.set_title(('修改前：眼周后压14mm' if row == 0 else '修改后：取消后压') +
                             f"\n{label}向：头部{abs(actual['actualYaw']):.0f}° / 身体{abs(actual['actualBodyYaw']):.0f}°", fontsize=12)
                ax.axis('off')
        fig.suptitle('眼周向前恢复支撑：整个人一起旋转的实际渲染', fontsize=19, y=.98)
        fig.text(.5, .025, '只修改眼周深度，保留眼面斜率和正面绘画；60°远侧眼重新露出，90°仍只显示近侧眼。\n'
                 '后脑、马尾、鼻下凹口与领口缺陷仍存在。本图不是整体造型验收。', ha='center', fontsize=11)
        fig.subplots_adjust(left=.02, right=.98, top=.9, bottom=.09, wspace=.04, hspace=.20)
        fig.savefig(OUT / ('before_after_left.jpg' if negative else 'before_after_right.jpg'), dpi=125, pil_kwargs={'quality': 94})
        plt.close(fig)

    # The source reference has no calibrated camera. Use it as art, not a yaw ruler.
    master = Image.open(EP / 'storyboard/hybrid_character/oblique_feature_study_v2/references/draft_02.png')
    fig, axs = plt.subplots(2, 3, figsize=(15, 10))
    for row, (frame, crop, label) in enumerate([
        ('turn_45', [0, 0, 655, 505], '右向'),
        ('turn_minus45', [0, 584, 655, 1088], '左向')]):
        for col, (im, title) in enumerate([
            (master.crop(crop), '绘画目标（角度未标定）'),
            (Image.open(OLD / (frame + '.png')), '原模型 · 头和身体45°'),
            (Image.open(NEW / (frame + '.png')), '眼周前移后 · 头和身体45°')]):
            axs[row, col].imshow(im)
            axs[row, col].set_title(label + ' / ' + title, fontsize=12)
            axs[row, col].axis('off')
    fig.suptitle('45°斜面全图复查：原画、旧模型、实际修订', fontsize=20, y=.98)
    fig.text(.5, .025, '新模型远侧眼显露增加；脸型、后发和衣领仍与绘画有差异，不能靠眼周前移一项完成还原。', ha='center', fontsize=11)
    fig.subplots_adjust(left=.02, right=.98, top=.91, bottom=.08, wspace=.04, hspace=.14)
    fig.savefig(OUT / 'reference_and_fix.jpg', dpi=125, pil_kwargs={'quality': 94})
    plt.close(fig)

    source_before = checksum(OUT / 'source_before.js')
    actual_source = EP / '../../../dula-assets/characters/bioarmor/aoi-generated-paint.js'
    applied_match = all(after['frames'][f]['sha256'] == report(OUT / 'depth_only')['frames'][f]['sha256'] for f in after['frames'])
    front_a, front_b = [np.array(Image.open(p / 'front.png')) for p in [OLD, NEW]]
    old_head = report(OUT / 'angle_audit/baseline')
    previous = report(EP / 'storyboard/hybrid_character/oblique_feature_study_v2/baseline')
    angle_audit = {f: {'actual_head_yaw': old_head['frames'][f]['actualYaw'],
                       'actual_body_yaw': old_head['frames'][f]['actualBodyYaw'],
                       'matches_previous_image': old_head['frames'][f]['sha256'] == previous['frames'][f]['sha256']}
                   for f in ['turn_45', 'turn_60', 'turn_minus45', 'turn_minus60']}
    audit_paths = [OLD, NEW, OUT / 'applied_head/baseline', OUT / 'angle_audit/baseline']
    assertions = {
        'front_pixels_equal': bool(np.array_equal(front_a, front_b)),
        'applied_matches_trial_all_16_frames': applied_match,
        'previous_comparison_reproduced': all(r['matches_previous_image'] for r in angle_audit.values()),
        'body_yaw_matches_head': all(abs(f['actualYaw']-f['actualBodyYaw']) < 1e-4 for f in after['frames'].values()),
        'finite_error_free_deterministic': all(not report(p)['errors'] and all(f['finite'] for f in report(p)['frames'].values())
            and all(report(p)['frames'][f]['reverseSeekEqual'] for f in ['front', 'turn_90']) for p in audit_paths),
        'source_snapshot_matches_live': checksum(OUT / 'source_after.js') == checksum(actual_source),
    }
    visibility = {frame: {v: report(OUT / v)['frames'][frame]['eyeDiagnostics']['eyeVisibility']
                         for v in ['baseline', 'depth_only', 'slope_only', 'orbit_01', 'natural_curve']}
                  for frame in ['turn_45', 'turn_60', 'turn_90', 'turn_minus60']}
    data = {
        'change': 'eyeSurface.recess: .014 -> 0, slope .36 unchanged; shared character source updated',
        'before_snapshot_sha256': source_before,
        'after_snapshot_sha256': checksum(OUT / 'source_after.js'),
        'assertions': assertions, 'previous_angle_audit': angle_audit,
        'eye_depth_samples': visibility,
        'sampling_limit': 'Face-only depth test on 25 iris-region points. Not visible pixel area; excludes hair alpha and eyelid painting.',
        'whole_frame_review': {
            'bangs_crown': 'unchanged; raised thick front lock remains',
            'rear_scalp_ears': 'unchanged; stretched texture and exposed triangular side region remain',
            'ponytail': 'unchanged; strong left/right visibility difference and tubular tips remain',
            'nose_mouth_chin': 'unchanged; earlier nose-underlip fitting was not applied to shared source',
            'eyes_ornament': 'eye region moved forward; far iris visible at 60, face-only near samples remain visible at 90; frontal pixels unchanged',
            'neck_collar': 'body turn now matches head; jagged collar/color borders still visible',
        },
        'not_validated': ['continuous animation', 'final likeness', 'hair repair'],
    }
    (OUT / 'review.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'assertions': assertions, 'angle_audit': angle_audit}, ensure_ascii=False))
    if not all(assertions.values()):
        raise RuntimeError('Eye orbit validation failed')


if __name__ == '__main__':
    main()
