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

**当前 Episode**：`episodes/she_ra/`（「She-Ra 公主力量」——Adora 变身、与 Hordak 对抗的奇幻冒险）

> 历史 Episode：
> - `episodes/starlight_courier/`（「星光快递员」）
> - `episodes/dunk_master_doraemon/`（「扣篮大师哆啦A梦」）
> - `episodes/takecopter_hikou/`（「竹蜻蜓飞行」）
> - `episodes/bichong_qiupai/`（「必中球拍」）

---

## 2. 目录结构

```
dula-story/
├── episodes/
│   └── takecopter_hikou/        # Episode 目录
│       ├── script.story         # 剧本（唯一时序数据源）
│       ├── bootstrap.js         # 资产注册入口（import dula-assets + 自定义插件）
│       ├── config/
│       │   ├── transitions.json # 场景过渡出口/入口
│       │   ├── voice_config.json# TTS 声线配置
│       │   └── choreography.json# 静态编舞配置（可被 .story DSL 覆盖）
│       ├── materials/           # 手动音频素材（可选）
│       │   ├── bgm/             # 手动 BGM (*.mp3/*.wav/*.ogg)
│       │   └── sfx/             # 手动 SFX (*.wav)
│       ├── assets/
│       │   ├── audio/
│       │   │   ├── music/       # BGM 输出 (*.wav，自动生成)
│       │   │   ├── sfx/         # SFX 输出 (*.wav，自动生成)
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
| `{Transition:Name\|key=val}` | `{Transition:Flash\|duration=0.8\|flashColor=0xff3333}` | 场景转场效果 |

### 参数语法
`{Namespace:Action|key=value|key2=1,2,3}`，数组值用逗号分隔。

### 标签共存规则
- 同一条目中，所有标签互不冲突，可共存。
- `@SceneName`、`{Music:...}`、`{Position:...}`、`{Prop:...}` 等配置型标签通常放在场景切换条目中（无对白的短条目）。
- `{Ball:...}` 放在对应动作发生的对白条目中，`startTime` 自动取自该条目时间戳。
- `{Transition:...}` 放在场景切换条目中，控制场景过渡动画效果。支持自定义转场（需在 `bootstrap.js` 中通过 `registerTransition()` 注册）。

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

### 自定义转场系统

引擎内置 `Fade` 转场。如需自定义转场，在 `bootstrap.js` 中继承 `TransitionBase` 并注册：

```javascript
import { TransitionBase, registerTransition } from 'dula-engine';

class FlashTransition extends TransitionBase {
  constructor(options) {
    super(options);
    this.duration = options.duration ?? 0.3;
    this.flashColor = new THREE.Color(options.flashColor ?? 0xffffff);
  }
  createOverlayMaterial() {
    // 返回 ShaderMaterial，用于全屏 quad
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        progress: { value: 0 },
        flashColor: { value: this.flashColor }
      },
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `uniform sampler2D tDiffuse; uniform float progress; uniform vec3 flashColor; varying vec2 vUv; void main() { vec4 texel = texture2D(tDiffuse, vUv); float flash = sin(progress * 3.14159); gl_FragColor = vec4(mix(texel.rgb, flashColor, flash), 1.0); }`
    });
  }
  update(t) {
    // t: 0..1，转场进度
    this.material.uniforms.progress.value = t;
  }
}

