# E05《清晨速写》制作笔记

> 工艺验证集：在 E04 定型工艺（codex 文生图 / OmniHuman 1.5 口型 / Seedance I2V /
> Seed-Audio 音频）上验证四项优化——I2V 满血版 1080p、表情分层描写、
> L1 布料/发丝次级动态词表、omni 神态分层 prompt、Boy 换音色。

## 版本记录

### V0 骨架与文案（2026-08-31）

- 剧情：清晨六点，小橘带小蓝穿过巷子、石桥到河堤，撞破"小橘的秘密"——
  转学生阿澈每天清晨在河堤台阶画小橘。三角色（Girl/Cat 沿用 E04，
  Boy 设计锁沿用 xiaoju_secret，画风重绘为晴印）。
- 时段变体：STYLE_BIBLE 新增「清晨变体」（top #3E9BD8 → horizon #FFC07A，
  低空金 #F5B942，日轮 #FFD97A 在画面右侧低空，长影一律指向左/西，
  露珠 = 平涂白色四角星，禁止薄雾）。
- script.story：20 条目 / 60s / 10 句台词（Girl 4、Cat 2、Boy 3 + 结尾留白）。
  Girl 的 {Voice:relaxed} 在 E04 voice_config 里不存在，改用 calm（写回纪律：
  新情感键必须先加进 voice_config 再进剧本）。
- 骨架：scene JS 由 E04 复制改造，starTwinkle→dewSparkle（四角星形）、
  fireflies→birdsFlyby（平涂 V 形雁阵，窗口化从左飞右）。
- build_lipsync.py 拼音表补 20 个新字（一今们友在基学密晨朋清现班生画秘见转那陪）。
- Boy 音色：导演备忘判定 xiaoju_secret 的 longshu_v3 叙事腔生硬，本集三候选
  盲听（tmp/boy_audition_{longze_v3,longjielidou_v3,longyue_v3}.wav，台词
  「它每天清晨，都来陪我画画。」），默认先上 longyue_v3，换音色 = 删
  013/014/016_Boy.wav 重跑 generate_audio_cosyvoice.py。

### 槽位对齐表（build_timeline.py 权威）

- omni 槽统一前垫 0.2s（slot 起点 = 台词起点 - 0.2），槽尾 == 下一静态帧 at。
- I2V 3 段：11.5-13.5 猫带路 / 18.5-21.5 过桥 / 29.8-31.8 跑下草坡。
- omni 8 镜：3.0-5.7 / 7.0-9.4 / 27.0-29.8 / 33.8-36.2 / 36.6-39.3 /
  44.3-47.3 / 47.6-50.3 / 50.6-53.3。

## 验收记录

### V1 成片（2026_9_5_0201.mp4，60.000s 1920×1080）

- **I2V 满血版 1080p 验证通过**：doubao-seedance-2-0-260128 输出 1920×1080，
  超过关键帧 1672×941，剪辑点零放大（E04 的 720p→1080p 放大 1.5× 虚边消失）。
  3 段一次通过，无重 roll。成本约 ¥1.6/条（4s 最小计费）。
- **布料/发丝 L1 词表有效**：过桥段裙摆涟漪、发梢滞后摆动、草叶相位差波
  全部可见且轮廓主体稳定；首帧构图（左 1/3 起走、右 2/3 留空）依然关键。
- **表情分层 + omni 神态分层**：特写表情信息量明显优于 E04 的整词写法；
  shot08 猫的"下巴微抬+眼睛半眯"得意神态一次到位。
- **Boy 新角色入列**：sunprint 版阿澈母版一次通过（style 参考在前、
  design 参考在后的参考图权重序有效），与少女/猫同框无色温跳跃。
- **配音**：Boy 暂用 longyue_v3（导演备忘要求弃 longshu_v3）；
  三候选试听在 tmp/boy_audition_*.wav，待人工盲听定稿，换音色 =
  删 013/014/016_Boy.wav 重跑 generate_audio_cosyvoice.py。
- **台词时长**：首轮 6 句 OVERRUN（最坏 +0.49s），调 rate（curious 1.22 /
  bright 1.15 / gentle 1.25 / nervous 1.2）+ #11 文本精简后全部 ≤+0.12s。

## 翻车与新发现（V1）

1. **OmniHuman 会"放松"标志性手势**：shot05 底图是"抬手挠头"的腼腆姿势，
   V1 生成视频中段手回落到速写本上、姿势中性化。教训：关键手势别指望 omni
   保住——要么让手势发生在相邻静态帧里，要么接受它只保留表情和口型。
   （V2 重 roll 时手势存活，见 V2 第 5 条——有随机性。）
2. **voice_config 情感键必须先于剧本存在**：Girl 无 `relaxed` 键，
   {Voice:relaxed} 会静默落到 default。写剧本时对照 voice_config 的键表。
3. **Codex 生图耗时**：26 张关键帧串行约 67 分钟，规划批量生产时预留。
4. **omni 输出实测 1920×1088**（不是 1080），cover-crop 消化，无影响。
5. `.env.*` 相对深度：episode/tools 里 source env 用 `../../.env.*`
   （episode 目录的上一级是 episodes/，再上级才是 dula-story 根）。

## V2 全角色迁 seed-tts-2.0（2026-09-05）

导演 A/B 听后判定 seed-tts-2.0 明显优于 CosyVoice，V2 起人类角色全部迁移：

- **Girl = zh_female_vv_uranus_bigtts（Vivi 2.0）**，emotion 映射：curious→
  surprised、bright→happy、calm→calm、gentle→tenderness、amazed→surprised(3)，
  全部 emotion_scale=2 弱档。
- **Boy = zh_male_taocheng_uranus_bigtts（小天 2.0）**——少年音，与猫的
  dayi 不撞车。候选 m191（云舟）/ruyayichen（儒雅逸辰）也解锁可用，
  试听在 tmp/voice_ab/。CosyVoice 那条 longze/longjielidou/longyue 试听线作废。
- Cat 维持 dayi 无情感参数（E04 性别漂移教训不动）。

迁移教训（已写回 volcano-seedtts.md）：

1. **seed-tts 没有 rate 控制**，E05 用 CosyVoice rate 调好的时长全部失效；
   uranus 自然语速偏慢，3 句超时（最坏 +0.78s），修法是精简台词文本 +
   加宽字幕窗/omni 槽，级联改 build_timeline。
2. **换音色必须重跑全部 omni 镜头**——omni 视频的口型是旧音频驱动的，
   gen_omni_shots.py 的幂等跳过会掩盖这一点（差点漏掉 Boy 三镜）。
3. 情感参数有效性按音色逐一验证（API 不报错就对比 md5/波形，同字节数
   也可能是不同音频——实测 taocheng 三条同尺寸不同 md5）。
4. 新发现可用音色（seed-tts-2.0 resource 下实测解锁）：xiaohe（小何）、
   m191（云舟）、taocheng（小天）、ruyayichen（儒雅逸辰）。
5. V2 重跑 omni 时 shot05 的挠头手势**保住了**——手势存活有随机性，
   V1 的"被放松掉"不是必然，不满意可以重 roll。

成片：`output/2026_9_5_1136_seedtts.mp4`（60.000s 1920×1080）。
