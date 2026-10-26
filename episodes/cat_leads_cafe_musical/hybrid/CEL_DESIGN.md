# 混合路线 cel 设计与资产台账（《半拍晴天》hybrid/）

## 身份锚（用户已认可，不可偏离）

| 资产 | 路径 | 实测 alpha 包围盒（px） |
|---|---|---|
| Girl 正面全身 | `assets/images/girl_body_v1.png` 1024×1536 | x 218–809, y 16–1521，人高 ~1505px，脚底行 x 370–654 |
| Boy 正面全身 | `assets/images/boy_body_v1.png` 1024×1536 | x 246–778, y 17–1519，人高 ~1502px，脚底行 x 303–729 |
| Girl/Boy 面部 | `assets/images/{girl,boy}_portrait_v1.png` | 1312×1199 / 1359×1158 |

## cel 清单与用途

| cel | 状态 | 用途 |
|---|---|---|
| girl_body_v1（既有） | 已认可 | 正面站姿（对话站起前后、歌舞正面相位） |
| boy_body_v1（既有） | 已认可 | 同上 |
| `cels/girl_side_v1.png` | ✅ 已验收（发丝、侧面轮廓、身份一致） | 转身 90°/270° 相位 |
| `cels/girl_back_v1.png` | 生成中 | 转身 180° 相位 |
| `cels/boy_side_v1.png` / `boy_back_v1.png` | 生成中 | 同上 |
| `cels/{girl,boy}_face_{open,half,blink}_v1.png` | 生成中 | raster-face 嘴窗/眼窗供体（对白+歌唱口型） |
| `cels/{girl,boy}_sit_v1.png` | 批次2 | 对白段坐姿（0–19s、95.3s 起） |
| `cels/cafe_table_fg_v1.png` | 批次2 | 前景桌椅+杯+笔记本层（对话段遮挡下本身） |

## 朝向映射（转身，pilot B）

- 时窗更正（miss M1）：`dance_beats_v3.json` 的 beats[] **相对 songStart=19.0**，
  beat 32–40 = 绝对 **37.77–42.4s**（不是 18.77s）。试片 B 窗口 = 36.9–43.4s。
- 3D 底稿 yaw 来自 dance-v5.js `turning()`：8 拍一整圈（dir=+1 Girl / -1 Boy），
  脚位由 locomotion turningFeet 提供（接触锚，保留）。
- cel 选择：yaw ∈ [-45°,45°]→front；[45°,135°]→side（左/右按符号，侧面 cel 镜像仅限
  女孩对称服装；男孩琥珀 rim 光在 viewer-right，镜像会翻转 rim——**Boy 另一侧待用
  独立生成，不可用镜像**（story-continuity：镜像不等于另一侧））；[135°,225°]→back。
- 过渡期（±15° 窗口内）允许相邻两张 cel 硬切（cel 纪律，不做透明叠化——叠化会重影）。
- 若硬切跳变不可接受，补 3/4 视角 cel（batch 3 决策点）。

## 表情合成（pilot A）

- raster-face.js：`expressionTransition:'cel'` 整换（禁叠化），嘴窗供体 = face_open /
  face_half / 原肖像（闭口微笑）；眼窗供体 = face_blink。
- 口型驱动：沿用 `config/visemes.json`（100Hz jaw/width，与 locked 音频绑定，不改）。
- 局部编辑验收：每张变体必须 diff 校验改动 confined 在目标区（codex-cli-imagegen.md 纪律），
  全分辨率目检特征本身。

## 接触与融合

- 脚/椅接触：dialogue-v4.js 的 foot/seat 坐标 + dance-v5.js 的 feet/stance 作锚；
  接触影用 cel-integration.js `drawGroundContact`（基线 I5/I9）。
- 敲杯接触：tap 时点 12.65/13.25s（dialogue-v4 tapLift），手部特写 cel 钉住接触帧（I11）。
- 画幅 1920×1080、30fps，与 V5 原片一致，保证 A/B 可比。

## 生成记录纪律

每张图：provider / prompt / refs / 采用或拒用原因记入 `cels/generation.json`；
codex 订阅额度优先，DashScope 为付费兜底，费用未知记 unknown。
