#!/usr/bin/env python
"""半拍晴天 hybrid 试片 cel 预处理（episode 绑定层）。

职责（共享脚本不覆盖的部分）：
1. 身体/家具 cel 的 alpha 杂点清理（小连通域）与边缘 defringe（半透明边像素取最近不透明色）。
2. 转身 8 帧组装：统一人高、脚底对齐 anchor、按角色转身方向生成镜像序列。
3. 家具前景拆层：椅层 / 桌面层（按 alpha 谷底分列）。
4. 脸 cel 椭圆羽化蒙版（只露皮肤+五官，避免与坐姿 cel 头发互叠）。

脸窗锁回（compose_cel_regions.py）与脸框裁切（prepare_cel_crops.py）走共享脚本，
本工具只处理它们没有的能力。所有产物带前后 sha256 报告到 hybrid/config/cel_prepare_report.json。
"""
import json, hashlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

EP = Path(__file__).resolve().parents[2]          # episode 根
CELS = EP / 'hybrid/assets/cels'
REPORT = {'steps': []}

# r4 脸片多边形蒙版（512×512 画布）：边界由亮度图像数据驱动（见 auto_poly），
# 落点是每列/每行最暗带（发际线/鬓角发缘/下颌轮廓描线-颈影）。
# 约束：顶边不压眼窗、下颌边不压嘴窗（donor 窗内须全不透明）。
FACE_SEARCH = {
    'girl': {'top': (55, 100), 'topX': (110, 400), 'sideY': (140, 375),
             'rightX': (400, 448), 'leftX': (66, 116), 'chin': (396, 412), 'chinX': (140, 375)},
    'boy': {'top': (55, 115), 'topX': (110, 405), 'sideY': (135, 400),
            'rightX': (405, 450), 'leftX': (60, 112), 'chin': (390, 440), 'chinX': (160, 360)},
}

def auto_poly(p):
    """从 512 脸图（未蒙版）亮度场找最暗边界路径，返回多边形顶点。"""
    rgba = load(p).astype(float)
    lum = rgba[:, :, :3] @ np.array([.2126, .7152, .0722])
    alpha = rgba[:, :, 3]
    S = FACE_SEARCH['girl' if 'girl' in Path(p).name else 'boy']
    def col_dark(x, y0, y1):  # x 列在 [y0,y1] 内的最暗 11px 窗中心
        best, by = 1e9, y0
        for y in range(y0, y1):
            v = lum[y-2:y+9, x].mean()
            if v < best: best, by = v, y
        return by
    def row_dark(y, x0, x1):
        best, bx = 1e9, x0
        for x in range(x0, x1):
            v = lum[y, x-3:x+8].mean()
            if v < best: best, bx = v, x
        return bx
    top = [(x, col_dark(x, *S['top'])) for x in range(S['topX'][0], S['topX'][1]+1, 28)]
    right = [(row_dark(y, *S['rightX']), y) for y in range(S['sideY'][0], S['sideY'][1]+1, 30)]
    chin = [(x, col_dark(x, *S['chin'])) for x in range(S['chinX'][0], S['chinX'][1]+1, 26)]
    left = [(row_dark(y, *S['leftX']), y) for y in range(S['sideY'][0], S['sideY'][1]+1, 30)]
    poly = top + right + chin[::-1] + left[::-1]
    return [(int(a), int(b)) for a, b in poly]

# 派生层（拆分/补丁/贴片）与源图内容不同，暗边不做前后比对
DERIVED_NO_BEFORE = {'cafe_chair_left.png', 'cafe_chair_right.png', 'cafe_chairs_layer.png',
                     'cafe_table_layer.png', 'cafe_table_layer_nospoon.png'}

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def load(p): return np.array(Image.open(p).convert('RGBA'))

def save(arr, p, src):
    p = Path(p); s0 = sha(src)          # 先取源摘要，允许 src==p 的自覆盖
    Image.fromarray(arr).save(p)
    REPORT['steps'].append({'output': str(p.relative_to(EP)), 'source': str(Path(src).relative_to(EP)),
        'sourceSha256': s0, 'sha256': sha(p)})

def despeckle(a, min_size=64):
    lab, n = ndimage.label(a > 32)
    sizes = np.bincount(lab.ravel()); sizes[0] = 10**9
    removed = int((sizes[lab] < min_size).sum()) if n else 0
    return np.where(sizes[lab] < min_size, 0, a), removed

def defringe(rgba):
    """颜色去污（r4 第二版）：只处理亮污染边（半透明且 lum>200）——
    取 4px 盘内、alpha>=250 腐蚀 2px 的内侧区域中**亮度最低**的像素回填（挖到线稿墨色）。
    暗边（线稿抗锯齿）保留原色不动。旧版无差别取最近不透明色 → 亮边 halo（P0-1）。"""
    a = rgba[:, :, 3]
    rgb = rgba[:, :, :3].astype(float)
    lum = rgb @ np.array([.2126, .7152, .0722])
    interior = ndimage.binary_erosion(a >= 250, iterations=2)
    edge = (a > 8) & (a < 250) & (lum > 200)
    if not edge.any() or not interior.any(): return rgba, 0
    Hh, Ww = a.shape
    best = np.full(lum.shape, np.inf)
    pick = rgb.copy()
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            if dx*dx + dy*dy > 16: continue
            ys = slice(max(0, dy), Hh + min(0, dy)); xs = slice(max(0, dx), Ww + min(0, dx))
            yt = slice(max(0, -dy), Hh - max(0, dy)); xt = slice(max(0, -dx), Ww - max(0, dx))
            cand = np.zeros_like(interior); cand[ys, xs] = interior[yt, xt]
            m = edge & cand
            if not m.any(): continue
            cl = np.full(lum.shape, np.inf); cl[ys, xs] = lum[yt, xt]
            take = m & (cl < best)
            if not take.any(): continue
            best[take] = cl[take]
            for ch in range(3):
                cc = np.zeros(lum.shape); cc[ys, xs] = rgb[:, :, ch][yt, xt]
                pick[:, :, ch][take] = cc[take]
    out = rgba.copy()
    m = edge & np.isfinite(best)
    out[:, :, :3][m] = np.uint8(np.clip(pick[m], 0, 255))
    return out, int(m.sum())

