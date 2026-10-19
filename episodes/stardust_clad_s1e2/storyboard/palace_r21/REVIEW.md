# R21：曲面肩甲与封闭盾背

后续反馈：用户明确“肩膀可以了”。认可范围记为本版肩甲；随后指出护臂仍是圆环与
铁块，要求连贯金属手套，见[R22](../palace_r22/REVIEW.md)。以下为R21制作时记录。

2026-10-19 用户指出 R20 肩甲像折纸、盾牌背面透明，随后补充三张铠甲角色参考。
参考强调流线大形、明确折面、宽而干净的高光和说明体积的暗部。保留此前明确的
程序动作、角色身份与现有脸，暂不接 Tripo。本轮只修装备形体与表面，未重塑人体或脸。
R20 的上述两项已被指出失败；R21 是修订候选，尚未获得用户美术认可。

## 先看见的问题

| 区域 | R20 可见事实 | 修订与复查 |
|---|---|---|
| 肩甲前/侧 | 多边形板只向前稍鼓，侧面几乎没有绕肩体积；亮边勾成纸板 | 双曲率壳跨过肩顶连接前后，有内壁、厚边和上下遮挡 |
| 盾牌背面 | 单面穹顶从内侧消失，能透见外侧装饰与环境 | 外壳、凹内壁、边缘连接及内侧加强筋，保持 FrontSide、不透明 |
| 胸甲/盾面 | 细刻纹在底色里过强，粗糙噪点抢过金属大面 | 原生成纹理改为微弱表面起伏，干净底色、宽高光；不烤死高光 |
| 转台背面 | 首轮实际场景转面被铜闸遮住 | 检查台保留实际姿态和同场灯光；全片镜头另在宫殿复查 |

主角保留铜金、太阳纹、叠层肩；对手保留紫钢、斜链胸纹与非对称月刃肩。
新肩壳没有改变现有抬臂控制。旧肩甲成长发光环从更新列表中移除，防止运行时复活。
盾牌原有半径、压扁比例、挂点和盾顶接触锚保持；没有以放大或移动盾牌掩盖穿透。

## 证据

- `reference_shape_review.jpg`（本地参考板）：用户参考、R20、R21肩胸区域。
  参考的强折面和人物流线更鲜明；本轮落实绕肩体积和干净高光，仍保留现有简化人物比例。
- `hero_front/side/back.jpg`、`enemy_front/back.jpg`：同机位旧新图；侧后面能看见包裹深度，
  不是仅把正面板换亮色。新肩壳仍属程序化风格，不声称达到参考人物的完整绘画水平。
- `shield_front/back.jpg`：背面由空轮廓变为实体内壁；正面太阳纹与铆钉保留。
- `shell_probe.json`：154 条正反射线，R20 背面77条漏过，R21全部命中；9个装备壳
  拓扑封闭、无非流形边，单面不透明材质；6个关键时刻盾顶世界坐标与旧版完全相同。
  旋转网格极点的零面积三角形在边拓扑统计中跳过，不作为开口。
- `final_shots/`：12个实际宫殿机位，包含举盾、格挡、伤腕、卡盾、蓄力和受击。
- `physics_final/`、`palace_checks.json`：本版全片60Hz导航实体、骨长、落脚与接触回归。
  范围沿用R20声明，不是所有衣物自碰撞或连续时间保证。
- `delivery_report.json`：最终正片解码、12个画面源对照、5个音频偏移窗口和原OP复用记录。
  5个窗口偏移均为0ms，常用入口已发布，R20入口归档；本轮未改剧本、时间轴、音频或光效触发时点。

尚存范围：脸和头发仍为现有简化风格；大腿/关节沿用R20；胸甲结构仍可继续设计。
本轮不能据装备改善宣称整个人体造型已接近参考。

## 复现与看片

- `output/armor_shape_comparison_r21.mp4`：18秒静姿连续转面，主角、对手、盾正反面。
- `output/palace_duel_preview_r21.mp4`：26秒实际反击片段，原声音。
- `output/stardust_clad_s1e2_palace_r21.mp4`：213秒正片。
- `output/stardust_clad_s1e2_palace_tv_r21.mp4`：262.2秒带原片头版。

```powershell
node --import ./tools/register_loader.mjs render.mjs --serve --port 4235
node tools/review_sculpted_armor.mjs --video
node --import ./tools/register_loader.mjs render.mjs --physics-only --fps 60 --board storyboard/palace_r21/physics_final
../../.venv/Scripts/python.exe tools/check_palace.py storyboard/palace_r21/physics_final/trace.json --out storyboard/palace_r21/palace_checks.json
node --import ./tools/register_loader.mjs render.mjs --shots config/palace_review_shots.json --board storyboard/palace_r21/final_shots
node --import ./tools/register_loader.mjs render.mjs --out stardust_clad_s1e2_palace_r21.mp4 --trace storyboard/palace_r21/render_trace.json --board storyboard/palace_r21/render
../../.venv/Scripts/python.exe tools/package_palace.py --version r21 --publish-aliases
```

`?sculpted=0` 仅用于本轮R20装备结构/材质对照，场景、姿态、镜头保持当前版本。
详细制作工艺在 `dula-skills/hybrid-craft-scene/references/animated-metal-armor.md`。
