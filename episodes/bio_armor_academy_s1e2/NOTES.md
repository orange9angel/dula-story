# 《9章》S1E2《碎岩》— craft3d 工艺（程序化三维，零视频生成费）

当前认可版为 **R21（2026-10-10）**：横屏 1280×720、30fps、70 秒、2100 帧，
viewer 端口 4214，成片 [output/craft3d_full_r21.mp4](output/craft3d_full_r21.mp4)。
用户复看确认“效果好很多了”，并要求同步文档、skill 与 Git。
工艺链路与 `yuki_airport_t2` 同构（自包含 viewer 链）；只读引用 /craft/（craft_trial 积木）
与 S1E1 音频资产（拷贝入本集 assets3d/）。**不改**其他 episode / dula-engine / dula-assets。

## 当前交付与复用范围

- 连续天空与已认可的反击表演自 R16 起接入正式入口；R19 统一肤色，R20 补齐耳后/
  后颈头发，R21 修正走路方向、左右落脚、收步、后退站距和换脚转身。
- [入场动作对比](output/walk_r21_detail_compare.mp4)：左 R20、右 R21，先正常速度再半速，
  无音轨；[原剧情机位对比](output/walk_r21_scene_compare.mp4) 带原对白。
  [最终动作抽帧](storyboard/walk_r21/final_walk_sheet.jpg) 与
  [验证记录](storyboard/walk_r21/check/locomotion_validation.json) 随源码归档。
- 制作方法沉淀在 [walk-director](../../../dula-skills/walk-director/SKILL.md)、
  [direct-animation-craft](../../../dula-skills/direct-animation-craft/SKILL.md)、
  [character-modeler](../../../dula-skills/character-modeler/SKILL.md) 和
  [hybrid-craft-scene](../../../dula-skills/hybrid-craft-scene/SKILL.md)。
  `locomotion.js` 和角色修型仍是本集实现；换角色需重测比例、落脚与重心，尚未晋升为共享动画资产。
- 本轮未升级原冲锋跑动、整集对白手势、发束和衣物次级运动；用户认可的是当前改进版。
- Git 同步源码、文档、改前源码样本、关键对照图和验证记录；完整视频按既有规则留在
  本地 `output/`，中间渲染帧也不全量归档。历史目录记录的是对应版本的检查结果。

## 当前入口（在本集目录运行）

```powershell
cd D:\opensource\movie\dula-story\episodes\bio_armor_academy_s1e2
node render.mjs --serve
# 复核现有 R21，无需重新渲染或生成音频
python tools/check_fight_trial.py --full --board storyboard/walk_r21/check --video craft3d_full_r21.mp4
python tools/check_locomotion.py storyboard/walk_r21/check/render_trace.json
# 需要重建时，明确指定版本名和证据目录
node render.mjs --check --out craft3d_full_r21.mp4 --board storyboard/walk_r21/check --trace storyboard/walk_r21/check/check_trace.json
node render.mjs --out craft3d_full_r21.mp4 --board storyboard/walk_r21/check --trace storyboard/walk_r21/check/render_trace.json
```

正式渲染直接复制本地 `output/craft3d_full_r11_2026_10_9.mp4` 的已认可 AAC 音轨；
新检出环境需先恢复该视频及项目所需的本地音频资产。裸跑 `render.mjs` 仍沿用早期
默认文件名/证据目录，因此重建 R21 使用上面的显式参数。当前同步未改动已验收的运行源码。
构建清单的 SHA-256 针对当时文件原始字节；Git 换行归一化可能改变文本哈希，跨环境
复现应保存本次构建清单并重新验收，不能直接沿用旧哈希和通过结论。
`make_story.py`、`synth_lines.py`、`build_audio.py` 属于前期制片流程，复核 R21 不需要重跑。

以下版本记录保留当时状态；“待评审”“未提交”等表述仅描述历史节点，当前认可状态以
本节为准，提交状态以 Git 记录为准。旧版命令用于解释当时工艺，不能用当前源码重建旧版外观。

## Phase 1 状态（视觉骨架，无声，已目检两轮）

- 场景 `scenes/RuinsDuskScene.js`：黄昏废工地——金橙渐变天+日轮+无文字城市剪影、
  左侧钢筋骨架烂尾楼（风动篷布 update 驱动）、右侧塔吊剪影、混凝土管群
  （`pipeJump` = 轰刚起跳管）、沙堆、积水倒映夕阳（半透明渐变片）、3 只盘旋乌鸦。
- 角色 `characters.js`：
  - **LeiXiaoCraft**：瘦高少年（~1.75m），非 Q 版；呆毛×2、卷袖（袖口+卷边两段
    LimbSurface）、斜挎书包、眼下淡阴影。**殖装锁死右臂**：rightRig 对齐肘→腕
    （前臂仅 ~0.18m，分段甲必须落在 0~.17——第一版排到 .2 溢出到拳外）。
    三态：壳疹六边形（青绿 emissive 微光）/ 鞘翅骨板盾（shieldT 弹开）/
    黑亮全甲（Phong 高光 + 青绿接缝环 + 爪尖，armorT 从肘向腕分段蔓延）。
    左臂 leftEtch 蚀纹组（青绿裂光，first_mark 才可见）。
  - **HongGangCraft**：高壮（~1.95m）寸头浓眉方颚、敞开校服外套（前襟两片+背片+短袖）、
    缠手绷带（前臂白缠带）、右拳「碎岩」岩灰几丁质拳甲 + 独角仙叉角（gauntletT 生长）。
  - ObserverCraft：极简暗色剪影（宽檐帽长衣），hook 段才上镜。
- `performance.js`：beats = card_open/establish/walk_in/hong_drop/hong_declare/lei_panic/
  hong_armor/clash1(抱头+骨板格挡)/lei_shocked/clash2(闭眼+闪回卡)/will_up(意志全甲+反击)/
  hong_laugh(坐地)/first_mark(左臂蚀纹)/hook(观察者+结束卡)。风林火山：静拍全收、
  动作拍配速度线/白闪/拟声词大字（「轰！」「铛——！」「碎！」）。
- 机位 camFor：establish(缓推)/walk/hong_drop/hong/lei/wide/block/shout(雷晓正面3/4)/
  counter/laugh/mark/hook。
- 42 检查帧 + seek 一致。**翻车记录（本轮实测）**：
  - **脸贴片翻车三连**：①脸贴片 phi 只盖 ±36°，而角色 yaw 面向 +x、机位在 +z 方向——
    看到的全是侧后脑，误以为贴图没渲染（probe 三连才定位）；②SphereGeometry 段坐标里
    脸贴半径要比颅骨大一圈才不露馅；③逆光场景脸贴必须 MeshBasicMaterial（Toon 正面全黑）。
    教训：talking 机位要放在角色面朝的 ±60° 内；侧面机位别把「看不到脸」当「脸没画」。
  - 角色 yaw 朝向决定脸贴可读范围：脸贴加宽到 ±65°（phiLength .72π）。
  - characters.js 曾混入一个不可见坏字符导致 V8 报 Invalid shorthand property initializer
    （node --check 也栽在同处，重写该行即恢复）。
