# 下一拍，你登场

## V14 颤音修复 + 糖果字幕（2026-09-19，待播放评审）

成片：`output/yuki_beat_ad_v14.mp4`（29.5 秒，720×1280，60 fps）。
音频/口型时序沿用 V12/V13，歌曲仍是模型原声（小雪音色转换待监制 A/B 试听选择）。

- **颤音抖嘴修复**：V13 的 RMS 只平滑了 7ms，歌声颤音（5-7Hz）直接驱动下巴
  抖动。`prepare_v14.py` 改为非对称包络跟随（attack 20ms / release 250ms）+
  ~100ms 零相位低通：颤音带调制深度降 61–97%，起音沿反而提前 20ms
  （`config/vocal_features_v14.json`，schema 同 v13）。
- **糖果字幕**：粉白蓝渐变胶囊 + 斜纹 + 当前字弹跳放大变色（KTV 逐字高亮
  保留）+ 两端手绘糖果/星星（`viewer_v14.js`）。
- **舞台/表情**：diva 加棒棒糖立柱与软糖堆道具（安全距离外）；neon 副歌
  聚光灯随拍扫色；副歌眉毛/眼皮/嘴角幅度 +30%；finale 改 wink；新增星星发夹。

## V13 口型几何升级（2026-09-19，Codex 离场后补记）

成片：`output/yuki_beat_ad_v13.mp4`。嘴部改独立上下唇轮廓，开合度由歌声强弱
驱动（`config/vocal_features_v13.json`），双唇音有接触帧；`lipsync_v13.js`。
自检 1769 帧 0 错误、几何与驱动一致。遗留：颤音抖嘴（V14 修复）、
音素仍为拼音近似。

## V12 口型时序校准（2026-09-19，待用户对比播放）

成片：[output/yuki_beat_ad_v12.mp4](output/yuki_beat_ad_v12.mp4)，29.483 秒、720×1280、60 fps。
先看 [10.25 秒脸部同步对比](output/yuki_lips_v11_v12_compare.mp4)：左 V11、右 V12，
选取开头、“小雪登场心跳打拍”、“把快乐唱出来”，共用同一条声音。
动作、表情、机位和最终音轨逐帧/解码比对均与当前 V11 一致。

**本次发现**：接班时 V11 已做逐字起音锚定，但只提前 start、没有修正前字 end，
留下 32 处重叠（5–175 ms）。旧驱动使用 `findIndex`，前字在重叠区优先，
提前的新字口型被遮住。V12 重建不重叠字窗，运行时遇到重叠直接报错。

- 从分离人声的频谱起音沿提取候选，并用能量上升复核；±150 ms 局部搜索、
  相邻字中点约束、一个起音只分配一次。56 字找到较明确锚点，24 字保留 DTW。
- 视觉准备窗提前 30 ms，和声音/字幕时钟分开；双唇音在声头前闭唇、到声头释放。
  连续元音衔接，不再每个字都额外从零开口；停顿仍强制闭嘴。
- ±600 ms 全局扫描复现 −125 ms 候选，但 +110 ms 得分只低约 1.1%，
  8 句仅 4 句支持负偏移，存在节奏周期歧义，**未全曲强制平移 −125 ms**。
  见 [测量与逐字记录](config/lipsync_calibration_v12.json)、
  [偏移扫描及实际开口曲线](storyboard/v12/timing_review.png)。

全帧检查：1769 帧、80 字均实际呈现、0 重叠、281 个字窗外帧闭嘴、18 个双唇音
准备帧闭嘴；头/手与足底检查通过。嘴形起点到首个渲染帧最大 15 ms，仅表示
60 fps 的采样误差，**不表示对歌声误差 15 ms**。
[验证记录](storyboard/v12/verification.json)与[画面对比](storyboard/v12/review_sheet.jpg)。
额外去掉版本标签做模型辅助视听评审，结果为“两者难以分辨”，并指出“心跳打拍”
仍有疑点；原文在 [model_av_review.txt](storyboard/v12/model_av_review.txt)。
因此本版是可播放的修订候选，尚不能宣称用户感知同步已通过。

重建（从 `dula-story` 根目录；需现有 V11 成片/全帧轨迹及缓存人声轨）：

