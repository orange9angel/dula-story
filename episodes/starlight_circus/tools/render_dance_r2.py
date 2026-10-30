#!/usr/bin/env python3
"""《借我一小段旋律》50 秒唱段 R2：分层 cel 舞台渲染（codex 透明底舞蹈 cel × 空舞台底图）。

R1（tmp/render_cinema.py）只在 7 张整幅静帧间换画 + 仿射抖动，人物身体从不动。R2 改为：
  - 空舞台底图 plate_empty + 每个角色独立透明 cel，按脚底锚点落地，接触影压暗地板
  - 舞蹈：按节拍换姿势 cel（2 帧 smear 过渡），绕脚底的节拍摇摆/弹跳/呼吸，台上位移带缓动
  - 近景：整幅肖像 cel，口型由 v6 分轨（noya/pip）能量包络三态驱动，镜头缓推
  - 光：同一灯光状态驱动整幅（开场暗→暖、静场收光到塞蕾娜、终场暖），光柱内微尘为出生/寿命粒子
镜表时间=v6 音频实际摆点（tools/assemble_song_v6.py）。用法（剧集目录）：python tools/render_dance_r2.py [--preview]
"""
import json
import math
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

EP = Path(__file__).resolve().parents[1]
W, H = 1672, 941           # 底图坐标
OW, OH, FPS = 1280, 720, 30
DUR = 50.0
CELS = EP / "hybrid/dance/cels"
ASSETS = EP / "hybrid/assets"
PLATE = EP / "hybrid/dance/plates/plate_empty.png"
AUDIO = EP / "assets/audio/mix/borrow_a_melody_r2_mix.wav"
OUT = EP / "output/borrow_a_melody_cinema_r2.mp4"
STEMS = EP / "tmp/v6/stems"
BEAT = 0.4094712            # tmp/beats.npy 平均间隔（八分音符栅格）
BEAT0 = 0.07

# 角色站姿高度（底图像素，取自 piano_master_v2）与默认脚底线
HEIGHT = {"noya": 530, "selene": 560, "pip": 360, "vesper": 470, "pair": 560, "trio": 560}
FLOOR = {"noya": 745, "selene": 742, "pip": 752, "vesper": 668, "pair": 745, "trio": 748}
CEL_H = {  # 个别姿势外框不等于站高（举臂/踮脚/弹跳），按目检覆盖
    "noya_arms_open": 575, "noya_spin_a": 545, "noya_spin_b": 540, "pair_twirl_a": 640,
    "pip_count1": 372, "pip_count3": 378, "pip_stumble": 360, "pip_tap": 360,
}


# ---------------------------------------------------------------- cel 载入
_cache = {}


def load_cel(name):
    if name in _cache:
        return _cache[name]
    p = CELS / f"{name}.png"
    im = cv2.imread(str(p), cv2.IMREAD_UNCHANGED)
    if im is None or im.shape[2] != 4:
        raise SystemExit(f"missing/opaque cel: {p}")
    a = im[..., 3].astype(np.float32)
    a[a < 70] = 0                                  # 去掉 codex 画进低 alpha 的地面雾（R2 试片发现青色雾斑）
    a = cv2.GaussianBlur(cv2.erode(a, np.ones((3, 3), np.uint8)), (3, 3), 0)
    ys, xs = np.where(a > 40)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    rgb = im[y0:y1 + 1, x0:x1 + 1, :3].astype(np.float32)
    al = a[y0:y1 + 1, x0:x1 + 1] / 255.0
    _cache[name] = (rgb, al)
    return _cache[name]


def load_full(path):
    if path not in _cache:
        im = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if im is None:
            raise SystemExit(f"missing: {path}")
        _cache[path] = cv2.resize(im, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)
    return _cache[path]


# ---------------------------------------------------------------- 节拍与缓动
def beat_phase(t, beats=2):
    return ((t - BEAT0) / (BEAT * beats)) % 1.0


