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

**最新 Episode**：`episodes/tomorrow_still_bright/`（《明天还会亮》——原创 2D 水彩科幻短片，按完整剧本分镜文档（`bible_source.txt`）32 镜 / 480s 制作；cel-cinema 管线第二次完整落地：3D 底稿（M-07 跛行机器人+51 接触事件）→ codex 文生图 38 资产 → painted-space 合成（标定表+两轮 96 帧审片）→ 全火山配音/Foley（最终接触时钟，49/49 对位）+ Suno 音乐盒主题（s19 片段与 s29 完整版同一旋律）→ 整集渲染+连续播放独立审查（continuity_scan 14400 帧+31 切镜边界+12 镜 10fps 序列亲看）；verify 10/10，成片 `output/tomorrow_still_bright_full.mp4`；声线配乐待用户听审，工艺与翻车见 `NOTES.md` T1-T5）

**活跃 Episode 列表**（按最近工作排序，完整列表见 `episodes/`）：
- `episodes/tomorrow_still_bright/` — 见上"最新 Episode"
- `episodes/borrowed_moonlight/` — 《借走月光的女孩》（cel-cinema 首片，478s；2026-10-28 用户接受 R5，屋内老人波动与屋顶抖动按用户要求保留暂不修改；成片 `output/borrowed_moonlight_cinema_r5_final.mp4`，viewer `hybrid/art_pass_r5.html`；交付摘要与证据见 `NOTES.md`、`R5_REVIEW.md`、`storyboard/character_attention/r5_acceptance.json`）
- `episodes/cat_leads_cafe_musical/` — 《半拍晴天》咖啡厅音乐剧特别篇（hybrid/ 混合制作路线重做视频部分：3D 仅作动作/接触底稿，人物全部为已审生成原画；两窗口试片 r16——8 相位逐拍真画+整拍冻结、同图表情变体、单角色单尺度常量、渲染实测断言全绿；已知保留项=相位间硬切定格感（下一步主项=过渡画）；巡检记录含 M1–M11 漏检册，工艺见 `hybrid/PIPELINE_NOTES.md`；音频与 V1–V5 旧版未动）
- `episodes/stardust_clad_op/` — 原创 OP《星屑战壳》（平行宇宙铠甲搞笑番：屑铁级战壳使三人组——阿鏊（平底锅座）/小凿（漏勺座）/大釜（汤釜座）；星屑灶台圣殿 StardustShrineScene；**P3 正式成片 49.2s/152BPM**：五段式谱面边界全吸附 beatgrid（build_timeline.mjs 断言）、切磋蒙太奇接触帧压 downbeat（格挡/对拳/击飞 0.156m/0.06m 探针实测）、颠勺合体 gag 定格压 33.855 唱句、赫斯提亚画外音（seed-tts QC 拼音 100%）+锅盖「当」收尾；gate 全绿，成片 `output/craft3d_full.mp4`；P3.5 hybrid 混合质感升级（Seedream 地板/石材/星空背景板+法线派生+ContinuousBackdrop 晋升 craft3d，四机位接缝探针零错误，seek 保持全绿）；**R2 监制整改**：音效全换 Seed-Audio（11 支溯源+底床节律验收+AAC 过冲留量）、战壳华丽化（全覆盖甲件体系+三人配色分级+肖像组自查）、多场景跳切（新增柱廊/火山口两场景，23 段边界全吸附拍网）；**R2.5**：出拳肩臂分离根治（目标点 ≤.85 臂长+noSwing+三角肌盖+reach/limb_attach 探针）、脸谱差异化（setStyle 参数包+发型件+SKIN 运行时注入）、女神赫斯提亚 outro 登场（坐锅沿晃腿+口型包络轨+坐姿探针复用 food/carry 段）、肖像 solo 隔离；gate 全绿，成片 `output/craft3d_full.mp4`（49.2s h264+aac，AAC 峰值 0.773）；**R2.6**：战壳贴身化重写（整筒胸甲/贴髋腰带/六片菱形甲叶随腿摆动/上扬壳肩甲锚三角肌盖/披风纯 t 摆动，悬浮环清零+clad_fit 54 条探针）+女神修脸+半成品场景丰富化合并验收；**R4**：歌词字幕烧入（whisper 粗锚×人声 onset 精修→subtitle-burn 字幕组风 ASS→净版烧入 `output/craft3d_full_subtitled.mp4`）；**R5**：女神锅铲权杖可读性（宽铲面展示定型朝向+三节环箍+挥手举起）；**R6**：首帧非黑（30% 亮度起 0.6s 淡入，封面帧纪律）；**R7**：胫甲/前臂甲板翻面修正（骨骼 rig 局部 +y=肢体前向，旧装反在后侧）+人形步态（standStraight 直立偏移+WALK/RUN 双 GAIT 实例+双臂对摆垂挂门控）；**R8**：角色/场景晋升 `dula-assets/characters|scenes/stardust/`（零拷贝复用）+新角色阿箸（筷子座，黑漆双筷刃+丹凤眼冷傲）；**R9/R10**：场景扩至七场景（星辉内殿有顶拱顶/幽荧河冥界/云巅圣峰/星屑角斗场/星辉门阙/沉星海底，Seedream 纹理+法线派生+专属背景板，四机位接缝探针全过）；**R11**：必杀技系统（moves.js 八技+技名大字卡+交锋链四喊招压拍+专属 SFX）；**R12**：配音按《9章》工艺卡重铸（ICL 克隆音色+逐句演绎档）；工艺与翻车见 `NOTES.md`）
- `episodes/stardust_clad_s1e1/` — 《星屑战壳》S1E1《圣火与战壳》（viewer 链正片 120.0s；**R13 剧情级重写**（监制否决"剧情太敷衍"后按 story-writer/series-architect 全工艺重做，旧「年检风波」75s 版推翻）：防务评估战——搞笑是壳、里子是垫底者尊严之战；考核三连败因=人物缺陷（无脑冲/过度计算/蛮力），谷底圣火空镜+三处眼部特写，必杀技挣到（缺陷认领为战术）；F01 圣火变弱+F02 撤防入册（docs/stardust_series_bible.md）；22 句配音 QC 全绿+喊招压帧；**R14** 晨景纹理集（三场景 15 张 Seedream+12 法线，morningize 与纹理共存，角斗场去灰蒙）；gate ALL GREEN，成片 `output/craft3d_full.mp4`；工艺与翻车见 `NOTES.md`）
- `episodes/stardust_clad_s1e2/` — 《焰阶宫·盾与暗链》R27（213s / 原OP版262.2s）。用户认可R26光效；本轮柔化脸发明暗，补耳鼻唇细节，短乱发/长侧分、宽圆/窄斜胸肩护腕护靴分别设计。门框错层修共面闪烁，暗殿四处壁火照亮墙面；末步提前转向收齐并重排33次脚步声。对白、音乐、环境分轨、剧情、镜头与原OP保留；60Hz全片场景采样、142口型状态、9处逆向取帧通过。正片 `output/stardust_clad_s1e2_palace_r27.mp4`，固定R26保留。R27外观待用户复看，证据和范围见 `NOTES.md`、`storyboard/palace_r27/REVIEW.md`。
- `episodes/late_beat_musical/` — 《迟到的一拍》（社区剧院汇演夜音乐剧，craft3d 观众席第一排 POV，170s：调音师少年阿拍顶替主演唱砸→灯光师少女小灯追光呼吸引回→二重唱谢幕；P1 脚手架+舞台场景+静默版；P2 真角色建造（集内 characters/theater.js：背带裤少年/oversized 衬衫少女+襟摆铰链+手电道具状态机）+ 探针铺全（env/gait/limbBody/reach/cloth/worn/supporter + POV 本地探针），contact_probe/locomotion/POV/seek 全绿；viewer 4216；音频与 Suno 抽卡在 P3；工艺见 `NOTES.md`）
- `episodes/bio_armor_academy_s1e3/` — 《9章》S1E3《天台便当》（texture 质感集 71s：正午天台日常、零伏笔推进；dula-assets bioarmor 角色与 craft3d 积木晋升后首用（episode 零拷贝）、赛璐璐材质统一（共享 coolShadowRamp）、动漫化分层（预备/跟随衰减/挤压拉伸/次级运动/一拍二 15Hz）+ billboard 表情符号、Seed-Audio 音频链（TTS 7/7 全绿）；P12 步态/肩部/书包修复；P13 掌心语义约束+手系托盘锚定+肩窝桥接+挎包可读性；P14 静息手支撑（垂放腿侧/搭盒沿）+ C7 门状态一致性（撞门对准人到、阵风关没关严的门）；P15 limb_body_mesh 肢体-躯干椭圆截面探针 + 坐姿肘外摆修同色贴壁 + squash 边界混合中性值修复（crack 入场压扁两帧事故）；P16 reach 超伸断言 + 嵌入/分离区间两端（托盘抱盒收进 .85 臂长、肘 pole 按 beat 收敛）；P17 cloth_body 襟片换号穿透探针 + 襟片让位（0:18 胸前腕同色合并修、前臂穿襟修）；P18 C8 渲染稳定性：地垫/墙帽共面抬 2mm、铁丝网双层换层（近细远粗）、flicker_probe 二阶差分探针进 gate 第七步；P19 坐姿肘极收体侧后下方（0:20"多长一节"修）+ 共享 locomotion 足踝滚动（触地背屈→放平→蹬离，跺脚翻车实录）；P20 按袖左上臂嵌躯干终修（肘极前外+滤除区 .12→.06 收紧+嵌入平阈 -20mm，连带真修三处旧肘嵌入）、铁丝网取消距离换层统一单层 repeat 70、flicker_probe 加台阶检测（step_ratio）；P21 横伸 beat 肘凸"多一节"修（肘极收后下方+目标点收回+elbEx 轮廓级凸包判据）+ cloth_body 坐标系假绿复活（mesh 局部喂 worldToLocal 零触发两轮）+ 襟片臂推外掀（内压/穿越才推）+ 襟片 probeExclude，接触探针 26 段；逐拍近景审片协议落地（`render.mjs --shots` + `config/review_shots.json` 28 镜）；成片 `output/craft3d_full.mp4`，viewer 4215；工艺与验收见 `NOTES.md`）
- `episodes/bio_armor_academy_s1e2/` — 《9章》S1E2《碎岩》（craft3d 横屏 70s、1280×720、30fps；R21 于 2026-10-10 获用户认可：保留连续天空、反击表演和原音轨，R19 统一肤色、R20 耳后/后颈头发衔接、R21 有限落脚/收步/后退/换脚转身；62 个顺序/seek 检查及五类步态检查通过。成片 `output/craft3d_full_r21.mp4`，viewer 4214；显式构建参数、视频依赖与复用范围见 `NOTES.md`，历史诊断见 `HYBRID_REVIEW.md` / `FIGHT_TRIAL.md`；动作实现仍在本集，工艺已同步至 walk-director 等 skill）
- `episodes/yuki_airport_t2/` — 《小雪游 T2》（小雪带年糕逛福州长乐机场 T2 幽默游记；craft3d 工艺全新机场场景 ChangleAirportScene：马鞍墙波浪曲面吊顶+喇叭口天窗阵列（R2 按实景改造）/树叶航班屏/幕墙海景/零高差值机岛/掌纹感应桩；19 条 TTS QC 全绿，123.6s 成片 `output/craft3d_full.mp4`（R5 树叶屏改宣传片画面+两句台词；R4 马鞍脊梁+GTC；R3 Seed-Audio BGM）（R1 已修正设计方事实链：CPG×中国院竞赛联合体+北京建院落地深化，见 NOTES）；viewer 4213；只读引用 craft_trial 与 fish craft3d）
- `episodes/yuki_fish_musical/craft3d/` — 《谁动了我的小鱼干》三维化（2026-09-27 Phase 4 完成：开场（端盘下套/空盘）+ 正片 + 结尾（洗碗/偷瞄零食袋/画外「我看着呢」）共 65.6s 完整剧情短片 `craft3d_full.mp4`；双主角形象精修（分层眼/高光带/裙褶顶点色/猫背分区）；5 条新台词 TTS 全绿；viewer 4210；原 cel 版不动，见 `craft3d/NOTES.md`）
- `episodes/yuki_morning_battle/craft_trial/` — 《早起大作战》工艺试片（2026-09-23：用户认可五指、四肢与头颈改善；新增二维三维混合河岸、非匀速阵风和飞鸟，12.4s 动态/静态各 372 帧检查通过并提供并排对照，环境效果待复看；原室内 16 帧哈希不变；viewer 4199，未替换共享角色或原集；入口见 `VISUAL_REVIEW.md`）
- `episodes/yuki_fish_musical/` — 《谁动了我的小鱼干》迷你音乐喜剧（46s：对白+双唱段、一首歌切两段实现动机复现、年糕/小雪各自本音演唱、家庭厨房场景、cel-look 纪律首验——描边 boil/一拍二/连指手/硬切阴影；自包含 viewer 链，不走 dula-render）
- `episodes/yuki_fish_musical/` — 《谁动了我的小鱼干》迷你音乐喜剧试播版（46.3s，五句对白 + 两段各四句短唱，早起集声线参考换声，嘴角物证/空盘/洗碗道具，最终人声驱动双角色口型；自定义 viewer 链，正常速度试听待监制评审）
- `episodes/yuki_beat_ad/` — 《下一拍，你登场》小雪歌姬唱跳广告（V17 监制首看通过：豆包音乐模型 GenSongForTime 经 veFaaS 中转生成 30s 人声歌曲，Demucs 分离 + Whisper find_alignment DTW 逐字对齐 + 连续视素轨道口型，拍网锁定 MTV 五段式编排，年糕 Mochi 冷面伴舞；自包含 viewer/prepare/render 链，不走 dula-render；小雪本音歌声转换 A/B 试听待选版）
- `episodes/yuki_bento_battle/` — 《便当大作战》（小雪系列第二集 101s 群像搞笑；新角色 Flash（瘦黑猫老江湖）/Dodo（幼儿园精力球）入库 dula-assets；场景：小雪家 + 便当盒时间态道具；全火山音频——seed-tts-2.0 六声线 + Seed-Audio BGM/SFX）
- `episodes/yuki_morning_battle/` — 《早起大作战》（小雪主角 62s 搞笑片：赖床 vs 咕噜号音量攻击，胖猫年糕一句「今天周六」冷面揭底；全火山音频——seed-tts-2.0 四声线 + Seed-Audio BGM/SFX；画面引擎渲染 + sketchify 手绘描边，自定义场景 `scenes/YukiRoomScene.js` 小雪家少女卧室，角色工艺同 yuki_cat_diet）
- `episodes/cat_leads_e10_waiting_rain/` — 《等雨停》（质感集：F01/F02/F03 全静默；**全程序绘制 76s 三场景天气弧**——阵雨灰蓝→雨后金光色板过渡、雨/白墙巷/便利店门脸新积木、走路/坐姿猫首画、黑场淡入，画面成本 ¥0，见 `painted/NOTES.md`）
- `episodes/croc_map_ad/` — 鳄鱼地图转场广告 demo（已出片；待导演评审后决定全量 4 城版）
- `episodes/cat_leads_e09_live_riverbank/` — 真人实验集（W2 已出片：6s 说话三明治 v3——同源底图+25fps+xfade，背景一致/无鬼影/无 judder；**猫说话 Seedance 2.0 图+音频组合已验证 ¥4/镜**，替代 DreamActor；人说话正脸待验 2.5 参考链）
- `episodes/cat_leads_e06_cat_model_live/` — 《模特小橘》真人版（V1 出片；V2 暂停待世界锚点实验）
- `episodes/cat_leads_e08_drifting_page/` — 《漂走的那张画》（2026-09-29：`hybrid/` 补齐停笔、重画、递接与松手过渡；阿澈持续握笔，分层混合掌向、指形和固定骨长的肘部路径；新增 60Hz 动作边界检查。保留三指握笔、相对夹纸、小蓝轻步、阿澈少年比例、18 镜及风鸟，原音频直接复制。成片 `2026_9_29.mp4`，`transition_comparison.mp4` 左 9 月 25 日版右当前；效果待用户复看。viewer 4200，见 `VISUAL_REVIEW.md` / `hybrid/NOTES.md`；原 `painted/` 与 `volcano/` 保留）
- `episodes/cat_leads_e07_river_willow/` — 《柳树下的老钓友》（长篇结构验证集：新角色老周、伏笔 F02/F03、环境微动 A/B）
- `episodes/cat_leads_e06_cat_model/` — 《模特小橘》（正片打磨验证集：亮场景密度 + 关键帧微动语法）
- `episodes/cat_leads_e05_morning_sketch/` — 《清晨速写》（优化方案验证集：1080p I2V + seed-tts-2.0 全角色配音）
- `episodes/cat_leads_e04_firefly_night/` — 《夏夜流萤》（火山全家桶首集）
- `episodes/cat_leads_e03_dusk_homecoming/` — 《暮色归途》（I2V 标准档验证集）
- `episodes/cat_leads_e02_morning_riverbank/` — 《清晨河堤》（I2V 视频 cel 工艺首用）
- `episodes/cat_leads_e01_sunny_store/` — 《晴天便利店》（晴印风格 60s 治愈系首集）
- `episodes/xiaoju_secret/` — 《小橘的秘密》（温情浪漫，rainy_rooftop_cat 同工艺续篇）
- `episodes/rainy_rooftop_cat/` — 《雨后天台》（31 秒单角色治愈系，2D 有限动画模板集）
- `episodes/last_deposit/` — 90 年代声波机器人风格原创机甲剧集
- `episodes/chibi_maruko_s1e1/` — 樱桃小丸子风格日常
- `episodes/transformers_beast_wars_s1e1/` / `episodes/transformers_beast_wars_s1e2/` — 原创机甲宇宙（beast wars 风格续集）
- `episodes/kimi_showcase_s1e1/` — Kimi 能力展示第一集
- `episodes/hurdles_championship/` — 跨栏锦标赛（3 segment 拼接长片）
- `episodes/broadcast_exercise_s1e1~s1e3/` — 广播体操系列
- `episodes/she_ra/` / `episodes/she_ra_s2/` — She-Ra 公主力量
- `episodes/star_travel_s1e1/` / `episodes/star_travel_s1e2/` — 星际旅行
- `episodes/yuyuhakusho/` — 幽游白书战斗 demo
- `episodes/inuyasha/` — 犬夜叉场景
- `episodes/saint_seiya_intro/` / `saint_seiya_five/` / `saint_seiya_duel/` — 圣斗士星矢系列
- `episodes/seaside_vacation/` — 海边假日
- `episodes/starlight_courier/` — 星光快递员
- `episodes/street_dunk/` — 街头扣篮
- `episodes/worm_dance/` — 虫子迪斯科