- 已知 P1（不阻塞）：中远景脸部细节弱（大眼距卡通脸）；篷布为静态构图像一块板
  （动态在 update 里，检查帧看不出）。

## Phase 2/3 状态（2026-10-07）：成片完成 `output/craft3d_full.mp4`（66.17s）

- 轰刚选声：4 候选试听（目录筛选→signature 句合成→librosa F0/RMS）——
  豪爽少年 254.9Hz / 热血少年 182.2Hz / 憨厚敦实 128.4Hz / **咆哮小哥 134.2Hz 选定**
  （低频+高能量，侵略性贴合力量型直性子，与白岚 79Hz/雷晓孱弱少年错开声区），
  记入 `config/voice_config.json`。
- TTS 8 句 QC **8/8 全绿**（首轮 2 条 ❌ 纯估算窗口问题，实测窗重建后全绿；
  内容拼音级 100%）。雷晓 atempo 1.05（S1E1 基准 rate），轰刚原速。
- build_audio.py：DTW 对齐（atempo 后音频）→ 实测重排（66.18s，目标 65-80 内）→
  双角色 V17 视素轨（生成后断言 t 单调递增）→ final_voice_features → 混音：
  inkblaze 全片铺底 + furyu 打斗段（hong_armor→will_up 末）+ SFX 事件总线
  （S1E1 音效库 16 支拷贝 assets3d/sfx/：落地 ground_crater/格挡 chitin_impact+
  shockwave_ring/变身 cicada_wing_buzz/反击 bio_impact_metal+floor_crack/
  蚀纹 heartbeat_core/收场 steps_fading）+ 晚风暮蝉环境床 + gate 包络 ducking。
  实测：对白段 ≈ −21.5dBFS，打斗段 −25.5，心跳段 −26.4，峰值 −1.01dBFS（卡边，安全）。
- 字卡：`dula-skills/title-card` 三张——开场「9章·残卷其二」（白光切出）、
  闪回「让我看看，你会羽化成什么。」（clash2 后半叠加）、收尾「残卷·其二·终」（淡黑）；
  底图用本集检查帧；帧序列在 cards/，清单 config/cards.json（viewer 缺卡时有兜底黑底墨字）。
- 伏笔台账 `config/foreshadow_ledger.md`：F04 蚀 advance（视觉化第一道蚀纹）、
  F07 轰刚复赛 planted、F08 蚀纹 planted；F03 观察者属冷却期免费露出（登记在案，
  下次必须换形式）；S1E3 必须 texture 集（不许连续三集推进）。
- 成片：h264 1280×720 + aac，66.167s，8.7MB。42 检查帧 + seek 一致 + 成片抽帧复查。
- **git 未提交**（等监制看成片后再说）。

## Phase 2/3 待办

（全部完成，见上。）

## 音频来源核查（2026-10-08）

当前 `output/craft3d_full.mp4` **不是全火山/Suno 音频**。成片与
`assets3d/mixed.wav` 解码到 16kHz 单声道后，66.176s 共同区间相关系数
0.999637，确认是当前混音的 AAC 编码版本；以下结论来自文件与生成记录核查。

| 层 | 实际来源与证据 |
|---|---|
| 8 句配音 | 火山 Seed-TTS 2.0；`tools/synth_lines.py` 调用 `seedtts_say.py`，声线见 `config/voice_config.json`。 |
| 全片配乐 `inkblaze_theme.mp3` | 从 S1E1 复制，SHA-256 相同。文件 comment 标注复用旧集 `episodes/yuyuhakusho/materials/bgm/battle_theme.mp3` 的手动下载素材；前 20s 对齐 12ms 编码偏移后相关系数 0.999893。原平台未核实，不能据 S1E1 片尾的 Suno 字样认定为 Suno。 |
| 打斗配乐 `furyu_fight_theme.wav` | 火山 Seed-Audio 1.0；S1E1 `tools/gen_audio_stems.sh` 与 `tmp/audio_stems/furyu_fight_theme.log` 有生成记录，复制件哈希一致。本集使用于 26.621–51.154s。 |
| 环境与事件音效 | 16 个文件均与 S1E1 同名素材哈希一致：11 个有 Seed-Audio 生成脚本及日志；`wind_dusk`、`crow_caws`、`floor_crack`、`heartbeat_core` 是 S1E1 `tools/synth_missing_sfx.py` 程序合成；`bio_impact_metal` 与 `last_deposit/assets/audio/sfx/impact_metal.wav` 哈希一致，由该集 `tools/generate_mecha_audio.py` 程序合成。 |

具体问题：`tools/build_audio.py` 让旧曲全片播放，再叠加打斗曲，
26.621–51.154s 两首独立配乐同时发声；这不是两曲切换，可能影响听感。
全程晚风床也是程序合成，未遵守真实环境音使用 Seed-Audio 的既有规则。
旧来源表及片尾署名不能替代逐文件追溯，生成脚本的 skip-if-exists 也不能证明旧文件已重生成。
本次仅核查并记录，未替换音频或重新出片；听感改善仍待专门处理。

## R2 精修轮（2026-10-08）：表情/动作细化 + 音频重混

成片 `output/craft3d_full_r2.mp4`（66.167s，9.5MB，h264+aac）。上文"音频来源核查"
针对的是 R1 的 `craft3d_full.mp4`；R2 已处理其中三个问题（双 BGM 叠放、程序合成
环境音、来源不可溯）。

### 角色表情/动作细化

- 新 `character_details.js`（episode 本地）：
  - `detailedHead`：参数化雕刻头替换球段脸贴——levels 轮廓车削（下颌/颧骨/颅顶
    逐圈收放）+ 鼻部高斯凸出，脸是画在头型 UV 上的 1024 canvas 纹理（正脸占 UV
    中段，侧后区收到边缘窄条防拉伸）；眨眼画成眼皮盖住固定虹膜（不再把整眼压扁）；
    纹理按 kind/emotion/量化 blink 缓存。
  - `garmentDetails`：雷晓领襟/门襟线/纽扣/胸袋/书包盖缝+铜扣；轰刚外套前襟/
    车线/肘部补丁。
  - `forearmDetails` + `updateForearmDetails`：轰刚缠手绷带螺旋线挂前臂 rig，
    每帧随 twoBone 肘→腕对齐；拳甲出现时绷带 rig 隐藏（setGauntlet 联动）。
- `characters.js` 重构：删旧脸贴/寸头帽改调 detailedHead；ArticulatedHand 缩放
  .78/.95（原轰刚 1.25 过大）；爪尖改挂四指末节指骨（随指形，不再写死局部坐标）；
  壳疹/分段甲收敛（甲片高 .031、壳疹 r .029、emissive .12）；rightRig/leftEtch 的
  lookAt 改 setFromUnitVectors（方向近竖直时 lookAt 会绕轴翻转）。
