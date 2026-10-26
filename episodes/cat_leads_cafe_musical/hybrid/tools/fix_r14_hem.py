#!/usr/bin/env python
"""r14 比例门修画（hybrid 本地薄工具）。

背景（r14 主代理驳回）：女孩 6+ 张侧/背面转身画裙摆下缘漂移（hem bottom 比锚高 +3~4%，
裙摆偏低偏长 → 观感腿短）；男孩从未建地标表过门。

做法（有界修画，仅垂直分区重映射，脚底/头顶/腰部以上不动）：
  [0, waist)        恒等
  [waist, hem)      压缩 → hemFrac 回到锚 0.544（±0.005）
  [hem, sockTop)    延展（大腿皮肤区拉长补齐——治"腿短"观感）
  [sockTop, 底]     恒等（脚部不动，底锚）
修 raw cel（girl_turn_*_v1.png），原图先备份到 hybrid/assets/cels/r14_pre/。
修后验证：蓝格裙底缘检测复测 hemFrac 必须落 0.544±0.005，否则报错不修表。

男孩：本工具只写地标表（刻度图人工读数，见 PIPELINE_NOTES r14 节），不改图——
8 相位实测全部落入 ±3% 门内（t1 裤脚 -2.7% 为最接近边界者，步态画抬腿腿裤脚上移
属姿势固有，读数取支撑腿）。
"""
import json, shutil, sys
from pathlib import Path
import numpy as np
from PIL import Image
import cv2

EP = Path(__file__).resolve().parents[2]
CELS = EP / 'hybrid/assets/cels'
TABLES = EP / 'hybrid/tmp/prop_tables'
BACKUP = CELS / 'r14_pre'

HEM_TARGET = 0.544
HEM_TOL = 0.005

# 待修女孩画：key -> (waistTop, hemBottom实测, sockTop) 取自 tmp/prop_tables/girl_<key>.json
GIRL_FIX = ['side_cross', 't1r', 't3', 'back_open', 't5', 't6', 't7', 't7r']

# 男孩地标表（刻度图人工读数：腰带=衬衫下缘黑皮带顶；裤脚=支撑腿裤脚下缘/白鞋上缘）
BOY_ANCHOR = {'H': 1502, 'bands': {'waist': {'top': 0.389}, 'pants': {'bottom': 0.912}}}
BOY_TABLES = {
    'front_open': (0.390, 0.895), 't1': (0.387, 0.885), 'side_cross': (0.397, 0.902),
    't3': (0.380, 0.895), 'back_open': (0.378, 0.912), 't5': (0.366, 0.912),
    't6': (0.394, 0.931), 't7': (0.397, 0.919),
}

def content_y(a, thr=32):
    ys = np.nonzero(a > thr)[0]
    return int(ys.min()), int(ys.max())

def skirt_hem_row(im, waistRow):
    """蓝格裙底缘：腰带以下最后一行深蓝格（b 显著大于 r/g）。发丝钴蓝高光在裙摆上方，不干扰底缘。"""
    a = im[:, :, 3].astype(int)
    r, g, b = [im[:, :, i].astype(int) for i in range(3)]
    blue = (b > 90) & (b > r + 25) & (b > g + 10) & (a > 200)
    blue[:waistRow] = False
    rows = blue.sum(1)
    ys = np.nonzero(rows > 20)[0]
    return int(ys.max()) if len(ys) else None