```powershell
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\prepare_v12.py
node episodes\yuki_beat_ad\tools\check_lips_v12.mjs
node episodes\yuki_beat_ad\tools\render.mjs --v12
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\review_v12.py
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\build_review_media_v12.py
```

V12 使用独立分析文件，不把新的校准反写到 V10/V11。仓库保留接班时 V11 起音
实验的数据和代码作为对照；`lipsync_baseline_v11.json` 固定其字表与成片 hash。
不要在已锚定的字表上重复施加全局偏移或口型提前量。

小雪音色也已有独立 [6 秒歌声转换试听](output/yuki_voice_audition_6s.wav)，
可对照 [原歌相同 6 秒](output/yuki_voice_original_6s.wav)。参考来自《便当大作战》
小雪的三句现有 VV 配音；本地 Seed-VC 保留源歌音高/时长设置，音色相似度未听审。
没有替换 V12 正式母带；若采纳，须重新验证转换后人声和口型。

## V11 歌词表演编排（2026-09-19，待播放评审）

成片：`output/yuki_beat_ad_v11.mp4`（29.483 秒，720×1280，60 fps）。
初版音频与口型沿用 V10；接班后又试过起音锚定并重渲染，当前 V11 的口型已不同，
`review_v11.py` 记录差异帧。该实验仍获用户“嘴型不符合”的反馈，重叠问题见 V12。
表演层由 `tools/prepare_v11.py` 按歌词逐句编排 23 个表演 cue
（`config/performance_plan_v11.json`：招手邀请/碎步点踏/捧心/合掌打拍/
左右移步/空气鼓/转圈/张臂放大……每个 cue 带情绪、视线焦点、动机与中文
导演意图），`performance_v11.js` 复用 V10 的 rig 与唇形驱动并扩展动作库，
`viewer_v11.js` 消费新计划。自检：1769 帧 0 浏览器错误、395 个休止帧闭嘴、
16 种表演情绪、足底/手-头余量断言通过。本节为模型辅助补记（Codex 离场后
整理），未声称人工视听验收。

另含实验性工具 `tools/prepare_voice_audition.py` +
`config/voice_audition.json`：用小雪既有配音音色做歌声转换试听
（zero-shot timbre audition），**未采纳为正式母带**，仅为后续"角色本音唱歌"
方向探路。

## V10 唱跳修订（2026-09-19，待播放评审）

成片：[output/yuki_beat_ad_v10.mp4](output/yuki_beat_ad_v10.mp4)
（29.483 秒，720×1280，60 fps，1769 帧，H.264 + AAC，17.6 MB）。
检查图：[storyboard/v10/review_sheet.jpg](storyboard/v10/review_sheet.jpg)；
验证记录：[storyboard/v10/verification.json](storyboard/v10/verification.json)。

针对 V9 首看反馈“口型不准、持麦手穿模、舞蹈仍未配合音乐”重新做表演。
歌曲和最终母带沿用 V9，未重新调用付费音乐接口。

- **歌词与嘴形**：Hybrid Demucs 从最终母带分离 vocals/drums；把原文逐字 tokens
  交给 Whisper `find_alignment` 做已知文本 DTW 对齐，得到 80 字时间窗。用人声
  包络修剪休止，并保留前一字拖音。拼音驱动闭唇、唇齿、A/E/I/O/U 嘴形，长元音
  保持，双唇音先闭嘴；静音直接覆盖笑脸表情。字幕按同一字表高亮。
- **连续编舞**：19 段动作替代每拍重新起步的旧舞步。包括招手邀请、小步点踏、
  张臂、完整转圈、胸前击拍、左右移步、起跳落地、交替上指和收势。
  “心跳”使用胸前动作；“跳一跳”“转一转”有独立动作窗。鼓轨攻击点细化原拍网，
  脚步和落地跟随音乐，换装与机位留在乐句层，足部动作采用全景。
- **角色与麦克风**：改用脸侧耳麦，腾出双手；这是舞台设计调整，未声称修好旧
  手持麦的 IK。增加双节手臂、腿部 IK、关节球、脚掌补偿和头部代理体避碰。