---

## 2. 目录结构

```
dula-story/
├── episodes/                    # 所有 Episode 目录
│   └── kimi_showcase_s1e1/      # 示例 Episode
│       ├── script.story         # 剧本（唯一时序数据源）
│       ├── bootstrap.js         # 资产注册入口（import dula-assets + 自定义插件）
│       ├── config/
│       │   ├── transitions.json # 场景过渡出口/入口（可选）
│       │   ├── voice_config.json# TTS 声线配置
│       │   └── audio_mix.json   # 音频混音配置（可选）
│       ├── materials/           # 手动音频素材（可选）
│       │   ├── bgm/             # 手动 BGM (*.mp3/*.wav/*.ogg)
│       │   └── sfx/             # 手动 SFX (*.wav)
│       ├── assets/
│       │   └── audio/
│       │       ├── music/       # BGM 输出 (*.wav/*.mp3)
│       │       ├── sfx/         # SFX 输出 (*.wav，自动生成或手动)
│       │       ├── manifest.json# TTS 音频清单（自动生成）
│       │       ├── mixed.wav    # 最终混音（自动生成）
│       │       └── *.mp3        # 逐句 TTS 输出（自动生成）
│       ├── storyboard/          # 验证截图输出（自动生成）
│       └── output/
│           └── output.mp4       # 最终视频（自动生成）
├── docs/                        # 工程化/工具设计文档
├── tools/                       # 辅助工具
├── package.json
├── README.md
└── AGENTS.md
```

