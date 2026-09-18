# 下一拍，你登场

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