已检查全片 1769 帧状态及 256 张检查图中的代表画面：395 个休止/低能量帧闭嘴，
36 个双唇音帧闭嘴，80 字均有发音状态；两次转圈均完整；足底最低高于舞台
0.00275 场景单位，手到头部代理体的最小余量 0.0216；浏览器错误 0。
最终 AAC 解码峰值 0.7734，音画流均从 0 开始；严格剧本和场景检查均无错误。

**验收边界**：以上是自动时序/几何检查和模型辅助抽帧目检，未完成用户正常速度
视听验收。字符对齐不等于音素标注，辅音/复元音转换仍是拼音规则估计；它仍是
程序玩偶角色的近似口型与编舞，不能称为真人级 lip sync 或“根治”。

从 `dula-story` 根目录重建（需原歌曲、V9 母带和本地 Whisper small 模型缓存；
首次分离会下载 PyTorch 官方约 319 MB 的模型到本集 `tmp/models/`）：

```powershell
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\prepare_v10.py
node episodes\yuki_beat_ad\tools\render.mjs --v10 --check
node episodes\yuki_beat_ad\tools\render.mjs --v10
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\review_v10.py
```

如果 V9 母带缺失，先运行下节的 `prepare_v9.py`。若 Whisper 缓存缺失，先通过
`faster_whisper.WhisperModel('small', device='cpu', compute_type='int8')` 下载；正式
对齐使用 `local_files_only=True`。本轮使用 faster-whisper 1.2.1、pypinyin 0.55.0。
人声分离可能残留伴奏；原始对齐边界及 token likelihood 保存在
`config/lyrics_forced_alignment_v10.json`，likelihood 不作为同步精度分数。
`.story` 为动作/机位时序源；分析 JSON 的 choreography 是其生成来源快照。
音频、成片和大体积全帧轨迹保留本地，Git 保存代码、对齐数据和精简检查证据。

## V9 MTV 歌姬试片（2026-09-19，首看未通过）

成片：`output/yuki_beat_ad_v9.mp4`（29.5 秒，720×1280，60 fps）。
尝试处理 V8 监制反馈"音乐不卡点、口型对不上"，音乐沿用 V8 的歌曲
（`diva_song_v8_a.wav` 不变，零新增模型成本），改的是分析与编排：

- **拍网锁定**：`prepare_v9.py` 用 librosa `beat_track` 提取 123.05 BPM /
  62 拍 / 15 downbeat 的完整拍网（onset 自相关复核同值），story 38 个条目
  边界全部吸附拍网（最大偏差 0.00ms）。viewer_v9 的 dance 主干从 onset 散点
  改为拍网驱动：bounce 顶点压拍点、手臂反拍甩出、downbeat 加 accent。
- **包络口型尝试**：HPSS 谐波支（仍含伴奏，并非纯人声）→ 200Hz–4kHz 带通 → 频谱
  onset 检测出 57 个音节（关键调参：onset_detect 要作用在带通后 harmonic 的
  频谱包络上，直接作用全带 harmonic 只出个位数），开口对音节 onset、
  按峰值分位定 open/half、60ms 攻击/释放平滑。closed 占比 0.366→0.532；
  该数值未证明观感正确，静音时回退张嘴表情的问题于 V10 修正。
- **MTV 五段式编排**：intro 剪影亮相（灯光压 0.08，首个 downbeat 0.22s
  渐强）→ verse 持麦近景（2 拍一切）→ chorus 霓虹 1 拍快切 16 条 +
  双残影伴舞 + 每拍灯光脉冲 + downbeat snap → bridge 星空荷兰角 ±6° →
  outro 定格 + 「安可」字卡。

```powershell
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\prepare_v9.py --input assets/audio/music/diva_song_v8_a.wav
node episodes\yuki_beat_ad\tools\render.mjs --v9 --check
node episodes\yuki_beat_ad\tools\render.mjs --v9
```

检查帧 168 张（`storyboard/v9/`），dance 顶点拍点误差最大 16ms（<1 帧）、
均值 7.8ms；模型辅助验证，未声称人工验收。已知残留：`move=jump/twirl`
未接 outro 定格缩放（本版 story 未用到）；chorus 彩纸仅 diva/neon 舞台预排。

