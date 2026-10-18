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
