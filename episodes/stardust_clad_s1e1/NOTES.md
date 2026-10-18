# 星屑战壳 S1E1「年检风波」NOTES

viewer 链正片（自包含，不走 dula-render/script.story），75.0s / 1280×720 / 30fps。
角色与场景全部从 dula-assets 晋升包 import（characters/stardust + scenes/stardust），
本集零角色/场景代码——只有谱面、机位、道具、特效、音频链。

## 入口命令（dula-story 根）

```bash
node episodes/stardust_clad_s1e1/render.mjs --check          # 检查帧 + seek 像素容差
node episodes/stardust_clad_s1e1/render.mjs --physics-only   # 数值采样 + 数值 seek（快）
node --import ./episodes/stardust_clad_s1e1/tools/register_loader.mjs episodes/stardust_clad_s1e1/tools/scan_reach.mjs  # 离线可达性（目录任意，路径写全）
.venv/Scripts/python.exe ../dula-skills/direct-animation-craft/scripts/episode_gate.py ./episodes/stardust_clad_s1e1  # 总门禁
node episodes/stardust_clad_s1e1/render.mjs --out craft3d_full.mp4  # 成片（自动 mux assets3d/mixed.wav）
# 音频链（火山凭证：set -a && source .env.speech && set +a）：
.venv/Scripts/python.exe episodes/stardust_clad_s1e1/tools/gen_dialogue.py   # 对白 seed-tts-2.0
.venv/Scripts/python.exe episodes/stardust_clad_s1e1/tools/gen_sfx.py        # SFX/底床/BGM Seed-Audio
.venv/Scripts/python.exe episodes/stardust_clad_s1e1/tools/build_audio.py    # 混音 → mixed.wav + voice_envs.json
.venv/Scripts/python.exe episodes/stardust_clad_s1e1/tools/check_audio_sync.py  # 声画对位（gate 第四步）
```

## 分场大纲（20 段，75.0s，无歌曲拍网——按对白/动作节拍排）

| 段 | 时间 | 内容 |
|---|---|---|
| s0 establish | 0.0–3.2 | 圣殿晨景全景淡入（30% 亮度起，R6 封面帧纪律）+ 标题字卡 |
| s1 morning | 3.2–10.6 | 三人晨练打闹（阿鏊挥盾/大釜深蹲/小凿冷看）；l01+l03 |
| s2a/s2b chase | 10.6–17.6 | **柱廊追逐跑**（监制点名人形跑展示）：阿鏊抢饭团领跑（RUN_GAIT），小凿追，大釜喘跟；l04/l05 |
| s3 notice | 17.6–23.4 | 走回圣殿（walk-in）+ 圣物大锅喷卷轴「年检通告」；l06/l07 |
| s4a/b/c | 23.4–33.0 | 阿箸登场：人形走入 → 转身 → **27.4 战壳生长秀**（2.6s 满甲排面+energy_charge）→ 抱臂出题；l09/l10 |
| s5a/b exam1 | 33.0–40.0 | 阿鏊把锅盖盾当煎锅（打蛋贴盾面+滋滋声）；阿箸「……那是盾。」眼角抽搐 |
| s6a/b exam2 | 40.0–46.6 | 大釜举石过顶（石台深蹲抱举）→ 脱手飞天 → 一屁股坐地（hipY 覆盖+双脚前伸）；阿箸扣分 |
| s7a/b exam3 | 46.6–52.0 | 小凿花窗盘穿孔 6 连（星屑光点掠过盘面）一次过；阿箸首肯 |
| s8a/b/c spar | 52.0–63.0 | mini 切磋：54.4 筷刃点盾（接触 .098m）→ 57.8 侧闪进怀点肩甲（.100m）→ 61.2 双筷夹盘（.038/.046m） |
| s9a/b hotpot | 63.0–69.4 | 大釜掏锅架锅，热气升腾飘香；阿箸嗅香破功（surprised→干咳掩饰）；l17/l18/l19 |
| s10 finale | 69.4–75.0 | 赫斯提亚坐锅沿现身（OP 坐姿链复用）+ 画外音 l20 + 74.3 锅鸣压尾字 + 全员眨眼 + 淡黑 |

## 选声（seed-tts-2.0，catalog 气质初筛，未听审——执行环境无音频输入，戏感待监制耳朵）

