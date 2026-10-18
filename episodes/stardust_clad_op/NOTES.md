# 星屑战壳 OP（stardust_clad_op）NOTES

原创平行宇宙铠甲搞笑番 OP。49.2s / 152BPM / 1280×720 / 30fps，自包含 viewer 链。

## 入口命令（dula-story 根）

```bash
node tools/build_timeline.mjs                # 在 episodes/stardust_clad_op 下：beatgrid 吸附重建 timeline.json（断言边界偏差 <20ms）
node episodes/stardust_clad_op/render.mjs --check          # 检查帧 + seek 像素容差校验
node episodes/stardust_clad_op/render.mjs --out craft3d_full.mp4  # 全片（自动 mux assets3d/mixed.wav）
.venv/Scripts/python.exe episodes/stardust_clad_op/tools/build_audio.py   # 混音总线 → assets3d/mixed.wav
.venv/Scripts/python.exe ../dula-skills/direct-animation-craft/scripts/episode_gate.py ./episodes/stardust_clad_op  # 总门禁
node --import ./tools/register_loader.mjs tools/scan_reach.mjs   # 离线 twoBone 可达性扫描（120Hz 全时间轴）
```

## 歌曲溯源

- `assets/audio/music/suno/op_song_suno.wav`：49.200s、152.0BPM、48kHz 双声道，溯源 `op_song_suno.source.json`（定版，勿动）。
- `config/beatgrid.json`：beats[122] / downbeats[31] / whisper_lines（主歌一 0-14s、主歌二 14-30.4s、尾段 30.4-44.2s、器乐尾 44.2-49.2s）。

## 谱面结构（21 段，边界全部吸附 beats[]）

| 段 | 时间 | 内容 |
|---|---|---|
| intro | 0.07–3.32 | 黑场淡入 establish 全景 + 标题字卡；2.113（第 2 downbeat）镜头缓推 |
| verse1 | 3.32–14.211 | 阿鏊→小凿→大釜依次登场：走入+换脚转身+setCladState 生长（起点压 downbeat 5.317/8.568/13.305，配 energy_charge）；小凿特写对漏勺打孔阵护腕 |
| verse1' | 14.211–30.256 | 阿鏊 vs 大釜切磋蒙太奇（小凿场边冷看）：15.023 冲刺 → **16.625 锅盖盾格挡** → 18.4 小凿反应 → **19.83 拳甲相撞** → 21.432 追击 → **23.034 反震击飞落地**（裂缝+碎石常驻）→ 24 大釜憨笑 → 走位归位。接触帧全压 downbeat |
| verse2 | 30.256–44.234 | 低机位仰拍三人冲锋（31.045 冲出）→ 颠勺合体 gag：大釜把阿鏊连人带盾抛起、小凿漏勺护腕接星屑光点，**33.855 唱句入点拍全员定格**（FREEZE=34.35 起漫画静帧+微浮/接缝行波保活） |
| outro | 44.234–49.2 | 定格+标题再现小卡 → **45.0 赫斯提亚画外音**「打完记得把锅刷了。」→ **47.02 锅盖「当——」**（三人齐眨眼+锅上冲击环）→ 48.228 起淡黑 |

## 混音（tools/build_audio.py → assets3d/mixed.wav + mix_report.json）

- 歌曲为底；SFX 事件总线 12 个摆点（时刻=performance.js `T` 表）；台词 45.0s 摆点、歌曲 duck −8dB（150ms 余弦平滑）、台词增益 ×1.4（QC 峰值 0.25 偏低补偿）。
- 收尾「当——」：`block_impact` 低通 1200Hz（金属高频压住读作锅盖；`impact_thud` 太闷像落地，已在 23.034 用它垫底）。
- 峰值上限 −1.8dBFS（超限整体归一，本轮触发：peak 0.8128）；AAC 解码复验峰值 0.7751 无削波。
- 赫斯提亚音色：`zh_female_ganmaodianyin_uranus_bigtts`（沙哑慵懒御姐，演绎型缺慵懒档的折中；speech_rate 15 + 首尾静默裁切），QC 拼音重合率 100% ✅（`tmp/voice_audition/qc_final.md`；戏感待监制耳朵终裁）。

## 验证证据

- `storyboard/gate/gate_report.json`：render_check / seek_determinism(72) / contact_probe / review_shots 全 PASS。
- 接触探针：格挡拳-盾 min 0.156m；对拳锚点 0.064~0.093m；手-躯干 XZ 全程 0.13~0.58m（域 .08~.78）。
- 步态：三角色 bout 速度/重心起伏/步频全过（最大 3.49m/s）。
- 成片 `output/craft3d_full.mp4`：49.200s、h264 1280×720@30 + aac 48kHz 双声道。
- 抽帧复查：`storyboard/final_check/`（18 镜：接触帧/定格/画外音/淡黑全覆盘）。