def ease(u):
    u = min(1.0, max(0.0, u))
    return u * u * (3 - 2 * u)


def keyed(keys, t):
    """keys=[(t,value),...] 缓动插值。"""
    if t <= keys[0][0]:
        return keys[0][1]
    for (ta, va), (tb, vb) in zip(keys, keys[1:]):
        if t < tb:
            return va + (vb - va) * ease((t - ta) / (tb - ta))
    return keys[-1][1]


def pose_at(seq, t):
    """seq=[(t,cel),...]；返回 (当前 cel, 上一个 cel, 距切换的秒数)。"""
    cur, prev, ts = seq[0][1], None, -9
    for i, (tt, c) in enumerate(seq):
        if t >= tt:
            cur, ts = c, tt
            prev = seq[i - 1][1] if i else None
    return cur, prev, t - ts


# ---------------------------------------------------------------- 角色层
def place(canvas, shadow, name, who, fx, t, motion, flip=False):
    rgb, al = load_cel(name)
    kind = who if who in HEIGHT else "noya"
    th = CEL_H.get(name, HEIGHT[kind])
    s = th / rgb.shape[0]
    # 微动：呼吸（纵向）+ 绕脚底摇摆 + 节拍弹跳
    sway = motion.get("sway", 0.0) * math.sin(2 * math.pi * beat_phase(t, motion.get("sway_beats", 4)))
    bob = motion.get("bob", 0.0) * abs(math.sin(math.pi * beat_phase(t, 1)))
    breath = 1.0 + 0.006 * math.sin(t * 2 * math.pi / 3.4 + fx)
    squash = 1.0 - motion.get("squash", 0.0) * (1 - abs(math.sin(math.pi * beat_phase(t, 1))))
    sy = s * breath * squash
    sx = s * (2 - breath) / squash ** 0.5
    rgb2 = cv2.resize(rgb, None, fx=sx, fy=sy, interpolation=cv2.INTER_AREA)
    al2 = cv2.resize(al, (rgb2.shape[1], rgb2.shape[0]), interpolation=cv2.INTER_AREA)
    if flip:
        rgb2, al2 = rgb2[:, ::-1], al2[:, ::-1]
    h, w = al2.shape
    fy = FLOOR[kind] + motion.get("dy", 0.0)
    lift = bob + motion.get("hop", 0.0)
    # 绕脚底中心旋转
    M = cv2.getRotationMatrix2D((w / 2, h), sway + motion.get("tilt", 0.0), 1.0)
    pad = int(h * 0.12)
    M[0, 2] += pad
    M[1, 2] += pad
    rgb3 = cv2.warpAffine(rgb2, M, (w + 2 * pad, h + 2 * pad), flags=cv2.INTER_LINEAR)
    al3 = cv2.warpAffine(al2, M, (w + 2 * pad, h + 2 * pad), flags=cv2.INTER_LINEAR)
    X = int(round(fx - w / 2 - pad))
    Y = int(round(fy - h - pad - lift))
    # 接触影：随弹跳离地变淡变小
    k = max(0.25, 1 - lift / 40.0)
    cv2.ellipse(shadow, (int(fx), int(fy - 3)), (int(w * 0.36 * k), int(12 * k)), 0, 0, 360,
                0.55 * k * motion.get("alpha", 1.0), -1)
    a_op = motion.get("alpha", 1.0)
    blit(canvas, rgb3, al3 * a_op, X, Y)


def blit(canvas, rgb, al, X, Y):
    h, w = al.shape
    x0, y0, x1, y1 = max(0, X), max(0, Y), min(W, X + w), min(H, Y + h)
    if x1 <= x0 or y1 <= y0:
        return
    sub = canvas[y0:y1, x0:x1]
    a = al[y0 - Y:y1 - Y, x0 - X:x1 - X, None]
    sub[:] = sub * (1 - a) + rgb[y0 - Y:y1 - Y, x0 - X:x1 - X] * a