**双管线目录约定**（E08 起）：同一 episode 同时有自绘版与火山生成版时，
自绘版全部放 `painted/`（painter/viewer/render 工具/检查帧/成片/NOTES），
火山版全部放 `volcano/`（自包含 episode 目录，可独立 `dula-render` 重建）；
共享的 `script.story`、`config/`（voice_config/audio_mix/lipsync_cues）、
`assets/audio/` 留在 episode 根目录，只保留一份权威版本。

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

### 避碰与运镜安全约束（P0）

以下约束必须在写 `.story` 时主动遵守。引擎已启用自动相机防穿模（`CameraCollisionGuard`）和角色间碰撞约束，但** authoring 阶段仍要遵循安全距离**，避免把镜头或角色埋进场景几何体。

> 自动防护范围：
> - `CloseUp` / `OverShoulder` / `TrackingCloseUp` / `Static` 相机会自动被推离角色 bounding sphere。
> - `RoomScene`、`ParkScene` 等常见场景已注册家具/树木/喷泉等碰撞代理，相机会自动被推离。
> - 角色间启用 `BodyCollisionGuard` 与 `JointConstraintSystem`，会互相推开并限制关节穿模。
>
> 自动防护**不保证构图美观**，只保证不穿模；所以 `.story` 仍需主动遵守下述规则。
>
> **自包含 viewer 链（如 craft3d 各集）不经过引擎，没有上述自动防护**——
> 须自建碰撞代理与数值探针（交互窗口期断言 + 多机位抽帧），纪律与最小距离表见
> `dula-skills/direct-animation-craft/references/contact-and-hands.md`。

