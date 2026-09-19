# 谁动了我的小鱼干

小雪 × 年糕的迷你音乐喜剧。五句对白穿插两段各四句的短歌：年糕越唱越无辜，
嘴角的鱼干渣却一直在出卖它。结尾判它洗碗。

**试播成片**：[output/yuki_fish_musical.mp4](output/yuki_fish_musical.mp4)
（46.322 秒，720×1280，60 fps，H.264 + AAC）。
[带章节播放页](output/review.html) · [画面检查表](storyboard/review_sheet.jpg)

| 时间 | 表演 |
|---|---|
| 0–5.00s | 空盘开场，小雪质问，年糕装傻 |
| 5.00–18.30s | 年糕唱四句狡辩：摇头否认 → 回味 → 睁眼装乖 |
| 19.00–24.66s | 小雪圈出嘴角物证；年糕：“这是……艺术。” |
| 25.36–41.50s | 小雪唱四句揭底：指证 → 闻香 → 抓包 → 洗碗判决 |
| 42.10–46.32s | 年糕认命，餐盘和海绵收尾 |

舞台为程序绘制的**家庭厨房**（HomeKitchenScene：橱柜/水槽/窗光/绿植/木地板；
早期剧院版已废弃）：空盘开场、嘴角碎屑物证、餐盘与海绵收尾。
近景给当前唱者或证据，全景保留双人关系和脚步。"艺术"一句下方配乐额外压低，
保留冷面喜剧的停顿。没有重新生成歌曲或对白。

## cel-look 定版（2026-09-19）

按 `dula-skills/cel-look` 纪律全量执行：双角色 sketchify 描边 + 12fps boil
（渲染时间驱动，同帧双渲染字节一致）、角色姿态一拍二（口型与摄影机保持
60fps）、小雪球手改连指手套手（bootstrap.js `mittenize`）、赛璐璐三档硬切
阴影（`celGradient` + `hardenToon`）。字幕为家庭剧样式（无舞台标题/糖果字幕）。
验证：2779 帧 0 浏览器错误、停顿帧闭嘴、人猫零穿模、手-头余量 0.051。
抽查帧见 `tmp/cel_probe/`。

## 接班修订

- 原 `segAt` 在所有时间空隙都回退到结尾，改成明确的反应条目。
- `script.story` 现有 21 个连续条目；角色动作、表情意图、机位由实际 viewer
  读取，删除 viewer 中另一套未消费剧本的表演分支。`timeline.json` 保存测量后的媒体排期。
- 年糕原来只拉伸两条“ω”笑线；改为实际口腔开合，静音恢复笑线。
- 口型强弱和静音门限来自**最终换声、归一化、排入时间线后的人声总线**。
  慢释放抑制颤音，快速静音门限独立控制，避免长插值跨过休止。
- 修复空声母被 `'' in 'bpm'` 误当闭唇音的问题；声母集合使用明确元素。
- 保留声轨与配乐轨，补剧本、声音导演计划、场景契约、全帧检查和模型辅助视听记录。

## 声音与验收边界

对白沿用 seed-tts 的小雪 `zh_female_vv_uranus_bigtts`、年糕
`ICL_uranus_zh_male_youmodaye_tob`。两段演唱为既有 Seed-VC 转换素材，
参考均来自《早起大作战》；小雪参考与该集四句台词构成的
`yuki_beat_ad/assets/audio/voice_morning/morning_reference.wav` SHA-256 完全一致。
参考和输入的校验记录见 [config/source_provenance.json](config/source_provenance.json)。

换声文件的包络互相关为零帧偏移，只能支持粗粒度时序检查，**不是音色一致性分数**。
逐字 DTW + 拼音视素仍是近似，辅音时长未逐音素标注；不能声称精准 lip sync。

2779 帧、浏览器错误 0；338 个停顿/结尾帧闭嘴，未发声角色闭嘴，人物根部最小间隔
1.057，手到头代理体最小余量 0.033；最终 WAV 峰值 0.920。
见 [verification.json](storyboard/verification.json)。
模型辅助评审认为故事可读，但误把唱词列为第五句对白，并给出与实际动作不符的描述，
因此没有将它的“同步良好”当作验收。用户正常速度试听、声线相似度与笑点效果均待评审。

## 重建

从 `dula-story` 根目录执行，依赖已缓存的歌曲、分离轨、两段换声与五句对白：

```powershell
.venv\Scripts\python.exe episodes\yuki_fish_musical\tools\build_timeline.py
.venv\Scripts\python.exe episodes\yuki_fish_musical\tools\finish_episode.py
.venv\Scripts\python.exe episodes\yuki_fish_musical\tools\document_contracts.py
node episodes\yuki_fish_musical\tools\render.mjs --check
node episodes\yuki_fish_musical\tools\render.mjs
.venv\Scripts\python.exe episodes\yuki_fish_musical\tools\verify_episode.py
.venv\Scripts\python.exe episodes\yuki_fish_musical\tools\build_review_page.py
```

交互预览：`node episodes/yuki_fish_musical/tools/render.mjs --serve`，打开
`http://127.0.0.1:4189/viewer.html`，点击播放。生成媒体、临时模型和逐帧轨迹不入库；
换一台机器需要另行带上音频素材，Git 本身不包含声轨。

`prepare_song.py` / `align_all.py` / `cut_segments.py` 为上游素材处理工具，
修改歌曲或换声后须重新对齐、混音、构建视素并检查。当前素材的转换参数为
F0-conditioned Seed-VC，30 steps、CFG 0.65、原音高/时长设置；不是原生指定角色唱歌 API。

静态检查使用 `story_tool.py validate`、`scene_tool.py validate` 和
`validate_audio_direction.py`。通用 `dula-verify` / inspector 只认识标准引擎链，
不能替代本集 `render.mjs --check` 对实际表演、嘴型和物证的检查。