registerTransition('Flash', FlashTransition);
```

然后在剧本中使用：
```
{Transition:Flash|duration=0.8|flashColor=0xff3333}
```

**已实现的自定义转场（she_ra）**：
| 转场名 | 效果 | 参数 |
|--------|------|------|
| `Flash` | 强光闪烁 | `duration`, `flashColor` |
| `Iris` | 圆形光圈开合 | `duration` |
| `Wipe` | 方向性擦拭 | `duration`, `direction` (left/right/up/down) |
| `Dissolve` | 噪点溶解 | `duration` |
| `Pixelate` | 像素化过渡 | `duration` |

---

## 5. 素材规范

### BGM (`assets/audio/music/`)
引擎 `generate_bgm.py` 会自动生成以下 5 首 BGM（procedural 合成）：

| 文件名 | 场景 | 风格 |
|--------|------|------|
| `room_theme.wav` | 室内 | C major, 60 BPM，轻松日常 |
| `park_theme.wav` | 公园 | G major, 100 BPM，轻快运动 |
| `chaos_theme.wav` | 失控 | Diminished, 130 BPM，滑稽紧张 |
| `tension_theme.wav` | 紧张 | A minor, 120 BPM，悬疑 |
| `wonder_theme.wav` | 惊奇 | F major, 90 BPM，空灵 + bell lead |

**手动素材优先**：将 `.mp3`/`.wav`/`.ogg` 放入 `materials/bgm/`，引擎会自动转换使用。

**推荐来源**：
- **Pixabay Music**（首选）：https://pixabay.com/music/ — 免费商用，无需署名。
- **Fesliyan Studios Cartoon**：https://www.fesliyanstudios.com/royalty-free-music/downloads-c/cartoon-music/86
- **Freesound**（SFX）：https://freesound.org/ — 需遵守各文件 CC 许可。

### SFX (`assets/audio/sfx/`)
引擎 `generate_audio.py` 自动从 story events 调度 SFX，procedural 生成回退。也可将手动素材放入 `materials/sfx/` 优先使用。

### Audio Registry（元数据参考）
`dula-assets/audio-registry/` 提供音频资产的元数据（来源 URL、许可证、触发提示），可用于指导手动下载。使用 `download.py` 按场景过滤生成下载计划。

### TTS 输出
由 `generate_audio.py` 自动生成，**不要手动修改** `manifest.json` 和 `mixed.wav`。

### Git 忽略规则
所有生成的音频资产（`assets/audio/` 下的 `.wav`、`.mp3`、`manifest.json`、`mixed.wav`）和临时文件（`_temp_*.wav`）已在 `.gitignore` 中排除，不进入版本控制。

---

## 6. 与引擎的交互

Story 仓库通过 `npm install` 引入引擎，以 npm scripts 方式调用 CLI：

### package.json scripts

```json
{
  "scripts": {
    "audio": "dula-audio ./episodes/takecopter_hikou",
    "verify": "dula-verify ./episodes/takecopter_hikou",
    "render": "dula-render ./episodes/takecopter_hikou",
    "build": "npm run audio && npm run render",
    "audio:dunk": "dula-audio ./episodes/dunk_master_doraemon",
    "verify:dunk": "dula-verify ./episodes/dunk_master_doraemon",
    "render:dunk": "dula-render ./episodes/dunk_master_doraemon",
    "build:dunk": "npm run audio:dunk && npm run render:dunk",
    "audio:she_ra": "dula-audio ./episodes/she_ra",
    "verify:she_ra": "dula-verify ./episodes/she_ra",
    "render:she_ra": "dula-render ./episodes/she_ra",
    "build:she_ra": "npm run audio:she_ra && npm run render:she_ra",
    "visual-review:she_ra": "python ./tools/visual-review/cli.py ./episodes/she_ra",
    "visual-review:collect:she_ra": "python ./tools/visual-review/cli.py ./episodes/she_ra --collect-only"
  }
}
```

### 依赖方式选择

| 方式 | package.json 写法 | 适用场景 |
|------|-------------------|----------|
| GitHub Release | `"https://github.com/.../dula-engine-0.1.7.tgz"` | **当前使用**，锁定版本号，与源码解耦 |
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

当 Engine 发布新版本（如 v0.1.7）并上传 Release Assets 后：

```bash
cd dula-story
# 更新 package.json 中的 dula-engine 和 dula-assets URL
npm install
npm run build
```

Story `package.json` 同时依赖 `dula-assets` Release tarball（如 v0.1.2），升级方式相同。

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
2. 复制 `takecopter_hikou/config/` 作为模板。
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

## 9. 当前 Episode 已知问题（she_ra）

| 问题 | 状态 | 备注 |
|------|------|------|
| She-Ra 剑绑定 | ✅ 已修复 | `swordGroup` 从 mesh 移到 `rightArm` group，剑跟随手部动画 |
| FrightZoneScene 风暴特效 | ✅ 已修复 | 闪电 PointLight + rimLight + 3000 粒子下雨 + 云层，时间驱动（非 setTimeout） |
| Hordak 外观增强 | ✅ 已修复 | 鼻子、胸甲、腰带、护膝、脸颊阴影、眼内发光 |
| Catra 退场修复 | ✅ 已修复 | 添加 `[Catra]{Event:Move}` 退场动画，角色不再凭空消失 |
| 音频优化 | ✅ 已修复 | Adora rate -10%，BGM baseVolume 0.05，TTS volume +20~40% |
| 转场效果扩展 | ✅ 已修复 | 新增 Flash、Iris、Wipe、Dissolve、Pixelate 5 种自定义转场，剧本已应用 |
| 视频 concat 后时间戳偏移 | 🔄 已知 | concat 输出有 `start: -0.021333` 偏移，视频流 `start_time=6.45s`，需用外部工具裁剪时注意 |
| BGM 风格匹配 | 🔄 待优化 | 当前使用 procedural BGM，后续可替换为 Pixabay 手动素材 |
| BGM 音量 Inspector 误报 | 🔄 已知 | AudioBalanceInspector 分析原始 BGM 文件而非混合后音量（引擎侧问题） |
| 闪电效果截图可见性 | 🔄 已知 | PointLight 闪光在静态截图中难以捕捉，但视频中动态可见 |

---

---

## 10. 质检团队 Inspector 维度（dula-inspect-team）

运行 `npx dula-inspect-team ./episodes/<name>` 执行闭环质检。

| 维度 | Inspector | 检测内容 |
|------|-----------|----------|
| D1 | SceneInspector | 场景注册、过渡配置、场景-主题匹配 |
| D2 | CharacterInspector | 角色注册、声线配置、场景连续性 |
| D2 | VisualInspector | 截图分析、角色可见性、位置重叠 |
| D3 | AnimationInspector | 动画注册、移动速度、角色专属匹配 |
| D4 | CameraInspector | 运镜参数、后脑勺检测、距离安全 |
| D5 | EffectInspector | Shake 滥用、特效-情绪匹配、强度范围 |
| D5/D6 | NarrativeInspector | 道具一致性、环境匹配、动作合理性 |
| D7 | AudioInspector | 音频存在性、抢拍检测、时长匹配 |
| **D8** | **AudioBalanceInspector** | **TTS vs BGM 音量平衡、同角色音量一致性** |
| D9 | StoryQualityInspector | 故事节奏、高潮定位、情绪多样性 |
| **D9** | **LipSyncInspector** | **台词长度-时间窗口匹配、语速检测、嘴型压缩** |
| **D10** | **CameraSubjectInspector** | **说话角色与相机目标匹配、ReactionShot 误用** |
| **D11** | **TransitionInspector** | **场景切换退场/入场动画、禁止瞬移、飞行能力利用** |
| **D12** | **MusicFitInspector** | **BGM 风格-场景匹配、BGM 音量、覆盖完整性** |

---

## 11. Visual Review — 非脚本级视觉/美学审核

`dula-inspect-team` 负责**脚本级**检查（角色注册、音频时长、相机角度等），但无法检测**视觉/美学级**问题（角色外观细节、场景丰富度、动作自然度、运镜质量、光效氛围、台词文学性）。

每个 Episode 目录下应包含 `VISUAL_REVIEW.md`，记录该 Episode 的视觉审核规范和问题追踪。

### 审核维度

| 维度 | 检查内容 | 审核方式 |
|------|---------|---------|
| **D-V1** 角色外观细节 | 面部特征、发型、服装、材质对比、比例 | 人工检查 storyboard 截图 |
| **D-V2** 场景丰富度 | 地面纹理、背景层次、道具点缀、光影、氛围 | 人工检查 storyboard 截图 |
| **D-V3** 动作自然度 | 动作幅度、流畅度、身体协调、表情配合 | 人工检查 storyboard 截图 |
| **D-V4** 运镜质量 | 景别变化、角度变化、运动运镜、角色可见、画面稳定 | 人工检查 storyboard 截图 |
| **D-V5** 光效氛围 | 主光源、角色照明、氛围光、阴影层次 | 人工检查 storyboard 截图 |
| **D-V6** 台词文学性 | 口语自然、情绪递进、角色个性、信息密度 | 人工阅读剧本 |

### 审核流程

每次修改后执行：

1. `npm run verify` 生成 storyboard 截图
2. 逐张检查截图，对照 6 个维度记录问题
3. 按 P0(必须修)/P1(建议修)/P2(可优化) 排序
4. 修复 P0/P1 后重新验证

### 角色消失规则（重要）

**角色不能凭空消失**，除非有明确的魔法/超自然解释。退场方式优先级：

1. **走出画面**（推荐）：`{Event:Move|character=X|x=...|z=...|duration=...}`
2. **随场景切换退场**：在场景切换的 Fade 过渡中自然消失
3. **魔法变身**：需配合强光/闪光效果，且台词明确说明
4. **禁止**：直接使用 `{Event:Hide|character=X}` 让角色凭空消失

### 工程化工具（已实现）

`tools/visual-review/` 提供自动化视觉审核框架：

```bash
# 收集关键帧（不调用 AI）
npm run visual-review:collect:she_ra

