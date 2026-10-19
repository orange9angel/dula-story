# R23：金属腿套与抬高的实体腰带

2026-10-19 用户认可R22护臂后，要求护腿像套进小腿的腿套；又指出腰带透明、位置
偏低显腿短。本轮只修这两处及相邻踝靴、裙甲衔接，保留R21肩甲、R22护臂、脸、
骨架动作、武器挂点和原片声音。R23外观待用户评价。

## 观察与实现

| 区域 | R22问题和参考目标 | R23处理与图像证据 |
|---|---|---|
| 护腿 | 正面板加悬环，侧背面裸露；参考是随小腿肚收踝的完整腿套 | 封闭内外壁、连续前后包裹、抬起膝前口沿；`hero_front/side/back.jpg`、`enemy_front/back.jpg` |
| 踝靴 | 甲片在鞋上方中断，黑鞋与金属分离 | 腿套跟膝踝轴，靴面及踝口跟原脚；靴跟继续金属面，原鞋底保留 |
| 腰带 | 低腰环位于大腿根，侧背面被腿切开；无实体内壁 | 按腰部剖面做有厚度的连续腰带，中心从髋下约1厘米移到髋上9厘米；`hero_belt.jpg`、`belt_back.jpg` |
| 腰腿比例 | 低带和低垂裙甲同时截短可见腿段 | 裙甲铰链同步上移10.5厘米，保留原随腿摆动；`hero_whole.jpg`、`enemy_whole.jpg` |
| 动作 | 新腿套必须允许原走路、屈膝、落脚 | `enemy_walk.jpg`、`hero_crouch.jpg`及实际宫殿 `final_shots/` |

共享实现 `dula-assets/characters/stardust/lower-clad.js` 仅由本集显式开启。旧零件
进入隐藏父组，防止成长/光缝更新器再次唤醒；新腿套独立跟随旧膝踝rig，避开旧护胫
1.14倍横向放大。腰带净空探针改参照腰围，其他角色仍沿用旧髋部参照。

第一轮靴面只盖上方，背面还露出黑鞋跟；最终将原鞋面独立替换为金属材质，保留
鞋底几何与位置。整身对照机位也拉远，避免把角色头部裁掉。
`reference_lower_review.jpg` 为本地独立参考/旧版/候选对照，未提交用户参考图。
参考用于包裹与腰线关系；本轮没有把人物比例、脸或整体绘画水平改成参考人物。

## 验证范围

- `lower_clad_probe.json`：16个甲壳有限值、封闭边、单面不透明材质通过；72条外侧
  射线覆盖腰带和腿套的正侧背面。12个实际剧情时点的肩甲、手、脚和盾顶锚与R22一致。
- 靴甲实际顶点相对原鞋底以5Hz采样，共4,264组；最小余量31.84毫米，新增甲面
  未低于原鞋底。原鞋底位置未改；这不是重新证明原步态所有落脚都完美。
- 全片导航、接触、数值seek与最终声画检查结果见 `palace_checks.json`、
  `physics_final/seek_check.json`、`delivery_report.json`。这些不覆盖全部自碰撞或连续CCD。
- `pixel_seek.json`：9、23.1、152.4、171.1秒的实际整帧在反向跳转后JPEG哈希一致，
  补充覆盖本轮甲壳在站立、走路、深蹲和命中时的实际输出；不外推为所有帧均经像素检查。
- 局部与剧情图为实际渲染画面；最终成片抽帧再与冻结源码输出对照。视频已输出供
  用户播放，本轮助手视觉判断来自带时刻采样帧，不声称观看了全部连续视频。
- 最终213秒正片及262.2秒原OP拼接版完整解码通过；12个源码画面/成片抽帧对照通过，
  5个声音窗口偏移均为0ms。`final_contact_sheet.jpg` 汇集12个成片样本，
  `comparison_decoded.jpg`（本地）抽查转面对照片，用户参考图仍仅留本地。

## 交付与复现

- `output/lower_armor_comparison_r23.mp4`：14秒旧新护腿、腰带转面与屈膝对照，无声音。
- `output/palace_duel_preview_r23.mp4`：26秒原声音实战片段。
- `output/stardust_clad_s1e2_palace_r23.mp4`：213秒正片。
- `output/stardust_clad_s1e2_palace_tv_r23.mp4`：262.2秒带原片头。

```powershell
node --import ./tools/register_loader.mjs render.mjs --serve --port 4235
node tools/review_lower_clad.mjs --video
node --import ./tools/register_loader.mjs render.mjs --physics-only --fps 60 --board storyboard/palace_r23/physics_final
../../.venv/Scripts/python.exe tools/check_palace.py storyboard/palace_r23/physics_final/trace.json --out storyboard/palace_r23/palace_checks.json
node --import ./tools/register_loader.mjs render.mjs --shots config/palace_review_shots.json --board storyboard/palace_r23/final_shots
node --import ./tools/register_loader.mjs render.mjs --out stardust_clad_s1e2_palace_r23.mp4 --trace storyboard/palace_r23/render_trace.json --board storyboard/palace_r23/render
../../.venv/Scripts/python.exe tools/package_palace.py --version r23 --publish-aliases
```

`?greaves=0` 关闭本轮护腿、靴面和腰带，保留R22肩臂，供同机位A/B。
工艺记录见 `dula-skills/hybrid-craft-scene/references/animated-metal-armor.md` 的R23段。
