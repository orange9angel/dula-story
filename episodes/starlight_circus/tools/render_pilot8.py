#!/usr/bin/env python3
"""8秒歌剧试片（30.0–38.0s）：codex 双人宫格原画（关键帧+中间画）逐张曝光 × 空舞台底图。

与 R2 的根本区别：人物不做整图摇摆/弹跳；画与画之间静止，运动全部来自新画。
每张宫格一套固定摆放（格内坐标=台上坐标），位移是画出来的，不会滑步。
融合：每张画按自己的脚底算接触影；舞台模糊光渗入人物边缘（light wrap）；同一暖主光/冷调作用全画面。
用法（剧集目录）：python tools/render_pilot8.py [--preview t ...]
"""
import json
import math
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

EP = Path(__file__).resolve().parents[1]
P8 = EP / "hybrid/pilot8"
cfg = json.loads((EP / "config/pilot8_atlases.json").read_text(encoding="utf-8"))
W, H = 1672, 941
OW, OH, FPS = 1280, 720, 30
T0, T1 = 30.0, 38.0
PLATE = cv2.imread(str(EP / "hybrid/dance/plates/plate_empty.png")).astype(np.float32)
AUDIO = EP / "assets/audio/mix/pilot8_mix.wav"
OUT = EP / "output/borrow_a_melody_pilot8_r1.mp4"
PAIR_H = 560          # 塞蕾娜（较高者）在底图中的站高
FLOOR_Y = 745
STAGE_X = 905         # 双人中心在底图中的 x
SELENE_X = 1040       # 塞蕾娜头顶在底图中的 x（配准锚，三个镜头共用）

# 曝光表 v2：每乐句 8 个关键帧（两张 2x2 宫格 k0/k1）+ 8 张中间画（i0/i1），共 16 张画。
# 关键帧落在四分音符拍点/字头上；中间画在相邻关键帧的中点。
V2 = json.loads((EP / "config/pilot8_atlases_v2.json").read_text(encoding="utf-8"))
TIMES = {p["id"]: p["times"] for p in V2["phrases"]}
V3 = P8 / "v3"
SHOTS = {
    "A": dict(t=(31.85, 33.83), sheet="p1", half=1, keys=[31.85, 32.40, 33.00, 33.41],
              cam=((900, 465, 1.36), (905, 458, 1.44))),
    "B": dict(t=(33.83, 35.42), sheet="p2", cam=((905, 495, 1.18), (905, 495, 1.22))),
    "C": dict(t=(35.42, 36.37), sheet="p3", cam=((880, 430, 1.30), (875, 418, 1.38))),
}
SHOTS["B"]["keys"] = TIMES["p2"]
SHOTS["C"]["keys"] = TIMES["p3"]
CU = dict(t=(36.37, 38.0), seq=[(36.37, "inhale"), (36.47, "u"), (36.93, "i"), (37.64, "closed")],
          push=(1.0, 1.06))
# 中近景 30.0–31.85「借我一小段」：逐字视素（字头取自诺娅分轨 onset），无声处由能量门控回闭口
MCU = dict(t=(30.0, 31.85), blink=(30.04, 30.16),
           seq=[(30.0, "closed"), (30.26, "inhale"), (30.44, "e"), (30.71, "o"), (31.08, "e"), (31.26, "a"),
                (31.45, "o"), (31.59, "a")])