- `performance.js`：姿势新增 fist/open/point 手势语义并纳入条目边界 0.3s 插值
  （换条目不再瞬切）；肩点 torsoOffset 随坐/走/bob 联动（修复蹲防手臂悬空）；
  shoulderHalf 收窄（雷晓 .155→.13、轰刚 .21→.18）。
- `viewer.js`：hong/lei/shout/laugh/mark 五个 talking 机位移进角色面朝 ±60° 内
  （原机位在侧后方只拍到后脑——Phase 1 脸贴翻车的同根问题）；shout 机位跟随雷晓
  rootX；表情接线——雷晓用谱面 emotion、谱面 blink 优先于自动眨眼；轰刚
  hong_laugh 外默认 determined。

### 音频 R2

- 双 BGM 叠放 → 单首 Suno 曲（v6 器乐，160s）切 4 cue 顺接
  （`config/music_cues_r2.json`：unease/duel/aftermath/unresolved，源内偏移
  0/97/129.5/1.5s，对白 duck −8dB，first_mark 段留白只露心跳，反击前 0.21s
  音乐呼吸口）；cues 间断言互不重叠。
- 五支程序合成音（wind_dusk/crow_caws/floor_crack/heartbeat_core/
  bio_impact_metal）改用 Seed-Audio 1.0 重生成：`tools/generate_refinement_audio.py`，
  prompt 与意图在 `config/audio_refinement.json`，逐支 .source.json 落盘。
  风声/蝉鸣 bed 做带通 + 0.4s RMS 包络整平（指标入 manifest 的 bed_qc）。
- `tools/remix_audio.py` 分轨混音：dialogue/ambience/effects/music 四 stem 落盘
  `assets3d/refinement/`，`mix_manifest.json` 记录逐文件 provider+sha256；
  对白 take、摆点、视素轨、story 时间轴字节级不动（重混前断言 script.story
  时间戳与 timeline.json 一致）。混音峰值 −1.8dBFS 上限，实测见 manifest。
- Suno 曲获取：无头 .suno_profile 登录态已过期（9/29 cookies 备份失效），
  改在用户日常已登录浏览器手动生成下载（song 22280731-…，sha256 在
  `assets3d/refinement/music/*.source.json`）。suno-driver 已同步修复并提交
  dula-skills 74bc027（cookie 备份改 `--restore-cookies` 显式恢复、--login 检测
  扫全部标签页、过守卫后滚动刷新备份）。

### 验证与翻车

- 42 检查帧 + seek 校验：首跑 shot_32 报不等（7×8 像素 24 点亚像素差异，
  肉眼无差），重跑全过（passed: true）——判定偶发，疑似光栅/编码噪声；
  结论：seek 校验单帧微差先跑像素 diff 再决定是否深挖。
- **被中断的渲染会留下无 moov 的半截 mp4**（19:21 首跑 craft3d_full_r2.mp4，
  ffprobe 报 "moov atom not found"）——接力/验收时先 ffprobe 再信成片文件。
- 重渲成片 vs 新 mixed.wav 相关系数 0.9997；旧 R1 成片 vs 新混音 0.796，
  确认配乐已换。成片抽帧（44.0 闪回卡/48.6 反击台词/55.5 坐地大笑/60.5 蚀纹）
  复查通过。
- git 仍未提交，等监制评审 R2 成片。

## R3 精修轮（2026-10-08）：打斗接触 + 场景剪影 + 表情

成片 `output/craft3d_full_r3.mp4`（66.167s，9.4MB；音轨与 R2 同 mixed.wav，未动）。

- **打斗接触（P0）**：冲锋终点 1.7→0.55（进入拳程，原全程打空气）；
  knockdown 击飞起点=接触点 0.55；冲锋加躯干前倾 lean .12（buildPose 新增
  lean 参数，绕脚底 pivot，入边界插值表）；冲击环锚点移到真实接触点
  （clash1 (−.05,1.35,−2.15)、反击 (1.05,1.35,−2.0)）。
- **新特效**：反击命中点地面径向裂缝（命中后常驻）+ 10 颗碎石飞溅（抛物线
  溅落后留作残骸）；轰刚坐地补尘环 dustRing2。全部时间驱动，seek 一致。
- **角色**：骨板盾 .075×.16→.11×.24 并贴近前臂；轰刚拳甲压深两号
  （#8a8578→#6e6a5e 系），不再像纸杯。
- **场景**：积水改径向羽化边缘+压暗（修掉 update() 呼吸把 opacity 提到 .78
  覆盖 build .35 的翻车）；塔吊重建为格构塔身+臂架+斜拉索三角+吊钩钢筋捆
  （原读成"带刺柱子"）；打斗区地面加发丝裂缝+14 颗碎石。
- **表情**：新增 laugh（∩ 上拱笑眼+眉上挑，与眨眼的眼皮遮盖分开实现），
  轰刚 hong_laugh 段接线。
- 验证：42 检查帧+seek 全过；成片 ffprobe 完好、与 mixed.wav 相关 0.9997；
  抽帧复查 37.45s 格挡接触帧（冲击环+拟声字+骨板同框成立）。
- 教训写回 direct-animation-craft / scene-designer（dula-skills 92c8270）。
- git 仍未提交，等监制评审（R2/R3 连同前序一起）。

## R4 混合工艺轮（2026-10-08）：craft3d-hybrid——文生图纹理/背景板 × 程序化 3D

成片 `output/craft3d_full_r4.mp4`（66.167s，13.9MB；音轨同 R2/R3 mixed.wav）。
动机：纯 procedural 场景"片场感"（纯色零纹理+几何太规则）。几何/动画/绑定/光影
不动，只把材质细节和远景氛围交给文生图。

- `tools/gen_textures.py`：Seedream 5.0 Pro（方舟，.env.ark）生成 6 资产 →
  `assets3d/tex/`（ground/concrete/steel/tarp/sand/backdrop + 逐文件 source.json
  溯源；skip-if-exists；Ark b64 响应会截断，必须重试 3 次——E04 同款坑）。
- `RuinsDuskScene.applyHybrid()`：viewer 启动时加载 tex/，任一缺失则该部位保持
  程序化外观（可回退 R3 纯程序版）。地面/钢管/锈骨架/篷布贴图
  （MirroredRepeatWrapping 免接缝，map×color 相乘要压灰防过曝）；
  backdrop 整幅替换天空+楼群+日轮（2048×768 matte painting），平面 x 偏移把
  图中太阳对到主相机视野；地面尽头暗条带 + Fog 糊接缝；板外 scene.background
  换同色系竖直渐变纹理（纯色会露平板边界）。
- 翻车修正：沙堆锥体贴图拉成放射条纹（帐篷感）→ 锥体不贴图保持色块；
  背景板加宽加深会丢暖色带 → 回收到 200×64@z−58；背景板一度紫化过度 →
  雾 far 26-78→38-115 + 阳光 1.5→1.7 找回金色时刻。