#### 1. 角色 vs 家具/场景避碰
- **RoomScene 默认家具**：椅子约在 `z=-1.5`、书桌约在 `z=-3.0`、床在 `x=7`、衣柜在 `x=-7`。
- **站位规则**：主要对话角色应放在 `z ≥ -0.5` 区域（椅子前方），避免站在椅子/书桌正后方或从它们后方穿过。
- **入场规则**：角色从门口（`x≈-10, z≈2`）或画面边缘入场时，路径应绕过家具；若使用 `{Event:Move}`，起点和终点的连线不可穿过椅子、书桌、床等障碍物。
- **角色间避碰**：多个角色同屏时，站位间距应 ≥ 1.0 米，禁止角色网格相互穿插。
- **禁止行为**：不要让角色从桌椅内部“浮出来”或从家具阴影/后方高速滑入画面；角色身体不得埋入墙壁、地面或其他角色。

#### 2. 相机 vs 角色/场景避碰
- **CloseUp 安全距离**（相机到目标角色头部，不得小于以下值）：
  - 大雄 / 静香等标准体型角色：`distance ≥ 3.0`
  - 哆啦A梦 / 胖虎 / 大恐龙等宽大体型角色：`distance ≥ 4.0`
- **OverShoulder**：`distance ≥ 4.5`，机位应放在肩后角色的后方或侧后方，禁止穿过肩前角色身体。
- **TwoShot**：`distance ≥ 6.0`，确保所有被拍摄角色完整在框内，机位不可切入任何角色。
- **运动运镜（Pan / ZoomOut / Tracking）**：若起点和终点之间的连线会经过角色身体或家具，改用 `Camera:Static` 或分段切换机位。
- **相机 vs 墙壁/家具**：机位不得位于墙壁、家具内部或被其遮挡；室内 CloseUp 应优先让相机朝向房间开阔区域，避免背靠墙壁导致黑边/穿模。
- **禁止行为**：相机不得从角色头、躯干内部穿出/穿入；CloseUp 不得把相机埋进角色身体里；相机不得穿透墙壁、门、桌椅等场景几何体。

