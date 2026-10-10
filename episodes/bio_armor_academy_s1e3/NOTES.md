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

## 遗留

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