def exposure(sh, t):
    """返回 (宫格文件, 格号)。关键帧 j → k{h} 第 j 格；其后依次为 qa / i / qb（v3 第二层中间画，存在时启用），
    把相邻关键帧间隔四等分；没有第二层时退回 关键帧/中间画 二等分。"""
    halves = [sh["half"]] if "half" in sh else [0, 1]
    ks = sh["keys"]
    marks = []
    for n, j in enumerate(range(len(ks))):
        h, c = halves[j // 4] if len(halves) > 1 else halves[0], j % 4
        nxt = ks[j + 1] if j + 1 < len(ks) else min(sh["t"][1], ks[j] + 2 * (ks[j] - ks[j - 1]))
        d = nxt - ks[j]
        q = (V3 / f"{sh['sheet']}_qa.png").exists() and h == 1 and sh["sheet"] in ("p1", "p2")
        if q:
            marks += [(ks[j], f"k{h}", c), (ks[j] + d * .25, "qa", c), (ks[j] + d * .5, f"i{h}", c), (ks[j] + d * .75, "qb", c)]
        else:
            marks += [(ks[j], f"k{h}", c), (ks[j] + d * .5, f"i{h}", c)]
    cur = marks[0]
    for m in marks:
        if t >= m[0]:
            cur = m
    # p1 关键帧 8（33.41s，正值换气）嘴是张开的，闭口局部编辑被 codex 审核误拦两次；
    # 它在屏上只有 3 帧，改为直接用已修成闭口的下一张中间画（qa）顶替，不跨图移植嘴
    if sh["sheet"] == "p1" and cur[1:] == ("k1", 3):
        return "qa", 3
    return cur[1], cur[2]


# ---------------------------------------------------------------- 宫格切格与固定摆放
_sheet = {}


_ref_stats = None


def lab_stats(c):
    m = c[..., 3] > 200
    lab = cv2.cvtColor(np.clip(c[..., :3], 0, 255).astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)[m]
    return lab.mean(0), lab.std(0) + 1e-3


def match_palette(c, strength=0.85):
    """各宫格由不同次 codex 生成，整体色相/饱和度会漂（v2 实测 p2/p3 裙色比 p1 偏橙红）。
    把每张画人物像素的 Lab 均值/方差对齐到同一张参考画，避免交替换画时颜色闪。"""
    global _ref_stats
    if _ref_stats is None:
        ref = cv2.imread(str(P8 / "v2/p1_k0.png"), cv2.IMREAD_UNCHANGED)[:512, :768].astype(np.float32)
        _ref_stats = lab_stats(ref)
    m = c[..., 3] > 0
    lab = cv2.cvtColor(np.clip(c[..., :3], 0, 255).astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)
    mu, sd = lab_stats(c)
    rm, rs = _ref_stats
    tgt = (lab - mu) * (rs / sd) + rm
    lab = lab + (tgt - lab) * strength
    rgb = cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
    c[..., :3][m] = rgb[m]
    return c


def cells(sheet, kind):
    key = (sheet, kind)
    if key in _sheet:
        return _sheet[key]
    src = (V3 if kind in ("qa", "qb") else P8 / "v2") / f"{sheet}_{kind}.png"
    im = cv2.imread(str(src), cv2.IMREAD_UNCHANGED)
    if im is None or im.shape[2] != 4:
        raise SystemExit(f"missing/opaque sheet {sheet}_{kind}")
    ch, cw = im.shape[0] // 2, im.shape[1] // 2
    out = []
    for i in range(4):
        c = im[(i // 2) * ch:(i // 2 + 1) * ch, (i % 2) * cw:(i % 2 + 1) * cw].copy()
        a = c[..., 3]
        hard = (a > 96).astype(np.uint8)
        n, lab, st, _ = cv2.connectedComponentsWithStats(hard)
        big = max(st[j, 4] for j in range(1, n))
        keep_ids = []
        for j in range(1, n):
            x, y, w_, h_, area = st[j]
            edge = x <= 1 or x + w_ >= cw - 1 or y <= 1 or y + h_ >= ch - 1
            # 贴格边的碎块是邻格串过来的布料：除非是主体（面积≥最大块 25%）否则丢弃
            if area > 1500 and (not edge or area >= 0.25 * big):
                keep_ids.append(j)
        keep = cv2.dilate(np.isin(lab, keep_ids).astype(np.uint8), np.ones((9, 9), np.uint8))
        a = (a * keep).astype(np.float32)
        a[a < 60] = 0
        c = c.astype(np.float32)
        c[..., 3] = a
        out.append(match_palette(c))
    # 逐格比例：codex 宫格下排常比上排大 8–10%。以塞蕾娜（格内右半、几乎不动）的头顶→脚底为尺，
    # 每格缩放到同一站高，绕格底中心缩放以保留格内的台上位置
    norm = []
    for c in out:
        al = c[..., 3] > 60
        feet = np.where(al.any(axis=1))[0].max()
        right = al[:, int(cw * 0.58):]   # 只取塞蕾娜头部所在列，避开转圈时高举的牵手
        top = np.where(right.any(axis=1))[0].min()
        head_cols = np.where(right[top:top + 40].any(axis=0))[0]
        hx = int(cw * 0.58) + float(head_cols.mean())   # 塞蕾娜头顶 x：横向配准锚
        norm.append((feet, top, hx))
        # 格边残余截断（裙摆贴边）：沿贴边列做 28px 软渐隐，避免直线切口
        a = c[..., 3]
        ramp = np.clip(np.arange(cw) / 28.0, 0, 1)
        if (a[:, :2] > 60).sum() > 15:
            a *= ramp[None, :]
        if (a[:, -2:] > 60).sum() > 15:
            a *= ramp[::-1][None, :]
    _sheet[key] = (out, norm, cw)
    return _sheet[key]


def drawing(sheet, kind, k):
    out, norm, cw = cells(sheet, kind)
    c = out[k]
    feet, top, hx = norm[k]
    s = PAIR_H / (feet - top)
    c2 = cv2.resize(c, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    X = SELENE_X - hx * s          # 以塞蕾娜头顶 x 配准：诺娅的位移只来自画面本身
    Y = FLOOR_Y - feet * s
    return c2, int(round(X)), int(round(Y))


# ---------------------------------------------------------------- 融合
BG_BLUR = cv2.GaussianBlur(PLATE, (0, 0), 18)


def contact_shadow(canvas, cel, X, Y):
    """逐人物接触影：在两人之间 alpha 覆盖最少的列处分开，各自按自己的脚底落影。
    脚底高于地面线（踮脚、腾空）时，影子落在地面线上、变淡变大——人物才不会"飘"。"""
    a = cel[..., 3] > 60
    cols = a.any(axis=0)
    xs = np.where(cols)[0]
    if not len(xs):
        return
    cover = a.sum(axis=0).astype(np.float32)
    lo, hi = xs.min() + int((xs.max() - xs.min()) * .3), xs.min() + int((xs.max() - xs.min()) * .7)
    split = lo + int(np.argmin(cover[lo:hi])) if hi > lo else xs.max()
    lowest = np.array([np.where(a[:, x])[0].max() if cols[x] else -1 for x in range(a.shape[1])])
    floor = lowest.max()                                       # 地面线 = 全画最低点（落地者的脚/裙摆）
    sh = np.zeros((H, W), np.float32)
    for x0, x1 in ((xs.min(), split), (split, xs.max())):
        seg = lowest[x0:x1 + 1]
        if (seg >= 0).sum() < 5:
            continue
        fy = seg.max()
        band = np.where(seg >= fy - 6)[0] + x0                # 这个人最下沿的列
        cx, rw = X + band.mean(), max(14, (band.max() - band.min()) * 0.75)
        lift = floor - fy
        k = float(np.exp(-lift / 35.0))
        gy = Y + floor - 2
        cv2.ellipse(sh, (int(cx), int(gy)), (int(rw * (1 + lift / 120)), int(7 + lift / 30)), 0, 0, 360, 0.55 * k + 0.12, -1)
        cv2.ellipse(sh, (int(cx + 30), int(gy - 2)), (int(rw * 1.8), 10), -4, 0, 360, 0.16 * k, -1)  # 主光左上→影子向右后
    sh = cv2.GaussianBlur(sh, (0, 0), 5)[..., None]
    canvas *= 1 - sh * np.array([1.0, 1.08, 0.86], np.float32)


def composite(canvas, cel, X, Y):
    h, w = cel.shape[:2]
    x0, y0, x1, y1 = max(0, X), max(0, Y), min(W, X + w), min(H, Y + h)
    c = cel[y0 - Y:y1 - Y, x0 - X:x1 - X]
    a = c[..., 3:4] / 255.0
    rgb = c[..., :3].copy()
    # light wrap：舞台模糊光沿人物边缘渗入（边缘 = alpha 减去腐蚀后的 alpha）
    inner = cv2.erode(a[..., 0], np.ones((7, 7), np.uint8))
    edge = cv2.GaussianBlur(np.clip(a[..., 0] - inner, 0, 1), (0, 0), 2.5)[..., None]
    env = BG_BLUR[y0:y1, x0:x1]
    rgb = rgb * (1 - 0.35 * edge) + env * 0.35 * edge * 1.25
    sub = canvas[y0:y1, x0:x1]
    sub[:] = sub * (1 - a) + rgb * a


YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
WARM = np.exp(-(((XX - 520) / 700) ** 2 + ((YY - 420) / 520) ** 2))[..., None]


def noya_x(t):
    """诺娅（画面左侧人物）的台上 x：取当时那张画左 55% 的 alpha 质心。"""
    for sh in SHOTS.values():
        if sh["t"][0] <= t < sh["t"][1]:
            kind, k = exposure(sh, t)
            cel, X, Y = drawing(sh["sheet"], kind, k)
            a = cel[..., 3] > 60
            cols = np.where(a.any(axis=0))[0]
            left = cols[cols < cols.min() + (cols.max() - cols.min()) * 0.55]
            return X + float(left.mean()), Y + cel.shape[0] * 0.45
    return 820.0, 470.0


def stage_light(canvas, t):
    # 同一暖主光与冷调作用全画面——人与景一起变
    canvas *= 0.965
    canvas += WARM * np.array([18, 38, 70], np.float32) * 0.55
    # 追光：跟诺娅，滞后 0.3s（人手操作感）；C 镜收窄、压暗周边，迎接高潮音
    sx, sy = noya_x(max(31.85, t - 0.3))
    k = 0.16 + (0.22 * ease((t - 35.42) / 0.9) if t >= 35.42 else 0)
    r = 430 - (110 * ease((t - 35.42) / 0.9) if t >= 35.42 else 0)
    spot = np.exp(-(((XX - sx) / r) ** 2 + ((YY - sy) / (r * 1.25)) ** 2))[..., None]
    canvas *= 1 - k * (1 - spot)
    canvas += spot * np.array([10, 22, 34], np.float32) * 0.6


_aud = None


def audience(out, t, pan):
    """前排观众剪影（stage-musical 第一排 POV 纪律）：只露头顶占画面下缘约 11%，肩部被画框裁掉；
    最近的前景所以轻度虚化；屏幕空间固定，随镜头横移做反向视差。"""
    global _aud
    if _aud is None:
        p = V3 / "audience_row.png"
        if not p.exists():
            return out
        im = cv2.imread(str(p), cv2.IMREAD_UNCHANGED).astype(np.float32)
        rows = np.where(im[..., 3].max(axis=1) > 40)[0]
        top = rows.min()
        k = 0.58
        sm = cv2.resize(im, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
        sm = cv2.GaussianBlur(sm, (0, 0), 1.6)
        tile = np.concatenate([sm, sm[:, ::-1]], axis=1)          # 镜像平铺补宽
        band = int(OH * 0.13)
        y0 = int(top * k) - 4
        _aud = tile[y0:y0 + band]
    band = _aud.shape[0]
    ox = int(60 + pan * 0.08) % max(1, _aud.shape[1] - OW)
    strip = _aud[:, ox:ox + OW]
    a = strip[..., 3:4] / 255.0
    out[OH - band:] = out[OH - band:] * (1 - a) + strip[..., :3] * 0.72 * a
    return out


rng = np.random.default_rng(830)
NP = 90
PB, PL, PU, PV = rng.uniform(T0 - 8, T1, NP), rng.uniform(4, 9, NP), rng.uniform(0, 1, NP), rng.uniform(0, 1, NP)


def dust(canvas, t):
    layer = np.zeros((H, W), np.float32)
    for i in range(NP):
        age = t - PB[i]
        if 0 <= age <= PL[i]:
            v = (PV[i] + age * 0.018) % 1
            cx, cy = 60 + v * 700 + (PU[i] - .5) * (90 + v * 260), v * 760
            cv2.circle(layer, (int(cx), int(cy)), 1 + int(PU[i] * 1.6), math.sin(math.pi * age / PL[i]), -1, cv2.LINE_AA)
    canvas += cv2.GaussianBlur(layer, (0, 0), 1.1)[..., None] * np.array([150, 205, 255], np.float32) * 0.5


def camera(img, cx, cy, z):
    cw, ch = W / z, H / z
    x0, y0 = min(max(0, cx - cw / 2), W - cw), min(max(0, cy - ch / 2), H - ch)
    M = np.array([[OW / cw, 0, -x0 * OW / cw], [0, OH / ch, -y0 * OH / ch]], np.float32)
    return cv2.warpAffine(img, M, (OW, OH), flags=cv2.INTER_AREA)


def ease(u):
    u = min(1, max(0, u))
    return u * u * (3 - 2 * u)


_cu = {}


_en = None


def noya_energy(t):
    """诺娅分轨的相对能量（相对 80 分位），给中近景口型做无声门控。"""
    global _en
    if _en is None:
        raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(EP / "tmp/v6/stems/noya.wav"), "-ac", "1",
                                       "-ar", "48000", "-f", "f32le", "-"])
        y = np.frombuffer(raw, np.float32)
        hop = 48000 // FPS
        e = np.array([np.sqrt((y[i:i + hop] ** 2).mean()) for i in range(0, len(y) - hop, hop)])
        _en = e / np.percentile(e[e > e.max() * .02], 80)
    i = int(t * FPS)
    return float(_en[i]) if i < len(_en) else 0.0


def frame(t):
    if MCU["t"][0] <= t < MCU["t"][1]:
        name = "closed"
        for tt, n in MCU["seq"]:
            if t >= tt:
                name = n
        if MCU["blink"][0] <= t < MCU["blink"][1]:
            name = "blink"
        if name not in ("closed", "inhale", "blink") and noya_energy(t) < 0.12:
            name = "closed"
        key = "mcu_" + name
        if key not in _cu:
            pth = V3 / f"mcu_{name}.png"
            _cu[key] = cv2.resize(cv2.imread(str(pth if pth.exists() else V3 / "mcu_base.png")), (W, H)).astype(np.float32)
        u = (t - MCU["t"][0]) / (MCU["t"][1] - MCU["t"][0])
        img = _cu[key].copy() * 0.97
        out = camera(img, W / 2 + 26 * ease(u), H / 2 - 6 * ease(u), 1.0 + 0.05 * ease(u))   # 缓推并向右（她正走向塞蕾娜）
    elif t >= CU["t"][0]:
        name = CU["seq"][0][1]
        for tt, n in CU["seq"]:
            if t >= tt:
                name = n
        if name not in _cu:
            _cu[name] = cv2.resize(cv2.imread(str(P8 / f"cu_{name}.png")), (W, H)).astype(np.float32)
        u = (t - CU["t"][0]) / (CU["t"][1] - CU["t"][0])
        z = CU["push"][0] + (CU["push"][1] - CU["push"][0]) * ease(u)
        img = _cu[name].copy()
        img *= 0.97
        out = camera(img, W / 2, H / 2 - 12 * ease(u), z)
    else:
        sid = next(k for k, s in SHOTS.items() if s["t"][0] <= t < s["t"][1])
        sh = SHOTS[sid]
        kind, k = exposure(sh, t)
        cel, X, Y = drawing(sh["sheet"], kind, k)
        canvas = PLATE.copy()
        contact_shadow(canvas, cel, X, Y)
        composite(canvas, cel, X, Y)
        stage_light(canvas, t)
        dust(canvas, t)
        u = (t - sh["t"][0]) / (sh["t"][1] - sh["t"][0])
        (ax, ay, az), (bx, by, bz) = sh["cam"]
        e = ease(u)
        cx = ax + (bx - ax) * e
        out = camera(np.clip(canvas, 0, 255), cx, ay + (by - ay) * e, az + (bz - az) * e)
        out = audience(out, t, cx - 905)
    if t - T0 < 0.25:
        out = out * ((t - T0) / 0.25)
    if T1 - t < 0.35:
        out = out * ((T1 - t) / 0.35)
    return np.clip(out, 0, 255).astype(np.uint8)


def main():
    if "--preview" in sys.argv:
        ts = [float(x) for x in sys.argv[sys.argv.index("--preview") + 1:]]
        qa = P8 / "qa"
        qa.mkdir(exist_ok=True)
        tiles = [cv2.resize(frame(t), (426, 240)) for t in ts]
        while len(tiles) % 4:
            tiles.append(np.zeros_like(tiles[0]))
        cv2.imwrite(str(qa / "preview.png"), np.vstack([np.hstack(tiles[i:i + 4]) for i in range(0, len(tiles), 4)]))
        return
    n = int(round((T1 - T0) * FPS))
    p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{OW}x{OH}",
                          "-r", str(FPS), "-i", "-", "-i", str(AUDIO), "-c:v", "libx264", "-preset", "slow", "-crf", "16",
                          "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", str(OUT)], stdin=subprocess.PIPE)
    log = []
    for f in range(n):
        t = T0 + f / FPS
        p.stdin.write(frame(t).tobytes())
        if MCU["t"][1] <= t < CU["t"][0]:
            sid = next(k for k, s in SHOTS.items() if s["t"][0] <= t < s["t"][1])
            log.append((round(t, 3), sid, *exposure(SHOTS[sid], t)))
    p.stdin.close()
    p.wait()
    (P8 / "exposure_log.json").write_text(json.dumps(log), encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
