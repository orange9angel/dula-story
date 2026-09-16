# E10《等雨停》NOTES — 全程序绘制版

> 质感集（系列圣经 §3.2：E10 质感为主，F01/F02/F03 全部冷却静默）。
> 画面零生成模型调用，全部视觉由本地 Canvas 程序绘制（flatpreviz）。
> 声音链：seed-tts-2.0 三角色配音 + 程序合成 SFX + procedural BGM。

成片：`painted/output/output.mp4`（76.0 秒，1920×1080，30 fps）。
检查帧：`painted/storyboard/shot_*.jpg`（21 镜 × 2）。
导演分镜表：`storyboard.md`（镜头设计意图与纪律自查）。

## 剧情与落点

阵雨困住河堤上的阿澈和小蓝，小橘带他们穿白墙巷、躲进便利店雨檐下
（E01 便利店、E02 巷子场景回调）。雨停云开，小镇被洗得发亮。
落点接 E08 阿澈"怕留不住普通日子"的伤口：「下过雨的日子，像新的一页。」
余韵：温暖明亮（washed clean）。

## 伏笔纪律执行

- F01/F02/F03 全静默：速写页只画雨线（C6 检查帧确认无符号）；无后山凝视；
  无"夜里的光"话题（"云边金色"是普通夕阳）。
- 全片无 #3DFFC8 青色；雨后金光走晴印金色系。
- 老周不登场；无新角色、无新声线。

## 本集新增的库积木（已沉淀到 dula-assets/lib/flatpreviz/）

- `env.js`：`drawRain`（双层雨丝+涟漪+水冠）、`drawAlley`（白墙巷透视）、
  `drawStorefront`（便利店门脸：条纹雨檐+玻璃门暖光+长凳）、
  `drawCloudGap`（云裂金边）、`drawWetDapples`（湿地金光斑）、
  `drawSky` 加 `cloudDarken` 阵雨变体
- `figures-cat.js`（新文件）：`drawCatStand` / `drawCatWalk` / `drawCatSit`
  （含骄傲表情、甩水抖动、三态口型吃 lipsync）
- `driver.js`：`makeDriver` 加 `fadeInAt`（开场黑场淡入）
- `core.js`：`mixHex` / `mixPal`（调色板插值，D1 段灰蓝→金色整场过渡）

## 制作要点

- 两套调色板 RAINY（阵雨灰蓝）/ GOLDEN（雨后金），`palAt(t)` 在 62.5–66s
  用 mixPal+sstep 平滑过渡；巷内另有 `palAlley` 压灰变体。
- 雨强包络 `rainAt(t)` 与 script.story 的 rain_shower SFX（14→62s）对齐：
  14–18s 快速升到 0.55、18–26s 到满、58s 后渐弱、62.5s 止。
- 口型吃 `config/lipsync_cues.json`（12fps 视素，按角色名绑定，三角色全覆盖）。
- 音频链走剧集内 tools/（引擎 dula-audio 不认识 seedtts provider，同 E08）：
  `tools/generate_audio.py`（TTS+混音）、`tools/build_missing_sfx.py`
  （rain_shower/awning_drips 程序合成）、`tools/build_lipsync.py`（视素提取）。

## 渲染

```powershell
cd dula-story
node episodes\cat_leads_e10_waiting_rain\painted\render.mjs --check   # 检查帧
node episodes\cat_leads_e10_waiting_rain\painted\render.mjs           # 成片
node episodes\cat_leads_e10_waiting_rain\painted\render.mjs --serve   # 预览
```

## 迭代记录

- R1：C4/C1 门面两侧黑缝（环境积木未满铺底色）、巷顶黑楔 → 库级修复
  （教训：环境积木先满铺底色，已写回 previz-animatic SKILL）
- R2：侧脸 calm 系表情读作愤怒眉（刘海尖过深+眉形未按表情分流）→ 库级根治
  （E08 侧脸教训同根；改动会影响 E08 重渲画面，方向一致）
- R2：走路循环相位过零帧双腿并拢读作站立 → 加基础开腿量
- R2：B 段雨太弱/天色太亮 → rainAt 前置升段 + 巷内压灰调色板
- R2：速写本连续性（A1 手持→B 段抱跑→C 段伏案画）

## 成本

画面 ¥0；声音：seed-tts 11 句（约 ¥1 量级）+ 程序合成 SFX/BGM ¥0。