**随后用户首看未通过**：口型不准、持麦手穿模、舞蹈仍未配合音乐。
上面的拍网/截图指标只能证明部分实现，不构成观感通过；以这次反馈为准。

## V8 歌姬版（2026-09-19，边唱边跳）

成片：`output/yuki_beat_ad_v8.mp4`（29.5 秒，720×1280，60 fps）。

首个**带人声歌唱**的版本。歌声来自火山豆包音乐模型（OpenAPI `imagination`
服务，`GenSongForTime` 后付费 0.002 元/秒，30 秒约 0.06 元），歌词为本片原创
（`config/diva_lyrics.txt`，8 句 30 秒）。因该产品限制海外 IP
（错误码 100011 ServerIpLimit），调用经 veFaaS 国内中转函数完成
（`tools/vefaas_song_relay.py`，零依赖手写 V4 签名，submit+轮询+base64 回传；
本地入口 `tools/song_gen.py --via-relay`，AK/SK 走 `.env.cv`，
触发器地址走 `.env.speech` 的 `SONG_RELAY_URL`/`SONG_RELAY_TOKEN`）。

- `tools/prepare_v8.py`：沿用 V5 <150Hz 底鼓锁拍选出 17 个编辑点；
  新增**人声包络口型**（300Hz–3kHz 带通 RMS，5ms hop，三态
  closed/half/open 分位量化 + 防抖），写入 `music_analysis_v8.json`
  的 `vocal_env` 字段（295 段）。
- `viewer_v8.js`：唱歌窗口内口型由 `vocal_env` 驱动（叠加在表情嘴型之上）；
  新动作 `mic_hold`（持麦）与 `arm_sweep`；新增 diva 舞台（聚光灯锥 +
  落地麦架 + 星尘）；底部字幕条在唱歌窗口显示歌词。
- `tools/render.mjs` 新增 `--v8` 分支与 `--video-backend program|model`
  开关（默认 program；model 为预留占位，报明确错误）。

```powershell
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\prepare_v8.py --input assets/audio/music/diva_song_v8_a.wav
node episodes\yuki_beat_ad\tools\render.mjs --v8 --check
node episodes\yuki_beat_ad\tools\render.mjs --v8
```

画面侧仍零生成模型调用；唯一模型成本为歌曲生成（本次含失败重试共约 0.2 元）。
口型为能量包络驱动而非音素级 lipsync，逐帧检查帧（`storyboard/v8/`）目检通过；
模型辅助验证，未声称人工验收。V7 纯器乐版编排仍待接，与本版互不冲突。

**已知问题（监制首看反馈，待修）**：
1. **音乐不卡点**——生成的歌曲节奏与舞蹈/剪辑点对不齐。prepare_v8 的编辑点
   是从成曲检测出来的（音乐在先、编排在后），但成曲本身的律动与画面动作
   缺乏"同一拍网"感；候选方向：改用 Lyrics 分段 + Tempo 参数（v4.3）锁定
   BPM 后重生成，或编排侧改按歌词句读而非底鼓选点。
2. **口型对不上歌词**——vocal_env 是 300Hz–3kHz 全频段能量包络，背景音乐
   泄漏导致开合与人声起始点对不齐；且三态粒度太粗。候选方向：做人声分离
   （或取模型纯人声音轨）再提包络；参考 E10 build_lipsync.py 的音节级视素。

## V7 音乐重做（2026-09-16，仅音乐）

针对监制"V5/V6 音乐单调"的反馈，只换音乐不动编排：解剖抖音 top 卡点曲
（`tmp/douyin/learned_features.md`，低频底鼓网格 + RMS 悬崖 + 频段占比），
按学到的特征写 prompt（`tools/compose_v7.py`）生成四个 14 秒候选到
`assets/audio/music/v7/`。客观指标选版（重音数/drop 位置/抽空 gap/低频占比/
高频点缀密度）选中 C（方波芯片 hook + funky 贝斯 + 卡通音效）：4.75s 抽空
0.25s → 5.05s drop，重音 14 个、低频 79%。母带沿用 V5 链（3:1 压缩 + 110Hz
低搁架 +2.5dB + 0.85 限制器）产出 `assets/audio/mixed_v7.wav`。这是模型辅助
选版（纯客观指标，未做盲听），不声称人工验收；V7 编排/成片待接。