# ---------------------------------------------------------------- 口型（v6 分轨能量 → 三态）
def jaw_track(stem):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(STEMS / f"{stem}.wav"),
                                   "-ac", "1", "-ar", "48000", "-f", "f32le", "-"])
    y = np.frombuffer(raw, np.float32)
    hop = 48000 // FPS
    e = np.array([np.sqrt((y[i:i + hop] ** 2).mean()) for i in range(0, len(y) - hop, hop)])
    pos = np.sort(e[e > e.max() * 0.02])
    p80 = pos[int(len(pos) * .8)] if len(pos) else 1
    lo, hi = p80 * .25, p80 * .6
    st, cur = [], 0
    for i in range(len(e)):
        m = e[max(0, i - 1):i + 2].mean()
        if cur == 0 and m > lo:
            cur = 1
        elif cur == 1 and m > hi:
            cur = 2
        elif cur == 2 and m < hi * .8:
            cur = 1
        elif cur == 1 and m < lo * .8:
            cur = 0
        st.append(cur)
    # 15Hz 量化（每 2 帧取一次），防嘴型逐帧抖
    st = [st[i - i % 2] for i in range(len(st))]
    return st


JAW = {}


def jaw(stem, t):
    if stem not in JAW:
        JAW[stem] = jaw_track(stem)
    i = int(t * FPS)
    return JAW[stem][i] if i < len(JAW[stem]) else 0


# ---------------------------------------------------------------- 光与粒子
rng = np.random.default_rng(20261029)
NP = 140
P_BIRTH = rng.uniform(-6, DUR, NP)
P_LIFE = rng.uniform(4, 9, NP)
P_U = rng.uniform(0, 1, NP)       # 光柱内横向位置
P_V = rng.uniform(0, 1, NP)       # 光柱内纵向位置
P_SZ = rng.uniform(0.8, 2.2, NP)
P_DRIFT = rng.uniform(-6, 6, NP)


def dust(canvas, t, gain):
    """左上光柱内的微尘：出生/寿命/缓慢下落，'lighter' 叠加。"""
    if gain <= 0:
        return
    layer = np.zeros((H, W), np.float32)
    for i in range(NP):
        age = t - P_BIRTH[i]
        if not 0 <= age <= P_LIFE[i]:
            continue
        life = math.sin(math.pi * age / P_LIFE[i])
        v = (P_V[i] + age * 0.018) % 1.0
        # 光柱：从 (60,0) 向 (760,760) 斜下，宽度随深度增加
        cx = 60 + v * 700 + (P_U[i] - .5) * (90 + v * 260) + P_DRIFT[i] * math.sin(age * .7)
        cy = v * 760
        cv2.circle(layer, (int(cx), int(cy)), max(1, int(P_SZ[i])), life, -1, cv2.LINE_AA)
    layer = cv2.GaussianBlur(layer, (0, 0), 1.2)
    canvas += layer[..., None] * np.array([150, 205, 255], np.float32) * 0.55 * gain


def light(canvas, t, state):
    """同一灯光状态作用整幅画面（人物与舞台一起变）。"""
    warm, lift, spot = state
    c = canvas
    if warm:
        c[..., 2] *= 1 + warm * .16
        c[..., 1] *= 1 + warm * .05
        c[..., 0] *= 1 - warm * .10
    if lift:
        c *= 1 + lift
    if spot:
        sx, sy, r, k = spot
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.sqrt(((xx - sx) / r) ** 2 + ((yy - sy) / (r * 1.15)) ** 2)
        m = 1 - k * np.clip(d - 0.55, 0, 1)
        c *= m[..., None]


LIGHT = [  # (t, warm, lift, spot_k)  spot 中心另给
    (0.0, -0.35, -0.38, 0.0), (2.6, 0.0, 0.0, 0.0), (29.5, 0.05, 0.03, 0.0), (37.9, 0.0, -0.06, 0.0),
    (38.8, -0.10, -0.10, 0.75), (46.6, -0.05, -0.05, 0.6), (47.6, 0.16, 0.08, 0.0), (50, 0.16, 0.08, 0.0)]


