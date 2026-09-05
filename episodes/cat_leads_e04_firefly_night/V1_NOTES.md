# 《猫带我去的地方》E04《夏夜流萤》V 1 晨报（2026-08-30 凌晨完成，当晚出片）

## 成片

- **V1**：`output/output.mp4` — 1920×1080 / 30fps / 60.000s / H.264+AAC
- 故事：接 E03 当夜，小橘蹲墙头叫门，小蓝跟它夜出（**银幕方向回正：全程向右**），
  穿夜巷、过石桥，河堤看萤火虫。**小橘本集开口说话**（喵完说人话×3）。
- 台词：小蓝独白×5 + 小橘×3（「跟紧我，夜路我熟。」「快点，萤火虫不等人。」
  「说了吧，是好地方。」）

## 火山全家桶首集（本集的技术验证对象）

| 环节 | 方案 | 结果 |
|------|------|------|
| 图生视频 ×4 | **Seedance 2.0 mini**（`doubao-seedance-2-0-mini-260615`，4s 取前段抽 12fps cel） | 4/4 一次通过，中段全 on-model，~¥3. 2 |
| 配音·猫 | **seed-tts-2.0**（语音控制台 key，非方舟）`zh_female_mizai_saturn_bigtts` + emotion 参数 | 3/3 一次通过，时长全 fit 槽位 |
| 环境音 | **Seed-Audio 1.0**（`/api/v3/tts/create`，语音控制台 key）单要素纯环境音模式 | 虫鸣/夜风 2 条 60s 一次通过 |
| 配乐 | **Seed-Audio 1.0** 单要素纯配乐模式 | 60s 指弹吉他夜曲一次通过（Pixabay 版留 materials/bgm/ 备胎） |
| 口型/眨眼变体 ×23 | **Seedream 5.0 Pro 图像编辑 + 手工脸框矩形贴回** | 23/23 一次通过，贴回 outside diff=0 |
| 文生图（母版/关键帧/前 4 张变体） | codex imagegen（订阅额度） | 30 张零重 roll |

**关键新结论（已写回 skill）：**
1. Seed-Audio 1.0 **不走方舟**（方舟对 `doubao-seed-audio-1-0` 404），走语音控制台
   key + `POST /api/v3/tts/create`（非流式，base64 整段返回，≤120s）。
   详见 `dula-skills/build-character-voice/references/volcano-seedtts.md` 末节。
2. seed-tts-2.0 响应流里 `code: 20000000` 是**成功**哨兵，客户端要放行。
3. Seedance 模型 ID 必须带日期后缀（`-260615`），裸写 404——已写回
   `build-continuous-story-images/SKILL.md`。
4. **Seedream 编辑全图重渲染**（PNG 输出也非逐像素保留），codex 式自动 diff 锁定
   不可用；改用**手工脸框 + `auto_lock_variants.py --rect` 强制矩形贴回**——
   矩形外逐像素一致由构造保证，编辑质量（口型开合、闭眼弧线）验收达标。
   工艺纪律更新：**codex 首选，Seedream+显式矩形贴回 = 验证达标的第二通路**，
   qwen/wanx 依然禁用。工具：`tools/seededit_probe.py` + `tools/gen_variants_seedream.py`
   （脸框表在脚本内 FACE 字典）。
5. 猫"喵完说话"需要**嘴型 rig 多 cue 绑定**：rig 同时挂喵 SFX cue 和台词 cue
   （`entries: [meow, speech]`，重叠时后者优先）——场景类 `_mouthStateAt` 已支持。

## 夜景工艺

- 「晴印」夜晚变体（STYLE_BIBLE E04 节）：深靛蓝 #1B2A5E→暗紫 #3A2E5C 天空、
  月光冷蓝银 #9FB8E8 rim、暖黄灯 #FFD97A 稀疏点光、萤火 #E8F29A。
- 程序化新图层 × 2（FireflyNightSequenceScene.js）：`starTwinkle`（星点呼吸闪烁）、
  `fireflies`（种子确定性萤火虫群，漂移/明灭/上升回绕）；**母版/关键帧全部不画
  萤火**，萤火虫 100% 程序化叠加。
- 场景母版 ×4 由 E03 黄昏母版 codex 夜景编辑，零重 roll。

## 验收