def edge_stats(p):
    """主代理判据：alpha 30–220 边带内 lum>200（亮边）/ lum<60（暗边）占比。"""
    rgba = load(p).astype(float)
    a = rgba[:, :, 3]
    band = (a >= 30) & (a <= 220)
    lum = rgba[:, :, :3] @ np.array([.2126, .7152, .0722])
    n = int(band.sum())
    return {'bandPx': n,
            'brightPct': round(100 * int((band & (lum > 200)).sum()) / max(1, n), 3),
            'darkPct': round(100 * int((band & (lum < 60)).sum()) / max(1, n), 3)}

def clean(name):
    src = CELS / name
    rgba = load(src)
    a, removed = despeckle(rgba[:, :, 3])
    rgba[:, :, 3] = a
    rgba, fringed = defringe(rgba)
    out = CELS / name.replace('_v1.png', '_clean.png')
    save(rgba, out, src)
    REPORT['steps'][-1]['removedSpecklePx'] = removed
    REPORT['steps'][-1]['defringedPx'] = fringed
    return out

def content_box(a, thr=32):
    ys, xs = np.nonzero(a > thr)
    return xs.min(), ys.min(), xs.max(), ys.max()

def turn_frame(rgba, canvas=(512, 768), person_h=700, foot_y=720, anchor_x=256):
    a = rgba[:, :, 3]
    x0, y0, x1, y1 = content_box(a)
    crop = rgba[y0:y1 + 1, x0:x1 + 1]
    h = y1 - y0 + 1
    s = person_h / h
    w2 = max(1, round((x1 - x0 + 1) * s))
    im = Image.fromarray(crop).resize((w2, person_h), Image.Resampling.LANCZOS)
    # 脚底中心：内容底部 40 行的 alpha 质心
    ca = np.array(im)[:, :, 3]
    rows = ca[max(0, person_h - 40):]
    ys, xs = np.nonzero(rows > 32)
    fx = xs.mean() if len(xs) else w2 / 2
    out = Image.new('RGBA', canvas, (0, 0, 0, 0))
    out.alpha_composite(im, (round(anchor_x - fx), foot_y - person_h))
    return out

def ellipse_mask(p, center, radii, feather=14):
    rgba = load(p); h, w = rgba.shape[:2]
    yy, xx = np.mgrid[:h, :w]
    d = np.sqrt(((xx - center[0]) / radii[0]) ** 2 + ((yy - center[1]) / radii[1]) ** 2)
    rgba[:, :, 3] = np.uint8(rgba[:, :, 3] * np.clip((1.0 - d) * feather, 0, 1))
    save(rgba, p, p)

