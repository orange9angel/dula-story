# 《9章》S1E3《天台便当》— craft3d 工艺（程序化三维 + Seed-Audio 音频）

**当前交付：P6 `output/craft3d_full.mp4`（另存 `craft3d_full_p6.mp4`，71.0s，1280×720@30 + AAC 48kHz）**。
开门修复对比：`output/door_p6_compare.mp4`（7–22s，左 P5 / 右 P6）；旧版保留为 `craft3d_full_p5.mp4`。
viewer 4215（`node render.mjs --serve`）。texture 质感集：正午天台，零伏笔推进。

## 构建命令（本集目录）

```powershell
cd D:\opensource\movie\dula-story\episodes\bio_armor_academy_s1e3
node render.mjs --serve                                # 预览（带混音）
node render.mjs --check                                # 55 检查帧 + seek 像素校验
node render.mjs --out craft3d_full.mp4                 # 正式成片（带音）
# 音频重建（需 dula-story/.env.speech 凭证；顺序敏感）：
../../.venv/Scripts/python.exe tools/synth_lines.py    # TTS + QC（全绿才往下）
../../.venv/Scripts/python.exe tools/gen_audio_assets.py  # Seed-Audio 环境/Foley/BGM
../../.venv/Scripts/python.exe tools/build_audio.py    # DTW 对齐 → 视素轨 → 混音
# 字卡重建：
../../.venv/Scripts/python.exe ../../../dula-skills/title-card/scripts/make_title_card.py \
  --bg storyboard/r1/check/shot_05.jpg --title "9章" --subtitle "残卷 · 其三" \
  --duration 2.4 --reveal 0.18,0.62 --out-mode white --out-dir cards/open
# （close 卡同理：--title "残卷" --subtitle "其三 · 终" --duration 3.0 --out-mode black --out-dir cards/close）
```

## P1：渲染链骨架 + 正午天台 + 静默版（2026-10-10）

- 骨架：render.mjs（端口 4215，去 fight/legacy 三态与跨剧集挂载，保留
  --check/--serve/--out/--board/--trace/--camera/--range；后加 --q 探针查询串）、
  viewer.html（import map `dula-assets/` 前缀，three 单例）、bootstrap.js、tools 五件。
- 场景 `scenes/RooftopNoonScene.js`：正午顶光（shadow.intensity .5 压淡）+天蓝半球光
  +淡蓝补光；水泥地程序纹理（镜像平铺+世界顶视 UV）；铁丝网菱格 alphaTest 面片；
  楼梯间小屋（门板纯时间函数开合，撞门带回弹）；水塔；校舍剪影；闭合天穹+程序化积云。
- 谱面 `performance.js`：(t,state) 纯函数，twoBone/walkingFeet/turningFeet 取自
  dula-assets/lib/craft3d；坐姿=sit 0..1 混合（矮沿遮挡下肢、脚底不穿地）。
- 赛璐璐统一（§9）：viewer 侧 celUnify() 遍历换 MeshToonMaterial+共享
  coolShadowRamp，例外 BackSide 描边壳/光效/脸 canvas；不动 dula-assets 资产。

## P2：动作动漫化分层 + 表情符号化（2026-10-10）

配方 `direct-animation-craft/motion-principles-recipes.md` +
`character-modeler/anime-expression-symbols.md`：

- 预备（起步沉身/挥手沉肩/递签回拉）、跟随衰减（settle 解析式 k=10 ω=24）、
  挤压拉伸（squashPulse 谷底 2-3 帧+回弹，落座×2+微光瞬间）、次级运动
  （便当 bob 差分滞后、书包/外套襟/发束尖阵风 windAt，空拍 ×1.8）、
  一拍二 15Hz（根/腿部满帧率防滑步，缘插值同量化）、轰刚大步
  createLocomotion 参数化。涂抹帧未启用（最高速 1.1m/s 低于阈值，按纪律不加）。
- 表情符号 billboard（paintFace 属 dula-assets 不改）：汗滴×4 窗、豆豆眼 31-32s
  （depthTest:false 防刘海遮挡）、轰刚 ∩ 笑眼用资产 emotion='laugh' 分支。
- 修复 P1 遗留：轰刚出场路径绕行小屋山墙（原路径穿墙）；铁丝网摩尔纹减弱。

## P3：音频链（2026-10-10）

- TTS：seed-tts-2.0 声线锁 S1E2，带标点输入；QC 7/7 全 ✅（`assets3d/dialogue/qc_report.md`）。
- 视素轨：faster-whisper DTW → V17 连续视素轨（t 单调断言）；viewer 对白段视素驱动、
  咀嚼段 chewCycle 优先、缺文件回退 talkJaw。
- BGM/环境/Foley 全走 Seed-Audio 1.0（10 项，source.json 落账）；心跳复用 S1E2 资产。
- 混音：对白峰一化 .55、BGM -24dB+duck -8dB、环境床 -26/-32/-34dB；峰值 -5.05dBFS。
  清单 `assets3d/refinement/mix_manifest.json`（sha256 + 床 QC 指标）。

## P4：字卡 + 正式成片（2026-10-10）

- 字卡：title-card skill 两张（open 58 帧白光切出 / close 72 帧淡黑），底图取本集
  检查帧；`config/cards.json` 清单接入 viewer（缺卡回退纯文字兜底）。
- 正式成片 `craft3d_full.mp4`：ffprobe 验流（h264+aac，71.0s）；抽帧复查开场卡/
  收尾卡/52.2s 微光三点通过；`--check` 55 帧 + seek 全绿。
- 付费调用清单：seed-tts-2.0 ×7 句、Seed-Audio 1.0 ×10 项（BGM 75s + 环境床×3 +
  Foley×6）；无其他付费 API。

## 验收总览

| 项 | 结论 |
|---|---|
| `node render.mjs --check` | 55 帧，seek 像素校验 passed |
| TTS QC | 7/7 全 ✅（时长在窗、无削波、拼音 86-100%） |
| 环境床节律 QC | wind/playground 全过；birds 高频占比超线但属内容本体（-34dB 铺底） |
| 混音峰值 | -5.05dBFS（上限 -1）；对白段 RMS≈-23dB vs 非对白 ≈-40/-45dB |
| 成片 | `output/craft3d_full.mp4` 71.0s 双流完整 |

## P5：复看修复（开门穿模 / 桨板手 / 进食悬浮）+ 接触探针（2026-10-10）

**历史记录：本节“门检通过”仅覆盖轰刚手部标点，不能证明两角色全身无穿模；P6 已纠正该结论与检查范围。**

用户复看三问题的根因与修法：

1. **开门穿模**（13.9–15s 轰刚身体/手与门板穿模）：根因=门 13.92 才撞开、
   人 14.0 已站在门扫掠净空区内。修法=时序型：门提前到 13.55–13.85 全开
   （人出现前扫完），回弹 13.85 起，SFX 同步移到 13.80。探针实测手-门板
   最小 0.53m；三机位抽帧（`storyboard/p5_door/{front,side,back}/`）确认零穿模。
2. **桨板手**：根因=谱面默认 `open:.2` 把指节拉直。修法=手势库进谱面
   （静息 `fist .12` 为底，逐 beat 左右手分别覆盖：持盒 .4 / 持签 .5 /
   平贴 open .3 / 挥手 open .75），buildPose 在 setPose 后覆盖 setGesture，
   gL/gR 进条目边界混合列表（不瞬切）。ArticulatedHand 现有 API 够用，
   未改 dula-assets。