### 表情与眼神

角色面部系统已统一升级：主角（Doraemon / Nobita / Shizuka）拥有瞳孔高光、眼皮、眉毛和更大幅度的表情动画。同时引擎会根据 TTS 推断的 emotion **自动播放对应表情**，因此普通对白条目不需要手动写 `{Face...}` 标签。

#### 自动表情映射

`generate_audio.py` 会从台词推断情绪并写入 `manifest.json`，运行时映射如下：

| 推断情绪 | 自动播放的表情动画 |
|---|---|
| `happy` / `excited` / `triumphant` | `FaceHappy` |
| `sad` | `FaceSad` |
| `scared` / `panic` / `worried` / `concerned` | `FaceScared` / `FaceWorried` |
| `angry` / `exasperated` / `defiant` | `FaceAngry` |
| `proud` / `teasing` | `FaceProud` / `FaceGrin` |
| `surprised` / `amazed` / `confused` / `curious` | `FaceSurprised` / `FaceConfused` |
| `calm` / `gentle` / `relaxed` | `FaceRelaxed` / `FaceSmile` |

#### 手动表情标签

如需精确控制某句台词的表情，仍可在 `.story` 中使用 `{FaceXXX}` 标签，显式标签会覆盖自动表情：

```
[Nobita]{FaceSad} {Shrug}好无聊啊……
```