## 翻车记录

- **大釜 hipIdle 过伸**：.99 髋高 + 腿长 .92，gag 颠勺挺身 bob +.04 时腿距 .93>twoBone 上限当场抛错。教训：DIMS 髋高必须 ≤ legA+legB+footY−.06（正 bob 余量）。现有 `tools/scan_reach.mjs` 离线 120Hz 扫全时间轴（Node loader 映射浏览器 import map——dula-assets exports 只开 '.'，裸子路径 Node 不解析）。
- **格挡接触差 0.42m**（bite 探针抓获）：拳头停在盾前空气。修法不是挪阈值——大釜上步压进拳程（1.05→.78）+ 阿鏊迎盾小上步 + 盾面前移到腕侧（z .10→.15），最终 0.156m。
- **小凿侧面特写方向算反**：打孔阵盘在左前臂外侧（局部 −x），角色 yaw +0.8 时盘面背向机位。改正面机位+前臂横抬胸前（前臂轴→+x 时盘面法线翻向 +z 镜头）。
- **seed-tts speech_rate 与时长非单调**：rate 12→2.02s、rate 15→2.14s；别靠 rate 卡窗，首尾静默裁切（-45dB）后直接 QC 实际时长。
- viewer.js 火焰 sprite 渐变把 `gr.addColorStop` 误写 `g.addColorStop`（页面静默卡 ready 超时——puppeteer 超时先查 pageerror）。

## R-hybrid（P3.5 混合质感升级：文生图皮肤 × 程序化 3D）

几何/动画/绑定/光影/谱面零改动，只换皮肤；纹理缺失静默回退程序化（404 路径 P1 已验证）。

### 资产清单（assets3d/tex/，逐文件 source.json 溯源 sha256）

| 文件 | 尺寸 | prompt 要点 | 用途 |
|---|---|---|---|
| floor.png (+_normal) | 1024² | 暗夜神庙石板正俯视、均匀散射光、四方连续 | 地面圆盘+远景盘（世界顶视投影 UV ×.13，法线强度 2.0） |
| stone.png (+_normal) | 1024² | 风化石砖正视、均匀光 | 祭坛石基/石灶/12 石龛柱楣背板食台（圆柱件 clone repeat 6×1，箱件 1:1，法线 1.6） |
| backdrop.png | 2048×768 | 深夜蓝星空+炊烟状星云带横贯+远处圣殿剪影、地平线下 1/3、无日无月无文字 | ContinuousBackdrop 连续天空（圆柱 r60 h30 repeat 2 offset .5，zenith #131a30） |

- 生成：`tools/gen_textures.py`（Seedream 5.0 Pro，.env.ark；b64 截断重试 3 次已带；skip-if-exists）；法线：`tools/derive_maps.py`（亮度 Sobel、wrap padding、NoColorSpace 加载）。
- 背景板原图过暗：canvas `brightness(1.55)` 预处理（皮肤侧，不动灯光）；`scene.background`=采样背景板实际像素行的竖直渐变兜底；雾 Fog(26,85) 糊地面尽头接缝。
- canvas 星野穹顶保留作高层细节：星云带移交背景板，穹顶只留三层星+近地平线 alpha 渐出（destination-out 径向带），色阶衔接 #1a2440。
- 星座刻纹/暖晕改为独立加色覆盖层（floorOverlayTexture），程序化/hybrid 两模式共用，AI 石板不吞刻纹。
- `ContinuousBackdrop.js` 晋升 `dula-assets/lib/craft3d/continuous-backdrop.js`（含 fract UV 接缝 textureGrad 周期解缠），README 导出表已更新；s1e2 原文件未动。

### 验证证据

- 多机位探针：`storyboard/hybrid_sky/cam1..4`（低仰角/仰拍天顶/侧向/反向，各 6s×30fps 无 pageerror；侧向无竖直亮缝、天顶无板缘）。
- `--check` 72 帧全绿；seek 72/72（max bad=1 像素，容差内——新纹理高频细节下 JPEG 块噪声）。
- gate 重跑 ALL GREEN（contact_probe 不受皮肤改动影响）。
- 成片重渲 `output/craft3d_full.mp4`：49.200s h264+aac（音轨 assets3d/mixed.wav 重 mux）。
- 改前改后对比：`storyboard/final_check/`（改前） vs `storyboard/hybrid_check/`（改后），同镜表同名文件。

### 翻车记录（R-hybrid）