3. **进食悬浮**：进食弧线改关键点路径（抬起→弧顶→嘴前停顿 0.3s→送进→撤回），
    jaw 张口包络与手部关键点同帧对齐；签锚点收回掌心（.025m），咬下与空拍咀嚼
   窗口用 `quaternion.slerp(朝嘴, 包络)` 把签尖转向嘴（签尖-嘴实测 0.042m）。
   顺手修掉轰刚够水壶回程手横穿腹部（关键点绕行替代直线 blend）。
- **新探针 `tools/check_contact.py`**：接触距离断言（门板净空 >.06m / 手-躯干轴
  XZ ∈[.09,.60]m / 签尖-嘴咬下帧 <.09m / 持盒手-盒 XZ<.16 且 dy∈[-.08,.08]）。
  运行方式：
  ```powershell
  node render.mjs --check --trace storyboard/r1/check/check_trace.json
  ../../.venv/Scripts/python.exe tools/check_contact.py storyboard/r1/check/check_trace.json
  ```
  当前全绿（door_min .53 / bite_min .042 / carry_max_xz .12 / seated∈[.11,.47]）。
- 工艺整理写回 `dula-skills/direct-animation-craft/references/contact-and-hands.md`
  （SKILL.md 已加指针）。

## P6：真实门洞、完整出门路径与网格检查（2026-10-10）

- 成片复查：雷晓 7–9s 不仅与开门扫掠相交，还沿门口→座位直线穿过实心
  `hut_body` 及右门框。旧探针只查 13.4–16.5s 轰刚双手，无法发现；基线探针
  在 30fps 下定位到 47 个碰撞帧（7.0–9.033s 范围内）。
- 场景改为空心墙壳和真实门洞，保留门板/门框尺寸；门槛顶面与步态地面 y=0
  齐平。两人从室内出发，沿门洞法线走出，门外换脚转向、绕过墙角再到座位。
  轰刚出门后才展开挥手；关门由 15.8–17.2s 改至 17.1–18.3s，避开背部。
- 本集步态适配：共享角色 `setPose` 未消费 FootYaw/FootPitch，现于本集写鞋旋转，
  静止/坐姿重置；walk/turn/sit 边界使用同一满帧率时钟并清除过期分支。
  未修改共享角色、音频或对白时间线。
- `tools/door_probe.js` 在 `?probe-door=1` 时读取实际门、门框、墙体变换，
  用全身/背包/便当三角形与外扩 15mm 的障碍盒求交。蒙皮手读取变形后顶点和
  包围盒。`check_contact.py` 核验两次登场、所有主体/障碍和完整采样；
  缺帧、缺探针及注入碰撞的三个负例均被拒绝。
- 验证：6.8–22s 的 60Hz 共 **912 帧零碰撞**；整集 30fps 2130 帧 trace、
  **75 张顺序/seek 检查通过**；正面和斜侧面各 32 张检查通过，并目检关键门区图。
  落脚/朝向/骨长/鞋底门检通过；进食及持盒接触回归通过。
- 视频：71.0s、1280×720@30、H.264 + AAC 48kHz 双声道；新旧解码音频
  SHA256 同为 `135a9bd25a3ce212635a90476fcbe57c98352c97a95f3291bc87b22fb617e7d3`。
  最终 MP4 已抽帧复查；正常速度审美效果留待用户复看，不以采样检查冒充连续物理保证。
- 证据：`storyboard/door_p6/{check60,full_check}/` 的 contact/locomotion/seek 报告，
  `front_sheet.jpg` / `side_sheet.jpg` / `final_video_sheet.jpg`；交付元数据 `delivery.json`。
  工艺已同步 contact-and-hands、scene-designer 与 walk-director。

```powershell
node render.mjs --check --fps 60 --range 6.8,22 --q '&probe-door=1' --board storyboard/door_p6/check60 --trace storyboard/door_p6/check60/trace.json
python tools/check_contact.py storyboard/door_p6/check60/trace.json --door-only
node render.mjs --check --q '&probe-door=1' --board storyboard/door_p6/full_check --trace storyboard/door_p6/full_check/trace.json
python tools/check_contact.py storyboard/door_p6/full_check/trace.json
python tools/check_locomotion.py storyboard/door_p6/full_check/trace.json
node render.mjs --out craft3d_full_p6.mp4 --board storyboard/door_p6/render
```

## P5 便当接触修复（2026-10-10，接 Codex 未提交改动之后）

前序（Codex 工作树，保留不回退）：便当盒改锚托盘手（`supportedBox()` 用解算后的腕部
世界坐标、`trayHand()` 掌朝上托盒手势）、盒盖掀开后内容物才可见、`probeBoxMeshes()`
网格级三角相交探针（`--q '&probe-bento=1'`，margin .004）、外套襟风动枢轴修正。
其 check4 聚类遗留两处真穿模，本轮修复：

1. **轰刚 vs 矮沿上的第二盒**（41.3–55.1s，693 帧）：offer 段轰刚凑近雷晓
   （rootX -3.45→-3.25）+ crack 段转身，胯/右腿扫进盒子。修：FIXED_B 落点移到
   (-2.88,.575,-11.30)——两人躯干包络（含外套襟、探针 margin）之间的净空只有
   ~.34m 宽，盒子半宽 .107m，居放窗口实测 [-2.93,-2.81]；第一次移到 -3.05 撞轰刚、
   -2.85 擦雷晓袖口，-2.88 是数值解。
2. **雷晓左手/左臂 vs 自己盒盖**（52.3–55.1s）：按袖子的手路径扫过掀开的竖直盒盖。
   先试盖子放平（-2.62rad）——结果盖子压到托盒前臂的袖卷边（新穿模 481 帧，撤回）。
   正解：50.4–51.3s 他把盒子放上自己右侧矮沿（LEI_SET=(-2.18,.575,-11.28)），
   路径先向体侧滑离前臂（+x .16m、微抬 6cm 过指节）再沉到矮沿——不抬到脸前、
   不扫前臂；按袖手部目标 z .24→.27 顺带收掉 55.1s 的 1 帧临界擦碰。
   叙事读法：笑完走神顺手把盒子搁边上，给微光腾出画面中心。

探针收尾：`tools/check_contact.py` 第 5 段=便当网格白名单——仅放行托盘手×自己托的
盒底（lei rightHand↔leiBento_base 限 6.9–51.4s 托盒窗口；hong leftHand↔hongBoxA_base
限 ≥13.9s），其余任何 主体×网格×便当 命中即失败；结果写入同一份
contact_validation.json（trace 旁）。

check9 全绿证据（`storyboard/bento_p7/check9/`）：门段 456 帧零碰撞；签尖-嘴 0.042m；
端盒贴合 xz≤.145m；坐姿手-躯干 [0.114,0.469]m；便当网格 1830 帧、白名单托盘接触
2927 次、非法命中 0；75 检查帧 + seek 像素校验 passed。目检：21.9s 第二盒落沿、
44.8s 递签交接、52.2s 按袖（盒子已离手在矮沿上）、61.5s 空拍全景——盒位自然。