| 角色 | 音色 | 理由 |
|---|---|---|
| 阿鏊 | zh_male_kailangdidi_uranus_bigtts | 元气少年（热血） |
| 小凿 | zh_male_gaolengchenwen_uranus_bigtts | 清冷克制（冷面） |
| 大釜 | zh_male_zhubajie_uranus_bigtts | 憨厚诙谐（演绎型） |
| 阿箸 | zh_female_gaolengyujie_uranus_bigtts | 清冷疏离御姐（冷傲精英，破功反差） |
| 赫斯提亚 | zh_female_ganmaodianyin_uranus_bigtts | 沿用 OP（沙哑慵懒） |

QC（qc_lines.py，拼音级）：18 句 = 16 ✅ + 2 ⚠️（l07 80%/l03 85%，均为 Whisper 同音字坑——
「年检俺」→「粘捡暗」拼音同音节；按纪律以拼音内容覆盖为准判合格）。
重生记录：l06「等、等等俺——」两连红（zhubajie 拖腔+象声尾被 Whisper 读歪）→ 换实词
「你们慢点！」✅；l13「看俺的！嘿——呀！！」50% → 「给我起来——！」✅。
**教训：zhubajie 音色读「俺」句尾+拉长象声词必翻车，台词里避免孤立的「俺+拖腔」组合。**
报告：tmp/voice_audition/qc_report.md + qc_retry*.md。

## 音频总线（tools/build_audio.py → assets3d/mixed.wav）

- BGM：bgm_morning.wav（Seed-Audio 74s 单条轻快搞笑番配乐，尾 1.5s 淡出）×0.55。
- 底床：ambience_morning 晨风（**源文件先做 1.5s 折尾无缝环 + 慢 AGC 抬平风息**，见翻车记录）×0.20；hotpot_bubble 64.2s 起 ×0.30。
- SFX 事件 19 摆点（时刻=performance.js T 表/追逐起止）：追逐呼啸、卷轴、生长蓄力、煎蛋滋滋、石头落地、坐地、穿孔 6 连 chime、筷刃 tap×2、夹取 clack、锅落地、收尾锅鸣。
- 对白 18 句 ×1.3，duck −6dB/150ms 平滑；口型包络从最终放置 PCM 派生 → config/voice_envs.json（同一零点铁律）。
- 峰值上限 −2.2dBFS（未触发归一，mix peak 0.697）；AAC 复验见验收节。
- check_audio_sync：19 事件 onset ✓ 底床 75s 无掉线 ✓ 18 对白窗声压 ✓ 峰值 ✓（audio_sync_report.json）。

## 探针契约（config/contact_contract.json，check_contact.py 包装执行）

- seated（4 角色手-躯干域）/ gait（4 角色 bout 速度/重心/步频）/ limb_attach（肩缝+抬臂上限；
  **dafu max_elev_deg=170°=举石过顶动作本体**，其余 118°）/ reach（≤.9+垂挂 35°，
  白名单 5 组过渡/发力窗）/ carry（举石：石心-双手域）/ food（女神坐姿臀-锅沿+晃腿下限）/
  clad_fit 48 条（胸/腰/胫/肩/六叶 × 4 角色；窗口=读卷轴站姿段 19.6-22.8（三人）与
  监考站姿段 30.6-32.9（阿箸））。
- 接触帧：bite[TAP1 刃尖-盾心 54.2-54.7 ≤.18m] + pin[PINCH 盘心落双刃连线 ≤.15m] +
  **contacts_local**（episode 本地段，check_contact.py 扩展：TAP2 刃尖-肩甲 ≤.16m）——
  共享探针 bite/pinch 各只一段，本集三个接触帧，多出的走本地段（沿用 clad_fit 本地化模式）。
- 实测：TAP1 0.098m / TAP2 0.100m / PINCH 双刃各 0.038/0.046m。

## 场景皮肤：晨景重置（ep 侧 morningize，资产夜景定型不动）

- 圣殿：穹顶换晨空 canvas（天顶钴蓝→地平线蜜桃金+地平 alpha 渐出同夜景工艺）、hemi×1.35 转暖、
  directional 全转暖朝阳色、灶火点光包一层 ×0.6（update 每帧重写强度→包装截获）、
  雾转薄雾蓝、地面/石材明度 ×1.5。
- 柱廊：无穹顶——ep 侧补晨空壳球；同法灯光转暖。
- 纹理：ep1 无 assets3d/tex → applyHybrid 静默回退程序化（合规设计内）。
- 追逐跑在柱廊（z≈3 走廊），其余全部圣殿。

## 翻车记录（S1E1）

- **walk.from 与旧拍 root 不同源时禁止边界混合**：追逐段起点（柱廊）与上一拍（圣殿群像位）
  不同位置，0.3s 边界插值把髋部拉离落脚点 → twoBone Unreachable 当场抛错。修法：
  walk/turn 拍跳过边界数值混合（含上一拍有 walk 的情况）。（已写回 direct-animation-craft）
