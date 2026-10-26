#!/usr/bin/env python
"""转身画集纯相似配准（hybrid 本地薄工具）。

背景：共享 stabilize_cel_anchors.py 的三点（脸/髋/脚）分区纵向重映射对同视角步态画成立，
但对多朝向转身画会把侧面画躯干拉长（girl_t6 躯干带 154→344px 病态，主代理实测 217→711）。
本工具只做相似变换：每画统一 scale（按模板全身像素高归一——主代理实测各画内部比例一致：
头=全身 10.0%，故全身高归一==脸高归一）+ 平移（内容中心 x→512、内容底→groundY）。
嘴部变体与其底图共用同一变换。读 stabilize 同一配置格式，输出同名 turn_reg 产物。
"""
import json, hashlib, sys
from pathlib import Path
import numpy as np
from PIL import Image

EP = Path(__file__).resolve().parents[2]

def content_bbox(a, thr=32):
    ys, xs = np.nonzero(a > thr)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())

def white_area(arr):
    r, g, b, a = [arr[:, :, i] for i in range(4)]
    return int(((r > 220) & (g > 220) & (b > 218) & (a > 200)).sum())

def torso_band(arr):
    """躯干带=衬衫白区（中央列带）纵向长度；行阈值取该图行峰值 20%（相对阈值，
    抗配准重采样的边缘抗锯齿损失——绝对阈值曾在 1% 缩放下误报 -21%）。背面发盖衬衫时返回 None。"""
    r, g, b, a = [arr[:, :, i] for i in range(4)]
    white = (r > 220) & (g > 220) & (b > 218) & (a > 200)
    rows = white[:, 430:600].sum(1)
    if not len(rows) or rows.max() < 10: return None
    ys = np.nonzero(rows > rows.max() * .2)[0]
    return int(ys.max() - ys.min()) if len(ys) else None

def main(cfg_path):
    cfg = json.loads((EP / cfg_path).read_text())
    W, H = cfg['size']; ground = cfg['groundY']
    cels = cfg['cels']
    template = next(c for c in cels if c['id'].endswith('front_open'))
    raw = {}
    for c in cels:
        im = Image.open(EP / c['file']).convert('RGBA')
        raw[c['id']] = (im, content_bbox(np.array(im)[:, :, 3]))
    templateH = raw[template['id']][1][3] - raw[template['id']][1][1] + 1
    out = EP / cfg['output']; out.mkdir(parents=True, exist_ok=True)
    records = []
    for c in cels:
        im, (x0, y0, x1, y1) = raw[c['id']]
        h = y1 - y0 + 1
        base = c['id'].split('_mouth_')[0]
        if base != c['id'] and base in raw:
            # 嘴部变体与底图共用变换（底图几何）
            scale = transform_cache[base]['scale']; tx0, ty0 = transform_cache[base]['translate']
        else:
            scale = templateH / h
            tx0, ty0 = None, None
        w2 = max(1, round(im.width * scale)); h2 = max(1, round(im.height * scale))
        rim = im.resize((w2, h2), Image.Resampling.LANCZOS)
        bx0, by0, bx1, by1 = content_bbox(np.array(rim)[:, :, 3])
        if tx0 is None:
            # 内容底→groundY，内容中心 x→W/2
            tx = round(W/2 - (bx0+bx1)/2); ty = round(ground - by1)
            transform_cache[c['id']] = {'scale': scale, 'translate': [tx, ty]}
        else:
            tx, ty = tx0, ty0
        canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        canvas.alpha_composite(rim, (tx, ty))
        canvas.save(out / f"{c['id']}.png")
        records.append({'id': c['id'], 'rawContentH': h, 'scale': round(scale, 4), 'translate': [tx, ty],
                        'torsoRaw': torso_band(np.array(im)), 'torsoReg': torso_band(np.array(canvas)),
                        'whiteAreaRaw': white_area(np.array(im)), 'whiteAreaReg': white_area(np.array(canvas)),
                        'sha256': hashlib.sha256((out / f"{c['id']}.png").read_bytes()).hexdigest()})
    who = 'girl' if '_girl' in cfg_path else 'boy'
    (out / f'registration_sim_{who}.json').write_text(json.dumps({'config': cfg_path, 'template': template['id'],
        'templateRawContentH': templateH, 'mode': 'similarity only (uniform scale + translate)',
        'records': records}, indent=2, ensure_ascii=False))
    print(json.dumps({'cels': len(records), 'templateH': templateH}))

transform_cache = {}
if __name__ == '__main__':
    main(sys.argv[1])