## P6：姿势跟随道具状态 + 道具离网 + 食物握持（2026-10-10）

用户复看三问题与修法：

1. **没托盒的手也举成托盘**：根因=trayHand 无条件覆盖（放下盒后右手仍举着）。
   修：托盘手强度挂道具状态机（hidden→held→placing→down，`trayK()` 包络与
   可见性/锚定同源）：雷晓右手 6.9→51.3（放下后 .6s 缓出+settle 收回腿边）、
   轰刚左手 13.9 起全程、雷晓左手端盒到 40.2s、轰刚右手出门段 13.9–15.1；
   朝向用 slerp(qBase→qTray, k) 渐变不瞬切。
2. **盒子/盒盖穿铁丝网**：根因=矮沿固定盒贴网放（盒盖掀起后背面贴到 z=-11.37 网面）。
   修：FIXED_B/LEI_SET 前移 ~8cm（z -11.22/-11.21，盒与竖盖全部离网）；探针加铁丝网
   薄板代理（fence_n/fence_w，不进画面），道具+身体 vs 网 1830 帧零命中。
   场景侧暴露 `this.netW`。
3. **食物握持**：炸鸡球球心抬到签轴上方 .008m（签尖从球体下半进入）；探针加食物断言：
   签尖-球心 ≤.025m（实测 max .017m）、指骨-球心 ≥.016m（实测 min .056m）——
   插签/递接/送嘴三段 573 帧全过。

check 全绿证据（`storyboard/p8_contact/check/`）：75 检查帧 + seek passed；
check_contact.py 五段（门/坐姿距离/签尖到嘴/端盒贴合/便当白名单+离网+食物）全过，
报告 `storyboard/p8_contact/check/contact_validation.json`。

## P7：道具操作三律修复（2026-10-10）

用户复看三问题与修法：

1. **签像插在手上**：签锚点从掌心移到捏合区（手局部 (.048,.026,±.006)，拇指腹-
   食中指第一节之间），捏在签下 1/3 段。断言：签轴-掌心点线距离 ∈[.015,.045]m
   （实测恒定 .0267m，咬下腕翻段豁免）。
2. **空托盘手**：搬运段双手端盒——雷晓右手托底+左手扶盒左沿（扶沿目标从盒变换
   推出）；轰刚重摞左手托、右手挥完垂放身侧（重物真实搬法；其臂长扶沿不可达，
   抱胸位也试过了会蹭盒，垂放是探针验证后的选择）。
3. **放盒飞行**：轰刚第二盒 21.3-22.2s 原为先手后盒的 lerp 飞行。修：转身段右手
   抬到摞顶接盒（20.85s 接触）→ 落座小弧带盒沉到腿后 → 22.2s 释放重力落台 .15s →
   指尖分轴推滑到两人中间（先后推离网再横滑，22.35-22.8s）→ 静置。落点常量由
   `calibratePlacement()` 从释放帧谱面姿势派生（释放帧盒位=静置位姿零跳变由构造
   保证）。雷晓放盒同理（50.4-51.35 手随盒、落台沉降）。可达性实测：坐姿肩高
   1.16m/台面 .58m/臂长 .43m，直臂够不到身侧台面，必须带 lean .15-.22 俯身；
   静置净空区与手可达区不重叠时用"落台+推滑"组合，不延长手臂。
   顺带收敛轰刚凑近幅度（share_3 +.12→+.06、offer 凑到 -3.32），静置盒全程
  （含推滑终态）探针零命中。

探针全绿（`storyboard/p9_grasp/check/`）：75 检查帧 + seek passed；
`contact_validation.json`：门/坐姿/签嘴/端盒/便当白名单/离网/食物/捏持/放置连续性
九段全过（bento 白名单托盘+操作接触 4040 次、非法 0；签尖-球心 ≤.017m；
指骨-球心 ≥.056m；放置手-盒 ≤.225m；落台后静置 <1mm/帧）。白名单=声明式接触清单
（bentoAllowed：托盘/扶沿/抓握/落台 transit 按 主体×部件×盒×窗口 声明）。

## P8：手腕生理域 + 道具状态机覆盖完整（2026-10-10）

用户复看五连的修法（全部不动 dula-assets，viewer/谱面侧解决）：

1. **手掌外翻（23s 特写）**：根因=trayHand 把掌心世界向上硬写且雷晓左手托盘窗泄漏到
   40s。修：手部朝向覆盖统一走 `physioTray()`——掌向由前臂轴推导（世界向上投影），
   相对前臂自然掌向扭转限位 ±60°（需求超界则钳位）；雷晓左手托盘窗收窄到搬运段
   （坐定 13.9s 缓出）；轰刚右手托盘窗整个移除（挥手段掌心向上=外翻源头）。探针实测：
   扭转需求最大 90°（即翻车姿势），限位后实加恒 ≤60°。
2. **盒子悬空无支撑**：数值上盒其实一直在右腕上（偏移固定），视觉上手被盒体挡住。
   修：托盘偏移 z .115→更靠近掌心的同时探针加「支撑者存在性」断言（盒可见且非静置/
   落台段 ⇒ 手或下层盒在支撑距离内），同一帧里盒必须有明确支撑者。
3. **盒子自动开盖**：开盖时机对齐到手的谱面时刻——雷晓左手掀盖 13.65–14.10（手到
   盖把位→掀→收回）、轰刚 boxB 盖在右手抓握搬运期（21.55–22.05）、boxA 盖在右手
   推滑收回路过时（23.6–24.0）。断言：盖角速度非零 ⇒ 主人有手在盖把 .25m 内
   （实测最大 .239m 在首帧接近中）。
4. **trayK 泄漏**：放下后缓出窗 .6s 与手部收回不同步 → 收窄到 .12s 同步；断言
   trayK>.3 ⇒ 掌-盒 < 托持偏移量+4cm（逐手势标定阈值），泄漏清零。
5. **手臂-身体接缝（50s 远景轰刚）**：谱面侧修——进食手目标稍降（y 1.26→1.21）、
   头下迎（headPitch .04→.10），手臂不过肩，袖肩接缝不再露馅。未改资产。

探针全绿（`storyboard/p10_wrist/check/`）：75 帧 + seek passed；check_contact.py
增至 14 段（手腕生理域/托盘泄漏/支撑者存在性/盖随手动为新增），旧断言零退化。

## P9：开关门声画对位（2026-10-10）

用户复看发现门声与画面不符。画面门时序（`scenes/RooftopNoonScene.js doorA(t)`）
与音效四个点位的最终对齐表：

| 事件 | 画面区间 | 音效点位 | onset 实测偏差 |
|---|---|---|---|
| 雷晓开门 | 6.9–7.5（开） | 7.05（door_close 素材降增益变体，gain .30） | -0.005s |
| 雷晓关门 | 9.2–10.4（关严 10.4） | 10.35（gain .45） | -0.005s |
| 轰刚撞门 | 13.55–13.85（撞击=全开）+回弹到 15.1 | 13.85（door_slam .75） | +0.112s |
| 轰刚关门 | 17.1–18.3（关严 18.3） | 18.25（gain .45） | +0.027s |

修法：remix_audio.py 门事件从两个补到四个并全部对齐画面点位（开门声用现有
door_close.wav 降增益变体，零付费调用）；重跑混音。撞门声与 13.9s 人物出场动作
无冲突（对白 14.6s 才开始）。