- **setCladState 必须先于 setPose**：fitMetrics 在 setPose 里读甲件锚点世界坐标，旧顺序
  （先摆姿势后长甲）让探针读到上一帧生长 scale——seek 逆序求值（先大后小）与顺序渲染
  在生长段读数撕裂（数值 seek 抓获，图像容差盖不住锚点漂移）。（已写回）
- **大釜臂短搬重物要先算工作空间**：.45 臂长够不到地面石头（直立肩点 1.58 - 臂长 .45
  下限 1.13 > 石顶 .93）。修法：垫 .8m 石台 + 深蹲 bob 把肩点降下来（肩点-手目标 ≤.85 臂长）。
  与「先量臂长再摆目标点」同族。
- **道具状态必须每帧全字段驱动**：青石只在抛物线段写 rotation，落地后 rotation 驻留
  (5,3,2)——seek 直接跳 29.9 时石头带着未来的旋转出现（图像 seek 抓获，数值 seek 抓不住
  道具视觉态——stonePos 只记位置）。修法：每个分支 position/rotation 都写全。
- **晨风底床比篝火稀疏**：20s 源自身有风息低谷（1s 块 RMS 掉到均值 42%），铺排叠化/半周期
  双层都治不好接缝 dip——源内折尾无缝环 + 慢 AGC（增益域 0.8-2.2、1s 平滑防泵浦）才过
  底床连续性。AGC 平滑别用 np.convolve 全核（O(n·sr) 直接挂起），用 uniform_filter1d。
- **机位走廊纪律**：监考角色站住不动也会挡动作主体——阿箸站 (1.5,3.0) 恰好在大釜举石
  机位轴线上。考核段给监考写「让位走位」（exam2 移到中后方），别只调相机。
- **zhubajie 音色拖腔**：见选声节。
- seek/接触/步态数值门禁全绿不等于观感：中间帧目检见 storyboard/p1_check/（75 帧）与
  storyboard/gate/shots/（22 镜逐拍近景组）。

## 验证证据

- `storyboard/gate/gate_report.json`：ALL GREEN（render_check 75 帧 + seek 75/75 +
  contact_probe + audio_sync + review_shots 22 镜）。
- 离线：scan_reach all reachable（WARN 15 条=2-3 帧边界过渡，白名单口径内）。
- 成片 `output/craft3d_full.mp4`（75.0s h264+aac，混音 assets3d/mixed.wav 自动 mux）。

## R11（必杀技接入：切磋段三接触帧升级 + 阿鏊考核段喊招）

- 资产库 `dula-assets/characters/stardust/moves.js` 共享（八技定义+VFX 构建器+技名卡）。
- 用上三技：阿鏊「圆盾·星莲华」（32.8 喊招末字压 35.0 蛋落盾面，莲华绽开给煎蛋 gag 排面）、
  阿箸「流星·双箸乱穿」（52.6 喊招压 54.4 刃点盾，残影刺线弹幕）、阿箸「合箸·夹星断」
  （59.6 喊招压 61.2 夹盘，夹点白闪+星屑崩散）。
- 喊招走既有对白管线（dialogue.json 加 c1/c2/c3 三行 → 口型包络/分色字幕/duck 自动接入，
  既有 18 句窗口与声画对位未动；22 事件总线新增 3 支必杀 SFX 摆点）。
- QC：c1/c2 拼音 100% ✅；c3 80% ⚠️（「合箸夹星断」全句同音字「合住夹心段」，判合格）。
- 晨景亮场加色光效强度按首帧目检调（弹幕/崩散 opacity 比夜景抬一档）。
- 证据帧：storyboard/r11_check/（shot_29/30 莲华+煎蛋、shot_53 乱穿+刃点盾、shot_60/61 夹星断+夹盘）。
- 混音 normalized 触发（喊招顶格归一），AAC 复验 0.776 ≤0.8；gate ALL GREEN。

## R12（配音升级：全员声线重铸到《9章》水准——数值全绿，戏感等监制耳朵终裁）

### 《9章》配音工艺卡（调研 bio_armor_academy_s1e1/s1e3 实录压缩）