- **AI 地板纹理直接换 map 吞掉星座刻纹**：刻纹/暖晕必须从地面基色拆成独立 overlay 层，否则 hybrid 一换皮就丢设定件。
- **深夜背景板原图太暗**：prompt 钉了"无日无月"后整幅明度贴地——canvas brightness 预处理比在场景里加灯合规（光影归灯光纪律只约束场景侧，贴图明度是皮肤参数）。
- **祭坛圆柱侧壁整图一圈拉成巨砖**：同一纹理不同件要 clone 后按周长设 repeat（圆柱 6×1、箱件 1:1）；clone 后 wrap 模式不继承需重设 MirroredRepeat。

## R2（监制整改轮：音效全换 Seed-Audio / 战壳华丽化 / 多场景跳切）

### 整改 1：音效（assets3d/sfx/，逐支 .source.json 溯源，provider=volcano-seedaudio）

- `tools/gen_sfx.py` 批量生成（ThreadPool 2 并发，skip-if-exists 校验 prompt+sha256 一致性）；旧程序合成件留档 `assets/audio/sfx/` 不再进混音。
- 清单：energy_charge（铠甲能量蓄力上行）/block_impact（金属盾格挡“铛”）/punch_heavy（双拳甲对撞）/dash_whoosh（冲刺呼啸）/whoosh_fast（快速挥动）/body_drop（甲士落地+甲片散落）/impact_thud（低频垫底）/energy_blast（星尘能量爆发）/pot_clang（锅鸣“当——”专用件，淘汰 P3 的 block_impact 低通方案）/ambience_night（20s 夜风+火星噼啪底床，节律三道验收直过：RMS max/mean 1.256、自相关 0.055、4-8kHz 占比 0.009）。
- `build_audio.py`：摆点零点不变；底床 20s 循环 1s 交叉淡化无缝铺满全场（`build_bed()` 抽出与 `check_audio_sync.py` 共用同一实现，防两套点位漂移）；mix_report.json 逐文件 provider+sha256。
- `tools/check_audio_sync.py`（gate 第四步自动捡起）：12 事件 onset 对位 ✓、底床 1s 块无掉线 ✓、峰值 ✓。
- **AAC 过冲**：wav 峰值卡 −1.8dBFS 时 AAC 解码过冲 1.3%（0.8234）——混音上限改 −2.2dBFS 后成片 0.773 达标（beatcut 教训的复现：必须解码最终 AAC 验峰值）。

### 整改 2：战壳华丽化（characters.js 重写甲件层，骨架/生长/接缝/探针锚点不动）

- 全覆盖件：额饰弧冠（露脸）→ 雕花胸甲（弧板+宝石核+锅沿浮雕纹圈+凸线）→ 翼状肩甲逐层（大釜 3 层）→ 臂铠（肘甲盖+前臂整板）→ 髋部 5 叶裙甲（铰链组向下生长）→ 膝甲+胫甲 rig。
- 生长序：额饰→胸甲→肩甲逐层→臂铠（含盾）→裙甲→腿甲，`clamp(t*7-ord*.8)`；压拍时刻不变。
- 配色分级：阿鏊 鎏金橙铜+青绿核 / 小凿 亮银+银蓝核（甲片带微弱冷色自发光固色，防灶火染暖）/ 大釜 铁灰鎏金+琥珀核；哑光黑作战服打底；主甲片 Phong 高光+勾边 mat()+接缝行波+宝石核脉动。
- 厨具元素降级为纹饰：胸甲核周锅沿浮雕圈、肩甲翼片凸线棱、漏勺打孔阵保留成银花窗盘（亮银盘+孔阵+银丝框）、锅盖盾保留（格挡语义+探针锚 shieldDome/bracerDiscL 不动）。
- 肖像自查：`config/portrait_shots.json`（3 人 × 正/3⁄4/侧/背，定格时点 38.5s）→ `storyboard/r2_check/portraits/`。

### 整改 3：多场景跳切（23 段，边界仍全吸附 beats[]）

- 新增 `scenes/StarfallColonnadeScene.js`（星屑柱廊旷野：11 断柱阵+碎石+流星 sprite+冷色月主光；地面 colonnade_ground.png+法线）与 `scenes/EmberCalderaScene.js`（云上灶膛火山口：环形岩壁+岩浆槽道+岩浆潭+上升火星+云海光带；caldera_ground.png+法线）；均 SceneBase 规范、applyHybrid 静默回退、update 纯 t。
- 背景板复用圣殿 backdrop.png：柱廊 brightness(1.45)+offset .05；火山口 sepia(.55) 暖化+offset 1.05；zenith 各自色阶。
- viewer.js：三场景同存按段 `scene` 字段硬切（Object3D 单父级 reparent，无渐隐穿帮）；角色世界坐标全局连续（MV 跳切语法：同一打斗链跨场景交替机位，接触帧物理链在圣殿）。
- verse1 三人各自场景（圣殿/柱廊/火山口，建立帧推近+特写）；打斗段 f4 柱廊（小凿冷看）/f6+f8 火山口（大釜踉跄/憨笑）；verse2 冲锋拆三镜（30.256/31.045/31.835 各场景一镜）→ 回圣殿 gag。
- render.mjs 无单场景假设（场景对象全在 viewer 侧），未改 scaffold。

