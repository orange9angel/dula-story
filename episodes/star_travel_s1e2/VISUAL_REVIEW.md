# Star Travel S1E2 视觉/美学审核文档

## 1. 基本信息

- **Episode**: `star_travel_s1e2`
- **当前状态**: 已完成重制并渲染
- **最终输出**: `episodes/star_travel_s1e2/output/output.mp4`
  - 分辨率：1920×1080
  - 帧率：30 fps
  - 时长：约 179.8 s
  - 大小：约 15 MB
- **预览帧**: `episodes/star_travel_s1e2/storyboard/preview.jpg`

## 2. 场景与运镜

| 场景 | 用途 | 关键设置 |
|------|------|---------|
| `DeepSpaceScene` | 太空战、飞船追逐、武器发射与爆炸 | 星空背景、粒子引擎尾焰、激光/导弹发射特效 |
| `BrightSpaceStationScene` | 指挥部/对接舱对话 | 室内高亮环境，角色面部可见；使用 `Camera:Static`，不飞入房间 |

### 运镜约定

- **空间站场景**使用静态机位，角色按 explicit `{Position:...}` 排布，避免镜头从外部飞入造成“太空里哪来的房间”的错觉。
- 角色 `face` 使用 `forward` 或互相对望，配合 `Storyboard` 的对话伙伴推断，避免角色倾斜或丢失。
- 飞船场景使用追踪/过肩镜头增强战斗临场感。

## 3. 飞船资产

| 角色 | 模型文件 | 来源与授权 |
|------|---------|-----------|
| 紫金号 / PurpleShip | `assets/models/purple_ship.glb` | Poly.Pizza CC0 飞船模型 |
| 猴子号 / MonkeyShip | `assets/models/monkey_ship.glb` | Poly.Pizza CC0 飞船模型 |

- `bootstrap.js` 使用 `GLTFLoader` 预加载模型，存储在 `window.__dulaShipModels`。
- `characters/ships.js` 提供 `GLBShipCharacter` 基类，统一处理引擎发光、尾迹、导航灯、受击闪烁与悬浮脉冲。
- 模型路径使用绝对路径 `/episode/assets/models/...`，确保 `dula-verify` 与 `dula-render` 都能正确解析。

## 4. 配音设计

采用**方言/地区口音**替代之前的标准普通话 + 无线电沙沙声，保留对讲机频段压缩效果（`radio` effect），但已移除 `radio_static` SFX。

| 角色 | 口音/地区 | TTS 声音 |
|------|----------|---------|
| Command | 标准指挥员 | `zh-CN-YunyangNeural` |
| Zorak | 沉稳反派 | `zh-CN-YunxiNeural` |
| Klaw | 急躁反派 | `zh-CN-YunjianNeural` |
| Vex | 东北话 | `zh-CN-liaoning-XiaobeiNeural` |
| Rex | 台湾腔 | `zh-TW-YunJheNeural` |
| Bai 白冷森 | 陕西话 | `zh-CN-shaanxi-XiaoniNeural` |
| Cheng 橙子 | 粤语 | `zh-HK-WanLungNeural` |

情绪变体（excited / angry / calm 等）在 `config/voice_config.json` 中配置。

## 5. 已解决问题

| 问题 | 处理方式 |
|------|---------|
| 飞船模型太简陋 | 替换为 Poly.Pizza CC0 GLB 飞船模型 |
| 白冷森介绍时消失/倾斜 | 空间站场景使用 `Camera:Static` 与显式 `Position`，修复角色朝向与关节限制 |
| 无线电沙沙声突兀 | 移除 `radio_static` SFX，仅保留对讲机频段 filter |
| 配音死板 | 改用方言 + 情绪变体，模拟电影角色辨识度 |
| 镜头从房间外飞入 | 删除 `Formation/CloseUp/ReactionShot` 飞入，改用舱内静态调度 |

## 6. 已知注意事项

- `dula-audio` 调度器会报告少量台词重叠警告（约 0.0–1.2 s），最终混音长度 179.8 s 与视频对齐，可接受。
- 生成的 `assets/audio/`、`storyboard/frames/`、`output/` 等已被 `.gitignore` 忽略，**不要手动提交**。
- 当前目录下仍留有 `tools/generate_audio.py`（未接入 npm scripts），如需清理请单独确认。

## 7. 视觉/美学检查清单

- [ ] 飞船 GLB 模型在 DeepSpaceScene 中比例一致、无闪烁穿模
- [ ] 激光/导弹发射特效可见，爆炸效果不像星球
- [ ] 空间站场景所有角色面部清晰、不倾斜、不少人
- [ ] 对话时角色有眼神/头部微动，避免木偶感
- [ ] 方言配音听起来有电影角色区分度，不刺耳
- [ ] 整体 3 分钟以内节奏紧凑，无第三方解说感