验收盲区固化：新增 `tools/check_audio_sync.py`——不靠耳朵：对 mixed.wav 四个点位
±0.4s 窗做 librosa onset 检测，断言目标点 ±0.15s 内存在 onset（注意坑：台词段的
对白/BGM onset 可能比事件音更强，"窗口内最强=事件"不成立，断言用"最近 onset"，
最强 onset 仅记录）。报告 `storyboard/p11_audio_sync/sync_report.json`（四点全过）。
该纪律已写回 dula-skills/build-ambience-foley/SKILL.md（事件点位登记+对位验证+
时间轴变更回归）。画面零回归（本次只动音频与文档，`--check` 帧哈希级不变）。

## P10：接触探针工具化（编写期物理门禁，2026-10-10）

S1E3 的 14 段接触断言泛化为 skill 级通用工具：

- `dula-skills/direct-animation-craft/scripts/contact_probe.py`：配置驱动（断言库
  逐段参数化：doorway/whitelist/env/seated/bite/carry/food/wrist/tray/supporter/
  lid/pinch/dual/place/continuity），输出 contact_validation.json；trace 契约与
  门禁工作流写进 `references/physics-gate.md`。
- 本集参数抽到 `config/contact_contract.json`；`tools/check_contact.py` 改为薄包装
  （原命令行用法不变）。
- **等效验证**：用既有 `storyboard/p10_wrist/check/trace.json` 新旧两版对跑——
  passed/failures/scope 逐字段相同；stats 仅 `nug_frames` 573→663：旧实现把没有
  bento 段的帧（68–71s 卡段）静默跳过后续所有段，通用版修正为覆盖（严格变大、
  零新增失败）。
- 复验：`storyboard/p11_contact_generic/check/` 全链路（渲染 trace → 薄包装 →
  通用探针）全绿，75 检查帧 + seek passed。本轮画面零改动。

## P12：自然度四类修复 + 探针泛化扩展（2026-10-11）

用户复看反馈四类"不自然"，逐项数值复现→修复→断言收口：

- **走路像机器人且太快（walk_in 7–14s）**：根因=ease 根位移（中段峰值 1.5×段均值），
  实测雷晓 p50 1.85 / p90 2.65 / max 2.84 m/s。修法：`enterRooftop` 加
  `{profile:'trap',bounds,pause}`——梯形速度剖面（ramp 12%，峰值≈1.14×均值）、
  转角停步张望段（u .44–.48，headYaw 一瞥）、转弯段 0.42s→0.21s；雷晓 persona
  `createLocomotion({lift:.05,pitch:.14,sway:.02,hipDelta:.014})` + 新增
  `dims.strideFactor=.85` 短步。修后：lei max 1.78 / p50 1.73 / bout 均速 1.54，
  bob 振幅与步频（3.75–4.14 步/s）全在域内；轰刚保持大步快走（max 2.26）。
  walkingFeet 落脚跟随根投影，剖面换了步频自然跟随、零滑步回归。
- **抬臂肩部断开**：顶点帧（t≈15.97）袖根脱出躯干肩环覆盖露皮肤三角。修法=谱面
  限幅：挥手顶点手位 1.58→1.46（轰刚肩高 1.56，手不过肩线），中间摆动键同步压。
  修后上臂仰角 max 72.6°（断言域 ≤85°），同刻帧（check5/shot_31）肩部连续无断缝。
- **掌心外翻残留**：漏网嫌疑段（crack 咬签/empty 咀嚼抬手）目检 48.5s/57s 特写——
  掌向生理、无外翻；physioTray 仍是唯一覆盖入口，本轮未加新路径。
- **书包嵌入人体**：探针实证包体按资产默认挂点内埋躯干/左腿 5.7cm（全程 3652 帧命中）。
  修法（viewer 侧常量，零资产改动）：枢轴移到包顶（geometry.translate，描边壳共用
  geometry 自动跟随）+ 外移 x −.25 + 重力外倾 −.16 + 包盖挂为包体子件随摆 +
  俯身逆 lean 回摆。offset 用**挂点扫描**一次渲染定稿（逐候选改变换→探针→还原，
  纯函数不进画面）：−.23 仍命中、−.25 起全程零命中（留 ~2cm 余量）。
- **探针泛化**：`contact_probe.py` 新增三 kind（追加在 SECTION_ORDER 末尾，保报告
  帧内序可比）：`gait`（walk 帧速度上限/bout 均速下限/bob 下限/步频域，按角色分参数）、
  `limb_attach`（上臂仰角域 + 肩点-躯干轴距离域；trace 新增 contact.arms/torsoAxis）、
  `worn_prop`（state.worn 零命中；包体/盖/带打 `userData.probeExclude` 跳过自身，
  door_probe.js traverseVisible 通路，margin −20mm 放行贴触只报深穿）。
  contract 同步加三段（17 段全参数化）；locomotion trace 增 `bob`。
- **验收**：`storyboard/p12_natural/check5/` 全链路 2130 帧 trace **17 段全绿**
  （新旧断言零退化：旧段 stats 与 P10 基线逐项一致）；目检走路×3/挥手肩 A-B/
  进食手部/书包走坐帧全过。成片重出 `output/craft3d_full.mp4`（71.0s，混音不动）。
- 工艺写回：physics-gate.md（三 kind + trace 契约 + 穿戴件/抬臂纪律）、
  walk-director SKILL.md（梯形剖面/strideFactor persona/pause 段纪律）。

## P13：细节四类修复 + 逐拍近景审片协议（2026-10-11）

用户复看再指出四个细节，本轮核心产出是**发现环节固化**（断言全绿≠看起来对）：

- **① 掌心向外反掌送嘴**：±60° 腕扭转限位挡得住生理、挡不住语义。修法=physioTray
  同级新增 `physioPalm`（动作语义掌向约束）：送嘴帧目标掌向=手→胸口 ⊥前臂轴投影，
  扭转限位用前臂旋后生理域 ±80°；进食弧线 keys 降到嘴前下方（掌心自然朝上向内）。
  断言 `palm_semantic`：激活帧掌心·躯干点积 ≥−.05（284 帧 min .46）。
  坑：audit 多乘一次 sign 把左手全员打成假阴性；轰刚抬起过渡段前臂直指胸口时
  投影退化，约束窗口只盖嘴前停顿段。
- **② 放盒俯身手臂分开**（21–22s 轰刚 / 51s 雷晓）：躯干 lean 前倾而臂根不随
  （资产 rig 如此），肩部开缝实测最大 .385m。修法=viewer 侧肩窝桥接件
  （椭球沿"躯干肩点（lean 后）→臂根"拉伸，缝隙 <6cm 时缩回内嵌）+ lean 减幅
  （.22→.18 / .15→.12；够台不变——臂根本来就不随 lean）。未动 bioarmor 资产。
