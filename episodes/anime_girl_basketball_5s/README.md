# 《最后一球》— 30 秒日漫篮球短片

本目录名保留了最初 `anime_girl_basketball_5s` 的实验名称，但内容已经扩展为完整的 30 秒双角色短片：日暮独自练球，穿日式学生服的男生从体育馆侧门进来，两人斗嘴并用一球决定谁请汽水。

## 成片构成

- 画面：51 张实际参与播放的 16:9 日漫画面，编排成 67 个时间节点；开场与决胜球加入定向中间画，动作段提升到约 5–6 次姿势变化/秒，同时保留长对白中的有限动画反应镜头。
- 镜头：绝对时间驱动的硬切、短交叉淡化，以及推近、横移、仰移等轻量二维运镜。
- 口型：从最终对白音轨提取语音能量，再按中文音节映射闭口、半开、开口三组口型单元，以 12 fps 驱动；静音区强制闭口。
- 配音：直接使用原生台湾华语神经音色，避免语音克隆和变调产生失真。`Higurashi` 使用较轻的 `HsiaoChenNeural`，`Boy` 使用未经变调的 `YunJheNeural`；对白采用自然/调侃语速，避免慢腔增加年龄感。
- 配乐：`proud`、`cheerful` 两段语义音乐，在决胜球开始前淡出；最后十秒只保留球馆现场声，避免配乐滑音被误听成投球破风。
- 音效：体育馆底噪、鞋底摩擦、开门、拍球和进球；移除漫画式投球破风声与独立呼吸采样。对白间以自然停顿留出气口，不再叠加容易产生“呜呜”感的外录呼吸。
- 字幕：从 `script.story` 解析对白，在代码中绘制中文安全区字幕；生成原图不含文字。

核心素材与配置：

```text
assets/character_reference.png          女生角色母版
assets/male_character_reference.png     男生角色母版
assets/keyframes/frame_00.png … frame_32.png
assets/keyframes/frame_07_landing_fixed_v3.png
assets/action_inbetweens/*.png
config/keyframe_timeline.json            30 秒、55 个画面节点
config/lipsync_cues.json                 12 fps 中文音节口型时序
config/voice_config.json                 双角色 F5-TTS 配置
config/audio_mix.json                    对白/配乐/音效混音配置
assets/audio/mixed.wav                   已生成的完整混音
assets/audio/sfx/sources/LICENSES.md     真实篮球 Foley 来源与 CC0 记录
```

`frame_07.png` 和 `frame_28.png` 被保留为生成记录，但已退出正式时间线：前者存在胸口多出投篮手臂的解剖错误，播放使用双臂自然下垂的 `frame_07_landing_fixed_v3.png`；后者离场方向不正确，播放使用 `frame_32.png`。

## 剧情对白

```text
日暮：最后一球……
男生：喂，日暮。社团的人……都走光了。
日暮：进了……我就回家。
男生：那我来防。输的人，请汽水。
日暮：你连校服……都没换。
男生：这样赢，才帅。
男生：喂！这算犯规吧？
日暮：汽水你请。球……也归你捡。
```

## 重新生成音频

从 `dula-story` 目录运行：

```powershell
python ../dula-skills/episode-scoring/scripts/run_scoring.py `
  ./episodes/anime_girl_basketball_5s --no-download
python ../dula-engine/tools/generate_audio.py `
  ./episodes/anime_girl_basketball_5s
npx dula-audio ./episodes/anime_girl_basketball_5s `
  --provider=edge --force
python ./episodes/anime_girl_basketball_5s/tools/build_lipsync.py
python ./episodes/anime_girl_basketball_5s/tools/check_lipsync.py
```

Foley 源文件可独立、确定性重建；篮球相关声音会读取
`assets/audio/sfx/sources/` 中固定的 CC0 录音，不再由正弦波和白噪声模拟：

```powershell
python ./episodes/anime_girl_basketball_5s/tools/generate_foley.py
```

## 验证

从仓库根目录运行静态验证：

```powershell
node --check dula-story/episodes/anime_girl_basketball_5s/bootstrap.js
node --check dula-story/episodes/anime_girl_basketball_5s/scenes/AnimeBasketballSequenceScene.js
python dula-skills/story-writer/scripts/story_tool.py validate `
  --story dula-story/episodes/anime_girl_basketball_5s/script.story `
  --episode-dir dula-story/episodes/anime_girl_basketball_5s `
  --warnings-as-errors
python dula-skills/scene-designer/scripts/scene_tool.py validate `
  --contract dula-story/episodes/anime_girl_basketball_5s/config/scene_contract.json `
  --episode-dir dula-story/episodes/anime_girl_basketball_5s
```

从 `dula-story` 目录运行集成验证：

```powershell
npx dula-inspect-team ./episodes/anime_girl_basketball_5s
npx dula-verify ./episodes/anime_girl_basketball_5s
```

## 渲染

从 `dula-story` 目录执行：

```powershell
npx dula-render ./episodes/anime_girl_basketball_5s --duration 30
```

正式成片输出：`output/output_0-30.mp4`（1920×1080、30 fps、30.000 秒，含 AAC 音轨）。

也可以从 `dula-story` 目录调用包装脚本：

```powershell
powershell -ExecutionPolicy Bypass `
  -File ./episodes/anime_girl_basketball_5s/render_keyframes.ps1
```

包装脚本调用正式 Dula 渲染器，因此会包含配音、配乐、音效和字幕；不会再生成旧版的 5 秒静音拼帧视频。

完整的 built-in imagegen 提示词体系、角色锁定和镜头指令记录在 `generation_prompts.md`。
