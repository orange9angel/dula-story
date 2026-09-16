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

## 配乐（R3，2026-09-16）

- 监制意见：引擎 numpy procedural 的 wonder_theme 太拉，按系列正式集标准
  （E04–E08）换火山 **Seed-Audio 1.0** 大模型作曲。生成脚本
  `tools/gen_bgm_seedaudio.sh`（`source .env.speech`，VOLC_SPEECH_API_KEY）。
- prompt 结构按 `dula-skills/episode-scoring/references/composition-prompt-craft.md`，
  曲式段对齐剧情弧：0–14s 河堤起风（钢琴独奏动机 pp，转阴的犹豫但温暖）→
  14–26s 穿巷赶雨（木琴/拨弦雨滴点缀，流动渐强）→ 26–62s 檐下听雨
  （弦乐群托底，主题展开，乐句留白，≤mf，躲雨的安全感）→ 62–76s 云开金光
  （长笛/双簧管提亮，主题再现，上扬后渐弱收 pp）。C 大调 + IVmaj7，
  钢琴/木琴/尼龙弦吉他/弦乐群/长笛/双簧管，rubato 66–72 BPM，
  无鼓组/电子音色/人声/爆音。
- 三版选一（`tools/compare_bgm_versions.py`：beatcut spectral-flux onset +
  每秒 RMS；阈值 50 onset/60s 等比 → 76s 需 ≥63）：

  | 版 | 时长 | onsets | RMS 动态范围 | 8 段 RMS dB 轮廓 | 判 |
  |---|---|---|---|---|---|
  | v1 | 72.08s | 131 | 46.4 dB | -30.1 -23.0 -18.4 -18.2 -16.8 -17.5 -14.8 -38.3 | 时长不足 76s，尾部需循环，出局 |
  | v2 | 76.00s | 119 | 35.7 dB | -34.1 -28.7 -24.0 -23.2 -20.1 -18.0 -22.7 -41.1 | 达标，动态对比最小 |
  | **v3** | **76.00s** | **148** | **48.3 dB** | -40.0 -34.7 -25.1 -21.8 -18.9 -21.4 -24.4 -43.1 | **入选** |

- 选版理由：v3 时长精确 76s（与混音槽 1:1，无循环接缝）；onset 最多
  （作曲活动度最高）；动态对比最大——开头 -42dB 的 pp 钢琴动机最干净，
  高点落在 38–57s（檐下听雨段内），结尾 5s 收到 -52dB，pp→mf→pp 大弧线
  完整且尾韵留得足。候选留存 music/waiting_rain_theme_v1/v2.wav 可替换。
- 混音：`script.story` 第 1 条 Music 标签改 `name=waiting_rain_theme`
  （fadeIn/baseVolume/endTime 不动），`tools/generate_audio.py` 重跑
  （TTS 11 句全部 skip 未重复合成），bgmVolume 维持 0.3 未降——
  新曲动态虽大但混音后 mean -26.8dB / max -4.5dB 不削波（volumedetect 实测）。