- **③ 盒浮在手上**：根因=盒锚在 mesh 系偏移（掌转了盒不转）+ 偏移量把盒心推到
  指尖之外。修法=`handBox()` 手系锚定（盒底中心=掌面中点，掌面顶面厚度用 hand.js
  掌椭球半径 .0205×scale）+ 扣边托手型（physioTray 加 gripFist，指腹扣盒底前缘）；
  放置过渡段在**位置空间** lerp 回 mesh 系抓握点（零跳变）。断言 `grip`：盒底投影内
  顶点-底面 min|y| ≤3mm（接触成立）+ 指节-盒体 ≤5mm（扣边成立）。连锁：盒贴掌后
  手/臂/袖/壳疹件与盒全程相交 → whitelist 补 6 行合法接触行（2.3 万条假阳性实录）。
- **④ 挎包只有一条绳**：现状确认——包体/包盖/背带其实俱全（P12 修的同一个包），
  问题是深棕撞深蓝裤子远景读不出+背带尾端与包顶断开。修法=包体提亮 #9a6b42/
  盖 #7a4f30 + 背带尾→包顶连接绳（随包摆动）。坐姿前摆方案探针实测复穿
  （坐姿大腿外侧鼓到 x −.20），挂点保持 P12 净空位不动。
- **审片协议落地**：`render.mjs --shots <json>` 逐镜点名（name/t/camera，不走
  checkTimes，4s 出 22 帧）；`config/review_shots.json` 覆盖全部道具交互事件
  （端盒走/停步/掀盖/摞盒走/挥手/放盒×2/推掀开盖/插签/递签/接过/咬签×2/自吃/
  放盒/释放/按袖/咀嚼×2/挎包/双人道具全景），检查帧 `storyboard/p13_detail_review/`。
  审片额外抓到并修掉：**递签指向**（签沿前臂轴垂坠、炸鸡端拖在拳后→绕捏点 slerp
  指向雷晓嘴边；锚点序修正：先定捏点再调四元数，pinch 域不漂）。
- **验收**：check6 全量 2130 帧 **19 段全绿**（旧 17 段 stats 零退化）+ seek 75/75；
  22 帧近景五点清单（掌向/接触/支撑/连接/穿戴件）逐张过。成片重出
  `output/craft3d_full.mp4`（71.0s，混音不动）。
- 工艺写回：contact-and-hands.md「掌心朝向语义表」（送嘴/托举/握持/垂放 +
  手系 vs mesh 系锚定 + 审计符号陷阱）；physics-gate.md「逐拍近景审片协议」
  「穿戴件做工纪律」（三件套/扫描定稿/坐姿鼓包复穿实录）。

## P14：体系化门禁（逐点矫正→开工即完整验收，2026-10-11）

本轮不改画面/成片，把八轮矫正沉淀成新集开工体系：

- **失败类目枚举闭环**：六类=碰撞/支撑/生理域/连接完整性/接触语义/声画同步
  （P5–P13 串行枚举完毕）。`dula-skills/direct-animation-craft/references/
  physical-completeness.md`：类目×节拍覆盖矩阵（11 种节拍类型×6 类目→断言 kind）、
  完整性定义（断言绿+审片全+声画绿，目检只做创意层判断）、新集开工门禁顺序、
  八轮成本实录。
- **`scripts/episode_gate.py`**：一条命令总验收——check 渲染（探针 trace+seek）→
  contact_probe → check_locomotion（有步态段时）→ check_audio_sync（有 mixed.wav 时）→
  逐拍近景组（有 review_shots.json 时）；汇总 `storyboard/gate/gate_report.json`，
  contact 失败按 timeline 定位到节拍。**S1E3 完整路径实跑六步全绿**（含渲染 ~97s）。
- **`scripts/init_viewer_episode.py`**：新集脚手架——原样复制 render.mjs（含
  --shots/--trace 基建）/viewer.html/bootstrap.js/check_contact 薄包装，模板生成
  viewer.js/performance.js 注释骨架与 config 四件（timeline/contract/review_shots/
  voice_config）；scenes/ 与产物不复制。`--smoke` 自查（node --check×4 + JSON×4）
  在临时目录验证通过。
- 接入：direct-animation-craft/SKILL.md 门禁节指向体系三件套；dula-skills/AGENTS.md
  「创作新剧集」加 viewer 链分支。

## P14：静息手支撑 + 门状态一致性（C7 类目固化，2026-10-11）

用户复看两类问题；本轮新增三断言 kind（共 22 段），gate 七步全绿。

- **A 坐姿手嵌身/悬空**：诊断=网格级手-躯干/大腿扫描（新 `handBody` 探针：代理盒
  92% 半径 + 骨盆侧翼延伸，−10mm 深穿才报）+ 静息支撑量（`handRest`：掌点→大腿轴/盒
  OBB 取近）。实测：LAP 静息手悬空 p50 .13–.17m（掌心朝下水平悬浮=装"隐形桌"）；
  嵌入点四处（轰够水壶扫腿 51.9–53.7 / 雷放盒左手贴 lean 胸廓 50.7–51.4 / 轰落座过渡
  21.6–22.7 / 轰胸前抱盒 17.7–20.6）。修法：静息手改**垂放腿侧掌心朝腿**（本 rig 臂短，
  坐姿肩-腿面距 > 臂长，"平放大腿上"物理不可达——诚实垂放）/轰刚右手搭盒 A 右沿；
  嵌入点：水壶绕行路径抬高外让 + 放盒落座 keys 抬升 + 雷放盒左手外让 + 掀盖收回绕行。
  断言 `rest_support`：持续静息 .35s+ 且手低于肩 ⇒ 贴腿/贴盒 ≤8mm 或垂臂 ≤35°
  （15Hz 一拍二帧间冻结不能当静息证据——手速按 .12s 窗算）。
- **审片协议又抓一个**：水壶"带歪"是手根本没碰到壶的无接触作假 → 删摆动，诚实化为
  "够了一下"（壶不动）。Beat 本意（转身没看见微光）不变。
- **B 门状态逻辑**：原 doorA 轰刚撞开 13.55–13.85（人 14.0 才到=门自己开）、17.1–18.3
  无人关门配关门声（鬼关门）。修法零音频改动：撞开窗口滑到 13.75–14.0（撞击帧=他到
  门口帧，撞门声 13.85 落窗内）；他撞开就没关严（门开着 14–18s），18.05–18.3 阵风带上
  （关门声 18.25 不动；阵风脉冲同步吹动角旗/挎包/发束——动因可见）。
- **C7 断言**：`contact_probe.py` 新 `state_consistency` kind（finalize 全时间轴分析）：
  迁移 from/to 态成立 + 触发者在场（角色距离/手近盖把/阵风量达标）+ 音效事件落迁移窗
  ±0.15s + 行为-状态规则（过门平面帧门必开，法向变号检测）。contract 声明门 4 迁移
  （雷推开/弹簧门漂移关/轰撞开/阵风关）+ 三盒盖开盖，全绿（触发距离实测 .48–.84m、
  过门帧开度 1.0、事件偏移全 0）。
- **验收**：check8 全量 2130 帧 22 段全绿 + seek 75/75；gate 七步全绿
  （`storyboard/gate/gate_report.json`）；目检：垂放手×2（23/24 帧）、轰推门-进门-阵风
  关门×3（25/26/27 帧）、空拍静息（28 帧）。成片重出 `output/craft3d_full.mp4`。
- 工艺写回：physical-completeness.md 加 C7 类目+矩阵行+门案例实录；
  contact-and-hands.md 加静息手支撑纪律（垂放腿侧/可达性先行/缓动尾不算定格）；
  physics-gate.md trace 契约补 handBody/handRest/doorOpen/lidOpen/windGust 五行。