- render.mjs：seek 校验从字节相等改像素容差（>16 差值像素 ≤64 判过）——JPEG
  编码器对同一画面偶有单个 8×8 块字节级不一致（shot_32 实测 maxBad 仅 26 点），
  字节相等把编码噪声误判为状态漂移。
- 验证：42 检查帧 + 容差 seek 全过（maxBad=1）；成片 ffprobe 完好、音轨相关
  0.9997；抽帧 5.0/37.45/60.5s 复查——日落接触帧、纹理地面、塔吊吊钩剪影成立。
- 新 skill `hybrid-craft-scene`（dula-skills）：纹理 prompt 纪律/背景板对齐/翻车清单。
- 音频链路自 R2 起已全大模型：Seed-TTS 2.0 配音 + Seed-Audio 环境/音效 +
  Suno 配乐，本轮无需改动。
- git 仍未提交（含 R2/R3/R4 全部，等监制评审）。

## R5 混合工艺补全（2026-10-08 晚）：全景覆盖 + 材质全覆盖

成片 `output/craft3d_full_r5.mp4`（66.167s，14.6MB）。R4 遗留：单平面背景板只盖
主视野，侧向机位（hong/establish 左侧）拍到板外纯色平板与板缘亮线；泥补丁/沙堆/
碎石等纯色件在贴图地面上突兀（"覆盖不到整个场景"）。

- **圆柱内壁全景**：`CylinderGeometry(70,70,36)` BackSide + MirroredRepeat repeat.x=2
  （镜像双幅，背面幅永不入镜），offset.x=.61 把太阳方位调进主视野；任意朝向机位
  不露馅。scene.background 换**采样自背景板实际像素**的竖直渐变，圆柱顶缘弧缝消失。
- **世界空间顶视平面投影 UV**（planarUVWorld）：地面 box/半径 65 远景圆盘/泥补丁/
  沙堆统一比例尺贴图；沙堆恢复贴图（锥体不再拉花）；泥补丁同纹理压暗一号读色差。
- 撤掉 R4 的暗色远条带（会读成海平面）；管件混凝土色压到 #8f877c。
- 42 检查帧 + 容差 seek 全绿；R5 成片抽帧 19/37.45/60.5s 复查通过。

## R6 混合工艺收尾（2026-10-08 晚）：全景融合四修复

成片 `output/craft3d_full_r6.mp4`（66.167s）。针对监制指出的"顶上没覆盖/背景形变/
天台感/前后景边界感"：

- **顶上**：圆柱背景之上加 48m 天色带圆柱（底缘色=背景板顶缘实测 #9774b8，
  向上渐深），任意仰角不露屏幕空间兜底。
- **形变**：背景板文生图局部编辑移除太阳（backdrop_nosun.png，暖光区保留），
  圆柱 repeat 2→4，横向形变 2.3x→1.15x；太阳改程序化日轮+光晕（世界锚定
  (-31.6,7,-65.9)，fog:false），镜像环绕不再复制太阳。
- **天台感**：地面圆盘 r65→r78（伸出筒壁）；新增 36 个程序化中景剪影块
  （r40-55 远处料场/矮废墟，#2e2638）填前景-天际线过渡；雾 38-115→30-100。
- **边界感**：上述中景+雾把锐利程序地面与柔和 AI 远景的接缝糊进大气层。
- 验证：42 检查帧 + 容差 seek 全绿；抽帧 05/19/41 确认侧向机位融合、
  天色带接缝、日轮位置成立。

## R7 材质化（2026-10-08 晚）：2D 图 → 3D 材质（亮度派生法线）

成片 `output/craft3d_full_r7.mp4`（66.167s）。回答"文生图能否仿射变换转 3D 纹理"：
仿射/投影只是贴皮；材质化是派生会响应光的立体信息。

- `tools/derive_maps.py`：albedo 亮度 Sobel 梯度 → 切线空间法线图（边缘 wrap
  配合 MirroredRepeat 无接缝；强度分档：布料 1.2/沙 1.4/混凝土 1.6/泥地 2.2/锈钢 2.6）。
- applyHybrid 全表面挂 normalMap（Toon 材质支持 normalMap）：泥地车辙和砾石在
  夕阳低角度光下出真实起伏，纹理与场景灯光联动，不再是印在平面上的图。
- 日轮换径向渐变纹理（白热核→橙缘羽化），读成发光体不再是平涂圆盘；
  天色带顶色调亮（#332a4c→#4a3a66）。
- 验证：42 检查帧 + 容差 seek 全绿；成片完好。
- 技术分层结论（写回 hybrid-craft-scene）：贴皮（投影 UV）< 材质化（派生法线）
  < 2.5D（深度估计视差，未上）< 真 3D（image-to-3D，违背"结构归程序"原则不上）。

## R8（2026-10-08 晚）：头顶闭合 + 中景去假

成片 `output/craft3d_full_r8.mp4`（66.167s，15.4MB）。针对"头顶没覆盖/远处方块假"：

- **头顶不靠摄像机规避**：撤掉上不封顶的天色带圆柱，改**闭合天穹球壳**
  （SphereGeometry(95) BackSide，按世界仰角的竖直渐变，v=.5 赤道=地平线，
  颜色与背景板顶缘衔接）——任意仰角无接缝。中途踩坑：中景环带引用
  this.mudMat 时它尚未定义（build 内定义顺序），材质 undefined 会落成
  默认白色——共享材质必须先定义后使用。
- **中景假方块 → 压扁土丘**：SphereGeometry 压扁缩放，吃 mudMat 泥地纹理
  （顶视投影同比例尺）+ Toon 光照响应，读成远处料堆/废墟起伏，不再悬浮。
- 42 检查帧 + 容差 seek 全绿；成片完好。

## R9（2026-10-08 晚）：镜头躲头顶 + 真光效 + 表演因果修正

成片 `output/craft3d_full_r9.mp4`（66.167s，17.1MB；音轨=新 mixed.wav 相关 0.9997）。

- **头顶（监制决定镜头躲）**：viewer.js `clampSky()`——画面上沿仰角钳制 ≤16.5°
  （背景筒顶缘 ~19°），只压低俯仰不改方位/机位；天穹球壳留作兜底。
  宽机位（establish/hook）构图略压低但落日天际线保留。
- **表演因果**：轰刚 knockdown 表情 determined→scared（被击飞是吃惊不是笑）+
  击飞段惊呼口型盖视素轨；laugh 只留在坐定后的 hong_laugh 拍。
- **真光效取代速度线**：撤掉 2D 集中线（监制判假）；接触点改加色混合光效——
  径向渐变闪光 sprite（pop .12s + 衰减）+ 16 颗火花迸溅粒子（LCG 确定性种子、
  抛物线）、冲击环改 AdditiveBlending 发光；白闪强度 .85/.6/.95 → .55/.4/.7。
- **光效带音效**：新增 shield_deploy（骨板弹开，Seed-Audio 1.5s）挂 clash1 u=.45
  （盾展开瞬间）；audio_refinement.json 加条目、remix_audio.py 加事件、重混
  mixed.wav（对白/时间轴/视素轨不动）。拟声词大字保留（S1E1 语法）。