常用标签（**以 dula-assets 实际注册为准**：`FaceHappy`、`FaceSad`、`FaceAngry`、`FaceSurprised`、`FaceDetermined`、`FaceSmirk`、`FaceBlink`、`FaceConfused`、`FacePain`、`FaceReset`）。⚠️ 历史文档里出现的 `FaceScared`/`FaceRelaxed`/`FaceProud`/`FaceWorried`/`FaceGrin`/`FaceCry` **从未注册**，写上会被静默跳过（yuki_bento_battle 验证发现）；害怕用 `FaceSurprised`，放松用 `FaceHappy`。

#### 眼神接触

`CloseUp` / `OverShoulder` / `TrackingCloseUp` 等镜头对准正在说话的角色时，角色会自动看向镜头（观众方向）。这会让特写镜头更有交流感，不需要手动写 `{LookAt}` 之类的标签。

#### 3. 验证动作
每次修改后必须执行：
1. `npx dula-verify ./episodes/<name>` 生成 `storyboard/check_shot_*.jpg`。
2. 逐张检查是否有穿模、相机切入角色、角色从家具内部出现、墙壁/家具遮挡镜头。
3. 检查表情是否明显：眉毛/眼皮是否有动作、机器猫嘴巴是否为月牙形、眼神是否呆滞。
4. 发现 P0 问题立即在 `.story` 中调整站位或机位，再重新验证。
5. 关键镜头（门出现、角色坐下、新场景首次亮相、情绪特写）必须单独截图确认视觉效果。

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
以下文件/目录已在 `.gitignore` 中排除，不进入版本控制：