### 翻车记录（R2）

- **gag 定格位置回跳**：chargeSpec 只在 v2charge 段设根位置，gag/定格回落到 SPOTS——角色在段边界瞬移回群像位（肖像帧 1m 怼脸穿帮才暴露）。修法：gag/定格/outro 停在冲锋落点；阿鏊落点收进大釜臂程（颠勺够得着）。
- **翼状肩甲水平叠片读成飞碟**：层片要绕侧轴外缘下垂（rotation.z 级联 .18+.14/层），勾边环同步倾转。
- **夜景暖光把银甲染成铜**：冷色甲片（小凿亮银/大釜铁灰）主甲片带微弱自发光固色（priGlow/secGlow，独立 Phong 实例不碰共享缓存）。
- **底床掉线检查别量混音**：歌曲尾奏能量回落会被误判 dropout——底床连续性要单独重建底床轨验证（build_bed 单源共用）。
- Edit 链式改同一文件函数时把函数头挤进上一行（mangled line 56）——大块重构用整文件 Write 后通读一遍再跑。

## R2.5（监制整改：出拳肩臂分离 / 脸谱差异化 / 女神登场 / 肖像隔离 / 新场景亮度）

### ① 出拳肩臂分离
- 谱面目标点全量收进 ≤.85 臂长（IDLE/HERO/格挡/对拳/踉跄/大笑/蓄力/冲锋/gag/冷看 全部重算）；接触距离预算靠上步压拳程（格挡大釜上步到 .62、对拳到 .70）不靠拉直手臂。
- 挥臂叠加纪律：出拳拍 `s.noSwing=1` 关掉跑步 armSwing 叠加（挥臂+直拳目标叠加会把腕点顶到 maxR 钳位——reach 探针抓到 .99）。
- 三角肌盖（肩窝桥接件，S1E3 P13 方案）：boyBase 每侧椭球盖随肩点-肘根方向走，垂臂内嵌躯干缘，盖肩关节断面。
- 探针：contract 新增 `reach`（ratio>.9 且前臂非垂挂>35°=超伸；大釜 pole 外撒常态 ~26° 故阈 35°；发力帧白名单 4 窗）+ `limb_attach`（肩点-躯干轴距上限=肩宽+2~4cm，抬臂 ≤118° 覆盖英雄姿势）。gate 实测：reach 零超限（白名单外）、抬臂 max 76°、肩轴零漂移。
- `tools/scan_reach.mjs` 扩成离线 120Hz 超伸扫描（不用等渲染）。

### ② 脸谱差异化（animatedHead setStyle/acting 逐角色参数包 + episode 侧发型加件，不动资产）
- 阿鏊：大眼（eyeWidth/Height 加宽）+暖肤（SKIN.lei 运行时注入暖调）+冲天翘发锥簇+两根呆毛管。
- 小凿：细眼压低（eyeHeight .62）+眼距收窄 80+薄唇 mouthWidth .8+冷白皮（SKIN.aoi 注入）+斜刘海遮左半眉（球段楔片）+左眼下泪痣贴片。
- 大釜：眯缝笑眼（eyeHeight .5+acting smile .35）+眼距 98+hong 方脸圆寸+颈甲环（gorget 遮颈加粗）。
- 并排帧 `r25_check/main/25_faces_lineup.jpg` + 特写 `portraits/face_*.jpg` 复查成立。
- 教训：**SKIN 调色板是逐角色配置表**，运行时注入（模块 import 后、角色构建前改写）即可一集多肤色，不用改资产文件；注意同 kind 复用者会共享（本集 lei=阿鏊+女神共用暖肤，有意为之）。