## P15：肢体-躯干嵌入探针 + 同色贴壁修复（2026-10-11）

用户 0:32s 截图：雷晓坐姿右臂（上臂/袖筒）嵌进躯干侧壁。本轮：断言扩展+修复+固化。

- **探针**：新 `limb_body_mesh` kind——盒代理实测不可用（躯干是变半径椭圆环列，
  盒角把正常垂臂全员误判，首扫 14889 帧假阳性），改**解析式**：沿臂轴采样对躯干
  环列插值椭圆截面求有符号距离 g，管面陷入判据 g < −(管半径+15mm)，袖根 .12m
  内埋区跳过。窗口 7–68（站姿走段+坐姿全程）。
- **0:32 根因**：几何上并未相交（g=+.013）——是**同色贴壁剪影合并**（白袖贴白衬衫，
  视频压缩吃掉轮廓线）。修法=坐姿肘极外摆（buildPose 肘 pole 坐姿默认
  V(sign*.45,−.62,−.35)，谱面可按 beat 用 `s[side+'Pole']` 覆盖；手腕 IK 钉住，
  盒接触全不变）。对照帧：前 `storyboard/p15_limb/ship_032.png` vs 后 `fix_032.jpg`。
- **顺带抓到一个成片级事故**：crack 入场边界混合把躯干压扁两帧（46.53–46.57，
  前帧 ship_046.png 白色尖刺）——根因=边界混合时 squash 中性值误用 0（应从 1 混），
  是 limbBody 的 g 爆到 −.41 暴露的。修在 poseAt 混合的 squash 默认。
- **其余嵌入帧**（首扫 22 帧真实命中）：轰刚放盒落座过渡（21.6）→ 加外摆绕行键；
  够水壶横摆锯胸（52.2–53.7）→ 转身 yaw 加深 −.18→−.34 + 弧线路径压到胸前下方
  （短臂 rig 的左后工作空间物理不可达，全展直指必然穿胸——诚实"够不着"）。
- **验收**：check10 全量 2130 帧 23 段全绿（旧 22 段零退化）+ seek 75/75；gate 七步
  全绿；对照帧 ship_032/046/052 vs fix_032/046/052（`storyboard/p15_limb/`）。
  成片重出 `output/craft3d_full.mp4`。
- 工艺写回：physical-completeness.md（C4 补肢体嵌入 + 矩阵坐卧/静息手行 + P15
  实录节）、physics-gate.md（limbBody 契约行）、contact-and-hands.md（g 判别数值 +
  同色贴壁 + squash 中性值）。

## P16：超伸僵直与袖根分离（嵌入-分离区间断言，2026-10-11）

用户 0:20s 截图：雷晓托盘臂全展直（腕-肩距 .986×臂长）+ P15 坐姿肘外摆默认值在该
beat 过量 → 袖根与躯干张开楔缝，"断开再接一截"。

- **诊断**（check10 trace 离线扫，无需重渲）：reach 比率 ≥0.9 的帧遍布全片
  （托盘/端盒/静息多居 .95–.99）——长期全展直是"机器人感"的隐性来源之一；
  0:20 帧比率 .986 + pole 外摆叠加。
- **修法**：托盘/端盒/收盒/搭盒各腕目标点收到 ≤.85 臂长（盒随手上抬贴身=抱盒，
  读感更好）；坐姿肘 pole 默认 .45→.35（外摆幅度按 beat 收敛；侧向伸展 beat 可用
  `s[side+'Pole']` 覆盖，如按袖段肘外摆让胸线）；掀盖/按袖/接签/放盒/够水壶等
  功能性伸展帧进白名单（带注释）。FIXED_B/LEI_SET 净空未动（落点由校准自动重派生）。
- **新断言**：`reach`（腕-肩比率 >.9 且前臂非垂挂即红，发力帧白名单）+
  `limb_body_mesh` 分离端（静息帧上臂侧向外摆角 >30°=袖根张开；rootG 距离判别
  已被实测证伪——正常臂根区恒 +.04m，只记录不判）。
- **验收**：check9 全量 24 段全绿（旧 23 段零退化）+ seek 75/75；gate 七步全绿。
  对照帧：`storyboard/p15_limb/ship_020.png`（前：全展直+袖根缝）vs
  `storyboard/p16_reach/fix_020.jpg`（后：屈臂抱盒、袖根连续）。成片重出。

## P17：胸前腕合并 + 襟片穿透（2026-10-11）

用户 0:18s 截图两问：

- **雷晓"左手"腕没入胸面**：诊断=该帧是 hong_arrive 段雷晓 startled（坐姿托盘右手在
  画面左侧=用户视角左手）；腕-胸廓有符号距离 +8.5cm（3D 无嵌入，hand_body_mesh 没报
  是对的）——真因是托盘腕部与胸面**同色剪影合并**。修法=托盘腕前移 4cm（z .19→.23 局部）
  越过剪影平面，腕部落到深色盒底前。对照：ship_018.png vs p17_chest/fix_018.jpg。
- **轰刚外套襟穿臂**：诊断=襟片与垂臂共面（襟在 x±.152、臂管 ±.18），深度探针恒报。
  判别量改为**面片换号穿透**（臂管段端点在襟片法向两侧换号+交点落襟片范围=穿出）。
  修法按优先级①襟片让位（静息底缘前倾 −.06+外张 .14 盖过臂外侧=搭盖合法；前臂前摆/
  上抬时 letOff 纯函数加成）+②静态外张（x×1.22）。0:18 行走帧前臂穿襟修复
  （fix_018 右区 vs ship_018）。
- 探针：`cloth_body` kind（state.cloth）；本段连带修：hong 递签前倾胸廓蹭盒 A/B
  白名单、leiR 超伸豁免窗口边界。25 段全绿，gate 七步全绿，成片重出。
- 写回：physical-completeness.md（C4 补衣物-肢体 + P17 实录节）、physics-gate.md
  （cloth 契约行）、contact-and-hands.md（薄衣片换号穿透 + 同色剪影合并不是嵌入）。

## P18：渲染稳定性类目 C8（z-fight/alpha 闪烁/同色合并终修，2026-10-11）

- **0:18 手腕没入胸口（用户说"还是"）**：精确定位=startled 段托盘右手（画面左侧=
  镜像误读）；腕-胸廓 +8.5cm（无 3D 嵌入）——根因是同色剪影合并残留：托盘手再向右下
  收（V(.16,.84,.22)→V(.15,.85,.20)），前臂剪影落裤/盒沿不叠胸面；胸前"黄色小物件"=
  盒内炸鸡（正常，签 41.2s 前不出现已确认无泄漏）。对照 `p17_chest/cur_018.png` vs
  `p18_flicker/fix_018_now.jpg`。
- **门外白地垫 z-fight**：hut_step 顶面与地面顶面同 y=0 共面 → 抬 2mm（连带扫到
  parapet_n_cap 底面与墙顶共面，同抬 2mm）。