def poly_mask(p, polygon, feather=10, featherIn=None):
    """r4 P0-2：脸片蒙版改多边形，边界落发际/下颌描线/颈影深色区（藏接缝）。
    非对称羽化：内侧 featherIn（默认 3，避免羽化带压到亮色下巴皮肤），
    外侧 feather（默认 10-12，伸入深色区）。"""
    import cv2
    if featherIn is None: featherIn = max(3, feather // 3)
    rgba = load(p); h, w = rgba.shape[:2]
    m = np.zeros((h, w), np.uint8)
    cv2.fillPoly(m, [np.array(polygon, np.int32)], 255)
    inside = np.clip(cv2.distanceTransform(m, cv2.DIST_L2, 3) / featherIn, 0, 1)
    outside = np.clip(1 - cv2.distanceTransform(255 - m, cv2.DIST_L2, 3) / feather, 0, 1)
    rgba[:, :, 3] = np.uint8(rgba[:, :, 3] * np.minimum(inside, outside))
    save(rgba, p, p)

def write_manifest():
    files = sorted(p.name for p in CELS.glob('*.png'))
    for sub in ['variants', 'variants2', 'turn_reg']:
        vd = CELS / sub
        if vd.exists(): files += sorted(p.name for p in vd.glob('*.png'))
    files = sorted(set(files))  # 一律纯文件名（viewer 按 basename 匹配；各目录文件名唯一）
    (CELS / 'manifest.json').write_text(json.dumps({
        'comment': '已落盘 cel 清单（含 variants2/、turn_reg/ 等子目录，一律纯文件名登记）。viewer 按文件名匹配。',
        'files': files}, indent=2, ensure_ascii=False))
    return len(files)

def flush():
    seen = {}
    for s in REPORT['steps']: seen[(s['output'], s.get('note', ''))] = s  # 重跑同步骤去重（留新）
    REPORT['steps'] = sorted(seen.values(), key=lambda s: s['output'])
    (EP / 'hybrid/config/cel_prepare_report.json').write_text(json.dumps(REPORT, indent=2, ensure_ascii=False))

def load_report():
    rp = EP / 'hybrid/config/cel_prepare_report.json'
    if rp.exists(): REPORT['steps'] = json.loads(rp.read_text())['steps']

def main():
    import sys
    if '--r3' in sys.argv:
        load_report()
        # r3-1) 批次3关键画清理（despeckle+defringe；男孩边缘 alpha 杂点按任务书处理）
        names = ['girl_sit_reach_v1.png', 'girl_sit_tap_v1.png',
                 'girl_turn_front_open_v1.png', 'girl_turn_side_cross_v1.png', 'girl_turn_back_open_v1.png',
                 'boy_turn_front_open_v1.png', 'boy_turn_side_cross_v1.png', 'boy_turn_back_open_v1.png']
        for name in names:
            clean(name)
        # r3-2) 转身关键画测量：contentTop/Bottom、脚底质心 x（底部 60 行）、供 cel_slots 标定
        measures = {}
        for who in ['girl', 'boy']:
            for key in ['front_open', 'side_cross', 'back_open']:
                rgba = load(CELS / f'{who}_turn_{key}_clean.png')
                a = rgba[:, :, 3]; ys, xs = np.nonzero(a > 32)
                top, bottom = int(ys.min()), int(ys.max())
                rows = a[max(0, bottom-60):bottom+1]
                fys, fxs = np.nonzero(rows > 32)
                measures[f'{who}_{key}'] = {'contentTop': top, 'contentBottom': bottom,
                    'footX': int(fxs.mean()) if len(fxs) else 512, 'contentCenterX': int((xs.min()+xs.max())/2)}
        # r3-3) side_cross 镜像（后半圈；rim/发梢方向随镜像翻转，开放风险同 r2 记录）
        for who in ['girl', 'boy']:
            src = CELS / f'{who}_turn_side_cross_clean.png'
            im = Image.open(src).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            out = CELS / f'{who}_turn_side_cross_mir.png'
            im.save(out)
            m = measures[f'{who}_side_cross']
            measures[f'{who}_side_cross_mir'] = {**m, 'footX': 1024-m['footX'], 'contentCenterX': 1024-m['contentCenterX']}
            REPORT['steps'].append({'output': str(out.relative_to(EP)), 'source': str(src.relative_to(EP)),
                                    'sourceSha256': sha(src), 'sha256': sha(out), 'note': '水平镜像（后半圈）'})
        (EP / 'hybrid/config/turn_key_measures.json').write_text(json.dumps(measures, indent=2))
        # r3-4) 无勺桌面变体：碟上勺（实测 plate 像素 (648,403)-(717,434)）用碟面正下方区域回补+羽化
        tbl = Image.open(CELS / 'cafe_table_layer.png').convert('RGBA')
        donor = tbl.crop((650, 440, 719, 471))  # 勺正下方碟面（避开杯体下缘）
        mask = np.zeros((1080, 1920), np.uint8)
        import cv2 as _cv2
        _cv2.rectangle(mask, (648, 403), (717, 434), 255, -1)
        wgt = np.clip(_cv2.distanceTransform(mask, _cv2.DIST_L2, 3)/4, 0, 1)[:, :, None]
        arr = np.array(tbl).astype(float); don = arr.copy(); don[403:434, 648:717] = np.array(donor)
        out_arr = np.uint8(np.clip(arr*(1-wgt)+don*wgt, 0, 255))
        out = CELS / 'cafe_table_layer_nospoon.png'
        save(out_arr, out, CELS / 'cafe_table_layer.png')
        REPORT['steps'][-1]['note'] = 'story-state 道具变体：abs>=11.9 起碟上无勺（勺在女孩手中）；碟面勺正下方区域回补，羽化4px'
        flush()
        print(json.dumps({'r3Steps': len(names)+4, 'measures': measures, 'manifestFiles': write_manifest()}))
        return
    if '--r2' in sys.argv:
        load_report()
        # r2-1) 椅层拆左右单椅（贴身bbox），座垫锚点由 viewer 配置引用
        fg = load(CELS / 'cafe_table_fg_clean.png')
        for side, x0, x1 in [('left', 0, 583), ('right', 1338, 1920)]:
            sub = fg[:, x0:x1].copy()
            a = sub[:, :, 3]; ys, xs = np.nonzero(a > 32)
            crop = sub[ys.min():ys.max()+1, xs.min():xs.max()+1]
            out = CELS / f'cafe_chair_{side}.png'
            save(crop, out, CELS / 'cafe_table_fg_clean.png')
            REPORT['steps'][-1]['note'] = f'单椅贴身裁切；原图列范围 {x0}-{x1}；座垫顶 y=563（原图坐标）'
            REPORT['steps'][-1]['cushionAnchorSrcPx'] = [int(xs.min() + (xs.max()-xs.min())/2), 563]
            REPORT['steps'][-1]['cropOrigin'] = [x0 + int(xs.min()), int(ys.min())]
        # r2-2) 敲杯手贴片：girl_sit 合十双手裁切（不含勺——勺在 viewer 运行时按手→杯连线绘制）
        sit = Image.open(CELS / 'girl_sit_clean.png').convert('RGBA')
        # r2-2) 敲杯手贴片：girl_sit 合十双手裁切，按肤色蒙版抠出（去裙摆/膝盖背景）；
        # 不含勺——勺在 viewer 运行时按手→杯连线绘制
        sit = Image.open(CELS / 'girl_sit_clean.png').convert('RGBA')
        hand = np.array(sit.crop((450, 735, 610, 825))).astype(int)  # 160x90
        r_, g_, b_, a_ = [hand[:, :, i] for i in range(4)]
        skin = ((r_>170)&(g_>120)&(b_>95)&(r_>=b_+8)&(r_>=g_-5)&(a_>100)).astype('uint8')*255
        skin = np.array(Image.fromarray(skin).filter(ImageFilter.GaussianBlur(1.5)))
        hand[:, :, 3] = np.minimum(hand[:, :, 3], skin)
        patch = Image.new('RGBA', (210, 150), (0, 0, 0, 0))
        patch.alpha_composite(Image.fromarray(hand.astype('uint8')), (25, 15))
        out = CELS / 'girl_hand_spoon_patch.png'
        save(np.array(patch), out, CELS / 'girl_sit_clean.png')
        REPORT['steps'][-1]['note'] = '敲杯手贴片（最小实现）：合十双手肤色抠图；锚点=双手中心(105,80)；勺由 viewer 运行时按手→杯连线绘制'
        REPORT['steps'][-1]['wristAnchorPx'] = [105, 80]
        # r2-3) 桌层边缘 teal 椅条带清除（分列错分遗留）
        table = load(CELS / 'cafe_table_layer.png').astype(int)
        r_, g_, b_, a_ = [table[:, :, i] for i in range(4)]
        teal = (b_ > 120) & (g_ > 120) & (r_ < 140) & (abs(g_ - b_) < 60) & (a_ > 100)
        band = np.zeros_like(teal); band[:, 583:700] = True; band[:, 1200:1338] = True
        kill = teal & band
        table[:, :, 3] = np.where(kill, 0, table[:, :, 3])
        save(table.astype('uint8'), CELS / 'cafe_table_layer.png', CELS / 'cafe_table_layer.png')
        REPORT['steps'][-1]['note'] = f'桌层边缘椅条带清除（{int(kill.sum())}px）'
        flush()
        print(json.dumps({'r2Steps': 4, 'manifestFiles': write_manifest()}))
        return
    if '--r7' in sys.argv:
        load_report()
        import subprocess as sp
        # r7-1) batch4 t 相位 cel 清理（batch3 三张复用既有 _clean；t1r/t7r 为女孩右起转补画，仅女孩）
        for who in ['girl', 'boy']:
            for t in ['t1', 't3', 't5', 't6', 't7'] + (['t1r', 't7r'] if who == 'girl' else []):
                clean(f'{who}_turn_{t}_v1.png')
        # r7-2) stabilize_cel_anchors 配准（脸/髋/支撑脚底对齐；髋部锚点 grid 目检实测）
        hips = {
            'girl': {'front_open': [495, 700], 't1': [390, 545], 'side_cross': [355, 705], 't3': [480, 560],
                     'back_open': [470, 720], 't5': [420, 555], 't6': [600, 570], 't7': [470, 590],
                     't1r': [560, 620], 't7r': [480, 585]},
            'boy': {'front_open': [505, 660], 't1': [520, 640], 'side_cross': [390, 690], 't3': [510, 630],
                    'back_open': [445, 670], 't5': [500, 640], 't6': [500, 630], 't7': [500, 660]},
        }
        rig0 = json.loads((EP / 'hybrid/config/rig_turn_cels.json').read_text())
        KEYS_GIRL = ['front_open', 't1r', 't6', 't5_mir_src', 'back_open', 't3_mir_src', 'side_cross', 't7r']
        KEYS = ['front_open', 't1', 'side_cross', 't3', 'back_open', 't5', 't6', 't7']
        for who, faceY, hipY, keys in [('girl', 215, 690, KEYS_GIRL), ('boy', 225, 680, KEYS)]:
            cels_cfg = []
            for k in keys:
                kk = k.replace('_mir_src', '')  # t3_mir/t5_mir 由配准版镜像派生，不进配准输入
                src = CELS / f'{who}_turn_{kk}_clean.png'
                if k.endswith('_mir_src'): continue
                entry = {'id': f'{who}_{kk}', 'file': str(src.relative_to(EP)), 'columns': 1, 'rows': 1, 'cell': 0,
                         'hip': hips[who][kk]}
                # 头部锚点：batch3 三张用既有标定；t 相位用顶部区域质心近似（背面无脸，检测器会失败）
                if f'{who}_{kk}' in rig0['cels']:
                    entry['face'] = rig0['cels'][f'{who}_{kk}']['j']['head'][:2]
                else:
                    a = load(src)[:, :, 3]; ys, xs = np.nonzero(a > 32)
                    top = ys.min()
                    m = (ys < top + 300)
                    entry['face'] = [int(xs[m].mean()), int(top + 185)]
                cels_cfg.append(entry)
            cfg = {'size': [1024, 1536], 'scale': 1.0, 'faceTarget': [512, faceY], 'hipTarget': [512, hipY],
                   'groundY': 1470, 'faceROI': [300, 60, 724, 460], 'cels': cels_cfg,
                   'output': 'hybrid/assets/cels/turn_reg'}
            cfgp = EP / f'hybrid/config/stabilize_turn7_{who}.json'
            cfgp.write_text(json.dumps(cfg, indent=2))
            r = sp.run(['python', str(EP / '../../../dula-skills/draw-over-animation/scripts/stabilize_cel_anchors.py'),
                        '--episode', str(EP), '--config', f'hybrid/config/stabilize_turn7_{who}.json'],
                       capture_output=True, text=True)
            print(r.stdout.strip() or r.stderr.strip()[-500:])
            if r.returncode: raise SystemExit(f'stabilize failed: {who}')
        # r7-3) 配准后测量：contentTop/Bottom、支撑脚 pin（贴地脚）、头/手粗框（驱动层用）
        measures = {}
        for who, keys in [('girl', KEYS_GIRL), ('boy', KEYS)]:
            for k in keys:
                kk = k.replace('_mir_src', '')
                rgba = load(CELS / f'turn_reg/{who}_{kk}.png')
                a = rgba[:, :, 3]; ys, xs = np.nonzero(a > 32)
                top, bottom = int(ys.min()), int(ys.max())
                # 支撑脚：贴地行（groundY±8）的 alpha 簇
                rowband = a[1458:1478]
                fys, fxs = np.nonzero(rowband > 32)
                # 左右脚簇分离（x 中点切半，取覆盖贴地行最多的簇）
                pin = [512, 1465]
                if len(fxs):
                    xm = np.median(fxs)
                    for side in [fxs <= xm, fxs > xm]:
                        if side.sum() >= len(fxs) * .3:
                            pin = [int(fxs[side].mean()), 1465]
                            if side.sum() >= len(fxs) * .62: break
                # 手：上半身（y 400-900）躯干外（|x-512|>160）暖肤簇质心
                rgb = rgba[:, :, :3].astype(int)
                skin = (rgb[:, :, 0] > 190) & (rgb[:, :, 1] > 130) & (rgb[:, :, 2] > 100) & (rgb[:, :, 0] > rgb[:, :, 2] + 20) & (a > 200)
                hands = {}
                yy, xx = np.mgrid[:1536, :1024]
                zone = skin & (yy > 400) & (yy < 900)
                for side, m in [('left', zone & (xx > 662)), ('right', zone & (xx < 362))]:
                    ys2, xs2 = np.nonzero(m)
                    hands[side] = [int(xs2.mean()), int(ys2.mean())] if len(xs2) > 200 else None
                measures[f'{who}_{kk}'] = {'contentTop': top, 'contentBottom': bottom, 'pin': pin, 'hands': hands}
        # 女孩背面 3/4：t3/t5 配准版水平镜像（背面看不到口袋，任务书许可；锚点 x=512 对称故镜像后锚定不变）
        for k in ['t3', 't5']:
            im = Image.open(CELS / f'turn_reg/girl_{k}.png').transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            im.save(CELS / f'turn_reg/girl_{k}_mir.png')
            mm = measures[f'girl_{k}']
            measures[f'girl_{k}_mir'] = {'contentTop': mm['contentTop'], 'contentBottom': mm['contentBottom'],
                'pin': [1024-mm['pin'][0], mm['pin'][1]],
                'hands': {'left': mm['hands']['right'] and [1024-mm['hands']['right'][0], mm['hands']['right'][1]],
                          'right': mm['hands']['left'] and [1024-mm['hands']['left'][0], mm['hands']['left'][1]]}}
            REPORT['steps'].append({'output': f'hybrid/assets/cels/turn_reg/girl_{k}_mir.png',
                'source': f'hybrid/assets/cels/turn_reg/girl_{k}.png',
                'sourceSha256': sha(CELS / f'turn_reg/girl_{k}.png'),
                'sha256': sha(CELS / f'turn_reg/girl_{k}_mir.png'),
                'note': '女孩背面3/4水平镜像（背面看不到口袋可镜像——r8 任务书依据）'})
        (EP / 'hybrid/config/turn7_measures.json').write_text(json.dumps(measures, indent=2))
        flush()
        print(json.dumps({'r7': 'registered+measured', 'manifestFiles': write_manifest()}))
        return
    if '--r9' in sys.argv:
        load_report()
        import subprocess as sp
        # r9) 转身正面系画同图嘴部变体（批次5）：头裁区原点=蒙版模板匹配（turn_headcrop_origins.json），
        #    嘴子窗逐 cel 目检标定（raw cel 坐标）；贴回后并入 stabilize 配准输入（同锚点→几何一致）。
        origins = json.loads((EP / 'hybrid/config/turn_headcrop_origins.json').read_text())
        import cv2
        # 嘴子窗（headcrop 坐标 → raw cel 坐标在下方换算）
        mouthInCrop = {'girl_front_open': [140, 198, 90, 45], 'girl_t1r': [225, 160, 55, 28],
                       'girl_t7r': [105, 150, 55, 28], 'boy_front_open': [135, 225, 95, 45],
                       'boy_t1': [175, 158, 55, 30], 'boy_t7': [178, 193, 55, 30]}
        made = []
        for key, mic in mouthInCrop.items():
            who = key.split('_')[0]
            org = origins[key]['origin']
            rect = [org[0]+mic[0], org[1]+mic[1], mic[2], mic[3]]
            for st in ['open', 'half']:
                base = load(CELS / f'{who}_turn_{key[len(who)+1:]}_clean.png')
                var = load(CELS / f'{who}_turn_{key[len(who)+1:]}_v1_mouth_{st}.png')
                # 变体=头裁区同图重绘；只取嘴子窗（白底区在窗外），alpha 加权防白边
                out = base.copy()
                x, y, w, h = rect
                vs = var[mic[1]:mic[1]+h, mic[0]:mic[0]+w]  # 头裁区坐标=变体自身坐标
                mask = np.zeros((1536, 1024), np.uint8)
                cv2.rectangle(mask, (x, y), (x+w-1, y+h-1), 255, -1)
                wgt = np.clip(cv2.distanceTransform(mask, cv2.DIST_L2, 3)/5, 0, 1)[:, :, None]
                plate = base.copy().astype(float)
                plate[y:y+h, x:x+w] = vs.astype(float)
                out = np.uint8(np.clip(base.astype(float)*(1-wgt) + plate*wgt, 0, 255))
                out[:, :, 3] = base[:, :, 3]
                outside = np.ones((1536, 1024), bool); outside[y:y+h, x:x+w] = False
                assert np.array_equal(out[outside], base[outside]), f'{key} mouth {st} outside diff'
                p = CELS / f'{who}_turn_{key[len(who)+1:]}_clean_mouth_{st}.png'
                save(out, p, CELS / f'{who}_turn_{key[len(who)+1:]}_clean.png')
                REPORT['steps'][-1]['note'] = f'批次5同图嘴部变体贴回（raw cel 坐标 {rect}，锁区外零差分）'
                made.append(p.name)
        # 并入配准：嘴部变体与底图同锚点
        for who, keys in [('girl', ['front_open', 't1r', 't7r']), ('boy', ['front_open', 't1', 't7'])]:
            cfgp = EP / f'hybrid/config/stabilize_turn7_{who}.json'
            cfg = json.loads(cfgp.read_text())
            existing = {c['id'] for c in cfg['cels']}
            for k in keys:
                baseEntry = [c for c in cfg['cels'] if c['id'] == f'{who}_{k}'][0]
                for st in ['open', 'half']:
                    vid = f'{who}_{k}_mouth_{st}'
                    if vid in existing: continue
                    cfg['cels'].append({'id': vid,
                        'file': f'hybrid/assets/cels/{who}_turn_{k}_clean_mouth_{st}.png',
                        'columns': 1, 'rows': 1, 'cell': 0, 'hip': baseEntry['hip'], 'face': baseEntry['face']})
            cfgp.write_text(json.dumps(cfg, indent=2))
            r = sp.run(['python', str(EP / '../../../dula-skills/draw-over-animation/scripts/stabilize_cel_anchors.py'),
                        '--episode', str(EP), '--config', f'hybrid/config/stabilize_turn7_{who}.json'],
                       capture_output=True, text=True)
            print(r.stdout.strip() or r.stderr.strip()[-500:])
            if r.returncode: raise SystemExit(f'stabilize failed: {who}')
        # 变体与底图同几何 → 测量复制底图
        m = json.loads((EP / 'hybrid/config/turn7_measures.json').read_text())
        for key in mouthInCrop:
            for st in ['open', 'half']:
                m[f'{key}_mouth_{st}'] = {**m[key], 'note': '嘴部变体，几何同底图'}
        (EP / 'hybrid/config/turn7_measures.json').write_text(json.dumps(m, indent=2))
        flush()
        print(json.dumps({'r9': 'mouth variants registered', 'made': len(made), 'manifestFiles': write_manifest()}))
        return
    if '--variants2' in sys.argv:
        load_report()
        # r7) 同图表情变体贴回：变体=底图头部裁区的局部编辑（白底），
        #    RGB 取变体、alpha 取底图（剪影/发丝边不漂），整裁区按原点贴回，禁仿射缩放。
        #    眼+嘴组合：嘴区从嘴变体取（锁区羽毛用共享 compose 等效内联，带零差分断言）。
        import cv2
        fa = json.loads((EP / 'hybrid/config/cel_slots.json').read_text())['faceActing']
        V2 = CELS / 'variants2'; V2.mkdir(exist_ok=True)
        for celKey, spec in fa['cels'].items():
            who = 'girl' if celKey.startswith('Girl') else 'boy'
            x0, y0, cw, ch = fa['headCrop'][who]
            base = load(CELS / spec['src'].split('/').pop())
            baseCrop = base[y0:y0+ch, x0:x0+cw].copy()
            cache = {}
            def variant(name):
                if name not in cache:
                    cache[name] = np.array(Image.open(CELS / f'{who}_sit_{name}_v1.png').convert('RGBA'))
                return cache[name]
            eyesStates = ['neutral'] + spec.get('eyes', []) + (['blink'] if spec.get('blink') else [])
            made = []
            for eyes in eyesStates:
                for mouth in (['closed'] if eyes == 'blink' else ['closed', 'half', 'open']):
                    if eyes == 'neutral' and mouth == 'closed': continue
                    # 底图（含眼态替换）
                    crop = baseCrop.copy()
                    # 白底变体的边缘像素被白色污染（发丝半透明边）→RGB 按底图 alpha 加权：
                    # 内饰（a≥255）取变体，描边/发丝边（a<200）保留底图暗色，平滑过渡。
                    wA = np.clip((baseCrop[:, :, 3].astype(float)-200)/55, 0, 1)[:, :, None]
                    if eyes != 'neutral':
                        ev = variant('eyes_tease' if eyes == 'tease' else 'eyes_focus' if eyes == 'focus' else 'eyes_blink')
                        crop[:, :, :3] = np.uint8(np.clip(ev[:, :, :3].astype(float)*wA + crop[:, :, :3].astype(float)*(1-wA), 0, 255))
                    if mouth != 'closed':
                        mv = variant(f'mouth_{mouth}')
                        # 嘴区羽毛锁回（compose 等效：内侧距离变换；锁区=裁区内嘴窗）
                        mx0, my0 = spec['mouthRect'][0]-x0, spec['mouthRect'][1]-y0
                        mw, mh = spec['mouthRect'][2], spec['mouthRect'][3]
                        mask = np.zeros((ch, cw), np.uint8)
                        cv2.rectangle(mask, (mx0, my0), (mx0+mw-1, my0+mh-1), 255, -1)
                        wgt = np.clip(cv2.distanceTransform(mask, cv2.DIST_L2, 3)/6, 0, 1)[:, :, None]
                        crop = np.uint8(np.clip(crop*(1-wgt) + mv*wgt, 0, 255))
                        crop[:, :, 3] = baseCrop[:, :, 3]  # alpha 恒取底图
                    out = base.copy(); out[y0:y0+ch, x0:x0+cw] = crop
                    # 锁区外零差分断言
                    outside = np.ones(base.shape[:2], bool)
                    outside[y0:y0+ch, x0:x0+cw] = False
                    assert np.array_equal(out[outside], base[outside]), f'{celKey} outside diff'
                    pid = f'{celKey}_e{eyes}_m{mouth}'
                    save(out, V2 / f'{pid}.png', CELS / spec['src'].split('/').pop())
                    REPORT['steps'][-1]['note'] = f'r5c 同图变体贴回（裁区原点 ({x0},{y0})，零缩放；alpha 取底图）'
                    made.append(pid)
        flush()
        print(json.dumps({'variants2': len(made), 'manifestFiles': write_manifest()}))
        return
    if '--variants' in sys.argv:
        load_report()
        # r5) 同头眼/嘴窗整换变体：供体窗（肖像坐标）仿射缩进目标 cel 实测框，
        #    生成 donor plate（与 cel 同尺寸，仅目标矩形内有内容），
        #    再发共享 compose_cel_regions.py 配置（锁区外零差分由共享脚本断言）。
        slots = json.loads((EP / 'hybrid/config/cel_slots.json').read_text())
        fa = slots['faceActing']
        VD = EP / 'hybrid/tmp/variant_donors'; VD.mkdir(parents=True, exist_ok=True)
        items = []
        for celKey, spec in fa['cels'].items():
            who = 'girl' if celKey.startswith('Girl') else 'boy'
            wins = fa['sourceWindows'][who]; donors = fa['donors'][who]
            eyesStates = ['neutral'] + spec.get('eyes', []) + (['blink'] if spec.get('blink') else [])
            for eyes in eyesStates:
                for mouth in (['closed'] if eyes == 'blink' else ['closed', 'half', 'open']):
                    if eyes == 'neutral' and mouth == 'closed': continue  # 基图本体
                    plate = Image.new('RGBA', (1024, 1536), (0, 0, 0, 0))
                    rects = []
                    if eyes != 'neutral':
                        d = Image.open(CELS / donors[eyes]).convert('RGBA')
                        w = wins['eyes']; r = spec['eyesRect']
                        # 等比缩放居中（r5b：禁止拉伸填满；供体只含眼球/眼睑，不含眉睫暗带）
                        sc = min(r[2]/w[2], r[3]/w[3])
                        cw, ch = round(w[2]*sc), round(w[3]*sc)
                        px, py = round(r[0]+(r[2]-cw)/2), round(r[1]+(r[3]-ch)/2)
                        plate.paste(d.crop((w[0], w[1], w[0]+w[2], w[1]+w[3])).resize((cw, ch), Image.Resampling.LANCZOS), (px, py))
                        rects.append([px, py, cw, ch])
                    if mouth != 'closed':
                        d = Image.open(CELS / donors[mouth]).convert('RGBA')
                        w = wins['mouth']; r = spec['mouthRect']
                        plate.paste(d.crop((w[0], w[1], w[0]+w[2], w[1]+w[3])).resize((r[2], r[3]), Image.Resampling.LANCZOS), (r[0], r[1]))
                        rects.append(r)
                    pid = f'{celKey}_e{eyes}_m{mouth}'
                    pp = VD / f'{pid}.png'; plate.save(pp)
                    items.append({'base': spec['src'].replace('assets/cels/', 'hybrid/assets/cels/'),
                                  'donor': f'hybrid/tmp/variant_donors/{pid}.png',
                                  'rects': rects, 'feather': 6,
                                  'output': f'hybrid/assets/cels/variants/{pid}.png'})
        cfg = {'comment': 'r5 同头眼/嘴窗整换变体（锁区外零差分由 compose_cel_regions 断言）',
               'report': 'hybrid/config/face_variants_compose_report.json', 'items': items}
        (EP / 'hybrid/config/face_variants_compose.json').write_text(json.dumps(cfg, indent=2, ensure_ascii=False))
        print(json.dumps({'variantItems': len(items)}))
        return
    if '--stats' in sys.argv:
        load_report()
        # 边缘带统计（主代理判据）：所有处理产物 after vs 源文件 before
        rows = []
        seen = {}
        norm = lambda s: s.replace('\\', '/')
        for s in REPORT['steps']:
            key = norm(s['output'])
            out = EP / s['output']
            if not key.endswith('.png') or not out.exists() or key in seen: continue
            seen[key] = 1
            src = EP / s['source']
            row = {'output': key, 'after': edge_stats(out)}
            if key.split('/')[-1] in DERIVED_NO_BEFORE:
                row['note'] = '派生层（拆分/补丁），暗边不做同图前后比对'
            elif src.exists() and str(src) != str(out) and str(src).endswith('.png'):
                row['before'] = edge_stats(src)
            rows.append(row)
        # 脸片 before=未蒙版 512 裁切（按 crops 配置现算）
        for cfgname in ['face_crops.json', 'face_crops_r3.json']:
            cfg = json.loads((EP / 'hybrid/config' / cfgname).read_text())
            for item in cfg['items']:
                src = Image.open(EP / item['source']).convert('RGBA')
                if 'crop' in item: src = src.crop(item['crop'])
                if 'size' in item: src = src.resize(tuple(item['size']), Image.Resampling.LANCZOS)
                tmp = EP / 'hybrid/tmp/_stats_tmp.png'; src.save(tmp)
                out = EP / item['output']
                row = {'output': norm(item['output']), 'before': edge_stats(tmp),
                       'after': edge_stats(out) if out.exists() else None}
                rows = [r for r in rows if r['output'] != row['output']] + [row]
        for row in rows:
            a = row.get('after'); b = row.get('before')
            row['brightPass'] = bool(a and a['brightPct'] <= 1.5)
            row['darkNotWorse'] = bool(not b or not a or a['darkPct'] <= b['darkPct'] + 0.5)
        REPORT['edgeStats'] = sorted(rows, key=lambda r: r['output'])
        REPORT['edgeStatsRule'] = 'alpha 30-220 边带内 lum>200 占比 <=1.5%（亮边不新增）；lum<60 暗边占比不恶化（线稿保护）'
        flush()
        bad = [r['output'] for r in rows if not r['brightPass'] or not r['darkNotWorse']]
        print(json.dumps({'files': len(rows), 'failing': bad}))
        return
    if '--mask3' in sys.argv:
        load_report()
        # r3 表情脸槽多边形蒙版（r4 P0-2：边界由 auto_poly 按亮度场数据驱动，落发际/描线/颈影）
        poly = {}
        for who in ['girl', 'boy']:
            base = CELS / f'{who}_face_closed.png'
            poly[who] = auto_poly(base)  # 蒙版只改 alpha 不改亮度，已蒙版文件上重跑也安全
        for prefix, who in [('girl_face_tease', 'girl'), ('girl_face_invite', 'girl'),
                            ('boy_face_focus', 'boy'), ('boy_face_lookup', 'boy')]:
            for state in ['closed', 'half', 'open', 'blink']:
                p = CELS / f'{prefix}_{state}.png'
                if not p.exists(): continue
                poly_mask(p, poly[who])
                REPORT['steps'][-1]['note'] = 'r4 多边形蒙版（auto_poly 数据驱动）'
        REPORT['facePolygons'] = poly
        flush()
        print(json.dumps({'masked': 'r3', 'polygons': poly, 'manifestFiles': write_manifest()}))
        return
    if '--mask' in sys.argv:
        load_report()
        # 5) 脸 cel 蒙版（共享脚本产出 512 脸图之后；r4 auto_poly 数据驱动）
        poly = {}
        for who in ['girl', 'boy']:
            for state in ['closed', 'half', 'open', 'blink']:
                p = CELS / f'{who}_face_{state}.png'
                if who not in poly: poly[who] = auto_poly(p)  # 首个 state（closed）上取边界
                poly_mask(p, poly[who])
                REPORT['steps'][-1]['note'] = 'r4 多边形蒙版（auto_poly 数据驱动）'
        REPORT['facePolygons'] = poly
        flush()
        print(json.dumps({'masked': 8, 'manifestFiles': write_manifest()}))
        return
    # 1) 清理：新生成的身体/家具 cel + 既有身份锚正面全身（复制进 cels/ 保持槽位局部化）
    cleaned = {}
    for name in ['girl_side_v1.png', 'girl_back_v1.png', 'boy_side_v1.png', 'boy_back_v1.png',
                 'girl_sit_v1.png', 'boy_sit_v1.png', 'cafe_table_fg_v1.png']:
        cleaned[name] = clean(name)
    for who in ['girl', 'boy']:
        src = EP / f'assets/images/{who}_body_v1.png'
        rgba = load(src)
        a, removed = despeckle(rgba[:, :, 3]); rgba[:, :, 3] = a
        rgba, fringed = defringe(rgba)
        out = CELS / f'{who}_stand_v1.png'
        save(rgba, out, src)
        REPORT['steps'][-1].update(removedSpecklePx=removed, defringedPx=fringed, note='身份锚原版复制体（清理后）')
        cleaned[f'{who}_stand'] = out

    # 2) 镜像（转身后半圈用）
    mir = {}
    for key, src in [('girl_side', cleaned['girl_side_v1.png']), ('boy_side', cleaned['boy_side_v1.png']),
                     ('girl_stand', cleaned['girl_stand']), ('boy_stand', cleaned['boy_stand'])]:
        im = Image.open(src).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        out = CELS / f'{key}_mir_v1.png'; im.save(out)
        REPORT['steps'].append({'output': str(out.relative_to(EP)), 'source': str(Path(src).relative_to(EP)),
                                'sourceSha256': sha(src), 'sha256': sha(out), 'note': '水平镜像（rim 光方向随镜像翻转，开放风险见 NOTES）'})
        mir[key] = out

    # 3) 转身 8 帧：统一人高 700、脚底 y=720、脚底中心 x=256。
    # 转身方向：Girl yaw 0→+2π（1/4 圈时面向画面右→需侧面镜像）；Boy 0→-2π（1/4 圈面向画面左→原侧面）。
    seqs = {
        'girl': [cleaned['girl_stand'], cleaned['girl_stand'], mir['girl_side'], mir['girl_side'],
                 cleaned['girl_back_v1.png'], cleaned['girl_back_v1.png'], cleaned['girl_side_v1.png'], mir['girl_stand']],
        'boy':  [cleaned['boy_stand'], cleaned['boy_stand'], cleaned['boy_side_v1.png'], cleaned['boy_side_v1.png'],
                 cleaned['boy_back_v1.png'], cleaned['boy_back_v1.png'], mir['boy_side'], mir['boy_stand']],
    }
    for who, seq in seqs.items():
        for i, src in enumerate(seq):
            frame = turn_frame(load(src))
            save(np.array(frame), CELS / f'{who}_turn_{i}.png', src)
            REPORT['steps'][-1]['note'] = 'turn frame: person height 700px, foot center->anchor[256,720]'

    # 4) 家具拆层：alpha 谷底 x=583 / x=1338（实测）。椅层在后，桌面层在前。
    fg = load(cleaned['cafe_table_fg_v1.png'])
    chairs = np.zeros_like(fg); table = np.zeros_like(fg)
    chairs[:, :583] = fg[:, :583]; chairs[:, 1338:] = fg[:, 1338:]
    table[:, 583:1338] = fg[:, 583:1338]
    save(chairs, CELS / 'cafe_chairs_layer.png', cleaned['cafe_table_fg_v1.png'])
    save(table, CELS / 'cafe_table_layer.png', cleaned['cafe_table_fg_v1.png'])
    REPORT['steps'][-2]['note'] = '椅层=双椅（x<583 或 x>1338 列），后层'
    REPORT['steps'][-1]['note'] = '桌面层=桌+杯碟+笔记本（583<=x<1338 列），前层遮挡下半身；分列边界条带的遮挡次序误差见 NOTES'

    # 5) 脸 cel 椭圆蒙版 → 单独 --mask 步骤（需先跑共享 compose/crops 产出 512 脸图）
    flush()
    print(json.dumps({'steps': len(REPORT['steps']), 'manifestFiles': write_manifest()}))

if __name__ == '__main__':
    main()
