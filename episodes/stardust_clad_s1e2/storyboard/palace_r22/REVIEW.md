# R22：连贯的金属护臂与手套

2026-10-19 用户明确“肩膀可以了”，继续指出护臂像圆圈加铁块，提供四张铠甲参考。
R21肩甲保留；本轮修订护臂、手背和手指装备，保留程序动作、现有脸、盾和武器挂点。
R21肩甲的认可不代表整个人物造型通过；R22护臂是待用户评价的新候选。

## 观察与实现

| 区域 | 原版问题 | 本版处理 |
|---|---|---|
| 前臂 | 圆筒、悬环及突出方块把轮廓切碎 | 肘侧宽、手腕收窄的连续曲壳，内侧护片，低矮贴壳排气片 |
| 手腕/手背 | 护臂止于腕，裸手单独露出 | 收腕口接有厚度的手背甲，掌侧保留柔性底手套 |
| 指组 | 只有皮肤和关节线，无金属分片 | 每手14块指节甲随原指骨，五个金属指尖；关节留窄缝 |
| 已认可肩甲 | 本轮应保留 | 同几何、材质和绑定；7个关键时点世界变换与R21完全相同 |

阿鏊沿用铜金、夜刈沿用冷钢色。原6个方块鳍片换成贴壳片，受击烧黑、断去一片的
剧情仍按原时点发生。原前臂零件收进显式旧壳组，仅本集开启新护臂时隐藏；其他角色
默认构造不变。手部底材质为独立实例，没有给脸改色。

第一轮近景中，指尖还露黑底手套、前臂内侧缺口较大；最终补了金属指尖和内侧护片。
手背、掌心与侧面分别复看。掌面仍保留深色柔性衬层，整体人物比例未重做。

## 验证与范围

- `hero_whole.jpg`、`enemy_whole.jpg`：正常观看大小与R21同机位对照。
- `hero_open/fist/palm/side.jpg`、`enemy_open/fist.jpg`：手背、掌面、侧面及完整开合；
  独立装备台省略臂肉，仅用于检查壳体，实际人物覆盖另见 `final_shots/`。
- `reference_gauntlet_review.jpg`（本地）：用户参考、旧护臂、新护臂部位板。
  提炼收腕、手背衔接、分节手指，不声称人物比例或整体绘画水平已等同参考。
- `gauntlet_probe.json`：两角色左右手、四种手势共16组检查，每手14个指节片挂对应指骨，
  手部蒙皮顶点有限；7个关键时点的肩甲、手腕与盾顶锚和旧版完全相同。
  这不是掌内、手指间或装备间完整自碰撞证明。
- `physics_final/`、`palace_checks.json`：全片213秒、60Hz、12,780帧检查70个导航实体、
  骨长、支撑脚、固定槽口与碰撞光核。导航检测范围与R21相同，不覆盖全部自碰撞。
- `delivery_report.json`：正片与原OP解码、12个最终画面对照及5个声画窗口；
  5个窗口偏移均为0ms，常用入口已指向R22；剧本、音频、走位、战斗光效时点沿用R21。

## 看片与复现

- `output/gauntlet_comparison_r22.mp4`：12秒旧新护臂，张手/握拳/侧转。
- `output/palace_duel_preview_r22.mp4`：26秒带原声音的实战片段。
- `output/stardust_clad_s1e2_palace_r22.mp4`：213秒正片。
- `output/stardust_clad_s1e2_palace_tv_r22.mp4`：262.2秒带原片头版。

```powershell
node --import ./tools/register_loader.mjs render.mjs --serve --port 4235
node tools/review_gauntlets.mjs --video
node --import ./tools/register_loader.mjs render.mjs --physics-only --fps 60 --board storyboard/palace_r22/physics_final
../../.venv/Scripts/python.exe tools/check_palace.py storyboard/palace_r22/physics_final/trace.json --out storyboard/palace_r22/palace_checks.json
node --import ./tools/register_loader.mjs render.mjs --shots config/palace_review_shots.json --board storyboard/palace_r22/final_shots
node --import ./tools/register_loader.mjs render.mjs --out stardust_clad_s1e2_palace_r22.mp4 --trace storyboard/palace_r22/render_trace.json --board storyboard/palace_r22/render
../../.venv/Scripts/python.exe tools/package_palace.py --version r22 --publish-aliases
```

`?gauntlets=0` 只关闭本轮护臂，保留已认可R21肩甲；旧转面对照若复现应同时加此参数。
工艺记录见 `dula-skills/hybrid-craft-scene/references/animated-metal-armor.md` 的R22段。