- ffprobe：60.0000s / 1920×1080 / 30fps / H.264+AAC
- 音频 astats：Peak -2.73dB / RMS -25.7dB，无削波
- check_lipsync：142 beats / 8 mouth rigs / 11 cues / 158 图全过
- story_tool：0 错误
- verify 21 张截图全过（猫说话嘴型、萤火层、星闪、字幕安全区）
- 成片抽帧 11 张全过：3.9 独白1 开口 ✓ / 8.0 猫句1 开口 ✓ / 12.5 I2V① 墙头走 ✓ /
  20.0 I2V② 过桥 ✓ / 22.5 独白3 ✓ / 27.3 猫叫2+猫句2 ✓ / 35.5 I2V③ 草坡跑 ✓ /
  40.0 独白4+萤火 ✓ / 43.5 猫句3 ✓ / 53.5 独白5 开口 ✓ / 58.8 星空收尾 ✓

## 成本

- 现金 ≈ **¥10.1**：I2V 4 条 ≈¥3.2（4 折价）+ Seedream 变体 23 张 ≈¥6.9
- codex imagegen 30 张走订阅额度（现金 0；中途配额耗尽一次，改道 Seedream 反而
  当晚出片）
- seed-tts / Seed-Audio 语音控制台额度内；BGM 备胎 Pixabay 未花钱
- 对比 E03（¥9.2 + 跨两天等配额）：E04 当晚完成，现金基本持平

## 遗留

1. scene_tool.py 的 `_find_project_root` 仍找 docs/skills 旧布局（E03 遗留，
   dula-skills 侧待修）。
2. 猫声线后处理（轻抬音调加"奶气"）未做——咪仔原声验收已达标，留给观众反馈。
3. Seedream 变体的 rig 矩形比 codex 版略大（贴回框=整脸框），播放无可见瑕疵；
   若未来发现脸部微闪，收紧 FACE 表矩形即可。
4. SeedEdit 3.0（更对口的局部编辑模型）在当前账号 404 未开通；若开通成功，
   可再探"非编辑区像素稳定"，有望免手工标框。

---

## V1.1（2026-08-30 凌晨，观众反馈修复）

三个问题，全部修复并出片：

1. **脸部局部编辑抖动 —— 是我们贴回框太宽，不是火山编辑质量差**。
   V1 用整张脸框贴回 Seedream 变体，rig 矩形被框内的全图重渲染噪点撑大
   （如 frame_16 眼 rig 229×388），嘴型/眨眼切换等于整块脸换图。
   修复：`tools/relock_tight.py` 用收紧的特征小矩形（自动致密 diff 分析 +
   顽固帧手工标定：猫毛纹理和 frame_16 大特写噪点太密，自动分离不了）
   重新贴回全部 23 张 Seedream 变体 → rig 矩形缩到嘴/眼本身
   （如 frame_16 眼 rig 111×114）。成片相邻帧对比：面部零抖动，只有嘴部在变。
2. **走路"哐哐哐" —— 是复用 E02/E03 的程序化脚步音效太硬**。
   修复：Seed-Audio 定制 3 条轻柔脚步（小巷 2s / 石桥 3s / 草地 3s），
   音量 0.45 → 0.22–0.28。
3. **猫不要喵了，直接说话**：script.story 删掉 3 处猫叫 SFX 条目，
   条目重新编号（猫台词 = 条目 4/11/15），rigs 的多 cue 绑定随之退役
   （场景类的 entries[] 能力保留）。呼噜声（满足音，非喵叫）保留在 50.3s。

V1.1 验收：60.000s / Peak -3.26dB RMS -27.4dB 无削波 / story_tool 0 错误 /
check_lipsync 142 beats 全过 / 抽帧：8.0 猫直接开口 ✓ / 13.7–14.0 独白2
相邻帧面部稳定只动嘴 ✓。

---

## V2（2026-08-30 上午，OmniHuman 对口型版）

观众反馈 V1.1 脸部表情对不齐后的**第三条路线**：说话镜头不再用贴回 cel，
改用即梦 **OmniHuman 1.5**（图+音频→口型同步视频，官方支持宠物/动漫主体）。

- 试点关键发现：base64 和 data: URI 均不支持，image_url/audio_url 必须是公网
  URL（50215/50220）→ 资产走 TOS 上传 + 预签名 URL（tools/tos_upload.py，
  bucket dula-e04-omnihuman-assets，cn-beijing，私有桶）。tmpfiles.org 等
  海外图床被火山机房拒连，别再用。
