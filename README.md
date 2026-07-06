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
├── episodes/                    # 所有 Episode 目录
│   ├── kimi_showcase_s1e1/      # 示例：Kimi 能力展示第一集
│   ├── she_ra/                  # 示例：奇幻冒险（变身/战斗）
│   ├── hurdles_championship/    # 示例：跨栏锦标赛 segmented 长片
│   └── ...                      # 更多剧集目录
├── docs/                        # 工程化/工具设计文档
├── tools/                       # 辅助工具（视觉审核、截图网格等）
├── package.json                 # 各 Episode 的 npm scripts
├── README.md                    # 本文件
└── AGENTS.md                    # AI 代理开发规范
```

单个 Episode 目录结构：

```
episodes/<name>/
├── script.story         # 剧本（时序 + 对白 + 指令标签）
├── bootstrap.js         # 资产注册入口（import dula-assets + 自定义插件）
├── config/
│   ├── transitions.json    # 场景过渡配置（可选）
│   ├── voice_config.json   # TTS 声线配置
│   └── choreography.json   # 静态编舞配置（可选，可被 .story DSL 覆盖）
├── assets/
│   └── audio/
│       ├── music/          # BGM 素材 (*.wav/*.mp3)
│       ├── sfx/            # 音效素材 (*.wav，自动生成或手动放入)
│       ├── manifest.json   # TTS 音频清单（自动生成）
│       ├── mixed.wav       # 最终混音（自动生成）
│       └── *.mp3           # 逐句 TTS（自动生成）
├── storyboard/            # 验证截图（自动生成）
│   └── check_shot_*.jpg
└── output/
    └── output.mp4         # 最终视频（自动生成）
```

## 当前剧集（部分）

| 目录 | 主题/备注 |
|------|----------|
| `kimi_showcase_s1e1` | Kimi 能力展示第一集（原创角色/场景/配音） |
| `she_ra` / `she_ra_s2` | She-Ra 公主力量（变身、对抗 Hordak） |
| `hurdles_championship` | 跨栏锦标赛，分 3 个 segment 拼接的长片 |
| `broadcast_exercise_s1e1~s1e3` | 广播体操系列 |
| `star_travel_s1e1` / `star_travel_s1e2` | 星际旅行 |
| `yuyuhakusho` | 幽游白书战斗 demo |
| `inuyasha` | 犬夜叉场景 |
| `saint_seiya_intro` / `saint_seiya_five` / `saint_seiya_duel` | 圣斗士星矢系列 |
| `seaside_vacation` | 海边假日 |
| `starlight_courier` | 星光快递员 |
| `street_dunk` | 街头扣篮 |
| `worm_dance` | 虫子迪斯科 |
| `transformers_beast_wars_s1e1` / `transformers_beast_wars_s1e2` | 原创机甲宇宙（beast wars 风格续集） |
| `chibi_maruko_s1e1` | 樱桃小丸子风格日常 |
| `last_deposit` | 90 年代声波机器人风格原创机甲剧集（Last Deposit） |

完整列表见 `episodes/`。

## 快速开始

```bash
# 安装依赖
npm install

# 生成指定剧集音频（TTS + BGM + SFX 混音）
npx dula-audio ./episodes/<name>

# 逐镜头验证指定剧集画面
npx dula-verify ./episodes/<name>

# 生成指定剧集完整视频
npx dula-render ./episodes/<name>

# 一键出片：音频 + 视频
npx dula-audio ./episodes/<name> && npx dula-render ./episodes/<name>
```

`package.json` 中也预置了常用剧集的 npm scripts，例如：

```bash
npm run audio:she_ra
npm run render:hurdles
npm run build:kimi_showcase_s1e1   # 若已添加对应 script
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

### 方式 B：GitHub Release
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
2. 复制已有 Episode（如 `kimi_showcase_s1e1`）的 `config/`、`bootstrap.js`、`script.story` 作为模板
3. 编写 `script.story`
4. 放入 BGM/SFX 素材到 `assets/audio/music/` 或 `materials/`
5. 执行：
   ```bash
   npx dula-audio ./episodes/<name>
   npx dula-verify ./episodes/<name>
   npx dula-render ./episodes/<name>
   ```

## 剧本格式

`.story` 是 SRT 时间轴的扩展格式，支持命名空间标签：

```
1
00:00:00,000 --> 00:00:01,500
@VirtualStudio{Music:Play|name=kimi_showcase_bgm|fadeIn=1.5|baseVolume=0.35|endTime=120}

2
00:00:03,000 --> 00:00:06,852
[Kimi]{WaveHand}{Camera:Static|position=0,3,8|lookAt=0,1.2,0} 大家好，我是 Kimi！
```

支持的标签：`@SceneName`、`[Character]`、`{Action}`、`{Camera:...}`、`{Music:...}`、`{Ball:...}`、`{Prop:...}`、`{Position:...}`、`{Event:...}`、`{Transition:...}`

详见 `AGENTS.md`。