### ③ 女神赫斯提亚（characters.js HestiaCraft）
- 白金长袍（ringsGeometry 裙身+坐姿前片垂布）+金边窄围裙+腰带结、金色大波浪（整壳盖原发+六缕正弦波浪管）、半垂眼睑慵懒脸（eyeHeight .55+lashes）、灶台火焰光环头冠（头顶悬浮火环 sprite 纯 t 闪烁）、金色长柄锅铲权杖（右手位姿×固定偏移，fist .55 握持）。
- outro 改造：24 段谱面——44.234 摇镜揭晓（out_reveal 缓推上锅）→ 45.047 近景台词（out_goddess，口型=build_audio.py 从 hestia_line.wav 派生的能量包络轨 config/hestia_voice_env.json，jaw≤.85 慵懒幅度）→ 46.35 懒洋洋挥手 → 47.02 锅鸣惊瞬眨眼 → 淡黑。
- 探针（复用现有 kind 不换探针）：food 段点线域=臀-锅沿前点 ≤.18m（实测 .043）+晃腿下限 ≥2.9m（实测 3.72）；carry 段=杖-手 ≤.12m（实测 .099）；seated 段纳管其手-躯干域（hestiaRoot 只在可见窗发射，隐藏帧不误判）。
- 翻车：女神臂长 .33 比少年还短，初版持杖/搭沿目标点直接超 twoBone 上限（Unreachable 0.40>0.33）——新角色先量臂长再摆目标点；围裙第一版太宽读成黄盒子（收窄到袍身前襟内）。

### ④ 肖像帧隔离
- render.mjs --shots 支持 per-shot `solo` 字段（window.setSolo 隐藏其他角色）；`config/portrait_shots.json` 15 张（12 角度+3 脸特写）全部无乱入。

### ⑤ 新场景亮度
- 柱廊：冷月主光 1.35+正面冷补光+断柱贴 stone 纹理（clone repeat 2×2）+柱顶冷光勾边环+流星周期加密（9+2.3i→5+1.2i）；establish 帧碎石地面/柱身纹理/星云带全可读。
- 火山口：岩浆点光 58+暖 fill .7（人物站岩浆槽边剪影成立）。
- 教训：新场景灯光强度要按首帧目检调（夜景 hemi .55 不够）；directional 光位决定柱面哪侧可读，正面补光必须有。

## R3（监制整改轮：场景丰富化——三场景"无纯色裸件"）

几何/动画/谱面/灯光方向零改动原则延续，只加密度与皮肤；新纹理缺失仍静默回退程序化。
材质分组贴皮器 `skin()`（每场景 applyHybrid 内）：逐件 clone 纹理 + `userData.texR`
逐件 repeat 提示 + 压灰防过曝 + 法线共用 UV/镜像（NoColorSpace）。

### 新纹理/背景板（assets3d/tex/，逐文件 source.json 溯源 sha256；Seedream 5.0 Pro）

| 文件 | 尺寸 | prompt 要点 | 用途 |
|---|---|---|---|
| altar_relief (+_n) | 1024² | 祭坛石材浅浮雕环形灶火图腾+几何回纹、均匀散射光、四方连续 | 祭坛三层石基/石灶/火盆铜盆（repeat 按周长 6/5/4/3/2×1，法线 1.8） |
| niche_wall (+_n) | 1024² | 石龛内壁风化灰石+浅雕竖向凹槽 | 12 石龛背板（法线 1.6） |
| fabric (+_n) | 1024² | 深靛蓝织纹布料+暗金织边回纹 | 龛间帷幔/旗帜（法线 1.2） |
| cast_iron (+_n) | 1024² | 铸铁锻打斑痕暗哑金属 | 圣物大锅锅体/锅沿/锅耳/三足+火盆沿（法线 1.4） |
| colonnade_stone (+_n) | 1024² | 冷灰蓝风化大理石横向环状柱身凹槽 | 柱廊全部断柱/残冠/柱头板/横卧柱段（2×2，法线 1.6） |
| break_face (+_n) | 1024² | 石柱断口放射状碎裂截面 | 矮柱顶面/横卧柱两端/柱脚碎石（法线 2.0） |
| rubble_ground (+_n) | 1024² | 废墟荒原碎石砂砾混杂 | 乱石堆+远景盘（世界顶视投影 .11 同地面比例尺，法线 2.2） |
| basalt_wall (+_n) | 1024² | 玄武岩六边形柱状节理岩壁 | 火山口岩壁近/中/远三层（3×2/3×2/2×2 逐层压暗，法线 2.0） |
| scorched_ground (+_n) | 1024² | 炭黑焦土灰烬+暗红矿物点（无发光） | 火山口远景盘（法线 2.2） |
| magma (+_n) | 1024² | 黑底亮橙红炽热裂纹网络 | 岩浆潭 map+emissiveMap（update 脉动 emissiveIntensity 1.15±.45，法线 1.8） |
| backdrop_colonnade | 2048×768 | 寒夜废墟旷野+残柱剪影地平线+星云带+流星痕、地平线下 1/3、无日无月 | 柱廊专属背景板（brightness 1.4，offset .5，zenith #0d1430） |
| backdrop_caldera | 2048×768 | 火山群剪影+烟云被火山红光染橙、地平线下 1/3 | 火山口专属背景板（brightness 1.25，offset .5，zenith #2a140c） |