| 层 | 做法 | 证据 |
|---|---|---|
| 选声 | seed-tts-2.0；主角可上 ICL 复刻克隆音色（雷晓=chanruoshaoye、轰刚=rexueshaonian、白岚=gaolengchenwen）；禁播音腔（解说/叙事音色不进正片） | s1e1 config/voice_config.json + volc-voice-casting SKILL |
| 演绎 | 逐情绪 rate/volume 变体表（default/nervous/scared/shout/pained…）+ 带标点 tts_text；战损/嘶吼超 TTS 上限 → Seed-Audio 演绎（prompt 公式：角色状态→嗓音物理→念法→台词原文）+ 参考音频锁音色（@音频N，谱质心 <15%）→ 满意后复刻固化 | volc-voice-casting「表演化台词」节 |
| 后期 | 对白峰一化 .55 → 混音 voice_gain；BGM −24dB rel voice + duck −8dB | s1e3 remix_audio.py |
| 口型 | DTW 逐字对齐回写 timeline；viewer 链=能量包络轨（同一零点） | s1e3 build_audio.py |
| QC | qc_lines.py 拼音重合率 ≥85%/时长在窗/峰值 .15-.99；同音字坑按拼音判 | qc_report.md 系列 |

### 五角色声线定案（R12 重铸）

| 角色 | R11 声线 | R12 声线 | 定案理由 |
|---|---|---|---|
| 阿鏊 | 开朗弟弟 | **ICL_uranus_zh_male_rexueshaonian_tob**（热血少年，轰刚同款克隆音色） | 热血+锋芒，9章实战验证 |
| 小凿 | 高冷沉稳 | 高冷沉稳（不动） | 白岚同款冷面，已在 9章水准线上 |
| 大釜 | 猪八戒 | **zh_male_dongfanghaoran_uranus_bigtts**（雄浑正气） | 豪壮大将感、去蠢腔 |
| 阿箸 | 高冷御姐 | **ICL_uranus_zh_female_aomanjiaosheng_tob**（傲慢娇声） | 冥府贵族腔（冷傲+傲气压迫） |
| 赫斯提亚 | 感冒电音 | 感冒电音（不动） | 慵懒基底已有，威压靠台词与威仪姿态 |

### 逐句演绎（seed-tts 原生 speech_rate + context 演绎指令，标点保留）

- 喊招档（重中之重）：rate +10~15 + context「全力呐喊出招名，高声压炸场」（OP 四招 +
  S1E1 c1/c2/c3）；阿箸喊招用「冷冽宣告终结技，压迫感」变体。
- 阿鏊常态：rate +5「少年热血有锋芒」；大釜常态：rate 0「豪壮不蠢」、慌张句 rate −5；
  小凿全程 rate −5「平直克制」；阿箸常态 rate −5「从容威压」、破功句「小声自我说服」。
- 逐句响度统一：混音前逐句峰一化 .5（9章工艺），再进 voice_gain/喊招顶格。

### 摆点重推（新声线时长全变）

- OP 喊招末字压帧（裁切实测回推）：沸泉 14.82→16.58 压 16.625 / 莲华 15.02→16.58 /
  锅鸣 17.66→19.78 压 19.83 / 陨星 21.03→22.98 压 23.034。
- S1E1 对白窗重排：l06→18.2、l07→20.3、l09→25.2、l10→31.5、c2→33.4（压 35.0 蛋落）、
  c3→59.1（压 61.2 夹盘）；唯二有意交叠：c2 莲华喊招压着 l10 尾句（少年漫同喊）、
  l07 尾音擦 l09 入场词起点。全部对白末字不超窗、声画对位 22 事件重验绿。

### QC 证据（数值全绿；无音频输入环境，戏感未听审，等监制耳朵终裁）

- S1E1 全量 21 句：18✅/3⚠️/0❌（⚠️=同音字坑既有判例：l03 先烈嘴/l07 粘捡俺/c3 夹心段），
  报告 `tmp/voice_audition/qc_r12.md`。
- OP 喊招 4 条：3✅/1⚠️（同音字），报告 `tmp/voice_audition/qc_calls_r12.md`。
- 混音 AAC 解码峰值两集 ≤0.8（见验收节）；口型包络从最终 PCM 重派生（同一零点）。

## R13（剧情级重写：防务评估战——搞笑是壳，里子是垫底者尊严之战）

监制否决旧版「剧情太敷衍」后的同目录重写：资产/技术链保留，故事与表演编排推翻。
大纲单源=`storyboard.md`（候选 A/B 对比、对抗式批评 pass、逐拍强度曲线、对白语义版）；
系列级设定入册=`docs/stardust_series_bible.md`（伏笔登记 F01 圣火逐年变弱/F02 上面撤防，
信息不对称台账：观众列领先）。

### 故事骨架（120.0s / 22 段 / 4 场景）

