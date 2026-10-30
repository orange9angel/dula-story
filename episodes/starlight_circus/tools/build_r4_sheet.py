#!/usr/bin/env python3
"""R4 曝光表：config/art_pilot8_r3.json → config/art_pilot8_r4.json。
  - 换画时刻对齐 tmp/beats.npy（四分拍 ≈0.41s）或其八分音符；
  - 转圈 13 格（twirl a1..c4 + a2 收尾 30°），在两拍点 33.831→35.039 之间按旋转角 θ(u)=390°·(0.6u+0.4·smoothstep(u))
    反解每 30° 的进入时刻并吸附到输出帧（起转/收尾停 4-5 帧，中段 2 帧）；转圈各格按头部竖轴（meta.axis）对齐；
  - 肖像镜头的嘴由 config/song_alignment_pilot8.json 驱动（viewer 内 dialogue-face-track），这里只给嘴形→变体映射。"""
import json
from pathlib import Path

import numpy as np

EP = Path(__file__).resolve().parents[1]
cfg = json.loads((EP / "config/art_pilot8_r3.json").read_text(encoding="utf-8"))
beats = np.load(EP / "tmp/beats.npy")
FPS = 30
B = lambda t: float(beats[np.argmin(np.abs(beats - t))])
E = lambda t: float(min(np.concatenate([beats, (beats[:-1] + beats[1:]) / 2]), key=lambda b: abs(b - t)))
F = lambda t: round(round(t * FPS) / FPS, 4)
sh = {s["id"]: s for s in cfg["shots"]}

# 肖像：嘴形→同锚变体（rest 用底图；恳求组有真闭口 plead_closed）
sh["mcu"].update(seq=None, mouthMap={"rest": "base", "labial": "base", "inhale": "inhale", "narrow": "e", "open": "a", "round": "o"},
                 blinks=[30.04], blinkCel="blink")
sh["cu"].update(seq=None, mouthMap={"rest": "plead_closed", "labial": "plead_closed", "inhale": "plead_inhale", "narrow": "plead_i",
                                    "open": "plead", "round": "plead_u"}, blinks=[], blinkCel=None)
for s in (sh["mcu"], sh["cu"]):
    s.pop("seq")

# 伸手：步→伸手→触到 落四分拍；塞蕾娜抬手落八分；牵手落在 33.414 拍点（正好是换气休止）
r = sh["reach"]
r["noya"] = [[F(B(31.85)), "noya_step", 536, 4], [F(B(32.23)), "noya_reach", 556, 0], [F(B(33.0)), "noya_touch", 574, 0], [F(B(33.41)), None, 0, 0]]
r["selene"] = [[F(B(31.85)), "selene_listen", 792, 0], [F(E(32.62)), "selene_lift", 786, 0], [F(B(33.41)), None, 0, 0]]
r["pair"] = [[F(B(33.41)), "pair_hold", 690, 0]]

# 转圈
# 0..180° 用生成格；210..330° 用 360-θ 镜像格（prep_r4_cels MIRROR）；c4 = 转完正面望向舞伴的收势
# R4b：240–330° 改用重画的 twirl_d（举手始终伸向右侧舞伴）；镜像格把举手翻到背离舞伴一侧，弃用（210° mb2 背面保留）
_d = (EP / "hybrid/r4/clean/noya_twirl_d1.png").exists()
# 210° 用生成的 b4（举手在头顶正上方，偏 −6px）而非镜像 mb2（偏 −31，手翻到背离舞伴一侧）
order = ["noya_twirl_" + k for k in ("a1", "a2", "a3", "a4", "b1", "b2", "b3", "b4") +
         (("d1", "d2", "d3", "d4") if _d else ("mb1", "ma4", "ma3", "ma2")) + (() if _d else ("c4",))]
t0, t1 = B(33.83), B(35.04)
u = np.linspace(0, 1, 4001)
theta = 30 * len(order) * (.6 * u + .4 * (3 * u ** 2 - 2 * u ** 3))
starts = [t0 + (t1 - t0) * float(u[np.searchsorted(theta, 30 * k)]) for k in range(len(order))]
fr = [round((s - t0) * FPS) for s in starts]
for k in range(1, len(fr)):
    fr[k] = max(fr[k], fr[k - 1] + 2)