def light_state(t):
    w = keyed([(a, b) for a, b, _, _ in LIGHT], t)
    l = keyed([(a, c) for a, _, c, _ in LIGHT], t)
    k = keyed([(a, d) for a, _, _, d in LIGHT], t)
    return w, l, ((1040, 520, 330, k) if k > 0.01 else None)


# ---------------------------------------------------------------- 镜表
# wide：舞台全景，cast=[(who, pose_seq, x_keys, motion)]；cam=(cx_keys, cy_keys, zoom_keys)
WIDE_CAM = ([(0, 836)], [(0, 470)], [(0, 1.0)])

SWAY = dict(sway=2.2, sway_beats=4)
BOB = dict(bob=7, squash=0.03)

SHOTS = [
    dict(t=(0.0, 3.1), kind="wide", cam=([(0, 836)], [(0, 470)], [(0, 1.0), (3.1, 1.035)]), cast=[
        ("vesper", [(0, "vesper_watch")], [(0, 150)], {}),
        ("pip", [(0, "pip_bob")], [(0, 450)], dict(bob=3)),
        ("noya", [(0, "noya_sway_l"), (1.33, "noya_sway_r"), (2.15, "noya_invite")], [(0, 690), (2.6, 745)], SWAY),
        ("selene", [(0, "selene_listen")], [(0, 1060)], dict(sway=0.6)),
    ]),
    dict(t=(3.1, 9.29), kind="cu", cels=[(3.1, ("jaw", "noya", ASSETS / "cu_noya_mouth_closed.png",
                                                  ASSETS / "cu_noya_mouth_half.png",
                                                  ASSETS / "cloak_woman_singing_closeup_v1.png")),
                                         (6.62, ("still", CELS / "cu_noya_tender.png"))],
         push=(1.0, 1.06), drift=(0, -10)),
    dict(t=(9.29, 13.03), kind="wide", cam=([(9.29, 836), (13.03, 900)], [(0, 470)], [(9.29, 1.08), (13.03, 1.16)]), cast=[
        ("vesper", [(0, "vesper_watch")], [(0, 150)], {}),
        ("pip", [(0, "pip_bob")], [(0, 450)], dict(bob=3)),
        ("noya", [(9.29, "noya_invite"), (10.25, None)], [(9.29, 760), (10.2, 820)], SWAY),
        ("selene", [(9.29, "selene_listen"), (10.25, None)], [(0, 1060)], dict(sway=0.6)),
        ("pair", [(9.29, None), (10.25, "pair_heart")], [(10.25, 915)], dict(sway=1.4, sway_beats=4)),
    ]),
    dict(t=(13.03, 15.44), kind="cu", cels=[(13.03, ("still", CELS / "cu_selene_wonder.png"))],
         push=(1.02, 1.09), drift=(6, 0)),
    dict(t=(15.44, 18.4), kind="cu", cels=[(15.44, ("jaw", "pip", ASSETS / "cu_pip_mouth_closed.png",
                                                    ASSETS / "cu_pip_mouth_open.png",
                                                    ASSETS / "cu_pip_mouth_open.png")),
                                           (15.80, ("still", ASSETS / "puppet_chest_knock_closeup_v1.png")),
                                           (16.25, ("jaw", "pip", ASSETS / "cu_pip_mouth_closed.png",
                                                    ASSETS / "cu_pip_mouth_open.png",
                                                    ASSETS / "cu_pip_mouth_open.png"))],
         push=(1.0, 1.05), drift=(0, 0), bob=6),
    dict(t=(18.4, 23.1), kind="wide", cam=([(18.4, 700), (23.1, 760)], [(0, 500)], [(18.4, 1.12), (23.1, 1.18)]), cast=[
        ("vesper", [(0, "vesper_watch")], [(0, 150)], {}),
        ("noya", [(18.4, "noya_laugh")], [(0, 780)], dict(sway=1.2, sway_beats=2)),
        ("selene", [(18.4, "selene_listen"), (21.3, "selene_sway")], [(0, 1060)], dict(sway=1.0)),
        ("pip", [(18.4, "pip_bob"), (19.86, "pip_tap"), (20.70, "pip_point"), (22.0, "pip_bob")],
         [(18.4, 430), (19.6, 520), (22.5, 560)], BOB),
    ]),
    dict(t=(23.1, 25.6), kind="wide", cam=([(23.1, 640)], [(0, 560)], [(23.1, 1.55), (25.6, 1.62)]), cast=[
        ("noya", [(23.1, "noya_laugh")], [(0, 790)], dict(sway=1.2, sway_beats=2)),
        ("pip", [(23.1, "pip_stumble"), (24.55, "pip_bob")], [(23.1, 560), (24.5, 520)], dict(bob=4)),
    ], pip_wobble=(23.1, 24.55)),
    dict(t=(25.6, 29.48), kind="wide", cam=([(25.6, 620), (29.48, 760)], [(0, 540), (29.48, 480)],
                                            [(25.6, 1.5), (28.2, 1.5), (29.48, 1.1)]), cast=[
        ("vesper", [(0, "vesper_watch")], [(0, 150)], {}),
        ("noya", [(25.6, "noya_laugh"), (28.3, "noya_sway_r")], [(0, 790), (29.4, 760)], dict(sway=1.2, sway_beats=2)),
        ("selene", [(25.6, "selene_sway")], [(0, 1060)], dict(sway=1.0)),
        ("pip", [(25.6, "pip_bob"), (26.85, "pip_count1"), (27.70, "pip_count3"), (28.35, "pip_bob")],
         [(0, 520)], BOB),
    ], pip_hop=(27.70, 28.30)),
    dict(t=(29.48, 31.5), kind="cu", cels=[(29.48, ("still", CELS / "cu_noya_plead.png"))],
         push=(1.0, 1.07), drift=(0, -12)),
    dict(t=(31.5, 37.88), kind="wide", cam=([(31.5, 860)], [(0, 450)], [(31.5, 1.02), (37.88, 1.1)]), cast=[
        ("vesper", [(0, "vesper_watch")], [(0, 150)], {}),
        ("pip", [(0, "pip_bob")], [(0, 450)], dict(bob=4)),
        ("noya", [(31.5, "noya_arms_open"), (33.38, None), (35.02, "noya_spin_a"), (35.43, "noya_spin_b"),
                  (35.84, "noya_arms_open")],
         [(31.5, 760), (35.0, 800), (35.9, 720), (37.8, 730)], dict(sway=1.0, sway_beats=4)),
        ("selene", [(31.5, "selene_sway"), (33.38, None), (35.02, "selene_sway")], [(0, 1060)], dict(sway=1.2)),
        ("pair", [(31.5, None), (33.38, "pair_twirl_a"), (34.20, "pair_twirl_b"), (35.02, None)],
         [(33.38, 930)], dict(sway=1.2, sway_beats=2)),
    ], spin=(35.02, 35.84)),
    dict(t=(37.88, 40.43), kind="wide", cam=([(37.88, 860), (40.43, 980)], [(0, 450), (40.43, 420)],
                                             [(37.88, 1.1), (40.43, 1.35)]), cast=[
        ("vesper", [(0, "vesper_watch"), (39.0, "vesper_soften")], [(0, 150)], {}),
        ("pip", [(0, "pip_bob")], [(0, 450)], {}),
        ("noya", [(37.88, "noya_sway_l")], [(0, 730)], dict(sway=0.4)),
        ("selene", [(37.88, "selene_listen"), (39.45, "selene_hum")], [(0, 1060)], dict(sway=0.3)),
    ]),
    dict(t=(40.43, 46.8), kind="cu", cels=[(40.43, ("still", ASSETS / "silver_woman_humming_closeup_v1.png")),
                                           (45.55, ("still", CELS / "cu_selene_open.png"))],
         push=(1.0, 1.10), drift=(0, -14)),
    dict(t=(46.8, 50.0), kind="wide", cam=([(46.8, 836)], [(0, 470)], [(46.8, 1.12), (50, 1.02)]), cast=[
        ("vesper", [(0, "vesper_soften")], [(0, 150)], {}),
        ("selene", [(46.8, "selene_reach"), (47.85, None)], [(0, 1060)], {}),
        ("noya", [(46.8, "noya_invite"), (47.85, None)], [(0, 760)], {}),
        ("pip", [(46.8, "pip_bob"), (47.85, None)], [(0, 450)], {}),
        ("trio", [(46.8, None), (47.85, "trio_bow")], [(0, 790)], {}),
    ], bow=(48.6, 49.6)),
]