- 42 检查帧 + 容差 seek 全绿；抽帧 37.45/48.9s 复查光效与表情成立。

## R10（2026-10-08 晚）：换声 + 断句 + 头顶钳紧

成片 `output/craft3d_full_r10.mp4`（63.267s，17.3MB——热血少年语速快，总长短了 2.9s）。

- **轰刚换声**：咆哮小哥→热血少年 2.0（`ICL_uranus_zh_male_rexueshaonian_tob`，
  监制试听不满意咆哮后更换）。02/04/07 三句重配，build_audio 全量重建
  （DTW 重对齐+实测重排+双角色视素轨+remix 重混）。
- **断句修复**：lines.json 的 `text`（纯字供对齐/QC）与 `display`（字幕）之外
  新增 `tts_text`——**TTS 输入必须保留标点才有停顿**（之前喂的是剥掉标点的
  text，整句连读）；07 句改"哈！好拳！碎片，你留着。下次，我不会输。"
  （哈哈→ASR 转写不稳，两轮呵呵后改单字哈，内容字 100% 对上）。
  字幕侧同步：碎片，你留着（加逗号）+ 叹问号硬断句换行。
- **表演收敛**：hong_laugh 的 laugh 表情只留 u<.3 开头一瞬，随即收 determined
  放话（之前整拍大笑，坐实"被打还笑"）。
- **头顶**：clampSky 16.5°→13.5°。
- QC 注：07 的 ❌ 是笑声词 ASR 不可转写 + 估算窗，非内容错；06 超窗同为估算窗
  （实测重排后吸收）。
- 验证：42 检查帧 + 容差 seek 全绿；成片音轨相关 0.9996；抽帧 48.5s（笑眼开头）
  /52.5s（收住放话）复查成立。

## R11（2026-10-08 晚）：断句根修——全句标点喂 TTS

成片 `output/craft3d_full_r11.mp4`（70.0s，18.6MB）。

- **根因**：lines.json 的 `text` 是给 ASR 对齐用的纯字文本，但 synth_lines 直接
  把它喂了 TTS——所有台词连读无停顿，"拳斗部轰刚"这类组合名被切碎。
  seedtts_say.py 正本本身不剥标点，问题在集内数据模型。
- **修复**：全 8 句新增 `tts_text`=display（带标点）喂 TTS；`text` 保持纯字
  供对齐/QC。全部重配 + build_audio 全量重建。停顿回归后总时长 63.3→70.0s
  （仍在 65-80 目标带边缘，可接受）。
- QC：内容拼音级 8/8 全对（3 条 ❌ 均为估算窗超窗，实测重排吸收）。
- 验证：42 检查帧 + 容差 seek 全绿；成片音轨相关 0.9997。

## R14（2026-10-09）：殖装武器活效——从"静态甲"到"活装备"

成片 `output/craft3d_full_r14.mp4`（70.0s；音轨不动）。全部效果为纯 (t,state)
确定函数（viewer 每帧调 `updateWeaponFX`，方向性语义如"生长中"由谱面 phase
显式传入），seek 校验不受影响。

- **雷晓殖装活化**：接缝光路改加色混合 + 肘→腕能量行波（生长中 9Hz 加速，
  平时 2.6Hz 呼吸，波峰泛白）；壳疹皮下微光改心跳双跳节律；新增**生长前锋环**
  （armorT 蔓延波前的青绿光环，跟着波前走）；爪尖加能量光点；补**肘甲盖 +
  手背甲**（全甲不再只有前臂五段）；黑甲加青绿返光呼吸（chitin emissive）。
- **骨板盾力场**：两骨板间新增半透明能量膜（竖向渐变 + 扫描线 canvas 纹理，
  offset 随时间流动），盾缘改加色脉动——格挡拍（37.45s）盾面读得出"力场"。
- **轰刚碎岩拳甲活化**：裂缝改熔岩橙加色裂光（5 道，内热呼吸脉动，受击
  hitT 瞬间炽亮 ×1.9）；拳峰新增三根碎岩棱刺；**生长拼合碎石**——碎岩上身
  段 12 颗带余热橙光的岩片从四周飞来拼成拳甲（仅 hong_armor 生长段可见）。
- **翻车修正**：①`mat()` 按色缓存共享（craft_trial/character3d.js），boss
  熔光必须用 `rock.clone()` 独立材质，否则染到同色甲段；②暗色素岩碎石在
  黄昏逆光里读成黑团，改独立亮材质 + 余热 emissive；③生长前锋环 r.052→.062
  加粗加亮才在 talking 机位读得出。
- 验证：42 检查帧 + 容差 seek 全绿（maxBad=0）；生长段（30.4–32.7s）与
  意志全甲段（50.8–53.0s）单独出片抽帧复查拼合碎石/生长环成立。
- 教训写回 character-modeler（dula-skills）。

## R15（2026-10-09）：人物形象精修——去"白板脸"与"泳帽头"

成片 `output/craft3d_full_r15.mp4`（70.0s；音轨不动）。动机：监制判"人的形象
还比较粗糙"。全部改在 `character_details.js`（脸纹理/头发/颈）与 `characters.js`
（轰刚嘴位），几何骨架/动画/时间轴不动。

- **脸部体块**：脸纹理加发际线下压影 AO + 双颊体块阴影（轰刚偏下颔、更重）
  + 雷晓腮红——告别平涂白板脸。
- **雷晓眼型放大**：眼高 24→27、眼宽 44→48、上睫线 4.5→6、外眼角两根下睫、
  虹膜/瞳孔/高光同步放大；眉 7→9 加深 #4a3428（原来近景几乎看不见眉）。
- **轰刚寸头**：泳帽感根修——壳面 44 根放射短茬（沿壳法线、确定性 LCG）+
  鬓角片 + **发际线画进脸纹理**（壳缘在纹理 canvas y≈168，碎茬只能落
  160-185 窄带；第一版放 y≈128 全被发壳盖住不出图）。浓眉 13→17。
- **翻车修正**：3D 发际线碎茬管悬浮在额皮上读成刻度线，撤掉改画进纹理
  （贴曲面、随头型弯曲、零深度问题）。
- **轰刚嘴位**：mouthRig y .008→.024（原贴在下巴尖读成悬浮黑痣）；颈加粗
  .058→.062 撑住大头。
- 验证：自由机位面部特写逐轮对照（hong 33.5s / lei 62.0s）；42 检查帧 +
  容差 seek 全绿（maxBad=0）。

## R16（2026-10-09 晚）：连续天空接入正片 + 动画化头 + 已认可表演设为默认

成片 `output/craft3d_full_r16.mp4`（70.0s、2100 帧、30fps、17.97MB；
AAC 包流与 R11 逐字节相同，直接流复制）。本轮落实 `HYBRID_REVIEW.md`
诊断的三条主线；构建溯源写入 `storyboard/character_look_r16/check/`
（check_build.json/render_build.json 记录 7 个源文件 sha256 与全部参数）。

