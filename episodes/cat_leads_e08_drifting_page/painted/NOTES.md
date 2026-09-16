# E08《漂走的那张画》V2 — 全程序绘制版

> 目标：画面零生成模型调用（不跑 imagegen / Seedance I2V / OmniHuman），
> 全部视觉由本地 Canvas 程序绘制。声音链不变：TTS 配音、环境音、SFX、BGM
> 全部沿用 V1 已生成的 `assets/audio/mixed.wav`。

成片：`painted/output/output.mp4`（60.0 秒，1920×1080，30 fps，2.5D 构图版）。
检查帧：`painted/storyboard/shot_*.jpg`。

## 2.5D 构图（第二轮迭代）

- **视差分层**：天空/远岸/河面/岸草柳树/人物分 5 层，`pan_view` 运镜横移时
  近快远慢（层速率 0.12/0.35/0.6/1.0），开场、树摇、阵风、漂页、收尾都带。
- **多视角镜头**（传统动画式 layout 切换，不再全正面平视）：
  - 侧面全景：阿澈侧坐速写，小蓝**从左侧走入画面**（两步走路循环）再停下
  - 阿澈侧面特写（望河回答，侧脸口型仍吃 lipsync_cues）
  - 过阿澈肩膀看画页被风掀起（前景后脑勺+速写本）
  - 贴水低角度漂页：前景草叶框景，画页带涟漪从眼前漂过
  - 俯拍重画：从上往下看阿澈伏案，速写逐笔显现、笔尖跟随
  - 过小蓝肩膀听阿澈说「我记得它」
  - 侧面双人镜头递画/接画
- 台词特写保留正面（正面读表情最清楚），与侧面镜头交替。

## 做法

- 共享库已抽到 `dula-assets/lib/flatpreviz/`（core/figures/figures-side/env/driver，
  纯 Canvas 零依赖），本集 `painted/painter.js` 只保留剧集层：角色 design
  对象（小蓝/阿澈/小橘）、画页与 F01 道具画法、18 个镜头的构图表。
  其他 episode 复用方式见 `dula-skills/previz-animatic/SKILL.md`。
- 画面语言：晴印平涂（纯色块、无渐变、无模糊）：
  - 场景：天空/太阳/云漂移、远岸、河流波光、草岸光斑、柳树（枝条珠链随风摆）、
    阵风粒子层（风速包络与 16.0–18.5s 的 wind_gust SFX 对齐）、飞鸟掠过。
  - 人物：小蓝（蓝色背带裙、刘海、金发夹）/ 阿澈（V 形刘海、琥珀 T 恤）/
    小橘（打盹，呼吸起伏 + 尾巴尖抖动），正面与侧面两套画法，
    程序表情（好奇/平静/吃惊/温柔/惋惜/开心）+ 确定性眨眼 + 三态嘴型。
  - 口型：直接吃 V1 的 `config/lipsync_cues.json`（由最终 TTS 干声提取的
    12fps 音节视素），按角色名绑定，不依赖任何图像 rig。
  - 关键叙事物：画页掀起飞走（18.5–21s）、画页漂河（30–34.5s 带涟漪）、
    凭记忆重画（40.5–45s 铅笔速写逐笔显现、笔尖跟随笔画推进）。
  - F01 齿轮霜花符号：程序绘制（8 齿 + 辐条 + 霜枝），在结尾速写本特写
    （51.5–54.5s）页面右下角，约 1/12 页面，全片无人提及。画页上**不出现**
    F01（沿用 V1 伏笔防泄露纪律）。
- `painted/viewer.html/js`：预览与逐帧渲染入口（点击预览带 `mixed.wav`）。
- `painted/render.mjs`：本地静态服务器 + puppeteer 逐帧截图 + ffmpeg
  混流（沿用 yuki_beat_ad 的剧集内渲染模式）。`--check` 只出检查帧，
  `--serve` 起本地预览。