SMEAR = 2 / FPS  # 姿势切换的 2 帧 smear


def wide_layers(shot, t):
    layers = []
    for who, seq, xk, motion in shot["cast"]:
        cur, prev, dt = pose_at(seq, t)
        fx = keyed(xk, t)
        m = dict(motion)
        if shot.get("pip_wobble") and who == "pip" and shot["pip_wobble"][0] <= t < shot["pip_wobble"][1]:
            u = t - shot["pip_wobble"][0]
            m["tilt"] = 9 * math.sin(u * 11) * math.exp(-u * 1.2)
            fx += 14 * math.sin(u * 5.5)
        if shot.get("pip_hop") and who == "pip" and shot["pip_hop"][0] <= t < shot["pip_hop"][1]:
            u = (t - shot["pip_hop"][0]) / (shot["pip_hop"][1] - shot["pip_hop"][0])
            m["hop"] = 46 * math.sin(math.pi * u)
            m["bob"] = 0
        if shot.get("spin") and who == "noya" and shot["spin"][0] <= t < shot["spin"][1]:
            m["dy"] = -6 * math.sin(math.pi * (t - shot["spin"][0]) / (shot["spin"][1] - shot["spin"][0]))
        if shot.get("bow") and who == "trio" and t >= shot["bow"][0]:
            u = min(1.0, (t - shot["bow"][0]) / (shot["bow"][1] - shot["bow"][0]))
            m["squash"] = 0.0
            m["dy"] = 5 * math.sin(math.pi * u)      # 谢幕时整组轻沉一拍
        layers.append((who, cur, prev, dt, fx, m))
    # 远处的先画（维斯珀在后），其余按脚底线
    return sorted(layers, key=lambda L: FLOOR.get(L[0], 745))