- 姿态锁定 prompt 有效（"保持姿势和位置完全不动，只动嘴"）：首测不锁姿态时
  猫会从站姿自作主张坐下，锁后 8/8 镜头姿态稳定、身份保持。
- 8 个说话镜头全量生成（免费试用，1 并发串行，~90s/条），抽 12fps cel +
  末帧补齐槽位；timeline 新增 omni 模式（`build_timeline.py --mode omni`，
  说话镜头的静态帧+rig 被 cel 序列替换）。口型 rig 在 V2 全退役
  （mouth_rigs.json 置空），眨眼 rig 只剩 frame_03/13/14（Seedream 锁定版，
  待 V1.2 codex 重做后恢复全量）。
- 渲染：V2 = output_v2_omni.mp4（同时覆盖 output/output.mp4）。
  V1.1 cel = output_v11_cel.mp4；V1.1 Seedream = output_v11_seedream.mp4。
- 鉴权：IAM 子用户 dula-api（CVFullAccess + TOSFullAccess），key 存
  dula-story/.env.cv（gitignore）。
- **待观众裁决**：V2（OmniHuman 版）vs V1.2（codex cel 版，11:37 续跑）对比后
  定正片工艺。OmniHuman 的已知风险：视频帧与静态 cel 的质感差异在剪辑点可见；
  视频自带音频轨已剥离（混音仍用 mixed.wav，同步由"音频即驱动源"保证）。

### V2.1（观众反馈修复，11:20）
- 猫句 1 不同步（第 6 秒）：V2 垫帧垫在末尾，视频从镜头开始就动嘴，比台词早
  1.3s。修复：垫帧改垫**前面**，按每句在镜头内的起始偏移（lead）前垫静止首帧
  （各句 lead：0.2/1.3/0.1/0.1/0.8/0.1/1.4/0.3s，来自 script.story 台词时间戳）。
- 清晰度：720P 快档 → 1080P（pe_fast_mode=false），8 条全量重生成。
- 验收：6.5s 猫闭嘴不动 ✓、7.6s 开口对准台词 ✓、1080P 锐度与关键帧一致。
- 产物：output_v2_omni.mp4（V2.0）、output_v21_omni.mp4（V2.1，当前 output.mp4）。

### 终版决定（2026-08-30 中午）
观众裁决：**OmniHuman 版（V2.1）转正**——"整体已经是动画片的流畅感觉"。
V1.2 codex 变体重做取消（对照组失去意义；已生成的 9 张 codex 变体留在
assets/mouth_variants/ 供日后参考，不再进管线）。
**工艺定型**：文生图（母版/关键帧）仍走 codex（订阅额度零现金+风格已验证）；
说话镜头走 OmniHuman（音频驱动口型，姿态锁定 prompt）；连续动作走 Seedance；
环境音/BGM 走 Seed-Audio；配音走 CosyVoice（主角）+ seed-tts（新角色）。
贴回型 cel 变体工艺整体退役（E02-E04 三集验证：qwen/wanx/seedream 全不达标，
codex 达标但被 OmniHuman 取代）。

### V2.2（观众反馈修复，中午）
- shot05（13.5-16s）三只手：OmniHuman  hallucination（行走+说话的组合 prompt
  下模型姿态不稳）。重 roll：prompt 改"双臂自然下垂贴身"并显式定姿态，一次通过。
  **新纪律：OmniHuman 镜头逐段抽帧查肢体数（手/臂/腿），hallucination 重 roll
  优先换 prompt 措辞再换 seed。**
- 产物：output_v22_omni.mp4（当前 output.mp4）。终版工艺与成本不变。

### V2.3（观众反馈修复，中午）
1. **24s 画面抖一下**：omni shot08 槽尾 24.1 越过 frame_07 起点 24.0，两个
   entry 交叠 0.1s 导致插帧闪切。修复：槽尾对齐 24.0。
   **纪律：omni/I2V 槽的 end 必须等于下一静态帧的 at，逐对检查。**
2. **门上椭圆光斑不自然（桥上也有）**：E03 沿用过来的 dappleSway 叠加层
   （LAMP_POOL/MOON_BAND）坐标是 E03 画面的，落在 E04 画面上就是假光斑。
   修复：全部撤除——夜景母版的灯光已烘焙进位图，不需要程序化补光。