```powershell
node episodes\cat_leads_e08_drifting_page\painted\render.mjs --check
node episodes\cat_leads_e08_drifting_page\painted\render.mjs
node episodes\cat_leads_e08_drifting_page\painted\render.mjs --serve
```

## 与 V1 的关系

- `script.story`、`assets/audio/`、`config/lipsync_cues.json` 完全共用（留在
  episode 根目录）；V1 火山版全部内容（bootstrap/scenes/characters/生成素材/
  关键帧配置/成片）已归档到 `../volcano/`，作为独立 episode 目录可重建。
- 画面风格从"照片级晴印"换成"平涂儿童插画"：这是自绘的成本形态，
  不声称与 V1 同质。字幕样式一致。

## 成本

- 画面：¥0（无生成调用）。声音：V1 已付费的素材复用，¥0 新增。
- 对比 V1 ≈¥40–55。

## 已知限制

- 人物动作是有限动画级别：无转身；走路是两步循环的平移。
- redraw 镜头的铅笔速写是 stylized 逐笔显现，不是真实笔迹仿真。
- 视听验收以人耳人眼为准；未跑模型评审。

- `painted/painter.js`：全部画面代码。晴印平涂语言（纯色块、无渐变、无模糊）：
  - 场景：天空/太阳/云漂移、远岸、河流波光、草岸光斑、柳树（枝条珠链随风摆）、
    阵风粒子层（风速包络与 16.0–18.5s 的 wind_gust SFX 对齐）、飞鸟掠过。
  - 人物：小蓝（蓝色背带裙、刘海、金发夹）/ 阿澈（V 形刘海、琥珀 T 恤）/
    小橘（打盹，呼吸起伏 + 尾巴尖抖动），程序表情（好奇/平静/吃惊/温柔/惋惜/
    开心）+ 确定性眨眼 + 三态嘴型。
  - 口型：直接吃 V1 的 `config/lipsync_cues.json`（由最终 TTS 干声提取的
    12fps 音节视素），按角色名绑定，不依赖任何图像 rig。
  - 关键叙事物：画页掀起飞走（18.5–21s）、画页漂河（30–34.5s 带涟漪）、
    凭记忆重画（40.5–45s 铅笔速写逐笔显现、笔尖跟随笔画推进）。
  - F01 齿轮霜花符号：程序绘制（8 齿 + 辐条 + 霜枝），在结尾速写本特写
    （51.5–54.5s）页面右下角，约 1/12 页面，全片无人提及。画页上**不出现**
    F01（沿用 V1 伏笔防泄露纪律）。
- `painted/viewer.html/js`：预览与逐帧渲染入口（点击预览带 `mixed.wav`）。
- `painted/render.mjs`：本地静态服务器 + puppeteer 逐帧截图 + ffmpeg
  混流（沿用 yuki_beat_ad 的剧集内渲染模式）。`--check` 只出检查帧，
  `--serve` 起本地预览。

```powershell
node episodes\cat_leads_e08_drifting_page\painted\render.mjs --check
node episodes\cat_leads_e08_drifting_page\painted\render.mjs
node episodes\cat_leads_e08_drifting_page\painted\render.mjs --serve
```

## 与 V1 的关系

- `script.story`、`assets/audio/`、`config/lipsync_cues.json` 完全共用（留在
  episode 根目录）；V1 火山版全部内容（bootstrap/scenes/characters/生成素材/
  关键帧配置/成片）已归档到 `../volcano/`，作为独立 episode 目录可重建。
- 画面风格从"照片级晴印"换成"平涂儿童插画"：这是自绘的成本形态，
  不声称与 V1 同质。字幕样式一致。

## 成本

- 画面：¥0（无生成调用）。声音：V1 已付费的素材复用，¥0 新增。
- 对比 V1 ≈¥40–55。

## 已知限制

- 人物动作是有限动画级别：无走路、无转身，情绪靠表情和姿态切换。
- redraw 镜头的铅笔速写是 stylized 逐笔显现，不是真实笔迹仿真。
- 视听验收以人耳人眼为准；未跑模型评审。