- **天空融合落地**：`scenes/ContinuousBackdrop.js` 从离片试验接入生产——
  `RuinsDuskScene.applyHybrid` 默认 `continuousSky`，原圆柱+天色带+天穹球壳
  组合隐藏，低仰角保持原圆柱投影构图、高处对源图顶部区域二维低通后连续
  过渡到天顶色，任意仰角无硬接缝（R8 球壳方案退役）。`clampSky` 保留作构图
  纪律但不再是遮缝手段。
- **动画化头（animated-head-r16）**：`character_look.js`——参数化雕刻头型
  （轮廓车削 + 鼻部/唇高斯凸出，UV 正脸占中段防拉伸）+ 程序化发壳/发束，
  五官画在同一张 1024 canvas 上：连续视线（lookAtWorld）、量化眨眼眼皮遮盖、
  眉形与情绪/表演通道联动、嘴型由视素驱动。`character_details.js` 的
  `detailedHead` 默认改走 `animatedHead`；`?legacy-look=1` 可回退 R15 头。
  审查工具：`tools/review_character_look.mjs`（同机位 before/after 肖像 +
  转头/仰视/俯视/半眨/全闭眼姿势组）、`tools/compare_character_look.py`
  （对照表 `portrait_comparison.jpg`/`head_motion_checks.jpg` + 10s 对比片
  `output/character_look_r16_compare.mp4`）。
- **已认可表演设为默认**：`render.mjs` 默认即 fight-final（R13 监制认可的
  反击表演 + 全片 fight_trial 状态机），`--legacy-performance` 回退旧表演；
  will_up 段的命中点/裂缝/残骸/尘环锚定新接触位（.38,1.185,-2.33），
  默认视线互看对手、 authored 表情通道优先，白闪/闪光/拟声字在试片段收敛。
- **翻车修正（本轮新发现）**：ContinuousBackdrop 的 `fract(atan)·repeat` UV
  在回绕方位画出 2px 竖直亮缝（屏幕导数突变 → mip 选最糊级 → 整图平均色）。
  修法：梯度按周期解缠（`d -= repeat*round(d/repeat)`）后 `textureGrad`
  显式采样。教训写回 hybrid-craft-scene。
- 验证：`tools/probe_hybrid_sky.mjs` 4 机位 + 180 帧无错误；62 检查帧 +
  seek 全绿（maxBad=0）；`check_fight_trial.py --full`（r16 board）全过——
  命中前受害者零位移、拳端标定误差 0、恢复期支撑脚零滑移、切镜根位置连续、
  护拳拇指朝向正确、音轨包流 = R11；成片 ffprobe 完好，53.07s 原接缝列
  像素扫描平滑。局限沿用 FIGHT_TRIAL.md：标定/IK 检查不认证手部网格碰撞、
  重量感或商业动画质量；前两次冲锋与其他对白表演未推广，仍走谱面动作。
- git 仍未提交（R2 起全部轮次，等监制评审）。

## R17（2026-10-09 晚）：动作根修——步态滑冰与跳跃假

成片 `output/craft3d_full_r17.mp4`（70.0s、18.0MB；音轨不动，AAC 包流仍 = R11）。
动机：监制判"动作不自然，比如走路和跳跃"。根因均在源码（非审美分歧）：

- **步态滑冰**：旧 buildPose 步态 `ph=t*4.6` 用 wall-time 驱动（与根位移的
  ease 脱钩），且双脚 z 向**同相**摆动（剪刀腿原地漂），步幅 .18m 对实速
  ~1m/s。重写为 `gaitFeet()`：相位=已走路程/步长（与根位移同源），支撑脚
  在**世界空间钉住**、摆动脚抛物线换步 + 脚背蹬伸（蹬地→勾脚跟着地）、
  髋部双支撑期微沉。数值自检：支撑脚滑移 8.9e-16m、帧间脚跳变 ≤2.6cm、
  4.33m 走 8-9 步交替。walk_in / lei_panic 后退步 / charge1·2（run 档）
  / hook 退场全部接入；fight_trial 的 setPose 包装在非格斗拍也应用脚背 pitch。
- **跳跃假**：旧 hong_drop 用 ease 全程 + sin 弧（水平竖直都匀速感），空中腿
  直挺。重写：预备下蹲摆臂（u<.10）→ 抛体飞行（水平**匀速**、竖直 v0=1.2/
  g=9.8、等效实秒 T=.689，落得越来越快）+ 空中收腿（q<.7）→ 落地前伸腿 →
  触地深蹲 -.26 回弹 + 宽站距。触地仍在 u=.55，与 viewer 震尘环/「轰！」
  原锚点一致，音效时间不动。
- **登场浮起**：条目边界 0.3s 缘插值把上一拍（visible=false）的 air=0 混入，
  轰刚从地里浮起再升上管顶。改为上一拍不可见则跳过插值，直接定格新拍起点。
- 验证：三段局部探片片（probe_walk/jump/charge_r17.mp4）逐帧条带目检——
  走路真迈步（膝盖屈伸、脚平贴地）、跳跃蹲伏/收腿/伸腿/深蹲缓冲成立、
  冲锋跑步接 punch 成立；62 检查帧 + seek 全绿（maxBad=0）；
  `check_fight_trial.py --full`（r17）全过；成片 ffprobe 完好。
- 已知边界：旧表演拍（对白手势等）仍未推广到 fight 状态机；R16 的
  fract 接缝修复与本轮动作修复互不影响（同一 r17 成片包含两者）。
- 教训写回 direct-animation-craft（dula-skills）。
- git 仍未提交（等监制评审）。

## R18（2026-10-09 晚）：身体人形化 + 走路上身动态

成片 `output/craft3d_full_r18.mp4`（70.0s、18.0MB；音轨不动，AAC = R11）。
动机：监制判"走路好一点了但还不自然，身体不太像人体"。

- **躯干人形化**（characters.js）：旧躯干是等宽椭圆直管（正面读成纸板）。
  雷晓新断面：骨盆 .127→胯 .143→**收腰 .127**→胸 .149→肩斜 .130→颈根 .064；
  轰刚：胯 .184→腰 .169→**胸 .207**→肩斜→颈根，外套前襟/背板同步加宽包住
  新胸廓（旧背板比新胸窄，侧面会穿出）。双肩加三角肌盖（扁椭球遮关节断面）。
  腿锥度四段→五段（大腿/膝/小腿/踝），直筒感消失。雷晓颈加粗 .044→.048。
- **走路上身三件套**（performance.js buildPose 走路分支）：①横向重心摆动
  倒向支撑脚（.5×hipHalf，先摆根再换算脚局部坐标——世界钉脚不受影响）；
  ②肩线反向扭转（肩点与手目标绕躯干竖轴同转，头 headYaw 反向 1.1 倍稳定）；
  ③前倾 .03（跑 .09）。起止按剩余距离 18cm 渐出，到位不瞬跳。轰刚退场
  走路补反相摆臂（±.16m，与步态同相源）。