## V6 元素扩充（2026-09-16）

成片：`output/yuki_beat_ad_v6.mp4`（13.6 秒，720×1280，60 fps）。
造型总览：`storyboard/v6/lookbook.jpg`。

针对监制"元素不够多样"的反馈，在 **V5 音乐与拍点完全不变** 的前提下扩充
元素（`mixed_v6.wav` 是 V5 母带的字节拷贝，`prepare_v6.py` 复用 V5 的
<150Hz 底鼓检测并重放同一拍点网格，断言与 V5 `selected_attacks` 完全一致）。
新增五类元素，全部卡在既有拍点上：

- **场景跳切**：单一糖果舞台扩成三段——糖果舞台（0–4.09s）→ 霓虹夜街
  （4.09–9.53s，楼影+霓虹灯管+彩纸）→ 星空云海（9.53–13.6s，星点穹顶+
  云海+弯月），同程序绘制风格（平涂色块+发光几何），人物站位与机位不变，
  切点在段落边界重音 4.09 / 9.53。
- **snap zoom**：5 个强拍（4.09 / 5.02 / 7.30 / 9.53 / 13.10）镜头 2 帧推近
  13% + 4 帧 ease-out 回弹。
- **kinetic 字卡**：「下一拍」（4.09）「萌力全开」（5.02）「你登场」（9.53），
  130% 砸下 + 回弹到 100%，停留 0.6s，位于裙摆高度不挡脸。
- **swipe 转场**：两次场景切换处色块侧向擦过 0.3s，方向跟随当拍动作
  （4.09 敬礼抬右手 → 左到右；9.53 抱爪 → 右到左）。
- **残影分身**：dance 长窗（9.53–10.86s，1.325s）带 2 个延迟残影
  （透明度 0.3 / 0.15，相位延迟 2 / 4 帧，克隆网格镜像同一套 pose 语法）。

```powershell
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\prepare_v6.py
node episodes\yuki_beat_ad\tools\render.mjs --v6 --check
node episodes\yuki_beat_ad\tools\render.mjs --v6
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\review_v6.py
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\review_av_v6.py
```

`script_v6.story` 是 V6 唯一人物变化时间线（每条新增
`scene/snap/card/swipe/ghost` 字段）；`viewer_v6.js` 实现全部新元素
（`buildStage` 主题化、`poseFull` 抽出供残影克隆复用、`ensureGhosts`/
`mirrorProxy` 残影、`drawSwipe`/`drawCards` 2D 覆盖层）。逐次变化前后帧、
元素逐项断言与 AAC 解码结果见 `storyboard/v6/verification.json`。V5 及之前
文件全部原样，`render.mjs` 仅追加 `--v6` 分支。这是模型辅助验证，
未声称人工验收。

## V5 多层编曲 + 底鼓锁拍（2026-09-15）

成片：`output/yuki_beat_ad_v5.mp4`（13.6 秒，720×1280，60 fps）。
造型总览：`storyboard/v5/lookbook.jpg`。

针对 V4 的两点反馈重做音乐：编曲单薄、卡点不在鼓点上。
Seed-Audio 生成五个明确四层编曲（鼓组/贝斯/主旋律/点缀，各自独立但锁同一
节拍网格）的 14 秒候选，盲听评审选中 D（ukulele 拨弦 hook + 指拨贝斯 +
摇摆鼓组 + 小号断奏，9 分）。`prepare_v5.py` 改为**低频段（<150Hz）底鼓
检测**：V4 用全频段 onset，0.245s 间隔的八分杂音会顶替正拍；V5 的 14 个
换装/动作点全部吸附到底鼓（前奏鼓未进入时用 hook 动机重音）。另加 ffmpeg
母带链（3:1 压缩 + 110Hz 低搁架 +2.5dB + 0.85 限制器），替换此前的裸
峰值归一化。编排在 V4 基础上重排：转圈落在下一个底鼓、跳跃压在 drop、
dance 段放在 1.3 秒以上的长窗。这是模型辅助听评，未声称人工验收。