晨巡（柱廊，值夜的日常尊严）→ 防务令+审查官阿箸入场（真赌注：不合格者战壳收回）→
角斗场考核三连（c1 无脑冲被点盾 51.5 / c2 读秒犹豫被点肩 63.5 / c3 全力挥空被绕背点背 74.0，
每招败因=人物缺陷）→ 谷底（圣火将熄空镜 78-81.5 + E1 阿鏊眼部特写 81.5-88）→
合体反扑（缺陷认领为战术：大釜抛 92.5 / 小凿标点 / c4 锅鸣一击被架开 96.5 /
c5 乱穿被盾阵+星网接住 99.5——必杀技是"挣到"的：输了三次才换来的配合）→
收刃评语（E2 阿箸眼部特写 101.2，「你们让"厨具"两个字，重新有了分量」）→
赫斯提亚画外音「火不怕小。怕的是，没人添柴。」→ F02 门阙报告独处（观众见角色不知）→
E3 看火收尾（118.0）。

### 执行工艺与翻车

- **接触帧反解**：c1-c5 不是调阈值过关，是按探针实测锚点反解站位/手位（阿箸 c1 进刃程
  落点 [.75,2.55]→[.62,2.5]+手伸 z .26→.30；c2 逼近终点 [-1.15]→[-2.18,2.21]；
  c3 改"滑步让挥空→绕背"两段走位；c4 阿鏊抛物线终点 .9→.27 停在拦截线+大釜抛后后撤
  让弹道；c5 阿箸压弹幕步步进逼 1.26→.45 贴脸被接）。实测 min：c1 .030 / c2 .070 /
  c3 .047 / c4 .106 / c5 .044m。
- **gait 探针三连翻车**：①后写的条件块（承弹微震/踉跄）在走拍进行中踩掉 rootX——
  守卫 `w>=1`/`st>0`；②段边界根位必须接续上一段终点（notice 起点=巡逻回巡终点），
  跨场景跳切前收步 `if(a<1)` 让 bout 干净闭合；③ease 峰值≈均值×1.5——走位窗口按
  peak<speed_max 校（大釜退场 1.4s→1.7s）。
- **seek 像素漂移根治（双渲染沉淀）**：大姿态跳变（不可见→入场/场景切换）后首帧渲染
  有 GPU 侧资源滞后（实测 152px 边缘条带，~1px 位移），同状态第二遍渲染逐位稳定。
  renderAt 改为渲染两遍取第二遍；顺序/seek 两路都取沉淀帧后 --check 85 帧 seek 全等。
  （定位链：数值指纹全同+像素不同→连续两渲染对比→最小触发矩阵，工具法存
  commit 历史，debug 脚本用完即删。）
- **表演连续性**：azu_walk/azu_declare 段三人曾被误设 visible=false（凭空消失违纪律）——
  改为静立转身目送（排面=他们不动她走）。
- **晨景重置参数化**：morningize 扩 stone/fog/floor/hemi/dir/pointDim/additiveDim 七参；
  角斗场夜用资产（加色沙痕层+火炬点光环+强补光）直接晨化会吹白全场，压功率留戏剧感。
- **对白窗重排（TTS 实测时长全表反推）**：10 句超窗 → 先声夺人（l04 宣判 24.5 起压着
  入场走）+ 三处变速档（rate +10~25）+ 后段扩容（verdict/outro/F02 段 103.5→120.0，
  片长 115→120s 仍在制片 90-120s 限内）。喊招压帧保留：c1 95.8 压 c4 96.5 前、
  c2 97.7 尾音被 c5 99.5 接住帧切断。
- **音频链**：22 句全重录（声线=R12 定案）+ 新 SFX 四支（pot_shock/star_net/shield_block/
  bgm_trial 考核战鼓点 44-112s 双段 BGM）；删火锅 gag 全套（HOTPOT_BED/煎蛋/石头/穿孔）。

### 验收证据（数值全绿；无音频输入环境，戏感等监制耳朵终裁）

- QC（qc_lines.py 拼音级）：**22/22 全 ✅**，报告 `tmp/voice_audition/qc_r13_report.md`。
- 混音对位：13 事件/底床 120s/22 句，AAC 留量 peak 0.7762 ≤0.8（`assets3d/audio_sync_report.json`）。
- 探针：contact/gait/reach/clad_fit 全绿（`storyboard/r13_phys/contact_validation.json`）。
- gate ALL GREEN：render_check + seek_determinism（85 帧）+ contact_probe + audio_sync +
  review_shots（`storyboard/gate/gate_report.json`）。
- 逐拍审片 32 镜：`storyboard/r1/shots/`（三处眼部特写 E1 85.5/E2 101.3/E3 118.4 重点复核）。
- 成片：`output/craft3d_full.mp4`（120.0s h264+aac）。