- **铁丝网时隐时现**：alphaTest+默认 mipmap 远距吃掉细线。选型实录：alphaHash（覆盖
  恒定但屏幕抖动噪声随镜头漂移，二阶差更难看→弃）、关 mipmap（远距成亚像素噪点→弃）、
  **双层网面定型**（近景细 repeat 140 / 远景粗 repeat 32，相机 >9m 换层，镜头驱动纯
  函数、换层只在镜头沿）。修复前后连拍 5 帧拼条：`storyboard/p18_flicker/strip_*.png`
  （before 双模式：打架+消失）。
- **新探针 `flicker_probe.py`**（gate 第七步）：成片逐帧二阶差分；watch 区回归带
  （mean 带 [下限=内容消失， 上限=闪烁] + 超阈占比）+ 背景 4×4 角格粗扫（含缓慢内容
  容忍 .045）。修复前片段实测三违全红（地垫打架 10.9/.115、网面消失 .29/.002 低于
  下限），修后全绿。config/flicker_watch.json 声明 watch 区。
- gate 七步全绿（flicker 成片比源码旧会跳过并标注）。成片重出；25 段零退化。
- 写回：physical-completeness.md 加 C8 类目+矩阵列+三例实录与制作纪律（共面件 2mm/
  polygonOffset；细长 alpha 件禁裸 alphaTest+默认 mipmap）；physics-gate.md 工作流
  门禁加第 5 步。

## 遗留

- 「事件音效对画」已进 skill 纪律（build-ambience-foley）；本集其他事件
  （落座/便当/插签/咀嚼/心跳）目前是谱面时刻即音效的约定，若日后重排时间轴，
  全部点位按同一纪律回归。
- 程序嘴在双人全景幅度偏小（逐字跟得上）；特写级嘴形需要时再评估 OmniHuman 类通路。
- 咀嚼 Foley 单采样多点位复用；嫌机械换多采样轮替。
- 混音峰值余量 -5.05dBFS 偏保守，母带如嫌响度低可整体 +3dB 重混（只改 remix 峰值目标）。
- 背机位（小屋正后方）抽帧只拍到墙，门区覆盖靠前/侧两机位+数值探针兜底。
- 咀嚼 Foley 单采样多点位复用（音量 .10-.20）；嫌机械则换多采样轮替。
- 行走段汗滴移至 12.2s（侧背机位贴脸符号必被遮挡，载体限制）；中景汗滴偏小，
  需要时升大汗滴规格。
- 混音峰值余量偏大（-5dBFS），最终母带如嫌响度低可整体 +3dB 重混（remix_audio.py
  改峰值目标即可，对白对齐不动）。

## 与 S1E2 的架构差异

- 角色与积木全部来自 dula-assets（file: 链接，本集零拷贝、零 /craft/ 跨剧集挂载）：
  - 角色 `dula-assets/characters/bioarmor/characters.js`（viewer.html import map 加
    `"dula-assets/"` 前缀映射；bioarmor 内部 bare `three` 由 import map 解析，单例）
  - 积木 `dula-assets/lib/craft3d/{pose,locomotion,look}.js`（twoBone / walkingFeet /
    turningFeet / coolShadowRamp / outlined）
- render.mjs 去掉 fight-trial/fight-final/legacy 三态与 /craft/、/fish/ 挂载，
  静默版恒 `-an` 不接音频；保留 `--check/--serve/--out/--board/--trace/--camera/--range`。
- 无 script.story：`config/timeline.json` 的 segments 直接驱动（viewer 侧映射成 entries）。

## 形象赛璐璐统一（modeling-techniques §9 落地方式）

不改 dula-assets 已验收资产，viewer 初始化时 `celUnify()` 遍历角色 mesh：
- Lambert 衣服 / Basic 皮肤头发 / 3 阶 ramp toon → 全部统一为 MeshToonMaterial +
  共享 4 阶冷阴影 ramp（coolShadowRamp，壳疹 emissive 保留）；
- 例外：BackSide 描边壳、透明/加色光效、`animated_head` 组内脸 canvas 与耳
  （Basic 兜底保五官，逆光条款同款）。
- 角色描边沿用资产自带法线外扩壳（surface.js mesh()/jointInk + 头发壳），不再叠加
  第二套壳；look.js 的 outlined() 用于本集新建道具（便当盒/水壶，线宽 .0006）。
- 阴影：PCFSoftShadowMap + sun.shadow.intensity=.5（压淡，自阴影交给 ramp 阶梯）。

## 场景（scenes/RooftopNoonScene.js）

正午顶光：高角度白光主光（投影）+ 天蓝半球光 + 淡蓝正面补光；闭合渐变球壳天穹 +
程序化积云（toon 阶梯，update 缓移）；水泥地面 canvas 程序纹理（均匀散射、镜像平铺、
世界顶视投影 UV）；铁丝网=菱格 alphaTest 贴图单面片 + 细杆立柱；楼梯间小屋（门朝镜头，
门板纯时间函数开合：雷晓 6.9–7.5 开门/9.2–10.4 带上，轰刚 13.55–13.85 撞开带回弹、17.1–18.3 带上）；水塔
（圆罐+四腿+拉杆）；校舍剪影与中景楼群压低推远、色随雾走。

## 机位（viewer.js camFor）

establish 缓推 / walk 跟拍雷晓 / hong_arrive 摇镜 / two 双人坐姿正打 / offer 递炸鸡
特写 / crack 雷晓近景（右臂侧，微光入镜）/ empty 空拍远景缓移。

## 道具与表演（viewer.js props + performance.js 谱面）

便当盒×3（雷晓随身深蓝盒、轰刚膝上盒、矮沿上炸鸡盒，t≈21.3–22.2 从手上过渡到矮沿）、
竹签炸鸡（41.55 轰刚右手插签递出 → 44.5 雷晓左手接过，手上锚定跟随）、水壶（52.2 前后
轰刚转身够壶，壶身微歪）。咀嚼=嘴 jaw 循环 + 手往复，viewer 口型与谱面共用
`chewCycle()` 相位源。微光一闪：FLASH_T=52.2，谱面输出 flashT 钟形包络，viewer 在
`updateWeaponFX` 日常心跳之上叠加 emissive 提亮再压回。

## 验收（P1）

```bash
node render.mjs --check          # 45 检查帧 + seek 像素容差校验全过（storyboard/r1/check/）
node render.mjs --out craft3d_r1_sample_7_22.mp4 --range 7,22   # 无声样片（出场+入座段）
```

目检要点记录：铁丝网不穿脸（网在人物身后）、坐姿脚底不穿地、脸 canvas 五官正常、
递接/微光/转身节奏正确。已修复：道具在角色未登场时悬空（可见性改跟随
`sl/sh.visible`）、远景楼群悬浮感（压低推远）、便当盒过小（×1.15–1.25）。

## P2（2026-10-10）：动作动漫化分层 + 表情符号化

配方来源：`direct-animation-craft/references/motion-principles-recipes.md` 与
`character-modeler/references/anime-expression-symbols.md`。全部新增运动保持
(t,state) 纯函数，顺序/seek 像素校验全绿（55 帧）。

- 预备：walk_in 起步反向沉身（u<.04，lean -.025）；hong_arrive 挥手=沉肩预备
  （u .03）→急起（.075 到位）→摆动衰减→收回；offer 取签后回拉再急递（2-3 帧到位）。
- 跟随衰减：`settle(t,t0,A,k=10,ω=24)` 解析式；雷晓收步头部余振、轰刚挥手收腕余振；
  左右张望视线→头→肩错开约 2-3 帧。