- 验证：四个定点机位改造前后对照（胸腰胯/三角肌成立）；走路探片 12 帧条带
  （迈步+重心摆动+前倾成立）；62 检查帧 + seek 全绿（maxBad=0）；
  `check_fight_trial.py --full`（r18）全过；成片 ffprobe 完好；抽帧
  37.45s 格挡 / 55.6s 收场复查无回归。
- 教训写回 character-modeler（dula-skills）。
- git 仍未提交（等监制评审）。

## 2026-10-10：人物造型流程与当前完整样板

本次复核输出 `output/craft3d_character_look_20261010.mp4`，使用当前角色、
表演和连续天空，包含工作区已有的 R17/R18 身体与步态调整。新版头部完成领口
低头接触、闭嘴情绪与转面复核；保留原剧情与音轨。本条不替代以上历史版本记录。

- 70 秒、1280×720、30fps、2100 帧；反击检查通过，AAC 包流与 R11 完全相同。
- 新证据单独放 `storyboard/character_look_20261010/`：24 张头像/剧情/头部活动图、
  同机位 `portrait_comparison.jpg`、`head_motion_checks.jpg`、最终视频抽帧与
  `check/validation.json`。62 个顺序/seek 检查通过；check/render 的 10 个关键
  源文件 SHA256 一致，涵盖角色、performance、场景与渲染入口。
- `output/character_look_compare_20261010.mp4` 为原成片 R15 与当前成片的
  17.5–27.5 秒对白并排对照；它呈现两版本整体画面差异，并非仅头部材质的隔离实验。
- 人物造型制作与验收已补入 `dula-skills/direct-animation-craft/` 的
  `references/character-look-development.md`，入口与 UI 描述同步更新，
  `cel-look` 补记凹陷面部描边内漏教训；skill 提交 `5f1ecd6`。
- 当前面部仍以曲面纹理和小幅控制为主；肩部接缝、衣物体积及大幅面部变形仍有
  程序模型的局限。检查通过不等于整集已达到商业动画的造型与表演水准。

复现（本集目录）：

```powershell
node render.mjs --check --out craft3d_character_look_20261010.mp4 --board storyboard/character_look_20261010/check --trace storyboard/character_look_20261010/check/check_trace.json
node render.mjs --out craft3d_character_look_20261010.mp4 --board storyboard/character_look_20261010/check --trace storyboard/character_look_20261010/check/render_trace.json
python tools/check_fight_trial.py --full --board storyboard/character_look_20261010/check --video craft3d_character_look_20261010.mp4
node tools/review_character_look.mjs after --board storyboard/character_look_20261010
python tools/compare_character_look.py --board storyboard/character_look_20261010 --video craft3d_character_look_20261010.mp4 --label CURRENT --out character_look_compare_20261010.mp4
```

## R19（2026-10-10）：统一肤色与人物细节修正

用户复看指出脸上肤色“一片一片”，其他细节仍有差距。根因是 R16 头部把两颊
与额头阴影硬画成固定深色区域，耳/颈/手臂还混用了不同肤色与受光材质。
上一版的外观评价不等于用户已认可，不作为本轮黄金样板。

- `character_finish.js` 统一脸、耳、颈、手臂与裸手的皮肤色板/材质路径；
  脸部取消额头横带与双颊多边形，只在下颌与颈部保持轻量明度差。
- `character_look.js` 将正面五官 UV 与常量后脑 UV 在侧缝处分开连接，避免
  一条三角形横跨五官图；鼻尖凸出减弱、下颌前移并修下缘、柔化眼口线条与短发冠部。
- 衣料改为较柔和的连续明暗，移除独立肩球，袖根接入胸廓，隐藏袖内上臂根；
  领片减薄和缩小，减少几何接头与硬切面。身体/动作谱与装备语义沿用当前版本。
- 成片 `output/craft3d_full_r19.mp4`：70 秒、2100 帧、30fps、1280×720。
  原 AAC 包流与 R11 完全相同，完整解码无错误；62 个检查点/逆序 seek 与
  反击接触、支撑脚、切镜连续性检查通过。check/render 的 11 个源文件哈希一致。
- `storyboard/skin_refine_20261010/` 保留改前源码与同机位样板、改后 24 张检查图、
  `portrait_comparison.jpg`、`head_motion_checks.jpg`、最终 MP4 抽帧和验证记录。
  正脸三个脸颊采样点最大通道差从 40 降为 0，仅用于证明该处拼色已去除，不衡量美术质量。
- 带对白近景对比 `output/character_skin_r19_closeup_compare.mp4`（8 秒）：
  左改前、右改后，依次取轰刚 19–23 秒与雷晓 23.5–27.5 秒，用相同世界机位。
  改前使用本轮保存的三份角色源码回放。实际剧情机位对比另见
  `output/character_skin_r19_scene_compare.mp4`（10 秒）。
- 尚有差距：衣物褶皱、全身关节变形、发束次级运动和大幅面部变形仍较简化。
  数值通过只证明已检查项目，不能认证达到商业动画质量。
- 教训写回 `cel-look` 和 `direct-animation-craft/references/character-look-development.md`。

复现（本集目录，独立输出与证据路径）：

```powershell
node render.mjs --check --out craft3d_full_r19.mp4 --board storyboard/skin_refine_20261010/check --trace storyboard/skin_refine_20261010/check/check_trace.json
node render.mjs --out craft3d_full_r19.mp4 --board storyboard/skin_refine_20261010/check --trace storyboard/skin_refine_20261010/check/render_trace.json
python tools/check_fight_trial.py --full --board storyboard/skin_refine_20261010/check --video craft3d_full_r19.mp4
node tools/review_character_look.mjs after --board storyboard/skin_refine_20261010 --baseline storyboard/skin_refine_20261010/before/review.json --video output/skin_r19_after_portraits.mp4
python tools/compare_character_look.py --board storyboard/skin_refine_20261010 --before storyboard/skin_refine_20261010/before --before-video craft3d_character_look_20261010.mp4 --before-label BEFORE --video craft3d_full_r19.mp4 --label AFTER --out character_skin_r19_scene_compare.mp4
```

## R20（2026-10-10）：后发覆盖、耳后衔接与后颈轮廓

用户确认肤色正常，但认为两人头发像假发、后面太短。本轮沿用 R19 皮肤和脸型，
重做 `character_look.js` 中后发的覆盖范围与体积关系。

- 雷晓的后发延伸到后颈，增加交叠且长短错开的宽发束，接通耳后发束；轰刚保留
  短发识别点，以贴近头型的后发和短收边覆盖原先露出的下后脑。
- 后发截面跟随现有头部轮廓逐渐收紧，避免单纯延长椭球造成膨大发团；根部颜色
  与主体过渡，减弱规则竖条和独立发片感。抬头时发现的后颈露肤缺口已修正。
