# Dula Story — 动画剧集内容仓库

本仓库存放 Dula 动画的**剧本、配置、素材与输出**。

三层架构：
- [`dula-engine`](https://github.com/orange9angel/dula-engine) — 纯净框架（渲染/音频执行）
- [`dula-assets`](https://github.com/orange9angel/dula-assets) — 官方资产库（角色/动画/场景/运镜/配音）
- **本仓库** — 内容声明（剧本/配置/素材/输出）

## 独立方向

电子漫画书/有声翻页漫画已经拆为独立工程：

- [`comic-book-studio`](https://github.com/orange9angel/comic-book-studio) — AI 分镜图、漫画气泡、TTS、BGM/SFX、Three.js 翻页视频生成

该方向可以和 Dula 动画工程互相借鉴技术方案，但代码、依赖和发布节奏保持独立。

## 目录结构

```
dula-story/
├── episodes/
│   └── bichong_qiupai/          # 单个剧集目录
│       ├── script.story         # 剧本（时序 + 对白 + 指令标签）
│       ├── bootstrap.js         # 资产注册入口（import dula-assets + 自定义插件）
│       ├── config/
│       │   ├── transitions.json    # 场景过渡配置
│       │   ├── voice_config.json   # TTS 声线配置
│       │   └── choreography.json   # 静态编舞配置（可被 .story DSL 覆盖）
│       ├── assets/
│       │   └── audio/
│       │       ├── music/          # BGM 素材 (*.wav)
│       │       ├── sfx/            # 音效素材 (*.wav)
│       │       ├── manifest.json   # TTS 音频清单（自动生成）
│       │       ├── mixed.wav       # 最终混音（自动生成）
│       │       └── *.mp3           # 逐句 TTS（自动生成）
│       ├── storyboard/            # 验证截图（自动生成）
│       └── output.mp4             # 最终视频（自动生成）
└── package.json
```

## 快速开始

```bash
# 安装引擎依赖
npm install

# 生成音频（TTS + BGM + SFX 混音）
npm run audio

# 逐镜头验证画面
npm run verify

# 生成完整视频
npm run render

# 一键出片：音频 + 视频
npm run build
```

## 引擎依赖

本仓库通过 `package.json` 引入 `dula-engine` 和 `dula-assets`：

### 方式 A：本地开发（file: 链接）
```json
{
  "dependencies": {
    "dula-engine": "file:../dula-engine",
    "dula-assets": "file:../dula-assets"
  }
}
```
- 源码修改**实时生效**，无需重新 install

### 方式 B：GitHub Release（当前使用方式）
```json
{
  "dependencies": {
    "dula-engine": "https://github.com/orange9angel/dula-engine/releases/download/v0.1.6/dula-engine-0.1.6.tgz",
    "dula-assets": "https://github.com/orange9angel/dula-assets/releases/download/v0.1.0/dula-assets-0.1.0.tgz"
  }
}
```
- 锁定版本号，与源码完全解耦
- 升级后修改 URL 重新 `npm install` 即可

日常开发无需进入引擎目录，所有 CLI 命令均从本仓库根目录执行。

## 新增剧集

1. 在 `episodes/` 下创建新目录
2. 复制 `bichong_qiupai/config/` 作为模板
3. 编写 `script.story`
4. 放入 BGM/SFX 素材到 `assets/audio/`
5. 修改 `package.json` scripts 指向新目录，或直接使用：
   ```bash
   npx dula-render ./episodes/<name>
   ```

## 剧本格式

`.story` 是 SRT 时间轴的扩展格式，支持命名空间标签：

```
1
00:00:00,000 --> 00:00:01,500
@RoomScene{Music:Play|name=room_theme|fadeIn=2.0}

2
00:00:03,000 --> 00:00:06,852
[Doraemon]{WaveHand} 大雄！明天要和静香打球对吧？
```

支持的标签：`@SceneName`、`[Character]`、`{Action}`、`{Camera:...}`、`{Music:...}`、`{Ball:...}`、`{Prop:...}`、`{Position:...}`、`{Event:...}`

详见 `AGENTS.md`。