```powershell
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\prepare_v5.py
node episodes\yuki_beat_ad\tools\render.mjs --v5 --check
node episodes\yuki_beat_ad\tools\render.mjs --v5
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\review_v5.py
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\review_av_v5.py
```

`script_v5.story` 是 V5 唯一人物变化时间线；音乐原始生成执行
`compose_v5.py`（读 `.env.speech`，有候选则跳过）。逐次变化前后帧与 AAC
解码结果见 `storyboard/v5/verification.json`。

## V4 俏皮糖果舞台（2026-09-15）

成片：`output/yuki_beat_ad_v4.mp4`（13.6 秒，720×1280，60 fps）。
造型总览：`storyboard/v4/lookbook.jpg`。

音乐用 Seed-Audio 重新生成三个 14 秒候选（木琴 kawaii bounce / 玩具钢琴芯片音 /
拨弦 electro-swing），盲听评审选中 E（玩具钢琴+芯片音，带"哦~啊~"拟声，蓄势-
释放结构最清晰）。提示词、来源与听评记录在 `assets/audio/music/v4/`。
这是模型辅助听评，未声称人工验收。

编排在换装卡点之上加入舞蹈动作：15 个选定重音对应人物变化，含两次原地转圈
（twirl，在下一个重音精确落地）、三次夹紧伸展跳（jump）、两段踩拍摇摆
（dance，按 onset 奇偶交替摆臂）、一次挥手和一次镜头滚转。背景从纯色升级为
糖果舞台：随服装换色的渐变穹顶、地面光环脉冲、圆形舞台、漂浮的星星与爱心、
两侧摆动光束，每次重音喷发一团彩纸。

```powershell
# 已有生成素材时，以下步骤不联网：
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\prepare_v4.py
node episodes\yuki_beat_ad\tools\render.mjs --v4 --check
node episodes\yuki_beat_ad\tools\render.mjs --v4
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\review_v4.py
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\review_av_v4.py
```

`script_v4.story` 是 V4 唯一人物变化时间线；`prepare_v4.py` 会重建它。
`viewer_v4.js` 包含全部舞台装饰与舞蹈动作（`move=twirl/jump/dance/wave`）。
音乐原始生成需手动执行 `compose_v4.py`，会读取工作区 `.env.speech` 并调用
付费服务，已有候选文件则跳过。逐次变化前后帧与 AAC 解码结果见
`storyboard/v4/verification.json`；视听模型评审见 `model_av_review.txt`。

## V3 人物变装卡点（2026-09-13）

成片：`output/yuki_beat_ad_v3.mp4`（13.2 秒，720×1280，60 fps）。
造型总览：`storyboard/v3/lookbook.jpg`。

音乐重新用 Seed-Audio 生成三个 14 秒候选，音频模型盲评选 C。最终为原有短句
剪至 12.97 秒后留尾；另试过更强的音量门控，但 A/B 听评更偏好原乐句，门控
仅保留为 `assets/audio/mixed_v3_staccato.wav`。所有提示词、来源和听评记录在
`assets/audio/music/v3/`。这是模型辅助听评，未声称人工验收。视听模型对同步
感的评价与单独音频盲评不一致，负面评审也保留，不能把技术误差达标当作惊艳。

14 个选定重音对应人物状态的直接变化：原装戴墨镜、兔耳卫衣闭眼笑、水手服
贝雷帽眨眼、黄色外套装酷、皇冠裙灿笑、噘嘴、吐舌等。人物保持同一机位和位置，
每次变化在首个落拍帧可见，字幕置于鞋子下方。皇冠裙首次出现前有一次短旋转。

```powershell
# 已有生成素材时，以下步骤不联网：
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\prepare_v3.py
node episodes\yuki_beat_ad\tools\render.mjs --v3 --check
node episodes\yuki_beat_ad\tools\render.mjs --v3
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\review_v3.py
```

`--v3 --serve` 打开 V3 本地预览。`script_v3.story` 是 V3 唯一人物变化时间线；
`prepare_v3.py` 会重建它。`wardrobe_v3.js` 保存可复用的本地服装和配饰几何，
不会改动资产库的小雪。音乐原始生成需手动执行 `compose_v3.py`，会读取工作区
`.env.speech` 并调用付费服务，已有候选文件则跳过。