- R19 原始三份角色源码与 16 张基线图保存在 `storyboard/hair_r20/before/`。
  改后 32 张图包含每人五视图、剧情帧、左右转头、俯仰和后颈检查；10 个静态
  头像相机与基线完全一致。`before_orbit/` 另保存改前的俯仰与环绕复核，未覆盖基线。
- `output/hair_r20_orbit_compare.mp4`：8 秒、240 帧，左 R19、右 R20，先轰刚后
  雷晓，各环绕一周，无音轨。它是固定剧情姿态的相机环绕，不代表发束动态。
  静态侧后对比为 `storyboard/hair_r20/rear_comparison.jpg`；原剧情对白机位的
  10 秒对比为 `output/hair_r20_scene_compare.mp4`。
- 新整片 `output/craft3d_full_r20.mp4`：70 秒、2100 帧、1280×720、30fps。
  完整解码无错误；62 个顺序/seek 检查及原反击、支撑脚、切镜连续性检查通过，
  AAC 包流与 R11 完全相同。11 个 check/render 源文件哈希与实际文件一致；相对
  R19 仅角色外观文件与渲染版本标签改变。最终 MP4 的 19.5/24.5/53.4/62 秒抽帧
  已复看，证据见 `storyboard/hair_r20/final_checks.jpg` 与 `check/validation.json`。
- 仍有边界：后发造型改善不等于头发动态完善，本轮没有增加次级摆动或发束物理。
  制作教训已写入人物造型 skill 参考文件并提交 `54ccab5`；用户随后认可形象改善，
  本次随 R21 一起同步内容仓库。

复现（本集目录）：

```powershell
node render.mjs --check --out craft3d_full_r20.mp4 --board storyboard/hair_r20/check --trace storyboard/hair_r20/check/check_trace.json
node render.mjs --out craft3d_full_r20.mp4 --board storyboard/hair_r20/check --trace storyboard/hair_r20/check/render_trace.json
python tools/check_fight_trial.py --full --board storyboard/hair_r20/check --video craft3d_full_r20.mp4
node tools/review_character_look.mjs before_orbit --board storyboard/hair_r20 --baseline storyboard/hair_r20/before/review.json --source storyboard/hair_r20/before/source --orbit-video output/hair_r20_before_orbit.mp4
node tools/review_character_look.mjs after --board storyboard/hair_r20 --baseline storyboard/hair_r20/before/review.json --orbit-video output/hair_r20_after_orbit.mp4
python tools/compare_character_look.py --board storyboard/hair_r20 --before storyboard/hair_r20/before --before-video craft3d_full_r19.mp4 --before-label R19 --video craft3d_full_r20.mp4 --label R20 --out hair_r20_scene_compare.mp4 --portraits lei_rear_quarter hong_rear_quarter --portrait-out rear_comparison.jpg
```

## R21（2026-10-10）：走路方向、有限落脚、起停与转身

用户认可 R20 形象比原来好，继续指出走路奇怪并询问运动 skill。本轮使用现有
`walk-director` 和 `direct-animation-craft`，保留 R20 角色、场景及原音轨。
基线源码保存在 `storyboard/walk_r21/before/source/`，基线成片为 R20。

- 诊断：雷晓入场时根向左前进，yaw 却从 -1.9 持续转向 1.86，身体逐渐反向；
  原步态还把路径左法向用作角色右向，造成左右落脚轨道交叉。同脚循环的路程
  过短导致碎步，循环截断后双脚突然回默认站位。仅钉脚数值为零不说明步态成立。
- 新增本集 `locomotion.js`，排有限的左右落脚、末步收脚和原地换脚转身。
  同脚跨步与交替单步分别计算；距离沿路径投影，重心侧摆不再改动步态进度。
- 雷晓沿行进方向完成入场，再停步转向；身体经过支撑脚时略微升起，肩根、手
  目标与躯干共用变换。左手靠书包带，右臂随步反向摆动。慌张后退继续面向对方，
  由摆动脚逐步加宽落点，避免窄距后退时鞋靠得过近。
- 轰刚退场先起身、换脚转向，再前进；提高站起后的髋高，减少持续屈膝。
  跨镜角度用最短圆弧，避免等价角度差 2π 被插值成整圈旋转。
- `viewer.js` 导出实际模型的世界脚位、鞋朝向、接触段、髋膝踝和鞋底最低点。
  `tools/check_locomotion.py` 覆盖雷晓前进/转身/后退和轰刚转身/前进五类样本。
  支撑位移最大约 1.2e-16 m，骨长误差为浮点噪声；正常前进朝向最大偏差约
  11.8°（含重心侧摆）。鞋底沿用原模型约 1 cm 的地面嵌入容差，未声称实现完整碰撞。
- 新整片 `output/craft3d_full_r21.mp4`：70 秒、2100 帧、1280×720、30fps。
  完整解码无错误，62 个顺序/seek 检查、原反击与切镜检查通过；AAC 包流仍与
  R11 完全一致。check/render/current 的 12 个源文件哈希一致，R20 角色和场景
  七份源文件哈希未变。证据在 `storyboard/walk_r21/check/` 与 `source_validation.json`。
- `output/walk_r21_detail_compare.mp4` 是同世界固定机位入场对照，左 R20、右
  R21，先正常速度再半速（约 18.9 秒，无音轨）；已检查相应时间序列抽帧。
  `output/walk_r21_scene_compare.mp4` 为原剧情机位 7.4–13.3 秒对照，带原对白。
  后退和退场另有 `backstep_r21_detail.mp4` / `leave_r21_detail.mp4` 检查机位。
- 边界：本轮聚焦走路、起停和转身，未升级原冲锋跑动、整集对白手势或次级发束/
  衣物运动。数值检查与抽帧不等于商业动画观感认证；用户复看后确认“效果好很多了”。
  程序步态工艺补入 `walk-director/references/procedural-footsteps.md`，skill 提交
  `d483a29`、`939abf6`；本次补齐 skill 入口、复用边界与历史建议修正，并同步内容仓库。

复现（本集目录）：

```powershell
node render.mjs --check --out craft3d_full_r21.mp4 --board storyboard/walk_r21/check --trace storyboard/walk_r21/check/check_trace.json
python tools/check_locomotion.py storyboard/walk_r21/check/check_trace.json
node render.mjs --out craft3d_full_r21.mp4 --board storyboard/walk_r21/check --trace storyboard/walk_r21/check/render_trace.json
python tools/check_fight_trial.py --full --board storyboard/walk_r21/check --video craft3d_full_r21.mp4
python tools/check_locomotion.py storyboard/walk_r21/check/render_trace.json
node render.mjs --range 7.4,13.7 --camera "1.55,1.15,2.6,1.55,.83,-1.3,48" --out walk_r21_detail_after.mp4 --board storyboard/walk_r21/detail_after --trace storyboard/walk_r21/detail_after/trace.json
node render.mjs --range 7.4,13.7 --camera "1.55,1.15,2.6,1.55,.83,-1.3,48" --source storyboard/walk_r21/before/source --out walk_r21_detail_before.mp4 --board storyboard/walk_r21/detail_before
```