3. **夜风"哐哐哐"**：是的，那是 Seed-Audio 生成的夜风底床自带节律性阵风
   （每秒 RMS 波动 max/mean=1.86）。用"完全平稳无阵风"prompt 重生成
   （max/mean=1.21），已替换进混音。**纪律：Seed-Audio 环境音 prompt 必须
   显式写"平稳、无阵风、音量恒定"，生成后跑每秒 RMS 包络验收。**
- 产物：output_v23_omni.mp4（当前 output.mp4）。

### V2.4（观众反馈修复，中午）
- 夜风仍有电子嘶声：频谱分析发现 Seed-Audio 风的 4-8kHz 嘶声能量占比 0.70
  （正常环境音 <0.15）。修复：ffmpeg highpass=60 + lowpass=1500 EQ，嘶声占比
  降到 0.054，风声主体保留。**纪律更新：Seed-Audio 环境音除 RMS 包络验收外，
  还要查 4-8kHz 嘶声占比，>0.2 就 EQ（highpass 60 + lowpass 1500）或重 roll。**
  原始未 EQ 版留 tmp/night_wind_seedaudio_raw.wav。
- 产物：output_v24_omni.mp4 不存在——V2.4 直接覆盖 output/output.mp4（变化仅音频）。

### V2.5（观众反馈修复，下午）
- "一秒一次的呼呼声"定位困难：逐层包络/自相关/低频带通指标都没能干净分离
  来源（各层 1s 节律指标都在噪声量级）。按"深夜晴夜本来就不需要风床"的判断
  **直接撤掉 night_wind**（虫鸣+河水+BGM 足够）。若撤销后呼呼声仍在，下一
  嫌疑是 river_water 的低频涌动。**纪律：听感问题逐层 solo 定位比频谱指标
  猜来源快——下次直接出"每层单独出声"的对照混音。**
- 产物：当前 output.mp4（仅音频变化）。night_wind 两个版本（Seed-Audio 原始/
  EQ 版/程序化版）都在 tmp/ 和 assets/audio/sfx/ 备查，未进剧本。

### V2.6（观众反馈修复，下午）
- 猫声前后性别不一致：根因是同一音色（咪仔）挂了不同情感参数——calm 低沉稳重
  听感偏男、happy 明亮偏女。按导演要求**统一男声**：换 `zh_male_dayi_saturn_bigtts`
  （大壹，seed-tts-2.0 资源内），**摘掉全部情感参数**（情感参数会改变性别听感，
  同一角色必须锁一套）。候选儒雅逸辰语速太慢爆槽（3.1/3.5/2.7s vs 槽 ~2s）淘汰。
  试音文件留 tmp/voice_audition/。
- **工具坑**：generate_audio_cosyvoice.py 对已存在的逐句 wav 静默跳过——换音色
  重录前必须删掉目标文件，否则混音用的是旧录音（V2.6 第一趟就白渲了一次）。

### V2.7（观众反馈修复，下午）
- "从桥上开始的呼呼声"定位成功：撤掉风床后仍在 → 逐层排查锁定 **river_water**
  （E03 沿用素材，16s 随桥进场）——0.5s 周期涌动（自相关 0.38，包络 max/mean
  2.19），叠加 33.5s 素材循环播放的接缝。
- 修复链：Seed-Audio 重生成"平稳无涌动"版仍带涌峰（0.20/3.58 不达标）→
  **包络拉平**（0.4s 滑动包络归一化增益，gain 钳制 0.25–4 防爆音）：
  0.5s 节律 0.02、包络 1.62，达标。旧版留 tmp/river_water_old.wav。
- **纪律沉淀**：① 环境音素材沿用前必跑节律验收（自相关 + 包络），老素材不等于
  免验；② 短素材循环播放要查接缝；③ Seed-Audio 水声类 prompt 要写"无节律性
  涌动"，不达标就包络拉平兜底。
- 产物：当前 output.mp4（V2.7，仅音频变化）。

### 导演决策（2026-08-30 下午）：环境音工艺变更
**环境音/氛围底床以后全部走大模型（Seed-Audio 1.0），不再程序化合成**——
程序化夜风/河水连续两次被观众判"不自然"，大模型纹理真实且目前基本无花费。
程序化仅限非真实/风格化声音。已写回 build-ambience-foley skill（含三道验收：
平稳锁 prompt、RMS 包络 + 周期自相关、嘶声占比 + EQ/包络拉平兜底）。