- 生成的音频资产：`assets/audio/` 下的 `.wav`、`.mp3`、`manifest.json`、`mixed.wav`、`_temp_*.wav`、`_*.txt`
- 生成的视频/截图：`storyboard/frames/`、`storyboard/*.mp4`、`output/`
- 调度报告：`scheduling_report.json`、`script.story.scheduled`
- 依赖：`node_modules/`
- Python 缓存：`__pycache__/`、`*.pyc`、`*.pyo`
- 日志：`*.log`
- 构建产物：`*.tgz`
- OS 文件：`.DS_Store`、`Thumbs.db`

需要提交的通常是：`script.story`、`bootstrap.js`、`config/*.json`、`materials/` 中的手动素材、`storyboard/check_shot_*.jpg` 等校验截图。

---

## 6. 与引擎的交互

Story 仓库通过 `npm install` 引入引擎，以 npm scripts 方式调用 CLI：

### package.json scripts

仓库为每个主要 Episode 预置一组 scripts，命名格式为 `<action>:<episode_alias>`。示例：

```json
{
  "scripts": {
    "render:kimi_showcase_s1e1": "dula-render ./episodes/kimi_showcase_s1e1",
    "audio:kimi_showcase_s1e1": "dula-audio ./episodes/kimi_showcase_s1e1",
    "verify:kimi_showcase_s1e1": "dula-verify ./episodes/kimi_showcase_s1e1",
    "build:kimi_showcase_s1e1": "npm run audio:kimi_showcase_s1e1 && npm run render:kimi_showcase_s1e1",

    "render:she_ra": "dula-render ./episodes/she_ra",
    "audio:she_ra": "dula-audio ./episodes/she_ra",
    "verify:she_ra": "dula-verify ./episodes/she_ra",
    "build:she_ra": "npm run audio:she_ra && npm run render:she_ra",

    "render:hurdles": "dula-render ./episodes/hurdles_championship",
    "audio:hurdles": "dula-audio ./episodes/hurdles_championship"
  }
}
```