def compose_wide(shot, t):
    base = load_full(PLATE).copy()
    layers = wide_layers(shot, t)
    # 第一遍只收集接触影并压暗地板，第二遍画人（影子必须在人物之下）
    shadow = np.zeros((H, W), np.float32)
    scratch = np.zeros_like(base)
    for who, cur, prev, dt, fx, m in layers:
        if cur or prev:
            place(scratch, shadow, cur or prev, who, fx, t, m)
    shadow = cv2.GaussianBlur(shadow, (0, 0), 7)
    sh = np.clip(shadow, 0, .6)[..., None]
    base *= 1 - sh * np.array([1.0, 1.08, 0.86], np.float32)  # BGR：保留红，暖地板压暗不发橄榄绿
    sink = np.zeros((H, W), np.float32)
    for who, cur, prev, dt, fx, m in layers:
        if prev and dt < SMEAR:                       # 2 帧 smear 换画
            k = dt / SMEAR
            place(base, sink, prev, who, fx, t, dict(m, alpha=1 - k))
            if cur:
                place(base, sink, cur, who, fx, t, dict(m, alpha=k))
        elif cur:
            place(base, sink, cur, who, fx, t, m)
    return base


def camera(img, cx, cy, z):
    cw, ch = W / z, H / z
    x0 = min(max(0, cx - cw / 2), W - cw)
    y0 = min(max(0, cy - ch / 2), H - ch)
    M = np.array([[OW / cw, 0, -x0 * OW / cw], [0, OH / ch, -y0 * OH / ch]], np.float32)
    return cv2.warpAffine(img, M, (OW, OH), flags=cv2.INTER_AREA if z < 1.2 else cv2.INTER_LINEAR)