def warp_hem(im, waistF, hemF, sockF, hemTargetF=HEM_TARGET):
    a = im[:, :, 3]
    y0, y1 = content_y(a)
    H = y1 - y0 + 1
    waistRow = y0 + waistF * H
    hemRow = y0 + hemF * H
    sockRow = y0 + sockF * H
    hemDst = y0 + hemTargetF * H
    # 整数结行：结外严格恒等（remap 非整采样会混入邻行）
    waistI = int(round(waistRow)); sockI = int(round(sockRow)); hemDstI = int(round(hemDst))
    h_img = im.shape[0]
    ys = np.arange(h_img, dtype=np.float32)
    src = ys.copy()
    m1 = (ys > waistI) & (ys <= hemDstI)
    src[m1] = waistRow + (ys[m1] - waistRow) * (hemRow - waistRow) / (hemDst - waistRow)
    m2 = (ys > hemDstI) & (ys < sockI)
    src[m2] = hemRow + (ys[m2] - hemDst) * (sockRow - hemRow) / (sockRow - hemDst)
    mapx = np.tile(np.arange(im.shape[1], dtype=np.float32), (h_img, 1))
    out = cv2.remap(im, mapx, src[:, None].repeat(im.shape[1], 1),
                    cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    return im, out, {'y0': y0, 'H': H, 'waistRow': waistRow, 'hemRow': hemRow,
                     'sockRow': sockRow, 'hemDst': hemDst, 'waistI': waistI, 'sockI': sockI}

def main():
    # 0) 男孩地标表（纯写表，不改图）
    (TABLES / 'boy_anchor.json').write_text(json.dumps(BOY_ANCHOR, indent=1))
    for k, (w, p) in BOY_TABLES.items():
        (TABLES / f'boy_{k}.json').write_text(json.dumps(
            {'bands': {'waist': {'top': w}, 'pants': {'bottom': p}}}, indent=1))
    print(f'boy tables written: anchor + {len(BOY_TABLES)} cels (no image change)')

    if '--tables-only' in sys.argv:
        return

    # 1) 女孩修画
    BACKUP.mkdir(exist_ok=True)
    results = {}
    for key in GIRL_FIX:
        tbl = json.loads((TABLES / f'girl_{key}.json').read_text())
        waistF = tbl['bands']['waist']['top']
        sockF = tbl['bands']['sock']['top']
        p = CELS / f'girl_turn_{key}_v1.png'
        bak = BACKUP / p.name
        if not bak.exists():
            shutil.copy2(p, bak)
        before = np.array(Image.open(bak).convert('RGBA'))  # 幂等：恒从 r14 前原图出发
        # 源裙摆行从备份图实测（表此时可能已是修后值）；与表原始值交叉校验
        y0b, y1b = content_y(before[:, :, 3]); Hb = y1b - y0b + 1
        hemRowDet = skirt_hem_row(before, int(round(y0b + waistF * Hb)))
        hemF = (hemRowDet - y0b) / Hb
        if 'r14' not in tbl.get('note', ''):
            assert abs(hemF - tbl['bands']['hem']['bottom']) <= 0.01, \
                f"{key} hem detect {hemF:.4f} vs table {tbl['bands']['hem']['bottom']}"
        out, geo, frac2 = None, None, None
        target = HEM_TARGET
        for _ in range(3):  # 压缩后底缘行被皮肤混色稀释，按实测残差补偿目标行
            _, out, geo = warp_hem(before, waistF, hemF, sockF, target)
            hem2 = skirt_hem_row(out, geo['waistI'])
            frac2 = (hem2 - geo['y0']) / geo['H']
            if abs(frac2 - HEM_TARGET) <= HEM_TOL:
                break
            target += HEM_TARGET - frac2
        assert abs(frac2 - HEM_TARGET) <= HEM_TOL, f'{key} hem after fix {frac2:.4f} out of tol'
        # 验证 1：内容框不变（顶/底锚定）
        ay0, ay1 = content_y(out[:, :, 3])
        assert (ay0, ay1) == (geo['y0'], geo['y0'] + geo['H'] - 1), f'{key} content bbox moved'
        # 验证 2：腰结行以上/袜口结行以下逐像素恒等
        wi, si = geo['waistI'], geo['sockI']
        assert np.array_equal(out[:wi + 1], before[:wi + 1]), f'{key} above-waist diff'
        assert np.array_equal(out[si:], before[si:]), f'{key} below-sock diff'
        Image.fromarray(out).save(p)
        # 更新地标表为修后复测值
        tbl['bands']['hem']['bottom'] = round(frac2, 3)
        tbl['note'] = 'r14 修画后复测（蓝格裙底缘检测）'
        (TABLES / f'girl_{key}.json').write_text(json.dumps(tbl, indent=1) + '\n')
        results[key] = {'hemBefore': hemF, 'hemAfter': round(frac2, 4),
                        'deltaPx': round(geo['hemRow'] - geo['hemDst'], 1),
                        'thighStretchPx': [round(geo['sockRow'] - geo['hemRow'], 1),
                                           round(geo['sockRow'] - geo['hemDst'], 1)]}
        print(f"fixed {key}: hem {hemF} -> {frac2:.4f} (skirt -{geo['hemRow']-geo['hemDst']:.0f}px, "
              f"thigh {geo['sockRow']-geo['hemRow']:.0f}->{geo['sockRow']-geo['hemDst']:.0f}px)")
    (EP / 'hybrid/tmp/prop_tables/r14_fix_report.json').write_text(json.dumps(results, indent=1))
    print(json.dumps({'fixed': len(results)}, ensure_ascii=False))

if __name__ == '__main__':
    main()
