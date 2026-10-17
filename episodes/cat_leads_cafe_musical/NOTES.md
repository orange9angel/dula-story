# 《半拍晴天》咖啡厅音乐剧特别篇

**当前 V4：** 用户要求修复面具感并统一聊天和唱跳人物。开场、收尾与歌曲均使用
同两个三维角色实例，面部采用连续曲面与统一肤色着色。详见
[craft3d/UNIFIED_V4.md](craft3d/UNIFIED_V4.md)。完整片为
`output/half_beat_sunshine_craft3d_v4.mp4`，23 秒预览为 `output/cafe_3d_dialogue_v4.mp4`。
后续裙子反馈已纳入：`output/cafe_wardrobe_v4.mp4` 为 27.5 秒起身和完整转圈预览。
用户不限定任何制作手段，只判断最终融合效果；当前修订仍待用户复看。

**V3 历史：** 用户认可三维 V2 后，新增侧后发、完整转身和轻快卡点。
入口与制作证据见 [craft3d/REFINEMENT_V3.md](craft3d/REFINEMENT_V3.md)。
完整文件为 `output/half_beat_sunshine_craft3d_v3.mp4`，新试片为
`output/cafe_craft3d_dance_v3.mp4`。下面 V2 与二维第一版保留为历史。

**V2 方向修订历史：** 用户要求二维原画观感的真实三维跳舞，否决下面第一版的整图
二维形变路线。三维修订与已知美术差距见 [craft3d/NOTES.md](craft3d/NOTES.md)，
当时交付为 `output/half_beat_sunshine_craft3d_v2.mp4`。下文第一版记录保留为历史。

本集采用用户确认的原图片版小蓝与阿澈：长蓝发少女与黑短发少年，两人白衬衫。
咖啡厅延续 E01 的日式晴天街角气氛，使用浅色墙、水蓝窗框、木家具和窗外电线杆。
这是《猫带我去的地方》的未编号特别篇，不覆盖 E01，不推进既有伏笔台账。

## V2 三维修订历史

- 完整候选：`output/half_beat_sunshine_craft3d_v2.mp4`，107.5 秒，1080p30。
- 三维唱跳试片：`output/cafe_craft3d_dance_v1.mp4`，约 18.6 秒。
- 启动 `node tools/render.mjs --serve`，访问输出的 `4235` 本地地址。
  根 `viewer.html` 也默认进入完整修订；`node tools/render.mjs` 导出完整版本。
- 技术检查与来源：`config/craft3d_delivery_qc.json`、`craft3d/NOTES.md`。
  聊天保留原图局部表情，唱段换为真实三维骨骼表演；服装和侧发仍待美术精修。

## 第一版历史交付

- 完整第一版：`output/half_beat_sunshine_v1.mp4`，107.5 秒，1920×1080，30fps。
- 18 秒试片：`output/cafe_hybrid_pilot_v1.mp4`，截取完整版本 14.4–32.4 秒。
- 历史入口：`viewer_illustrated.html` / `viewer.js`；启动
  `node tools/render.mjs --illustrated --serve` 后访问输出的 `4234` 本地地址。
  这是自包含 viewer 链，不走 dula-render。

阿澈画得忘了喝咖啡，小蓝敲两下杯沿邀他接唱。他说不会跳，点头后跟着她错开半拍
迈小步，副歌一起唱跳。最后回到桌边，咖啡凉了，阿澈说「正好，现在能喝了」。
成片包含回桌与蒸汽消退，没有举杯喝下或放笔动作。

## 采用工艺与复用

四张选用 imagegen 原画：咖啡厅空景、桌边双人、两张透明全身立绘。程序负责局部
眨眼与口型、二维网格侧步、分层前臂小幅摆动、点头、杯沿节奏与蒸汽、字幕及镜头。
全片未调用图生视频。人物美术不是从零用矢量重画，也没有把贴图立绘当成完整三维。

共享执行代码：`dula-assets/characters/sunprint/IllustratedCafeKid.js`、
`dula-assets/lib/craft3d/generated-portrait-paint.js`、
`dula-assets/lib/audio/separate_vocals.py`。剧集内只含本集场景与表演编排。
`pilot/performance.js` 的 parseStory/dance/blink 被正式 viewer 复用；其中旧试片
performanceAt、`pilot/viewer.*`、程序三维候选 CafeKid 不是正式入口。

母版与角色来源记录在 `config/image_sources.json`。先前另外生成了四张头脸/头发
候选，试贴简化三维身体后外观不足，未进入成片。不能把试验总生成量写成只有四张。

## 声音

对白沿用系列火山 seed-tts-2.0 声线，小蓝 Vivi、阿澈 Taocheng；9 句分别按语境
生成。环境底噪与两次陶瓷敲击来自 Seed-Audio。歌曲来自 Suno，一次提交返回两版，
本次取 A 版 75.56 秒授权 WAV；未对 B 版做听觉比较，不能称为试听择优。

歌曲通过 Demucs 分离人声、已知歌词 DTW 和局部起音锚定驱动 jaw/width；对白与
歌唱均由最终角色人声总线门控。原始歌手未换成对白音色。按提示词暂分配前四句女声、
接四句男声、末六句双人；ASR 不证明实际演唱严格遵守此分工，正常速度听审待定。
最终混音只加入原歌一次，角色人声总线用于口型，不重复混回歌声。

## 重现与证据

在本目录执行：

```powershell
node tools/render.mjs --check
node tools/render.mjs
D:\opensource\movie\dula-story\.venv\Scripts\python.exe tools/verify_delivery.py
```

`script.story` 是当前 107.5 秒时序源，viewer 实际读取该文件。`script.story.draft`
仅留作最初对白文本源。`tools/finalize_audio.py` 会从源对白重新编排正式剧本、音轨和
对齐资料；已有成片不需再次生成音频。provider 原始参数与回执在 config 和 `.source.json`。

- `config/catalog.json`：真实 bootstrap 扫描包含 Girl、Boy、CafeMusicalScene。
- `config/story_validation.json`：14 条结构通过，6 条通用语速估算警告由已解码对白
  时长覆盖。strict CLI 的 registerAll 门禁适用于引擎适配，本 viewer 未伪造该调用；
  结构验证调用同一校验器 API，实际注册另外由浏览器运行检验。
- `config/audio_direction.json`：9 句对白、1 条环境、2 次音效、1 首歌，标准校验通过。
- `config/audio_qc.json`：源哈希、整轨时长、峰值、无声段口型门控；9 句 ASR 全匹配。
- `storyboard/render.json`：30 个关键采样、反向 seek 图像哈希、连续支撑锚点记录。
- `config/delivery_qc.json`：最终 MP4 全解码、帧数/声画时长、混音关联延迟、源摘要。
- `VISUAL_REVIEW.md`：实际采样观察与局限。未声称整片正常速度人工听看已通过。

## 费用与能力边界

本路线省掉视频生成调用，但不是全部零成本：共有 8 张本轮生成候选、一次 Suno
双候选生成、9 句 TTS 与 2 个 Seed-Audio 素材，另有本地分离/渲染计算时间。
会员额度及接口本次精确扣费未完整回收，不估造总价。后续可复用人物原画与绑定，
仍需按新动作检查变形；是否更省总制作时间，待用户对第一版观感确认后判断。

大幅转身、复杂舞步、拿杯喝水、完整手臂舞姿尚未实现。现有侧步与口型比静态
图片加运镜更可控，仍保留明显的有限二维动画特征。
