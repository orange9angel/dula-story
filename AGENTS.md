# Dula Story — 内容仓库开发规范

> 本文档供 AI 开发代理阅读。本仓库是三层架构的**内容层**：只包含剧本、配置、素材、输出。渲染执行由 `dula-engine` 完成，官方资产（角色/动画/场景/运镜/配音）由 `dula-assets` 提供。

---

## 1. 项目概述

三层架构中的内容仓库。每个 **Episode**（短片剧集）是一个自包含目录，包含剧本、配置、音频素材和最终输出。

```
dula-engine  ← 框架（渲染/音频执行/Registry）
   ↑ 注册
dula-assets  ← 官方资产库（角色/动画/场景/运镜/配音/CourtDirector）
   ↑ 消费
dula-story   ← 本仓库（剧本/配置/素材/输出）
```

**当前 Episode**：`episodes/bichong_qiupai/`（「必中球拍」——哆啦A梦借给大雄百发百中网球拍，最后失控飞走）

---

## 2. 目录结构

```
dula-story/
├── episodes/
│   └── bichong_qiupai/          # Episode 目录
│       ├── script.story         # 剧本（唯一时序数据源）
│       ├── bootstrap.js         # 资产注册入口（import dula-assets + 自定义插件）
│       ├── config/
│       │   ├── transitions.json # 场景过渡出口/入口
│       │   ├── voice_config.json# TTS 声线配置
│       │   └── choreography.json# 静态编舞配置（可被 .story DSL 覆盖）
│       ├── assets/
│       │   ├── audio/
│       │   │   ├── music/       # BGM 素材 (*.wav)
│       │   │   ├── sfx/         # 音效素材 (*.wav)
│       │   │   ├── manifest.json# TTS 音频清单（自动生成）
│       │   │   ├── mixed.wav    # 最终混音（自动生成）
│       │   │   └── *.mp3        # 逐句 TTS 输出（自动生成）
│       │   └── images/          # 贴图/背景（预留）
│       ├── storyboard/          # 验证截图输出（自动生成）
│       └── output.mp4           # 最终视频（自动生成）
└── README.md
```

---

## 3. 剧本格式（`.story`）

`.story` 是 SRT 时间轴格式的扩展，支持命名空间标签。它是**唯一时序数据源**。

```
1
00:00:00,000 --> 00:00:01,500
@RoomScene{Music:Play|name=room_theme|fadeIn=2.0|baseVolume=0.68|endTime=19.5}

2
00:00:03,000 --> 00:00:06,852
[Doraemon]{WaveHand}{Camera:Static|position=0,2.5,6|lookAt=0,1.2,0} 大雄！明天要和静香打球对吧？
```

### 标记说明

| 标签 | 示例 | 说明 |
|------|------|------|
| `@SceneName` | `@RoomScene` | 场景切换指令 |
| `[Character]` | `[Doraemon]` | 说话角色，驱动 TTS 和嘴型 |
| `{Action}` | `{WaveHand}` | 身体动画（通用或角色专属） |
| `{Camera:Move\|key=val}` | `{Camera:ZoomIn\|distance=3.5}` | 运镜指令 |
| `{Music:Action\|key=val}` | `{Music:Play\|name=park_theme\|fadeIn=1.5}` | 配乐提示 |
| `{Ball:Action\|key=val}` | `{Ball:Serve\|from=Doraemon\|to=Nobita\|arcHeight=1.5}` | 球事件 |
| `{Prop:Action\|key=val}` | `{Prop:Racket\|character=Doraemon\|color=0xe60012}` | 道具操作 |
| `{Position:Char\|key=val}` | `{Position:Doraemon\|spot=northBaseline\|face=Nobita}` | 角色站位 |
| `{Event:Action\|key=val}` | `{Event:Move\|character=Nobita\|y=15\|duration=3.0\|relative=true}` | 剧情事件 |

### 参数语法
`{Namespace:Action|key=value|key2=1,2,3}`，数组值用逗号分隔。

### 标签共存规则
- 同一条目中，所有标签互不冲突，可共存。
- `@SceneName`、`{Music:...}`、`{Position:...}`、`{Prop:...}` 等配置型标签通常放在场景切换条目中（无对白的短条目）。
- `{Ball:...}` 放在对应动作发生的对白条目中，`startTime` 自动取自该条目时间戳。

---

## 4. JSON 配置文件

### `config/transitions.json`
定义场景切换时的出口和入口坐标。

```json
{
  "exits": {
    "RoomScene": { "x": -4, "z": 2 }
  },
  "entrances": {
    "ParkScene": { "x": -2, "z": 3 }
  }
}
```

### `config/voice_config.json`
定义各角色的 TTS 声线参数。

```json
{
  "Doraemon": {
    "voice": "zh-CN-XiaoxiaoNeural",
    "rate": "+10%",
    "pitch": "+10Hz"
  },
  "Nobita": {
    "voice": "zh-CN-YunxiNeural",
    "rate": "-5%",
    "pitch": "-5Hz"
  },
  "Shizuka": {
    "voice": "zh-CN-XiaoyiNeural",
    "rate": "+0%",
    "pitch": "+5Hz"
  }
}
```

### `config/choreography.json`
定义 ParkScene 的静态编舞配置。优先级低于 `.story` DSL 标签（若 `.story` 中已声明，则忽略 JSON 中的对应项）。