也可以直接调用 CLI：

```bash
npx dula-render ./episodes/<name>
npx dula-audio ./episodes/<name>
npx dula-verify ./episodes/<name>
```

### 依赖方式选择

| 方式 | package.json 写法 | 适用场景 |
|------|-------------------|----------|
| `file:` 链接 | `"file:../dula-engine"` / `"file:../dula-assets"` | **当前使用**，本地开发，源码修改实时生效 |
| GitHub Release | `"https://github.com/.../dula-engine-0.1.7.tgz"` | 锁定版本号，与源码解耦 |

### 本地开发链路

```bash
# 1. 引擎侧注册本地包（只需一次）
cd ../dula-engine
npm link

# 2. Story 侧链接引擎（只需一次）
cd dula-story
npm link dula-engine

# 3. 日常开发（全部在 Story 仓库执行，以指定 Episode 为例）
npm run audio:kimi_showcase_s1e1   # 生成音频
npm run verify:kimi_showcase_s1e1  # 验证画面
npm run render:kimi_showcase_s1e1  # 生成视频
npm run build:kimi_showcase_s1e1   # 一键 audio + render
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
2. 若修改了对白或时间轴，重新生成音频：`npm run audio:<alias>` 或 `npx dula-audio ./episodes/<name>`
3. 验证画面：`npm run verify:<alias>` 或 `npx dula-verify ./episodes/<name>`
4. 生成视频：`npm run render:<alias>` 或 `npx dula-render ./episodes/<name>`

### 新增 Episode
1. 在 `episodes/` 下创建新目录。
2. 复制一个已有 Episode（如 `kimi_showcase_s1e1`）的 `config/`、`bootstrap.js`、`script.story` 作为模板。
3. 编写 `script.story`。
4. 放入需要的 BGM/SFX 素材到 `assets/audio/music/` 或 `materials/`。
5. 可选：在 `package.json` 中添加该 Episode 的 npm scripts。
6. 按上述流程生成音频 → 验证 → 出片。

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

## 9. 历史 Episode 已知问题（she_ra）

> 本节记录 `she_ra` 开发周期的历史问题与修复方案，供后续 Episode 参考。当前各 Episode 的独立问题建议在该 Episode 目录内维护 `VISUAL_REVIEW.md` 或在项目 issue 中跟踪。

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

# 运行完整 AI 视觉审核（自动使用 kimi-cli 登录凭证）
npm run visual-review:she_ra

# 指定维度
python tools/visual-review/cli.py ./episodes/she_ra \
  --dimensions character_detail lighting
```

**组件架构：**
- `ScreenshotCollector` — 从 storyboard 提取关键帧（场景开始/结束、对白中间、运镜变化）
- `AIVisionClient` — 封装 Kimi 视觉 API（自动使用 kimi-cli 登录凭证）
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

**最后更新**：2026-07-01