tw = sh["twirl"]
tw["noya"] = [[F(t0 + f / FPS), key, 570, 0] for f, key in zip(fr, order)] + [[F(t1), None, 0, 0]]
# 托手转圈：交握的手是轴心。每格按举手手尖对齐到塞蕾娜举手手尖（舞台坐标），身体在手下转
import cv2  # noqa: E402
_sel = cv2.imread(str(EP / "hybrid/r3/clean/selene_raise.png"), cv2.IMREAD_UNCHANGED)
_a = _sel[..., 3] > 100
_ys, _xs = np.nonzero(_a[:, :_a.shape[1] // 2])
_i = int(_ys.argmin())
_m3 = json.loads((EP / "hybrid/r3/clean/meta.json").read_text(encoding="utf-8"))["selene_raise"]
_h = cfg["bodyH"]["selene"] * _m3["size"][1] / (_m3["size"][1] - _m3["head_top"])
_s = _h / _m3["size"][1]
tw["joinHand"] = [round(804 - _m3["size"][0] * _s / 2 + _xs[_i] * _s, 1), round(cfg["floorY"] - _h + _ys[_i] * _s, 1)]
tw["joinHand"][1] += 10  # 交握点取塞蕾娜掌心（指尖下 ~10px），诺娅指尖落进掌心
# 摆放：每格先按「手尖=交握点」求头位置，再对头路径做 [.25,.5,.25] 平滑后按平滑头位摆放——
# 各宫格举手外伸量不同（b≈0、a/d 60–100px），纯手锚会让头横跳 60–100px；平滑后手残差 ≤~20px。
_m4 = json.loads((EP / "hybrid/r4/clean/meta.json").read_text(encoding="utf-8"))
_heads, _geo = [], []
for e in tw["noya"][:-1]:
    mm = _m4[e[1]]
    sc = cfg["bodyH"]["noya"] / mm["scaleRef"]
    cxh = tw["joinHand"][0] + (mm["size"][0] / 2 - mm["hand"][0]) * sc  # 手锚下的 cel 中心
    _geo.append((cxh, (mm["axis"] - mm["size"][0] / 2) * sc))
    _heads.append(cxh + _geo[-1][1])
_sm = [(_heads[max(0, i - 1)] + 2 * _heads[i] + _heads[min(len(_heads) - 1, i + 1)]) / 4 for i in range(len(_heads))]
for e, (cxh, off), hs in zip(tw["noya"][:-1], _geo, _sm):
    e[2] = round(hs - off, 1)
tw["handResidualPx"] = [round(hs - h, 1) for hs, h in zip(_sm, _heads)]
tw["alignHand"] = False
tw["selene"] = [[F(t0), "selene_raise", 804, 0], [F(t1), None, 0, 0]]
tw["pair"] = [[F(t1), "pair_turnend", 690, 3]]
cfg["faceHidden"] = ["noya_twirl_b1", "noya_twirl_b2", "noya_twirl_b3", "noya_twirl_b4", "noya_twirl_mb2", "noya_twirl_mb1"]
tw["note"] = "R4: 0-180 generated, 210-330 mirrored (360-theta), c4 settle; theta(u)=390*(0.6u+0.4 smoothstep) between beats; axis-aligned"

# 张臂：低→中→高，中间画落八分音符（「呼」字上扬），高位落拍点
o = sh["open"]
o["noya"] = [[F(B(35.42)), "noya_open_low", 560, 3], [F(E(35.62)), "noya_open_mid", 556, 0], [F(B(35.82)), "noya_open_high", 552, 0]]

for s in cfg["shots"]:  # 每镜头首张画从镜头起点上画（拍点吸附可能略晚于剪辑点）
    for who in ("noya", "selene", "pair"):
        if s.get(who) and s[who][0][1] and 0 < s[who][0][0] - s["t"][0] < .1:
            s[who][0][0] = s["t"][0]
cfg["beatAccent"] = {"beats": [round(float(b), 4) for b in beats if 29 < b < 39], "compress": 1.4, "decay": 9}
cfg["note"] = cfg["note"] + " R4：换画吸附节拍；嘴由已知歌词对齐驱动；转圈 12 角度单向。"
(EP / "config/art_pilot8_r4.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=1), encoding="utf-8")
holds = np.diff(fr + [round((t1 - t0) * FPS)])
print("twirl frames", fr, "holds", holds.tolist())
for s in cfg["shots"]:
    for who in ("noya", "selene", "pair"):
        if s.get(who):
            print(s["id"], who, [(e[0], e[1]) for e in s[who]])