柱廊/火山口不再复用圣殿星空板；scene.background 采样各自背景板实际像素渐变兜底（同圣殿工艺）。

### 几何/道具密度（全程序化、update 纯 t）

- 圣殿：11 段环廊楣梁连起石龛（缺口方向不封）；龛间帷幔 6 幅+旗帜 10 面（顶边钉住顶点摆动，权重=(h/2−y)/h）；祭坛火盆圈 6 座（石座+浮雕铜盆+火舌 sprite+余烬盘）；地面星屑碎石 26 件。
- 柱廊：高柱柱头残件板（错位微倾）、矮柱断口截面贴面；倒塌横卧柱段 5 根（半埋错落，两端 Circle 断面沿柱轴 lookAt）；乱石堆 12 座（压扁球体贴碎石纹）；远处废墟剪影带 18 件（r38-56 土丘+断柱残桩，贴同族纹理压剪影色，不悬浮色块）。
- 火山口：岩壁近 18/中 12/远 9 三层（锥台远景在背景筒 r60 内）；岩浆潭换 Toon+magma map/emissiveMap 脉动；火星 42→96 + 潭口集群 24。

### 灯光重调（夜景偏暗吞纹理）

- 圣殿：hemi .55→.78、灶火点光 42→46、暖补 .85→1.05。
- 柱廊：hemi .85→1.12、月光 1.35→1.5、正面冷补 .62→.72。
- 火山口：岩浆主光 58→72（update 同步）+距离 52→56、hemi .7→1.05、暖 fill .7→1.2、近壁色 #9a8578→#ab9484。

### 验证证据

- `node episodes/stardust_clad_op/render.mjs --check --board storyboard/r3_check --trace storyboard/r3_check/trace.json`：81 帧全绿；seek 81/81 像素容差通过（max bad=1）。
- 目检帧 `storyboard/r3_check/`：`shrine_establish/shrine_altar_brazier/shrine_niche_drape/colonnade_establish/colonnade_fallen/colonnade_far_band/caldera_establish/caldera_pool/caldera_wall_layers`（shots.json 自由机位 9 镜）+ 81 张流程帧；三场景 establish/中景无大面积纯色平涂（发光件除外）。
- 纹理目检：12 张新图全部符合 prompt 纪律（无方向性阴影/无文字无人物/四方连续）。

### 翻车记录（R3）

- **楣梁/帷幔切线对齐转角是 `Math.PI/2-am` 不是 `am+Math.PI/2`**：后者局部 +x 在 am=π/4 方位指向圆心（梁横甩成径向）。验算：rotation.y=θ 把局部 +x→(cosθ,−sinθ)、+z→(sinθ,cosθ)，要对齐切线 (−sin am, cos am) 须 θ=π/2−am（+z 恰好朝径向，帷幔法线自动对）。
- **lookAt 前别 mutate 方向向量**：横卧柱断口贴面循环里 `ax.multiply(sign)` 就地改轴向量，第二个端面方向错——addScaledVector/lookAt 一律用 clone。
- **render.mjs --shots 模式会打印 "video complete" 但不编码**（encoder 只在 !check&&!shots 时 spawn）——看到该行别误以为覆盖了成片；确认 output/ 无新增文件即可。
- **--shots 自由机位会粘住**：setFreeCamera 无清除口，shots.json 里要么每镜都给 camera，要么后续镜会沿用上一镜机位。

## R2.6（战壳贴身化+女神修脸；含被叫停轮次（场景 R3 丰富化）的合并验收）

> 本轮开工时工作区带有一轮被叫停的半成品（场景丰富化：楣梁环廊/帷幔摆动/火盆圈/碎石/十二张新纹理已生成）。
> 评估后判定连贯可用（渲染兼容、纹理齐套），合并进本轮一并验收。教训：**开工先 git status 盘点再动手**，
> 也验证了一条：被叫停轮的已生成资产（纹理）零浪费。

### ① 战壳贴身化（buildOrnateClad 重写，禁止悬浮环）