def render_cu(shot, t):
    a, b = shot["t"]
    seq = shot["cels"]
    spec = seq[0][1]
    for tt, sp in seq:
        if t >= tt:
            spec = sp
    if spec[0] == "jaw":
        _, stem, closed, half, opened = spec
        img = load_full([closed, half, opened][jaw(stem, t)])
    else:
        img = load_full(spec[1])
    u = (t - a) / (b - a)
    z = shot["push"][0] + (shot["push"][1] - shot["push"][0]) * ease(u)
    dx, dy = shot["drift"]
    breath = 3.0 * math.sin(t * 2 * math.pi / 3.4)
    bob = shot.get("bob", 0) * abs(math.sin(math.pi * beat_phase(t, 1)))
    return camera(img, W / 2 + dx * u, H / 2 + dy * u + breath - bob, z), img


def frame(t):
    shot = next((s for s in SHOTS if s["t"][0] <= t < s["t"][1]), SHOTS[-1])
    if shot["kind"] == "wide":
        canvas = compose_wide(shot, t)
        st = light_state(t)
        dust(canvas, t, 1.0 if st[1] > -0.2 else 0.4)
        light(canvas, t, st)
        cxk, cyk, zk = shot["cam"]
        out = camera(np.clip(canvas, 0, 255), keyed(cxk, t), keyed(cyk, t), keyed(zk, t))
    else:
        out, _ = render_cu(shot, t)
        out = out.copy()
        st = light_state(t)
        light_cu = (st[0], st[1] * 0.5, None)
        o = out.astype(np.float32)
        # 近景同受整体光态（色温/亮度），不加舞台光斑
        if light_cu[0]:
            o[..., 2] *= 1 + light_cu[0] * .16
            o[..., 0] *= 1 - light_cu[0] * .10
        o *= 1 + light_cu[1]
        out = o
    if t < 0.5:
        out = out * (t / 0.5)
    if t > DUR - 0.6:
        out = out * max(0.0, (DUR - t) / 0.6)
    return np.clip(out, 0, 255).astype(np.uint8)


def main():
    preview = "--preview" in sys.argv
    if preview:
        qa = EP / "hybrid/dance/qa/r2_preview"
        qa.mkdir(parents=True, exist_ok=True)
        ts = [float(x) for x in sys.argv[sys.argv.index("--preview") + 1:]] or \
             [1.0, 2.5, 5, 8, 10.8, 14, 16, 17, 19.9, 21.5, 23.6, 27.0, 28.0, 30.5, 32.0, 33.6, 34.5, 35.2, 35.6,
              37, 39.8, 43, 46, 48.5]
        tiles = []
        for t in ts:
            f = frame(t)
            cv2.imwrite(str(qa / f"t{t:05.2f}.png"), f)
            tiles.append(cv2.resize(f, (320, 180)))
        while len(tiles) % 4:
            tiles.append(np.zeros_like(tiles[0]))
        rows = [np.hstack(tiles[i:i + 4]) for i in range(0, len(tiles), 4)]
        cv2.imwrite(str(qa / "contact.png"), np.vstack(rows))
        print("preview ->", qa)
        return
    NF = int(DUR * FPS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{OW}x{OH}",
                             "-r", str(FPS), "-i", "-", "-i", str(AUDIO), "-c:v", "libx264", "-preset", "slow",
                             "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", str(OUT)],
                            stdin=subprocess.PIPE)
    for f in range(NF):
        proc.stdin.write(frame(f / FPS).tobytes())
        if f % 150 == 0:
            print(f"frame {f}/{NF}", flush=True)
    proc.stdin.close()
    proc.wait()
    print("wrote", OUT)


if __name__ == "__main__":
    main()