- 挤压拉伸：`squashPulse(t,t0,depth)`（谷底 .08s≈2-3 帧→回弹→归 1，体积守恒
  xz=1/√sy，只写 body group scale）：雷晓落座 13.80s(.06)、轰刚落座 21.86s(.10)、
  微光瞬间 52.2s(.05)。spect 量化到 15Hz 后 squash 自带作画感。
- 次级运动：便当盒 bob 差分滞后（0.12s，≈解析弹簧）；书包/外套襟/发束尖的阵风摆动
  （`windAt(t)` 阵风包络，空拍段 ×1.8）。
- 一拍二：poseAt 内谱面采样量化 `floor(t*15)/15`（含条目边界缘插值），行走/转身段的
  根与步态相位用满帧率重取（支撑脚钉地不滑）；相机/口型/光效满帧率，时钟分离。
- 轰刚大步：DIMS_HONG.gait=createLocomotion({lift:.075,pitch:.19,sway:.022,hipDelta:.012})。
- 表情符号（billboard 载体——paintFace 在 dula-assets 不能改，且其 canvas 每帧整幅
  重绘无叠加注入点；符号面片挂 headGroup、不进 boil）：汗滴面片（弹入 2-3 帧回弹/
  停留/退场淡出，camera billboard）12.2-13.3 / 27.0-28.2 / 46.7-47.8（双滴）/
  52.4-53.5；豆豆眼黑椭圆片遮原眼（depthTest 关闭防刘海锁片遮挡，仅 31.0-32.0s
  正面镜头启用）；轰刚 ∩ 笑眼用资产既有 emotion='laugh' 分支（offer/crack 已触发）。
- P1 遗留修复：轰刚出场改为两段路径绕行小屋东南角（原路径穿山墙，14-15s 被挡住）；
  铁丝网 repeat 240×13→140×8 + 线宽 3.2，摩尔纹减弱；render.mjs 新增 `--q` 追加
  viewer 查询串（探针用）。

踩坑记录（回本集）：
- billboard 朝向必须在相机定位**之后**计算：seek 直接跳转时相机无历史帧，
  面向 (0,0,0) 的符号面片会背对镜头消失。
- 贴脸符号面片要放在头发壳半径之外（本角色鬓角发片覆盖到半径 ~.15m），
  或用 depthTest:false 按叠层处理。

## 验收（P2）

```bash
node render.mjs --check   # 55 帧，seek 像素校验 passed
node render.mjs --out p2_sample_7_22.mp4 --range 7,22    # 走路+出场
node render.mjs --out p2_sample_40_56.mp4 --range 40,56  # 递炸鸡+笑场+微光
```

证据：`storyboard/r1/check/`（检查帧+seek_check.json）、`storyboard/p2_samples/`（样片抽帧）、
`output/p2_sample_*.mp4`。

## P3（2026-10-10）：音频链 + 带音成片初版

**当前交付：`output/craft3d_r3.mp4`（71.0s，1280×720@30 + AAC 48kHz 立体声）**。
render.mjs 恢复音频接入（assets3d/mixed.wav 存在则 AAC 混流，缺失静默 -an）。

- TTS：seed-tts-2.0，声线锁 S1E2 voice_config.json（雷晓 chanruoshaoye / 轰刚
  rexueshaonian），带标点 tts_text。`tools/synth_lines.py`（key 从 .env.speech 注入进程
  环境，子进程继承——S1E2 同款做法）。QC（qc_lines.py）：**7/7 全 ✅**（时长全在窗内、
  无削波、拼音重合率 86–100%），报告 `assets3d/dialogue/qc_report.md`。
- 视素轨：`tools/build_audio.py`（faster-whisper small DTW 逐字对齐 → fish viseme_core
  V17 连续视素轨），`config/viseme_{leixiao,honggang}.json`（t 单调断言）+
  `final_voice_features.json`（帧级 gate/amplitude）。实测句长全部落窗（如 offer
  3.66s/窗 6.1s）。viewer.js 对白段换视素轨驱动（S1E2 makeLip 同款 chan+gate），
  吃东西段咀嚼 chewCycle 优先，缺文件回退 talkJaw。
- BGM：`assets3d/music/rooftop_noon_theme.wav`，**走 Seed-Audio 纯音乐模式**而非
  Suno——Suno 驱动是浏览器会话灰产，Seed-Audio 是本任务授权的已验证 API 通路，
  75s<120s 单次上限。prompt 锁器乐/无人声/音量平稳。
- 环境床：wind_noon + playground_distant + birds_noon（Seed-Audio，等功率重叠循环，
  bandpass + 0.4s 滑动包络归一化；节律 QC 全过——birds_noon 的 4-8kHz 占比 0.286
  超 0.2 线但蝉鸟高频是内容本体，铺 -34dB，不做扼杀性 EQ）。
- Foley：door_slam 13.95 / door_close 10.1 / sit_down 13.72+21.80 / bento_open
  21.95+22.60 / skewer_pick 41.2 / chew_soft 47.6 及空拍节拍点位（雷晓 3.0s、
  轰刚 2.6s 错开）；52.1s heartbeat_core（S1E2 资产复用，压至 .18 增益——日常集）。
- 混音（`tools/remix_audio.py`）：对白峰一化 .55；BGM -24dB rel voice + duck -8dB；
  环境床 -26/-32/-34dB + duck -2dB；峰值 -5.05dBFS（上限 -1）。柱测：对白段 RMS
  ≈-23dB，非对白段 ≈-40/-45dB。清单 `assets3d/refinement/mix_manifest.json`
  （含各源文件 sha256 与床 QC 前后指标）。

## 遗留

- 对口型为视素轨程序嘴（远景双人镜头下幅度偏小但逐字跟得上）；特写级嘴形精修
  留待需要时评估 OmniHuman 类通路。
- hong_arrive「哟！」的转写丢「这儿」（拼音重合率 86%，✅ 档内）；offer「分着吃」
  转写为「分之吃」属同音字，发音正确。
- 咀嚼 Foley 为同一采样多次点位复用，音量压到 .10-.20；若复听觉得机械再换多采样轮替。
- 字卡仍是纯文字兜底，未接 title-card 帧序列。
- 涂抹帧/残像未启用：本集无超过身高×2/秒的高速段（配方阈值 3.4m/s），按纪律不加。
- 走路段汗滴从 8.6s 移到 12.2s（收步坐定后）：行走中侧背对镜头时贴脸符号必被
  头发/后脑遮挡，属载体固有限制；若要在行走正脸镜头加滴，需让镜头先转到迎面。
- 汗滴在 12.7s 中景距离下偏小偏淡，如需更强可读性可放大到 1.2 倍或换大汗滴规格。

## P19（2026-10-11）：全密度自查（建议封版）

主代理对最新检查帧做全量全分辨率复查（p18_flicker/check2 全 75 帧分批 + 可疑帧放大），
非抽样。新发现仅两例瑕疵级：①38s 远景轰刚屈肘袖+外套在双人之间读成团块（剪影浑，
非穿帮）；②44s 递接帧签被炸鸡球遮挡（签存在，角度遮挡）。其余帧无新发现；
数值层 25 段探针 + flicker + 声画 + seek 全绿。结论：建议封版，两例瑕疵留待用户定夺。