- 胸甲=随胸廓剖面的整筒（ringsGeometry 剖面+12mm），圆形纹章嵌凹槽（槽底盘+凸起槽圈棱+宝石核内凹+放射纹），V 形棱线贴面收腰到腰带；腰/臂/腿的独立悬浮环全删，发光接缝全部改甲片表面细纹。
- 腰带=贴髋断面筒（含大腿根：比大腿面宽 12mm，侧向不夹腿管）+中央圆扣；6 片菱形尖甲叶（拉长压扁八面体）铰接下沿，内面贴腿/臀 5~10mm；甲叶摆动=大腿姿态纯函数（抬腿前叶外撇、侧展侧叶外张）。
- 膝甲盖贴膝点+胫甲前片贴小腿前侧（膝→踝 rig，半径=实测腿管半径+8mm——探针抓到固定半径比腿细嵌入）+踝小翼。
- 肩甲=上扬翻卷壳层叠（外缘向上翻卷），根部锚三角肌盖随肩点（抬臂再上扬）；披风（阿鏊白长/大釜深色短，小凿无）：分段网格顶边钉住，摆动=纯 (t,lift)（冲锋 capeLift 后扬）。
- 探针 `clad_fit`（54 条，episode 侧 check_contact.py 包装执行，不改共享探针）：胸/腰/胫/肩根/六叶逐键窗口采样。站姿窗口+冲锋抬腿窗（联动期只抓深穿 ≥60mm；阿鏊定格悬空收腿，其站姿基准改对峙拍）。

### ② 女神修脸

- 发壳收到颅顶（theta .46π+前沿上抬），中分两缕短束露眉眼，六缕波浪垂发全部走耳后；半垂眼睑可见。
- 长袍明暗两层：冷白主袍+背侧淡金阴影层（半剖面罩），围裙金边勾线（下沿弧+两侧竖条），腰带结加大。
- 权杖搭锅沿入镜（21/22 帧可见）。

### 翻车记录（R2.6）

- **串联编辑吃括号**：viewer state 对象里塞调试展开块，两轮补丁把 contact 的闭括号吃掉（brace balance +1）——vm.SourceTextModule 逐行删行二分定位比肉眼快。教训：state 组装块编辑后跑一次 parse。
- **甲叶探针连翻三轮**：轴心距-管半径度量对"平板搭圆管"误报（斜向叶深穿假象）——改骨轴到叶内面平面的垂直净空（搭盖合法区读负值，深穿才报）；后叶的参照面是躯干臀面不是大腿骨（大腿骨膝前弓把后叶读成悬浮）。
- **胫甲固定半径嵌入**：腿管实测半径（LimbSurface.radius(.62)）+8mm 才是"贴腿"，写死 .046 比大釜腿细。
- **探针窗口要避开非中性姿态**：定格段阿鏊悬空收腿，叶间隙读数漂移正常——站姿基准窗挪到对峙拍，冲锋窗只抓深穿。
- 半成品合并：被叫停轮的帷幔/火盆/楣梁与本论贴身甲同渲零冲突；其 update() 摆动全为纯 t 函数（seek 保持全绿 81/81）。

## R4（歌词字幕烧入）

- 链：`tools/build_lyrics_subs.py`（whisper 13 段粗锚 × op_lyrics.txt 真词 → 人声频段 300-3kHz 谱面流量起音沿精修（±150ms 窗，行起点吸附最强 onset；能量不足保粗锚）→ `config/lyrics_events.json` → subtitle-burn `make_subs.py` → `config/lyrics.ass` → 烧入）。
- 校正量实测 -0.13~+0.05s（whisper 段界普遍滞后 20-130ms，符合预期）；相邻行不重叠（终点=下行起点-80ms）；44.16s 后器乐尾无字幕；与 45s 赫斯提亚台词天然错开。
- 字幕版式：字幕组风底部居中、淡金（主题歌单一 speaker 取分色盘首色）、深描边、`\fad(400,500)`；group/project 留空不出片头卡（OP 自带字卡）。无英文副字幕（歌词无官译，不机翻）。
- 烧入纪律：源=净版母带 `output/craft3d_full.mp4`（不叠烧）；`ffmpeg ass` 滤镜 Windows 盘符冒号转义由 make_subs 内置；抽帧用输出寻址（-ss 在 -i 前）。
- 产物：`output/craft3d_full_subtitled.mp4`（49.200s，h264 crf18，音轨流拷贝不动）。抽帧验证 `storyboard/r4_check/`：2.5s（L2）/15s（二段 L1）/34.5s（L7）/40s（L8）/45.5s（台词帧无歌词残留）全过。

## R5（权杖可读性小整改）