# 运行完整 AI 视觉审核（需配置 OPENAI_API_KEY 或 ANTHROPIC_API_KEY）
npm run visual-review:she_ra

# 指定维度和 provider
python tools/visual-review/cli.py ./episodes/she_ra \
  --dimensions character_detail lighting \
  --provider openai
```

**组件架构：**
- `ScreenshotCollector` — 从 storyboard 提取关键帧（场景开始/结束、对白中间、运镜变化）
- `AIVisionClient` — 封装 GPT-4V / Claude 3 / 本地模型 API
- `VisualReviewEngine` — 整合收集器与 AI 客户端，生成评分报告

**审核维度映射：**

| 工具维度 | AGENTS 维度 | 说明 |
|----------|------------|------|
| `character_detail` | D-V1 | 角色外观细节 |
| `scene_detail` | D-V2 | 场景丰富度 |
| `cinematography` | D-V4 | 运镜质量 |
| `lighting` | D-V5 | 光效氛围 |

### 未来演进

- [x] 关键帧自动提取
- [x] AI Vision API 集成框架
- [ ] 规则引擎回退（降低 API 成本）
- [ ] 与 dula-inspect-team 统一报告格式
- [ ] 历史对比与趋势追踪
- [ ] 自动修复建议生成

**最后更新**：2026-05-03