逐次变化前后帧与 AAC 解码结果见 `storyboard/v3/verification.json`。

## V2 卡点表演试剪（2026-09-13）

对比成片：`output/yuki_beat_ad_v2.mp4`；原片仍为 `output/yuki_beat_ad.mp4`。
本次保留小雪模型，加入闭眼笑、惊讶嘴、抬眉与单眼笑，主旋转用整幅镜头滚转，
在音乐重音回正后切笑脸；减少上下字卡对表情的遮挡。

配乐暂用本地缓存曲目试选，原始生成记录尚未核实，不能视为音乐或发布授权定稿。
没有调用新的生成模型。参考链接未通过平台页面校验，未完成参考视频逐帧对照。

从 `dula-story` 重建：

```powershell
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\prepare_v2.py
node episodes\yuki_beat_ad\tools\render.mjs --v2 --check
node episodes\yuki_beat_ad\tools\render.mjs --v2
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\review_v2.py
```

预览使用 `node episodes\yuki_beat_ad\tools\render.mjs --v2 --serve`。
`script_v2.story` 是 V2 唯一镜头与表情时序；`music_analysis_v2.json` 是音频分析结果。
`prepare_v2.py` 重建该时间线，会覆盖对 V2 剧本的手动修改。时间来自短窗音频攻击检测，
150 BPM 参数只兼容旧动作注册，V2 最终表演与镜头脉冲不依赖这个固定速度。
检查图和 AAC 解码结果保存在 `storyboard/v2/`；未声称已完成人工听审。

## V1

12.8 秒原创角色 IP 卡点广告样片，720×1280 / 30 fps。主角复用资产库的
小雪 Yuki，模型、动作、舞台、字卡均本地渲染；不调用生图、生视频、配音或音乐生成模型。

成片：`output/yuki_beat_ad.mp4`。分镜总览：`storyboard/contact_sheet.jpg`。

## 重建

从 `dula-story` 运行：

```powershell
.venv\Scripts\python.exe episodes\yuki_beat_ad\tools\prepare_audio.py
node episodes\yuki_beat_ad\tools\render.mjs --check
node episodes\yuki_beat_ad\tools\render.mjs
```

`node episodes\yuki_beat_ad\tools\render.mjs --serve` 启动本地预览
`http://127.0.0.1:4188/viewer.html`，点击画面播放或暂停。

## 复用方式

- `script.story` 是唯一镜头时序，32 拍 / 150 BPM；六次切镜与末尾停格均按拍编排。
- `performance.js` 注册程序化角色动作与安全距离内的镜头。
- `bootstrap.js` 复用 Yuki 造型，添加整眼控制句柄，并调整为适合棚拍的标准材质。
- `config/ad_copy.json` 按动作名绑定文案，不另写时间轴。
- 竖屏渲染入口使用现有 Dula Storyboard / SceneBase / CharacterBase，外层 Canvas 绘制字卡，ffmpeg 编码。
- 库存配乐为 `worm_dance/tools/generate_bgm.py` 的 NumPy 合成结果 `gym_beat.wav`，无需下载音乐或付费 API。

这版验证角色 IP 宣传的节奏和制作方式，角色保持现有 Q 版几何风格，动作是短手臂的有限动画。
推广具体商品时应另外安排产品展示、卖点和行动文案。

## 验证

严格 story 验证和场景 contract 验证通过；标准 dula-verify 输出 7 镜头，
竖屏渲染额外输出 8 张检查图及运行状态，无浏览器脚本错误。

旧 `dula-inspect-team` 起飞检查通过，但 CharacterInspector 将没有对白的
Event:Animate 演出误判成“没有角色”，且其固定运镜列表不识别已注册的 AdCamera；
它把事件开始时间当片长，报告 9.6 秒。实际 StoryParser 与成片均为 12.8 秒。
这些差异保留在 `storyboard/inspect_team.txt`，没有通过添加假对白来绕过。
最终以严格词汇/场景检查、实际角色画面、帧数、媒体探测与竖屏目检为依据。