- 权杖重做（HestiaCraft.staff）：铲头加大加宽（宽勺形铲面 ≈ 肩宽 1/3，压扁球+椭圆勾边+铲面高光片）、杆身三节带环箍、柄尾珠；朝向改**展示定型**（握点=右手心探针零缝，朝向=固定 Euler+纯 t 微晃，铲面法线朝 out_goddess 主镜头）——不再绑手掌轴（掌轴朝向由手臂 IK 决定，铲面天然不对镜头）。
- 挥手窗（46.35-47.3）右手腕微抬 6cm，权杖随手上举，铲面剪影更清楚（22 帧）。
- carry 探针（杖-手 ≤.12m）锚的是握点不是铲头，铲头加大后零误报，容差未动。
- 教训：**展示型道具的朝向别绑手部 IK 轴**——手掌朝向服务表演，道具朝向服务读感；握点（接触）绑手、朝向（读感）独立定型，两者分离各管各的，探针测接触点即可。
- 重渲 `output/craft3d_full.mp4`（49.2s 不变）→ 重烧 `build_lyrics_subs.py` → `output/craft3d_full_subtitled.mp4`（字幕/权杖同框正常，sub_45.5 帧验证）；gate 重跑全绿。

## R6（首帧非黑）

- 监制问题"为什么第一帧是黑的"：intro 黑场淡入让第 0 帧纯黑，视频封面/平台抓帧=全黑。改法=fadeBlack 淡入从纯黑改 30% 亮度起（overlay alpha .70→0，0.6s 淡入到正常），构图第 0 帧可读；结尾淡黑不动。
- 教训：**封面帧纪律**——第 0 帧必须是可读构图帧（夜景基调微亮起），"从黑场淡入"是把封面让给全黑。淡入可以保留，起点不能是 0% 亮度。
- 抽帧验证 `storyboard/r6_check/`：frame0.jpg（净版第 0 帧）/frame_0.2s.jpg/sub_frame0.jpg（字幕版第 0 帧）均非黑可读；gate 重跑（全量，非 --skip-render）全绿；字幕版重烧 49.2s 不变。

## R7（监制整改：胫甲装反修正 + 人形步态——告别山羊腿）

### ① 胫甲前片装反（characters.js 腿甲段）

- 根因：forearmRig.align 把 rig 局部 +z 对到膝→踝骨轴；直筒腿时 **rig 局部 +y 才是腿前向**
  （setFromUnitVectors(+z→朝下) 绕 x 转 +90°，局部 -y 翻到角色后方）。旧胫甲弧板弧心在 -y=
  小腿后侧，与注释"-y=腿前向"相反；分段环纹本就在 +y 前侧——板在背面、纹在正面，各贴一边。
- 修法：CylinderGeometry 弧心 θ 起 `Math.PI-.8`（柱局部 -z，rotation.x=π/2 后翻到 +y 前侧），
  胫前棱线与 clad_fit ref 同步改 +y。探针度量是到骨轴的距离，左右对称不受翻面影响。
- 教训：**rig 局部方向注释要用旋转验算，不要凭直觉写**；甲件装饰件（环纹）与主板分两次写时
  方向假设可能不一致，落成"主板背面+装饰正面"的撕裂状态。

### ② 人形步态（performance.js buildPose + 双 GAIT 实例）

- 诊断（`storyboard/r7_diag/` 侧视帧）：髋部恒低、双膝全程深屈、脚踝坐膝后=山羊腿/蹲行；
  站姿也伸不直（站不直）。根因：髋高目标恒为 hipIdle+微 hipDelta(.008)，远低于腿长允许的
  cap（`hipY≤footY+√((legA+legB-.008)²−水平距²)`），腿永远用不满。
- 修法三件套：
  1. `DIMS.standStraight`（.013/.012/.008）：buildPose 里 hipY 与 p.bob 同加 st——髋/躯干/臂根
     整体上移，站姿膝近伸直。idle 臂支 arm 的肩点与腕目标同加 p.bob（增量不变，reach 零影响）。
  2. `createLocomotion` 双实例（不动共享默认值——s1e2/s1e3 已验收）：WALK_GAIT hipDelta .040
     （支撑相髋部上抬腿伸直、迈步转换点下沉=人步行重心节律）；RUN_GAIT（lift .105/sway .022/
     armSwingMax .16/heelStrike .30/toeOff .30）按 `walk.run` 分流。cap 机制兜底，永不超伸。
  3. 双臂对摆（旧版只有右臂摆）但**只摆垂挂臂**：抬臂架势（格斗/踉跄/抬手）按前臂抬角
     线性收掉摆动量（hangDeg>32° 归零），否则摆动把腕点顶过 reach .9 阈（f4/f6 各 11/5 条翻车）。
- 连锁修型：腿伸直后大腿骨略前移，dafu 前中裙甲叶悬浮 +2mm 超阈（.0299>.028）——FC 叶内移
  4mm（几何修型，不动探针阈值）。
- 验证：`storyboard/r7_diag2/` 侧视/正面帧（腿伸直、胫甲前板可读）→ scan_reach 全时间轴
  reachable → gate 全绿（contact_probe 回 baseline）→ 重渲 `output/craft3d_full.mp4` + 重烧字幕版。