```json
{
  "parkScene": {
    "placements": [
      { "character": "Doraemon", "spot": "northBaseline", "face": "Nobita" },
      { "character": "Nobita", "spot": "southBaseline", "face": "Doraemon" },
      { "character": "Shizuka", "x": 5.5, "y": 0.01, "z": 2.5, "face": "center" }
    ],
    "props": [
      { "character": "Doraemon", "type": "racket", "color": "0xe60012" },
      { "character": "Nobita", "type": "racket", "color": "0x1a3c8a" }
    ],
    "ballEvents": [
      { "type": "player", "startTime": 30.0, "from": "Doraemon", "to": "Nobita", "arcHeight": 1.5 }
    ],
    "storyEvents": [
      { "type": "move", "character": "Nobita", "startTime": 44.5, "duration": 3.0, "relative": true, "x": 0, "y": 15, "z": 0 }
    ]
  }
}
```

**语义化站位 spot**：`northBaseline`, `southBaseline`, `sidelineBench`, `center`

---

## 5. 素材规范

### BGM (`assets/audio/music/`)
| 文件名 | 场景 | 建议风格 | 推荐来源 |
|--------|------|----------|----------|
| `room_theme.wav` | 室内 | 轻松、日常 | Pixabay Music |
| `park_theme.wav` | 公园 | 轻快、运动 | Pixabay Music |
| `chaos_theme.wav` | 失控 | 滑稽、紧张 | Pixabay Music |

**推荐来源**：
- **Pixabay Music**（首选）：https://pixabay.com/music/ — 免费商用，无需署名。
- **Fesliyan Studios Cartoon**：https://www.fesliyanstudios.com/royalty-free-music/downloads-c/cartoon-music/86

### SFX (`assets/audio/sfx/`)
引擎会自动生成 `tennis_hit.wav`。其他音效可手动放入。

### TTS 输出
由 `generate_audio.py` 自动生成，**不要手动修改** `manifest.json` 和 `mixed.wav`。

---

## 6. 与引擎的交互

Story 仓库通过 `npm install` 引入引擎，以 npm scripts 方式调用 CLI：

### package.json scripts

```json
{
  "scripts": {
    "audio": "dula-audio ./episodes/bichong_qiupai",
    "verify": "dula-verify ./episodes/bichong_qiupai",
    "render": "dula-render ./episodes/bichong_qiupai",
    "build": "npm run audio && npm run render"
  }
}
```

### 依赖方式选择

| 方式 | package.json 写法 | 适用场景 |
|------|-------------------|----------|
| GitHub Release | `"https://github.com/.../dula-engine-0.1.6.tgz"` | **当前使用**，锁定版本号，与源码解耦 |
| `file:` 链接 | `"file:../dula-engine"` / `"file:../dula-assets"` | **本地开发**，源码修改实时生效 |

### 本地开发链路

```bash
# 1. 引擎侧注册本地包（只需一次）
cd ../dula-engine
npm link

# 2. Story 侧链接引擎（只需一次）
cd dula-story
npm link dula-engine

# 3. 日常开发（全部在 Story 仓库执行）
npm run audio   # 生成音频
npm run verify  # 验证画面
npm run render  # 生成视频
npm run build   # 一键 audio + render
```

### 版本升级（Release 方式）

当 Engine 发布新版本（如 v0.1.6）并上传 Release Assets 后：

```bash
cd dula-story
# 更新 package.json 中的 dula-engine URL 为 v0.1.6
npm install
npm run build
```

引擎通过 npm `file:` 协议、`npm link` 或 Release tarball 安装到 `node_modules/dula-engine/`，CLI 命令自动注册到 `node_modules/.bin/`。

**相对路径规则**：所有 CLI 命令的相对路径均解析为**相对于当前工作目录**（即 Story 仓库根目录），与引擎安装位置完全解耦。

---

## 7. 开发工作流

### 修改剧本
1. 编辑 `episodes/<name>/script.story`。
2. 若修改了对白或时间轴，重新生成音频：`npm run audio`
3. 验证画面：`npm run verify`
4. 生成视频：`npm run render`

### 新增 Episode
1. 在 `episodes/` 下创建新目录。
2. 复制 `bichong_qiupai/config/` 作为模板。
3. 编写 `script.story`。
4. 放入需要的 BGM/SFX 素材到 `assets/audio/`。
5. 按上述流程生成音频 → 验证 → 出片。

---

## 8. 架构分层原则

| 层级 | 所在位置 | 职责 |
|------|----------|------|
| **剧本层** | `script.story` | 时序声明（何时发生什么） |
| **世界层** | `config/*.json` | 静态配置（场景过渡、声线、编舞备选） |
| **框架层** | `dula-engine` | 执行算法与基类（渲染、音频、Registry） |
| **资产层** | `dula-assets` | 可复用资产（角色、动画、场景、运镜、配音） |

**核心规则**：
- 剧情决策不进代码（引擎不硬编码任何剧情）。
- 技术算法不进剧本（`.story` 不手写坐标，用语义标签）。
- 静态配置不进 SRT（重复使用的配置放在 JSON 中，可被 DSL 覆盖）。

---

**最后更新**：2026-04-19
