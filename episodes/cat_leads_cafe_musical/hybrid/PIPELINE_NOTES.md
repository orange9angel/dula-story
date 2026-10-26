# 半拍晴天 · 混合制作（draw-over）试片管线骨架

日期：2026-（本轮）。状态：**管线骨架 + 动作烘焙 + cel 集成试片完成（v2）**。
音频 `assets/audio/final/mixed.wav` 与拍点 `config/dance_beats_v3.json`（130 拍，tempo 103.359375，songStart 19.0）未动。

## 管线图

```
output/half_beat_sunshine_craft3d_v5.mp4 (sha256 锁定, 源片不动)
        │  参考/A-B
        ▼
node tools/render.mjs --serve            ← 既有静态服务 127.0.0.1:4235（不改一行）
        │  同时服务 /craft3d/viewer.html（烘焙源）与 /hybrid/art_pass.html（试片）
        ▼
pipeline.mjs --step prepare              ← 同步 skill 共享 runtime → hybrid/assets/draw_over_runtime/
        ▼
pipeline.mjs --step bake                 ← capture_adapter.mjs 在 craft3d 页面逐帧 capture
        │      产出 hybrid/config/motion_{dialogue_a,turn_b,turn_full}.json
        ▼
hybrid/art_pass.html + art_pass.js       ← 平面舞台：cafe_master_v1.png 底图
        │      + cel-stage/baked-cel-clip/raster-face/cel-integration/motion-controls
        │      + cel_slots.json 槽位（缺图→占位色块+标签，missingAssets 进 state）
        ▼
pipeline.mjs --step render [--render]    ← 不带 --render：配置校验 + 代表帧 PNG
pipeline.mjs --step probe                ← probe_adapter.mjs：关节有限/脚底方差/缺失清单
pipeline.mjs --step package              ← （留配置，未跑）并排对照 output/hybrid_pilot_comparison_v1.mp4
```

## 命令清单（实测结果）

```bash
cd dula-story/episodes/cat_leads_cafe_musical
node tools/render.mjs --serve            # 后台常驻；打印 http://127.0.0.1:4235/craft3d/viewer.html?full=1

node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config hybrid/config/pilot_pipeline.json --step prepare
# → {"prepared":"hybrid/assets/draw_over_runtime"}  19 个共享模块 + shared-runtime.json 哈希清单

node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config hybrid/config/pilot_pipeline.json --step bake
# → dialogueA 271 帧 / turnB 172 帧 / turnFull 196 帧（均含末端边界帧）

node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config hybrid/config/pilot_pipeline.json --step render
# → 通过；15 个代表帧 PNG + samples.json + build.json 写入 hybrid/storyboard/pilot/

node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config hybrid/config/pilot_pipeline.json --step probe
# → exit 1（预期）：关节/接触全绿，唯一 error = 26 个 cel 缺失（试片阶段定义即 failed）
#   报告：hybrid/storyboard/pilot/motion_check.json
```

## 烘焙窗口

| id | 绝对秒 | 帧数@30 | 内容 |
|---|---|---|---|
| dialogueA | 4.0–13.0 | 271 | 对白近景/双人镜 + 敲杯（CeramicPickup 条目 11.9–14.2，tap 敲击点 12.65s） |
| turnB | 17.8–23.5 | 172 | 起身（SunlightPause 17.85–19.0）+ 入歌 step-touch |
| turnFull | 36.9–43.4 | 196 | **第一次完整转身**：beat 32–40（相对 songStart）= 绝对 37.7667–42.4333s |

⚠️ **任务书与实际运行态的偏差（重要）**：任务写 "beat32=18.7667s 起" 并把转身放进
17.8–23.5 窗口。实际 `dance_beats_v3.json` 的 beats[] 是**相对 songStart=19.0** 的
（viewer 里 `beatState(abs - 19.0)`），beat32=18.7667 对应**绝对 37.7667s**。
17.8–23.5 里没有转身，只有起身+入歌。为同时覆盖两种解读，按任务书烘焙了
dialogueA/turnB 两个指定窗口，另加 turnFull（36.9–43.4）真正覆盖转身。
已验证 turnFull 中段 mode='turn'、Girl.yaw 0→2π（Boy 反向）、相机 span 固定 2.78×拍点脉冲：
t=37.80 yaw 0.005 → 38.93 π/2 → 40.07 π → 41.27 3π/2 → 42.40 ≈2π。

## 适配器读到的实际关节清单（19 个/角色，两窗口一致）

```
head neck pelvis spine chest
leftShoulder leftElbow leftHand   rightShoulder rightElbow rightHand
leftHip leftKnee leftFoot leftToe rightHip rightKnee rightFoot rightToe
```

来源：`window.actors.{Girl,Boy}`（craft3d viewer 暴露）→
- `head/neck`：CafeKid 绘画头骨（`a.bones.head/neck`，THREE.Bone）；
- 其余：GLB 蒙皮骨骼 `a.body.bones`（ImportedPerformer，mixamo 名归一化：
  leftarm/leftforearm/lefthand/leftupleg/leftleg/leftfoot/lefttoebase…）。
- 附加：`root`(mesh 世界位)、`yaw`、`projected`（按重建的正交相机投到 1920×1080 像素）、
  `contact`（解剖学左右的 planted）、`soles`（每脚 48 个鞋底采样点的质心/最低 y/planted，screen 键）、
  帧级 `mode/beat`、`camera{position,quaternion,fov:null,orthoSpan}`。

### 踩坑记录：screenSide 映射

`RiggedCafeKid.setPose` 的循环 `[side,screenSide]=[['left','right'],['right','left']]`：
performance 数据的 `leftWrist/leftFoot` 是**角色局部 -x 侧**（面向镜头时=解剖学右脚），
返回的 `joints`/`feet` 以 screenSide 为键——`joints.left` 实为解剖学**右**脚。
适配器已换算成解剖学左右；直接读 `r.limbs` 的人注意别按字面用。

### 相机重建

craft3d viewer 的 camera 是模块局部变量、未暴露。适配器用 `await import('three')`
（页面 importmap）重建同参数正交相机，完整复制 viewer.js 的 span 公式
（isDance 拍点脉冲、turn 固定 {x:0,y:1.15,span:2.78}、对话镜头来自 dialogueAt/performanceAt）。
viewer.js 改动会被 bake.sourceFiles 指纹记录，但不会自动报错——**改了 viewer.js 相机逻辑要同步改适配器**。

## 试片 viewer 设计（hybrid/art_pass.html + art_pass.js）

- 1920×1080 平面合成：`cafe_master_v1.png` 全幅底图 + 顶部/底部轻微明暗渐变。
- 人物层：`cel-stage.js`（WebGL 网格位移）、`raster-face.js`（口型/眨眼三态切换，骨架期 jaw=0 仅眨眼）、
  `baked-cel-clip.js`（turnFull 窗口整身转身帧序列，按 turnStart/turnEnd 进度取帧，Girl/Boy 方向相反）、
  `cel-integration.js` 的 `drawGroundContact`（按 projected 脚点+鞋底世界 y 换算落点，离地时减淡）。
- 摆放驱动：`motion-controls.js` 每窗口一个 controller（`update(t)`+头部 `offsets` 作 cel-stage 的 motion 位移）；
  位置/高度直接取烘焙 `projected` 像素 + `orthoSpan` 换算 ppm。
- 缺图策略：占位色块+标签（身体/脸三态口型/转身 8 帧），`window.state.missingAssets` 报告全部缺失路径；
  `window.ready=true`，`renderAt(t)→{image: PNG base64, state}`。
- 窗口外时间：钳到最近窗口边界帧，左下角画"窗口外预览"条，`state.gap=true`。
- 非 capture 模式有播放/拖动条（无音频，纯画面预览）。

### 踩坑记录：cel 缺失清单不能用 fetch 探测

viewer 初版用 `fetch(path)` 探测文件是否存在——**Chromium 对 404 也会发 console error**
（"Failed to load resource"），pipeline 把所有 console error 当页面错误直接 throw。
改为 `hybrid/assets/cels/manifest.json` 显式登记已落盘文件，viewer 只加载清单内文件，
缺失路径零请求。**原画落盘后必须把文件名加进 manifest.json 的 files**。
这条教训建议由主代理写回 draw-over-animation skill（executable-pipeline.md 的 viewer 约定段）。

## 已知限制 / 未完成项（v1 骨架期；v2 状态见下节）

1. ~~26 个 cel 槽位待主代理生成~~ → v2 已到位并集成；probe 已 passed。
2. 骨架期脸不驱动 jaw（烘焙未含口型）；需要时把 visemes 查表加进 viewer（数据已在 /config/visemes.json）。
3. `pilot.rig` 的关节影响半径/pins 是占位值（420px/m、maxDelta 60），原画到位后必须人工标定 ref/pins。
4. 对话近景里脚在画外（如敲杯镜 span 0.61），烘焙像素坐标会落在 1080 之外——这是真实投影，不是 bug；
   试片里人物相应地被裁出画面，与原片一致。
5. package/integrate 步骤只留了配置，未执行（无原片替换授权，且 cel 未到）。
6. `fov:null`（正交相机），真正有用的是 `camera.orthoSpan`。
7. bake 适配器依赖 `/pilot/performance.js`、`/performance.js` 的 import 路径与 `window.actors` 暴露；
   craft3d viewer 重构时需复查。

---

# v2 集成轮（cel 原画到位后）

## 资产预处理（hybrid/tools/prepare_cels.py + 共享脚本，全部带 sha 报告）

报告：`hybrid/config/cel_prepare_report.json`（清理/镜像/转身帧/家具拆层/蒙版，39 步）、
`hybrid/config/face_compose_report.json`（锁区外零差分断言）、`hybrid/config/face_crops_report.json`。

1. **清理+defringe**（`prepare_cels.py`，PIL+scipy）：7 张新 cel + 2 张身份锚复制体。
   杂点清理=alpha>32 连通域 <64px 删除（girl_sit 25px、boy_sit 18px、其余 ≤7px；girl_back 发帘
   层次与主质量连通，未误删）；defringe=半透明边像素取最近不透明色（2.4万-9.7万 px/张，
   含 cafe_table_fg 的红黄流苏 97317px）。
   ⚠️ 踩坑：`scipy.ndimage.distance_transform_edt(..., return_indices=True)` 在
   return_distances 默认 True 时返回 **(距离, 索引) 二元组**，索引本体形状 (2,h,w)；
   直接 `ind[0][edge]` 会拿到距离矩阵（float64）。已按二元组解构修正。
2. **脸槽 512×512**（共享 compose_cel_regions.py + prepare_cel_crops.py）：
   closed=原肖像裁脸框（girl (330,180,960,810) / boy (350,140,990,780)，四态同框）；
   half/open=嘴窗（girl [520,520,280,140]、boy [560,480,270,130]）羽化 8px 锁回；
   blink=眼窗（girl [380,340,550,140]、boy [400,300,560,140]）锁回；锁区外零差分 ✓。
   之后 `prepare_cels.py --mask` 加椭圆羽化蒙版（只露皮肤+五官，头发让位给底层身体 cel，
   避免与坐姿 cel 发型互叠；girl 中心(256,236)半径(154,203)，boy (260,264)/(150,200)，feather 14）。
3. **转身 8 帧**（512×768，anchor[256,720]，人高统一 700px，脚底中心对 x=256）：
   ⚠️ 与任务书单映射的偏差：dance-v5 里 Girl 转 +2π、Boy 转 -2π（相反方向），
   1/4 圈时 Girl 面向画面**右**、Boy 面向画面**左**。帧序列按各自方向生成：
   boy=[正,正,侧,侧,背,背,侧镜,正镜]（=任务书），girl=[正,正,侧镜,侧镜,背,背,侧,正镜]；
   viewer 两侧统一 direction=1 按 yaw 进度取帧。
   **Boy 镜像帧 rim 光方向翻转——世界光向合理性开放风险，待主代理/监制判断。**
4. **家具拆层**：alpha 谷底分列 x=583/x=1338 → `cafe_chairs_layer.png`（双椅，后层）/
   `cafe_table_layer.png`（桌+杯碟+笔记本，前层遮挡下半身）。
   已知瑕疵：分列边界条带的可见面归属有少量错分（桌角条带进椅层、椅侧条带进桌层），
   影响仅在人物与条带相交时的遮挡次序，试片尺度不可见。
5. manifest.json 全量登记（53 文件），viewer 只按清单加载（404→console error→pipeline 失败的规避）。

## viewer v2 接线（hybrid/art_pass.js）

- 舞台（背景板+家具层）按窗口 `stageRef` 相机整体 pan/zoom（dialogueA/turnB ref={x:-1.3,y:1.47,span:2.08}，
  turnFull ref={x:0,y:1.15,span:2.78}）；人物按烘焙 projected 像素落位，脚底贴 sole 世界 y。
- dialogueA：坐姿 cel + 椅层（后）/桌面层（前）+ raster-face 三态嘴（jaw 来自 `config/visemes.json`
  按 floor(t*100) 查表）+ 周期 blink；脸片锁在坐姿 cel 标定位（girl cx515 cy270 w350 / boy 515,262,340，
  经 t=12.65 特写抽帧目视对齐）。
- turnFull：baked-cel-clip 8 帧按转身进度取帧 + drawGroundContact（planted=false 时减淡）。
- turnB：起身交叉淡入（坐姿→站姿 0.6s），**未完工**；窗口全程画"未完工"角标。
- 脸 overlay 仅坐姿段；转身段用帧序列自带画脸。

## 试片产物（ffprobe 实测）

| 文件 | 画幅 | fps | 帧数 | 时长 | 音轨 |
|---|---|---|---|---|---|
| output/hybrid_pilot_dialogue_a.mp4 | 1920×1080 | 30 | 270 | 9.000s | aac 192k，来自 mixed.wav 4.0–13.0s |
| output/hybrid_pilot_turn_full.mp4 | 1920×1080 | 30 | 195 | 6.500s | aac 192k，来自 mixed.wav 36.9–43.4s |
| output/hybrid_pilot_dialogue_a_comparison.mp4 | 3840×1128 | 30 | 270 | 9.000s | A/B 对照 |
| output/hybrid_pilot_turn_full_comparison.mp4 | 3840×1128 | 30 | 195 | 6.500s | A/B 对照 |

渲染：pipeline `render --render`（dialogueA 270 帧 11 项确定性检查通过；turnFull 195 帧 9 项通过），
随后用 mixed.wav 对应窗口重mux音轨（c:v copy，不动画面）。
package：两窗口均 passed，音频相关性 0.9997/0.9993、偏移 0.0ms（对源片）。
probe（pilot_pipeline.json）：**passed=true**，missingAssets 空，关节有限性与脚底方差全绿。
交付明细：hybrid/storyboard/pilot_{dialogue_a,turn_full}/delivery.json + overview 帧列。

## 观察到的明显画面问题（不做审美结论，供主代理审片）

1. **敲杯插入镜（t≈12.65）构图丢失**：原片此处是桌面敲杯特写；试片是平面舞台整体缩放，
   杯与手落在画框外，画面成小蓝半身特写。stageRef 平面近似的固有偏差，需要该镜头专用
   ref/构图或干净桌层对齐。
2. **对话广角人物"坐空气"**：椅层在人后、桌层在前，但 3D 里人与桌椅的深度关系（z=-1.35）
   在平面合成中丢失，人坐在椅子前方悬空；脚有接触影但与椅子无接触关系。
3. **转身 8 帧量化粗糙**：f4/f5 背帧覆盖 180°–270°，180° 精确点（u=0.5 边界）附近仍显示侧面帧；
   无过渡画，45° 一档跳变明显；脚底锚定静止、无搓步（烘焙帧序列不携带脚步位移）。
4. **Boy 后半圈 rim 光随镜像翻转到画面左**（原画 rim 在右）——世界光向自洽性开放风险。
5. 试片无字幕/标题卡（原片有烧入字幕）；blink 为固定周期，与原片程序眨眼不同步；
   转身段脸用帧序列自带画（无 raster-face 叠加）。
6. 椅/桌相对人物比例偏大（fg 板按参考构图绘制，人物按烘焙身高），广角里椅子显得高。

## 未完成项（v2 收尾时）

1. turnB 起身窗口：交叉淡入占位，未做真实起身过渡画/过渡帧。
2. 敲杯插入镜构图（上述问题 1）未修——需要镜头级 stageRef 或桌层重对齐。
3. 坐姿段缺座椅接触（问题 2）——需要按 z 深度分层或人物后移。
4. rig 的 pins/影响半径仍是占位（420px/m、maxDelta 60）；motion 形变幅度小，尚未人工标定。
5. integrate（接回正片）未授权未执行；`source.sha256` 与烘焙指纹均在 package 断言通过。

---

# r2 修正轮（主代理复看 r1 后的四条修正，全绿）

版本约定：r1 试片改名 `output/*_r1.mp4`（4 个）保留；新片用默认名（r2 现行）。
r2 产物 sha256：dialogue_a `e7cdad10…`，turn_full `24c063c3…`，
对照 `b482604e…` / `6c274d19…`。

## 修法与踩坑

1. **敲杯插入镜（P0）**：
   - 背景板改为按真实世界矩形（craft3d/viewer.js 的 6.45×3.6297 @ (0,1.05,-3)）用烘焙相机
     （position+quaternion+orthoSpan，含 2.9° 俯仰）三点仿射投影——所有镜头的背景取景从此与原片一致，
     取代 r1 的 stageRef 平面近似（r1 在特写时把舞台绕画面中心缩放导致杯/手出画）。
   - 家具改世界锚点+真实投影：桌层以**杯中点**锚定（plate px [744,400] ↔ 世界 (-1.66,0.86,-1.05)，
     杯世界位置=烘焙 Girl.leftHand 敲击位下方）；`metersPerPlatePx: 0.00125` 为板绘比例标定。
   - 手：无持勺原画，最小实现= girl_sit 合十双手**肤色抠图**贴片（skirt/膝盖背景已抠除），
     跟随烘焙 leftHand（tapLift 12.65/13.25 敲击行程 35px 在烘焙里）；**勺在 viewer 运行时按
     手→杯中点连线程序绘制**（柄+勺头），保证任何取景下接触可读。
   - 验证：hybrid/review/fix_r2/tap_{12.45,12.65,12.85}.png —— 杯+手+勺同框，敲击行程可读。
2. **座椅接触与比例（P0）**：椅层拆左右单椅（贴身裁切），座垫锚点（crop 内 [194,301]）逐帧对齐
   角色烘焙 pelvis（y 再降 seatDrop 0.064m 入座）；桌层保持腰/腹前遮挡。广角验证帧
   wide_9.50_seat_contact.png：臀-座垫贴合可见。家具比例由 1.925e-3 → 1.25e-3 m/px（约 0.65 倍，
   比任务建议的 0.8-0.85 更收——0.82 时椅背高 1.37m 仍超 seated 人高，按实际画面判定）。
3. **转身脚粘地（P1）**：每拍 bob ≤5px（sin(π·frac)）+ rotation ±1.5° 交替 + 烘焙脚中点-髋部
   投影差驱动水平摆动（±14px 限幅）。**踩坑：cel-stage 的 view.roll 绕画面中心变换，把角色甩到
   屏中央（两人重叠悬浮）**；正解是 clip.place 定帧后再用 cel-stage 的 `rotation` 参数（绕自身
   锚点）重放几何。证据：samples.json 的 bobPx/rot/sway 逐拍变化 + review 帧列。
   turnFull 末端（abs≥42.7）Boy 近景叠 raster-face（front 帧 [7,0] 限定，jaw 按 visemes），
   turn_r2_boy_face_43.20.png 可见脸片对齐（下颌有轻微蒙版边，见遗留）。
4. **字幕（P1）**：viewer 读 config/subtitles.json 按原样式（600 40px YaHei、描边 #243748、
   角色分色、♪ 前缀、y=1018）烧入；subtitle_dialogue_5.50.png / turn 各帧可见。

## r2 复跑结果

- render --render：dialogueA 270 帧 11 项确定性检查通过；turnFull 195 帧 10 项通过。
- 音轨：mixed.wav 对应窗口重 mux（c:v copy）。
- probe：passed=true，missingAssets 空。
- package 两窗口 passed：音频相关性 0.9997/0.9993，偏移 0.0ms；delivery.json 更新。

## r2 遗留问题（如实）

1. 敲杯镜的手贴片是"合十双手"，且与小蓝手臂无连接（悬浮手）；坐姿 cel 自带的手仍在其膝上
   （画面里同时有两双手）。需要专用持勺手/臂原画才能根治。
2. 转身 8 帧量化不变（45°/档、无过渡画、无真搓步）；bob/rotation/摆动是节奏提示而非落脚。
3. Boy 后半圈 rim 光随镜像在画面左（世界光向开放风险，同 v2 记录）。
4. Boy 近景脸片下颌处有轻微椭圆蒙版边（feather 14px 处可见轮廓差）。
5. turnB 起身仍只有交叉淡入（未完工）；片头/片尾卡不做（任务范围外）。
6. 桌面层在女孩近景镜（非敲杯）对其腰腹的遮挡偏弱（桌层锚定杯位，近景时桌沿低于腰线）；
   对话广角与敲杯镜遮挡正确。
7. 敲杯第二击 13.25s 在 dialogueA 窗口（4.0–13.0）之外，本试片只含第一击。

---

# r3 作画层轮（批次 3 关键画接入，probe/package 全绿）

版本：r2 四个文件改名 `*_r2.mp4` 保留；当前默认名为 r3。
r3 产物 sha256：dialogue_a `3f0b2944…`，turn_full `267652f4…`，对照 `d4895eea…` / `489ab1ce…`；
无勺桌面变体 `cafe_table_layer_nospoon.png` sha `82dbec83…`。

## 接入内容

1. **表情供体时间轴**（供体整换、禁叠化；jaw 仍按 visemes 驱动嘴窗）：
   tease/focus 供体用**眼窗+嘴窗双窗**锁回（眉眼联动）；half/open/blink 在表情基图上沿用 r2 供体窗；
   裁切框与椭圆蒙版同 r2。Girl：tease @ abs [4.0,6.16]∪[9.7,11.67]∪[11.9,13.0]；Boy：focus @ [6.6,9.36]。
   invite/lookup 只产 closed 基图（预留整片，本轮未接线）。
2. **敲杯根治**：abs≥11.9 切 girl_sit_reach（手臂相连持勺），12.65±2帧 切 girl_sit_tap（勺触杯沿），
   之后回 reach 至窗口末；r2 的悬浮手贴片与程序勺已移除。
   **偏差记录**：批次3 reach/tap 关键画手臂伸向**画面左**，而杯在画面右（世界 +x，烘焙 leftHand 证实）——
   运行时以 cel-stage scaleX:-1 水平镜像适配（口袋/刘海随镜像，tease 单侧嘴角也翻侧）；
   是否重生成右伸手版本由主代理决定。spoonTipPx（原图坐标）逐 cel 实测：
   reach (395,665)、tap (160,770)；敲杯特写时桌层杯锚点直接对齐勺尖屏幕位（接触钉住优先于世界锚定，
   仅 span<0.8 特写生效，广角保持世界锚定）。
3. **无勺桌面 story-state**：`cafe_table_layer_nospoon.png`——碟上勺（plate px (648,403)-(717,434)）
   用碟面正下方区域回补+4px 羽化（第一版取碟右侧供体带入杯底碎片，已换正下方供体）；
   abs≥11.9 切换（勺已在女孩手中）。
4. **转身 5 相位关键画**（替代 8 帧中性站姿旋转）：front_open [0,.58) → side_cross [.58,1.74) →
   back_open [1.74,2.90) → side_cross 对侧 [2.90,4.07) → front_open 收势（叠 5px 下沉）[4.07,4.67)；
   转前/转后（36.9–37.77 / 42.43–43.4）用 stand 正面。镜像规则按转身方向：
   Girl +2π 前侧段镜像、Boy -2π 后侧段镜像。每相位保持 ≥17 帧（满足一拍二；无更短循环）。
   脚底锚定用逐张实测的 contentTop/Bottom + 底部 60 行脚底质心 footX（hybrid/config/turn_key_measures.json），
   接触影逐帧跟烘焙脚点；bob ≤3px、rotation ±1°（小于 r2，关键画自带重心）。
   front 相位双角色叠 raster-face（jaw 驱动），侧/背不叠。
5. **probe 新断言（R2-F1）**：按烘焙 yaw 推导期望关键画并与 renderAt 实际 cel 比对——
   37.80 front_open / 38.93 side(mir) / 40.07 back_open / 41.27 side（对侧） / 42.40 front_open，
   10/10 通过；另有表情供体 5/5、敲杯 cel 4/4 断言（报告 hybrid/storyboard/pilot/motion_check.json）。

## 复跑结果

render --render：dialogueA 270 帧 11 项、turnFull 195 帧 10 项确定性检查通过；音轨 mixed.wav 窗口重 mux。
probe passed=true（missingAssets 空）。package 两窗口 passed（音频相关性 0.9997/0.9993，偏移 0）。
验证帧：hybrid/review/fix_r3/（16 张：表情边界×5、敲杯三点+有勺对照、声画联查、转身五相位+Boy 脸）。

## r3 遗留问题（如实）

1. reach/tap 关键画为左伸手，运行时镜像使用（口袋/刘海/嘴角翻侧）——待主代理裁定是否重生成。
2. 敲杯特写里桌层为对齐勺尖整体下移（杯位=cel 勺尖），桌沿与原片透视有出入；广角不受影响。
3. 转身关键画间无过渡画（45°→90° 相位切换为硬切）；交叉步脚底与烘焙脚点有小位移差
   （cel 按 footX 质心锚定，关键画交叉步的前/后脚与实时脚位不完全一致）。
4. tease/focus 供体在广角景别差异较细微（眯眼/垂眸在 1080p 广角里幅度小）；近景可读。
5. turnB 起身窗口仍只有交叉淡入（未完工）；invite/lookup 未接线（整片阶段）；第二击 13.25s 在窗口外。
6. 转身 front 相位脸片叠加以 projected.head 定位，与关键画画内头部有 ~10px 级残差（大头画形）。

---

# r3.1 修复（R3-F1：front 相位双重脸）

- 原因：front 相位脸片锚点用烘焙 projected.head（3D 中性站姿头位），front_open 关键画
  （手臂展开、重心偏移）的画内头位不同 → 脸片错叠出第二张脸。
- 修法：front_open（含 settle 段）脸片改为**按该 cel 实测锚点锁定画内坐标**：
  girl {cx:505,cy:200,w:316}、boy {cx:512,cy:225,w:324}（1024×1536 cel 坐标系，裁图实测），
  存 `cel_slots.json → turnKeys.front_open.faceAnchor`；stand 正立段沿用 projected.head（r3 已验证）。
  dialogueA 坐姿脸片未动。
- **教训（待主代理写回 skill）：脸片锚点必须按每张关键画实测，不能沿用同角色其他姿势的标定。**
  同理适用于任何"画内特征点"（手/脚/道具接触点）——姿势变，标定变。
- 重渲 turnFull：195 帧 10 项确定性检查通过；probe passed（相位断言 10/10 不变）；
  package passed（音频相关性 0.9993，偏移 0）。r3.1 产物 sha：turn_full `a05a3386…`、对照 `4f36a42f…`。
  dialogueA 未改动（保持 r3 片）。验证帧（同机位重出）：hybrid/review/fix_r3/phase_front_37.80.png、
  phase_front_settle_42.40.png——双重脸消除，脸片贴合（42.40 帧小蓝闭眼笑、阿澈口型随 jaw）。

---

# r4 边缘工艺修复轮（P0-1 亮边 halo / P0-2 脸片蒙版边 / P-D6 衣领）

版本：r3/r3.1 四个文件改名 `*_r3.mp4` 保留；当前默认名为 r4。
r4 产物 sha256：dialogue_a `a52027b6…`，turn_full `062445f7…`，对照 `bfbc8f62…` / `ea7effac…`。

## P0-1 defringe 亮边 → 颜色去污（"不准提亮"）

- 根因：旧 defringe 把半透明边带无差别替换为最近不透明像素色；线稿描边本身是半透明的，
  alpha 腐蚀后"内侧"已是亮色填充区 → 暗描边被换成亮色 → 亮背景前读作白抠图边
  （boy_turn_side_cross 亮边 0.2%→12.1%）。
- 教训一（写回 skill 候选）：**线稿 cel 的描边芯是不透明深色、边是半透明深色；
  "内侧取色"必须取到描边芯，且只允许处理亮污染像素**。
- 新算法（prepare_cels.py defringe v2）：只处理 半透明且 lum>200 的亮污染边，
  取 4px 盘内、alpha≥250 腐蚀 2px 内侧中**亮度最低**的像素回填（挖到描边墨色）；
  暗边保留原色（PNG 直存 alpha 下暗描边本来就能正确合成）。
- 结果：所有 *_clean/stand 文件亮边 ≤0.16%（原图 0–1.5% 水平回归），暗边占比无恶化
  （逐文件前后统计见 cel_prepare_report.json → edgeStats）。
- 另：弃用并删除 r2 的 16 张中性转身帧（girl/boy_turn_0..7）与手贴片 girl_hand_spoon_patch
  （r3 起不再引用）。

## P0-2 脸片蒙版亮边（16-17% → 3-4%）

- 迭代过程：椭圆扩径（更糟：底边落进亮颈部）→ 手调多边形（bandmap 逐簇定位 3 轮）→
  **auto_poly 数据驱动**：按 512 脸图亮度场，顶边/鬓角/下颌逐列（行）搜最暗带
  （发际线、鬓角发缘、下颌描线-颈影），搜索区间带约束（不压眼窗/嘴窗）。
- 关键教训二（写回 skill 候选）：**羽化带压在亮色下巴皮肤上必亮边——非对称羽化**
  （内侧 3px / 外侧 12px，poly_mask），边界沿描线走，外延落颈影。
- 结果：girl 脸片 16.9%→3.4%、boy 17.3%→3.9%（残余为刘海间隙与下颌尖的零星小簇，
  非连续环带）；近景帧目检无可见蒙版边（fix_r4/boy_collar_jaw_7.0.png）。
  未达 ≤1.5% 硬指标——如实记录：脸片边界必须覆盖皮肤区，纯数值达标需要皮肤-皮肤
  色调完全一致的源画对；当前以目检为准。
- 派生层（椅/桌拆分、无勺补丁）暗边不做同图前后比对（内容不同），报告里标注 n/a。
- **流程固化**：cel 预处理与脸片合成后必须跑 `python hybrid/tools/prepare_cels.py --stats`，
  判据 alpha 30–220 带内 lum>200 ≤1.5%（亮边不新增）+ lum<60 不恶化（线稿保护），
  结果写入 cel_prepare_report.json → edgeStats。主代理将写回 skill。

## P-D6 衣领双重线：disproven

dlg 本地 3.0s（abs 7.0）衣领区抽帧 vs boy_sit_clean 源画同区对比：嵌套 V 形褶皱阴影
为源画自身设计（证据帧 fix_r4/dlg3_collar_frame.png + boy_sit_collar_src.png），
非合成重影。r4 蒙版改版后颌部也无叠加边。

## 复跑

render --render 两窗口（270+195 帧，确定性 11+10 项过）→ mixed.wav 重 mux →
probe passed（相位 10/10、表情 5/5、敲杯 4/4 断言不变）→ package 两窗口 passed
（音频相关性 0.9997/0.9993，偏移 0）。验证帧：hybrid/review/fix_r4/（亮墙发缘×2、
衣领+颌部×2、敲杯、tease 表情、P-D6 证据×2）。

## r4 遗留

1. 脸片亮边残余 3.4%/3.9%（零星簇非连续环带；≤1.5% 需源画色调一致，见上）。
2. auto_poly 搜索区间是本剧两张肖像标定的（FACE_SEARCH），换角色需重标定区间。
3. 其余同 r3（镜像 reach/tap、转身硬切、turnB 未完工、invite/lookup 未接线）。

---

# r5 路线纠正（撤销整脸贴片 → 同头眼/嘴窗整换）

主代理裁定：512² 脸片叠到身体 cel 头上的路线违反 draw-over-animation 既定图案
（嘴窗/眼窗在同一个头上整换；近景用整张肖像当镜头），并已造成三次接缝缺陷
（R3-F1 双重脸、P-D4 椭圆边、41.9s 刘海犄角——犄角即错位脸片的发区残影）。本轮全撤。

## 新路线实现

- **离线变体**：供体窗（已验收表情变体的嘴窗/眼窗，肖像坐标）仿射缩进目标 cel 的
  **逐张实测**眼/嘴框（1024×1536 坐标，grid 标定，值在 cel_slots.json → faceActing.cels；
  遵循 R3-F1 教训：不沿用别的姿势的标定）。生成 donor plate 后走共享
  compose_cel_regions.py（feather 6px，preserveAlpha，锁区外零差分断言）：
  30 个变体（girl_sit/reach/tap × tease、boy_sit × focus、front_open×2；
  嘴 half/open × 眼态 + blink×closed），产物 hybrid/assets/cels/variants/。
- **运行时**：viewer 按 eyesTimeline（tease/focus）+ blink（仅闭嘴帧）+ jaw 三态嘴
  选择变体 cel 整换，禁叠化；无变体的姿态（stand/侧/背相位）用基图本体。
  raster-face 贴片层、faceOverlay、turnFace 配置全部移除；512² 脸片文件已删除
  （原始 *_v1 供体保留为窗口源）。raster-face.js 仍可用作"整头即镜头"的近景路线
  （s1e2 用法），本集贴片用法不再出现。
- turnFull：front_open/settle 相位用变体嘴窗（jaw 驱动）；侧/背无嘴部处理；
  刘海犄角帧（41.87s）验证已消失（fix_r5/settle_boy_head_41.87_horn_report.png）。
- dialogueA：坐姿/敲杯 cel 自身脸上的眼窗+嘴窗整换；tease/focus 语义保留；
  闭眼弧线仍来自 blink 供体眼窗。

## 踩坑记录

- variants/ 子目录文件在 manifest.json 里带前缀而 viewer 按文件名匹配 → 全数落占位。
  manifest 一律登记纯文件名（write_manifest 已修）。
- 嘴态阈值沿用 raster-face 约定（jaw>.32 open / >.075 half）。

## 复跑（全绿）

render --render 两窗口过（270+195 帧，11+10 项确定性检查）；mixed.wav 重 mux；
probe passed（相位 10/10、眼态 5/5 + 口型联动 1/1、敲杯 4/4、missingAssets 0）；
package 两窗口 passed（音频相关性 0.9997/0.9993）。
r5 产物 sha256：dialogue_a `d1a2b702…`，turn_full `f14978c2…`，对照 `c0970350…` / `ad5d0521…`。
验证帧：hybrid/review/fix_r5/（settle 段阿澈头部帧列×5、开口/半开/闭眼/tease/focus 近景×5、敲杯×1）。

## r5 遗留

1. reach/tap 关键画镜像使用（口袋/刘海/tease 嘴角翻侧）——仍待主代理裁定重生成。
2. 供体窗→cel 框为非等比仿射（脸宽比差异），近景细看嘴形略有压扁/拉伸。
3. blink 仅在闭嘴帧叠加（说话中不眨眼）；眨眼时机为固定周期，与原片程序眨眼不同步。
4. stand cel（起身/转前转后）无嘴窗变体——转后段（42.43-43.4 歌词仍在）嘴部静止，
   需补 stand 的 celFaces 标定（下一轮可做）。
5. turnB 起身交叉淡入未完工；invite/lookup 供体未接线；敲杯第二击在窗口外。

---

# r5b 修复（阿澈 focus 眼窗暗带）

- 根因：眼窗供体矩形（boy (400,300,560,140)）上缘吃进了眉毛与刘海暗色发缘带，
  且供体→目标框为非等比拉伸填满，压进不匹配的框 → 眼部读作蒙眼横带。
- 修法（两条都按任务要求）：
  1. 眼窗供体只取眼球/眼睑区，逐角色重测：girl (475,412,350,72)、boy (475,418,380,70)
     （肖像坐标；眉/发缘带在上缘之外，经 grid 刻度图逐供体目检）。
  2. 供体→目标框改为**等比缩放居中**（scale=min(tw/dw,th/dh)，宁可小一号居中），
     compose 锁区矩形=实际落点足迹；嘴窗不变（r5 已验证）。
  3. 目标眼框逐 cel 重标定（紧贴双眼外缘，grid 目检；值在 cel_slots.json → faceActing.cels）：
     Girl_sit (445,212,172,52) / Boy_sit (438,218,180,50) / Girl_reachCel (438,214,174,52) /
     Girl_tapCel (448,254,176,50) / Girl_turn_front_open (428,200,176,52) / Boy_turn_front_open (422,240,182,50)。
- 小蓝侧复查：tease/blink/half/open 各 cel 框贴合（variants_r5b 目检 + fix_r5b 帧）。
- 变体重生成 30 个，锁区外零差分断言全过。
- 教训补充（写回 skill 候选）：**供体窗上缘先排眉睫暗带；窗口仿射一律等比居中**；
  目标框紧贴特征外缘（宁小勿大，锁区羽毛在框内收敛）。
- 复跑：render 两窗口过（270+195 帧）→ probe passed（相位 10/10、眼态 5/5、口型联动 1/1、
  敲杯 4/4、missingAssets 0）→ package 两窗口 passed（相关性 0.9997/0.9993）。
  r5b 产物 sha256：dialogue_a `1f4f0db0…`，turn_full `414a39bf…`，对照 `646dc5c5…` / `092206e3…`。
- 验证帧：hybrid/review/fix_r5b/（boy_focus_abs7.2 同机位、boy_focus_open_abs7.5、
  girl_tease_abs5.0 对照、wide_blink_abs9.5 广角双人）。

---

# r5b/r6（眼窗收窄 + 逐关节驱动层）

## r5b→r5c：focus 眼窗深色横带根治

- 原生分辨率裁区确认：供体窗 (475,418,380,70) 横向吃进肖像两侧刘海尖（暗色发缕垂入
  y418-488 带），缩进 cel 眼框后向太阳穴溢出成横带。
- 修法：boy 眼窗横收窄至 (500,418,330,70) 纯眼球/眼睑（供体暗色含量实测：眼周内容
  x≈480-860，刘海尖侵入区 x<500 / x>830）。girl 窗不变（r5b 已验收，其窗未含发尖）。
- 验证：fix_r6/boy_focus_eyes_native_crop.png（**原生分辨率裁区**，非降采样整帧——M4 教训：
  整帧经查看工具降采样后看不见这个尺度的问题）。

## r6：motion-controls 逐关节驱动层（转身段告别纸片人）

接法（依据 executable-pipeline.md + motion-controls.js）：
- `hybrid/config/rig_turn_cels.json`（主代理逐张人工标定）→ 每相位 cel 一个 rig：
  `{actor, ref=相位起点帧, pins=支撑脚固定点, j=关节 cel 像素高斯区}`；镜像帧 x→1024-x 派生。
- 每角色一个 createMotionController（motion=turnFull 烘焙；pixelsPerMeter = cel 人高/实际身高：
  girl 885、boy 730；maxDelta 38 限幅；pinRadius [90,80]）。
- 增量 = 当前烘焙帧 − 相位参考帧（同关节、去根位移、world 米→cel px）；
  cel-stage place() 的 **warp(u,v)** 通道施加（注意 warp 返回的是**屏幕像素**增量：
  deform 在 cel 像素空间计算后要乘 p.height/1536 的显示比例——直接当 cel px 传会按
  相机缩放失真/不生效）；pins 在 deform 内把固定点增量归零（支撑脚不滑）。
- 整图 bob/rotation/sway 保留（±1°/≤3px），相位边界仍整画切换，一拍二保持
  （同一幅画网格连续变形，不是 redraw）。
- **踩坑**：front_open 起手/收势两个相位共用一个 celKey，rig 的 ref 被收势相位覆盖
  （ref=148 顶掉 26）→ 变形量爆炸。修法：rig 键加相位后缀（@ph4），deform 键与
  cel 图像键解耦。教训（写回 skill 候选）：**同一幅画在多个时间段复用时，
  每段时间窗需要各自的参考帧 rig 条目**。
- probe 新断言（motion_check.json → driveChecks，80 项全过）：
  (a) 施加量 == 烘焙位移经 maxDelta 限幅（逐关节逐轴 wiring 等值断言；
      大摆动处 baked ±200-380px 被限幅到 ±38 是刻意防橡皮化，非 bug）；
  (b) pins 支撑脚位移 = 0px（<2px 阈值）；(c) 相位内确有显著关节运动（maxBaked>20px）。

## 产物与验证

- 复跑：render 两窗口过（270+195 帧）→ mixed.wav 重 mux → probe passed（全部断言）→
  package 两窗口 passed（相关性 0.9997/0.9993）。
- r6 产物 sha256：dialogue_a `fc2e1299…`，turn_full `61a67883…`，对照 `f351d3f1…` / `e0097d77…`。
- 验证帧 hybrid/review/fix_r6/：drive_seq_0..5（back_open 相位内 39.6-40.6s 连续 6 帧整帧
  + 同区臂腿原生分辨率裁区 *_armleg_crop.png）、boy_focus_full_abs7.2.png +
  boy_focus_eyes_native_crop.png（原生裁区）、tap_12.65.png。

## 纪律违规自报

r5/r5b 的默认名产物被本轮重渲覆盖前未改名（r5b 片丢失；r1/r2/r3 保留完好）。
r5b 如需重建：boy 眼窗回退 (475,418,380,70) + 撤驱动层即可确定性复现。
教训：重渲前先改名，把"改名"写进每轮 checklist 第一步。

## r6 遗留

1. maxDelta 38px 限幅下大摆臂被压到约 1/5-1/9 幅度（防橡皮化与运动量的取舍，
   需要更大表现时按 skill 加过渡画而不是放开限幅）。
2. 驱动只覆盖转身 5 相位；对话段身体仍是摆位+breath/motion 参数微动（未接关节驱动）。
3. stand cel 无嘴窗变体；blink 固定周期；turnB 未完工；同 r5 其余项。

---

# r7 路线重建（批次 4：8 相位真画 + 同图表情变体；按 skill 开工前路线核对执行）

路线归属书面核对：转身段=**关键画序列**（每相位一张独立画，walk-cycle 链式）+**驱动层**
只做相位内微调（头/手/重心，maxDelta 30）；对话段表情=**同图局部编辑贴回**
（裁区→编辑→贴回原点，零缩放）。已否决项均未用：无整图摆放冒充、无网格扭曲换腿、
无跨图窗口移植、无整脸贴片。验证证据含原生分辨率裁区。

版本：r6 四片已先改名 `*_r6.mp4`（本轮吸取 r5 覆盖教训：改名在重渲前）。
r7 产物 sha256：dialogue_a `4b98e4b3…`，turn_full `56808bf4…`，对照 `0e1d4512…` / `06ee9824…`。

## 转身窗口（8 相位）

- **转向序列与烘焙的关系（关键判断，实测依据）**：批次4 的画序列是"左起转"（T2 侧面朝左），
  而烘焙女孩 yaw 为 +2π（90° 时面向画面右，原片 38.93s 帧两人相对已核实）。8 张画覆盖全部
  朝向 → 统一映射 `yawN = (-yaw mod 2π)`、扇区中心对齐标称角：女孩按画序**反向播放**
  （她的 T2 出现在烘焙 270°=面朝左时 ✓），男孩正向。任意烘焙 yaw 下画朝向均与原片一致
  （probe 相位断言 10/10 实证；男孩 T1/T2 朝向经逐帧放大核对）。
- 配准：共享 `stabilize_cel_anchors.py`（脸/髋/支撑脚底锚定；髋锚点逐张 grid 目检，
  t 相位头锚点=顶部质心近似，batch3 三张沿用 rig_turn_cels 标定头点）→ `assets/cels/turn_reg/`。
  配置与记录：hybrid/config/stabilize_turn7_{girl,boy}.json + turn_reg/registration.json。
- 驱动层 rig 改用 `turn7_measures.json`（配准后实测：支撑脚 pin、头框、手粗框；
  腿/膝移出 rig——换腿由画承担）。相位参考帧=该相位在角色 yaw 序列中首次出现的烘焙帧
  （viewer 初始化时扫描，yaw 反向→女孩的相位时间序反向，参考帧随之正确）。
- 转后段 42.43–43.4 回 stand cel（无嘴窗——路线纪律，见遗留）。

## 对话窗口（同图表情变体）

- 批次4 同图变体实测为**整头部裁区重绘**（非严格局部编辑；强差异遍布裁区），且白底。
  贴回法：整裁区 RGB 取变体、**alpha 恒取底图**（剪影/发丝不漂）、内饰按底图 alpha 加权
  （防白底污染发丝边）；嘴区组合从嘴变体按 mouthRect 羽化锁回。锁区=头部裁区，区外零差分断言。
- 变体 12 个（girl/boy 各：tease|focus ×闭/半/开 + neutral×半/开 + blink×闭），
  落 `assets/cels/variants2/`；reach/tap 自带表情不叠加；肖像供体移植链（variants/）已删除。
- 眨眼弧线来自同图 eyes_blink 变体 ✓（fix_r7/girl_blink_eyes_native.png 原生裁区）。

## probe 新断言输出（r7 全绿）

- 相位（yaw8 推导 vs 实际 cel）：10/10（37.80 front_open、38.93 Girl=t6/Boy=side_cross、
  40.07 back_open、41.27 Girl=side_cross/Boy=t6、42.40 front_open）。
- 相位边界换画：首个相位跳变帧 38.1667，角色区变化率 **42.2%**（阈值 10%）✓。
- 纸片人：相位内相邻帧刚体配准后残差 **3397** px（未配准 5911；非零=驱动/微动确在作用，
  配准后减半=残差确为形变而非纯平移）✓。
- 驱动接线：79 项全过（施加量==烘焙限幅值；pins 位移 0；相位内 maxBaked 33–161px 实动）。
- 表情/敲杯/接触/有限性：全绿。missingAssets=0。

## 验证帧（hybrid/review/fix_r7/）

- 8 相位整帧：phase_{front_open,t1,side_cross,t3,back_open,t5,t6,t7}_*.png
- 相位边界连续帧：boundary_T1T2_{before,after}_41.4/41.5、boundary_T4T5_{before,after}_39.65/39.7
- **原生分辨率裁区**：legs_girl_{t5,back_open,t3}_*_native.png（跨相位换腿）、
  boy_focus_eyes_native.png、girl_blink_eyes_native.png、girl_tease_face_native.png
- 敲杯：tap_12.65.png（回归）

## r7 遗留

1. 批次4 画序列的头发甩动方向按"左起转"绘制，女孩实际右起转（反向播放）——发梢滞后的
   时间方向在女孩侧与动作反向，属画层近似；如需严格，女孩需要一组右起转真画（报主代理裁定）。
2. 转身段嘴型随画（无嘴窗整换）——唱段中 front/t7 相位嘴静止；近景段（42.7+）同理。
   如需口型需对 turn cel 做同图嘴部变体（同 dialogueA 工艺）。
3. 驱动手/头粗框的解剖左右在侧/背相位是近似的（屏幕侧映射）；幅度小，未观察到异常。
4. 支撑脚 pin 为配准后贴地簇质心（程序估）；若某相位换支撑脚时机与画不符需人工标定。
5. 其余同 r6（turnB 未完工、第二击窗口外、invite/lookup 未接线、stand 无嘴变体）。

---

# r8 转身段重构（纯画序列 + 整拍冻结；删驱动层）

用户物理性指摘（主代理定位根因）：驱动 warp 把 t5 画里抬起的脚拉向地面拧转鞋踝；
整图 bob/rotation/sway 呈皮影晃动。r8 全部删除：转身段（37.7667–42.4333）= 8 张相位画
**整拍冻结**（除整画随烘焙根位移的整数像素平移外，无形变/摆动/旋转/呼吸），movement 全来自换画。

- **朝向映射按绝对角度、禁止时间倒放**：女孩右起转序列
  [front_open, t1r, t6, t5_mir, back_open, t3_mir, side_cross, t7r]（t1r/t7r=主代理补画的右起转
  3/4 正面，已落地接入；背面 3/4 = t3/t5 配准版水平镜像——依据：背面看不到口袋，镜像不改变
  角色身份要素；锚点 x=512 对称故镜像后配准锚定不变）。男孩既有 8 张正向（sign=-1）保留。
  每角色符号：Girl +1 / Boy -1（yawN = sign*yaw mod 2π，扇区中心对齐标称角）。
- **踩坑（重要，写回 skill 候选）**：整拍冻结的落位若锚定"播放时该相位首次出现帧"
  （运行时状态），seek/倒放渲染时重锚 → 像素漂移、确定性检查失败（Sequential/seek pixel
  mismatch）。正解：**相位入场帧在初始化时从烘焙数据离线算定**（turnPhaseEntry），
  落位/缩放/影子全部从该帧烘焙投影计算，与播放顺序无关。
- 接触影：每相位画自带支撑脚 pin（配准后实测），影子位置=入场帧画内 pin 投影，整拍仅随根平移。
- rig 只留放置锚（无 deform；motion-controls 驱动层在转身段停用，对话段的头部 motion 参数保留）。

## probe 断言更新（r8 全绿，motion_check.json）

- 相位内相邻帧躯干内饰盒刚体配准（±8px 整数平移）后残差：Boy=0px（纯色躯干逐像素一致），
  Girl=62-99px——严格 0 不可达：cel 纹理经 WebGL 线性过滤在整数平移下重采样产生边缘 AA 差异。
  判据=配准后 ≤max(150px, 未配准量×15%)（实测女孩 62-99/738-1008≈6-10%，男孩 0）。
  **与 r7"残差非零"断言相反，按新标准执行**（形变只许发生在换画帧）。
- 接触影位置相位内仅随根平移：shadow-follows-root-only 4/4 ✓。
- 相位边界换画率 56.1%（阈值 10%）✓；相位断言 10/10；表情/敲杯/接触/有限性全绿。
- package 两窗口 passed（音频相关性 0.9997/0.9993，偏移 0）。

## 产物与验证

- r8 sha256：dialogue_a `4b98e4b3…`（与 r7 逐字节一致——对话段代码未动，确定性复现 ✓），
  turn_full `5c342955…`，对照 `0e1d4512…` / `993962f1…`。r7 四片已先改名 *_r7.mp4。
- 验证帧 hybrid/review/fix_r8/：phase0..7_*.png 八相位整帧（女孩 t1r/t7r 已接入）；
  freeze_a_40.1/freeze_b_40.4 + freeze_pair_girl_torso.png（同相位相隔 0.3s 叠印：躯干内饰
  全黑=逐像素一致，边缘白点=纹理过滤 AA，背景差=拍点脉冲）；
  legs_girl_t5_39.43_native.png（t5 相位腿部原生分辨率裁区：抬起的脚保持画中位置）。

## r8 遗留

1. 相位内背景拍点脉冲仍在动（烘焙相机 span 脉冲），人物冻结 → 发缕间隙的背景有微动；
   若要求全画面冻结需连背景脉冲一起冻（改变原片摄影手感，待裁定）。
2. 相位间 ppm 脉冲差异 → 换画帧有 ≤1.2% 缩放跳变（被换画掩盖）。
3. 根平移取整到像素 → 相位内亚像素根移动被吞（肉眼不可见）。
4. 转身段嘴型随画静止（无嘴窗；路线纪律），stand 段同。对话段不变。
5. 其余同 r7（turnB 未完工等）。

---

# r9（脚滑/尺度/嘴型三修；批次5 嘴部变体接入）

1. **平移法术（脚滑）根治**：r8 的冻结画仍锚定持续运动的烘焙关节（root 不动但脚点逐帧滑）。
   r9：每相位画的摆放锚 = **画内支撑脚 pin 对位相位入场帧的烘焙触地脚**（contact.planted），
   整拍锁死零平移；位移只发生在换画帧（新画支撑脚落新位=画间步距）。
   probe：支撑脚屏幕位相位内 0 位移（逐像素相等）✓；换画帧步距记录（信息项）。
2. **尺度回归（腿短）**：实测 V5 同帧人物头-脚像素距（girl 498 / boy 515 @span2.78）
   比试片显示高约 11%——worldHeight 常数映射低估了 V5 大头顶余量。r9 起显示人高 =
   烘焙头-脚投影距 + crownM·ppm（头顶余量，V5 同帧实测 girl 0.65m / boy 0.48m，
   证据 hybrid/tmp/hgt_compare.png），逐帧/逐相位以烘焙实测为准，不再用常数身高。
   probe：10 时点 × 双角色显示人高 vs 烘焙目标 ±2% 全过（实测 err ≤0.53%）。
3. **唱段嘴型**：批次5 同图嘴部变体（{base}_mouth_{open,half}.png，与该 cel 头裁区同图同尺）
   接入转身段正面系画（girl front_open/t1r/t7r、boy front_open/t1/t7）：头裁区原点=蒙版模板匹配
   （TM_CCORR 置信 0.98+，turn_headcrop_origins.json），嘴子窗逐 cel 目检标定（raw cel 坐标），
   贴回后并入 stabilize 配准输入（同锚点→几何一致），锁区外零差分断言。
   jaw 按 visemes.json（绝对时间）→ closed/half/open 整换；侧/背相位不加；眨眼暂不接入转身段。
   probe 嘴态抽样 3/3（41.95 boy open、42.20 boy half、42.20 girl closed 对照）。

## 复跑

render 两窗口过（270+195 帧，确定性 11+10）→ mixed.wav 重 mux → probe 全绿
（冻结：躯干配准残差 Girl 0-16px/Boy 0-4px，支撑脚零位移）→ package 两窗口 passed。
r9 sha256：dialogue_a `4b98e4b3…`（与 r7/r8 逐字节一致——对话段确定性复现）、
  turn_full `730b5d3c…`、对照 `0e1d4512…` / `3c84bd23…`。r8 四片已先改名 *_r8.mp4。
验证帧 hybrid/review/fix_r9/：feet_native_{40.00,40.15,40.30}.png（同相位 3 帧脚底原生裁区，
零滑移）、phase0..7 整帧、mouth_boy_{open,half}_native2x.png（原生裁区 2x）、
same_shot_r8/r9_40.08.png（同机位对照：人高回到 V5 水准）。

## r9 遗留

1. 相位内背景拍点脉冲仍在（与原片一致；人物零滑移后 bg-人相对关系=原片）。
2. 转身段眨眼未接（任务书暂缓）；转后 stand 段嘴部静止（无 stand 嘴变体）。
3. 相位间 ≤1.2% 尺度跳变（拍点脉冲被换画掩盖）；换画帧支撑脚跳步=画间步距（符合预期）。
4. 冻结锚定用相位入场帧的 span；拍点脉冲在相位内不改人物缩放（有意为之）。
5. 其余同前（turnB 未完工、敲杯第二击窗口外、invite/lookup 未接线）。

---

# r10（跨相位比例归一：锚定配准固定跨距）

- 主代理实测：8+2 张转身画内部比例一致（头=全身 10.0%，与身份锚相同），各画全身像素高差异大。
  本轮关键实证：v9 逐 cel 头高表归一会巨人化（t1r +18%）；且**配准（stabilize_cel_anchors）已把
  全部相位画的脸/髋/脚底强制到同一内布局**（脸 215/225、髋 690/680、脚底 1470）——
  比例一致性的正确来源是配准，不是逐画归一。
- 修法：显示尺度 s =（入场帧烘焙头-脚投影距 + crownM·ppm）/ 脸-脚底跨距（注册固定值
  girl 1255 / boy 1245；stand 未配准用实测 1371/1354）→ 每角色全相位同一 s，头高天然恒定；
  全身高随发量/裙摆内容边距小幅变化。逐 cel 头高表弃用。
- 踩坑记录：v9 用 raw 画头高表配注册后内容 → 量纲错配巨人化；probe 的 target 公式也曾拿
  头高表对脸-脚底跨距（900% 假红）。断言必须与 state 字段同量纲。
- probe：脸-脚底显示跨距 vs 烘焙目标 err ≤0.91%（±2% 内，20/20）；全身/跨距比波动 ±4.8%
  （back_open 颅顶无蓬发 -8% 属画法真实差异，信息项不拦截）；冻结/支撑脚/边界/嘴态/相位全绿。
- 复跑：render 两窗口过 → probe 全绿 → package 两窗口 passed。
  r10 sha256：dialogue_a `4b98e4b3…`（对话段未动，逐字节同 r7-r9）、turn_full `08dcf66c…`、
  对照 `0e1d4512…` / `58fa70e6…`。r9 四片已先改名 *_r9.mp4。
- 验证帧 hybrid/review/fix_r10/：phase0..7 整帧（t1r 巨人化已消）、head_girl/boy_phase{2,4}
  相邻相位同区头部裁区、v5_40.08 原片同帧对照。

## r10 遗留

1. back_open 全身内容高 -8%（背面发量垂于背部、颅顶上方无蓬发）——画法真实差异，头高精确恒定。
2. 男孩逐 cel 头高 grid 目检表（front185/t1 210/side205/t3 190/back165/t5 180/t6 195/t7 165）
   仅作存档（v9 弃用路径），如复用需按注册后内容重测。
3. 其余同 r9。

---

# r11（转身画集改纯相似配准；修复分区重映射躯干拉伸）

- 根因（主代理数字证据）：共享 stabilize_cel_anchors.py 的三点（脸/髋/脚）分区纵向重映射
  把侧面画躯干拉长（girl_t6 躯干带 154→344px，主代理实测 217→711）。对同视角步态画成立、
  对多朝向转身画错误。
- 修法：`hybrid/tools/similarity_register.py`（本地薄配准器，读 stabilize 同一配置格式、
  输出同名 turn_reg 产物 + registration_sim_{girl,boy}.json）：每画统一 scale（按模板
  front_open 全身像素高归一——主代理实测各画内部比例一致：头=全身 10.0%，故全身高归一==脸高归一）
  + 平移（内容中心 x→512、内容底→groundY 1470）。嘴部变体与底图共用同一变换。
  **共享工具缺相似模式——记录在此，写回由主代理统一做（本任务未动 dula-skills）。**
- 仪表修正：任务给定的"躯干带纵向长度"指标在 1% 重缩放下误报 -21%（带缘行绝对阈值边际）；
  改测白衬衫区像素面积比 ≈ scale²（实测偏差 0-2.1%，稳健）。带长保留为信息项。
- 显示尺度：相似配准后全相位内容高=模板高（girl 1471/boy 1282），比例一致由相似变换保证；
  显示 s =（烘焙头-脚投影距+crownM·ppm）/该值，逐相位恒定。stand 段用自身内容高（1505/1502）。
- 配准前后躯干带长度表（节选自 registration_sim_*.json；全表在 probe torsoChecks）：
  girl_front_open 235→235(s=1.0)、girl_t1r 205→238(s=1.157)、girl_t6 154→151(s=1.0)、
  girl_side_cross 171→139(s=1.01)、girl_t7r 262→251(s=0.989)、girl_back_open 豁免（发盖衬衫）、
  boy_front_open 1052→1052、boy_t5 1011→1093(s=1.021)……面积比 vs scale² 偏差 0-2.1% 全过 ≤3%。
  （注：带长仍偶有重采样边际波动，面积比为准；两者均入档。）
- probe：torsoChecks 26/26 全绿 + 既有全部（冻结/支撑脚零位移/脸-脚底跨距 ≤0.91%/相位 10/10/
  嘴态 3/3/表情/敲杯/接触/有限性/missingAssets=0）。package 两窗口 passed。
- r11 sha256：turn_full `b8af4651…`、dialogue_a `4b98e4b3…`（对话段未动，逐字节同 r7-r10）、
  对照 `0e1d4512…` / `58fa70e6…`（对照片内容同 r10——底片确定性一致，ffmpeg 打包头差异）。
  r10 四片已先改名 *_r10.mp4。
- 验证帧 hybrid/review/fix_r11/：torso_front_vs_side_native.png（正/侧躯干原生裁区并排，
  病态拉伸消除）、t6_src_vs_simreg.png（源画 vs 相似配准版，比例一致且边缘杂光清除）、
  phase0..7 八相位整帧。

## r11 遗留

1. back_open 全身内容高 -8%（背面发垂为画法真实差异）；personPx 全相位波动 ±8.6% 上限，
   脸-脚底跨距精确恒定（≤0.91%）。
2. girl_back_open 的躯干带不可测（发盖衬衫）用豁免+面积比兜底。
3. 其余同 r10。

---

# r12（统一世界站高常量；女高男矮方向修正）

- 根因（主代理数字证据）：烘焙 frame 60 头-脚距 girl 1.284m / boy 1.328m（男孩应高 ~3%），
  而 r9 的 crownM（girl 0.65 / boy 0.48，凭感觉手估）把女孩显示高度抬过头——同框里女孩反高半个头。
- 修法：每角色**单一世界站高常量** worldStandH（写进 cel_slots.json）= 烘焙头-脚距 + 实测解剖颅顶余量。
  crownM 实测法（hybrid/config/stand_height_measure.json）：注册版 front_open 上量 眼线→下巴脸长，
  解剖颅顶=眼线−0.9×脸长（蓬发/飞发不计身高——女孩的头发蓬体量本就是把她"抬过头"的病根），
  按该 cel 米/像素（烘焙头-脚距 ÷ 眼线→脚底 cel 跨距）折算成米。
- 实测表：

  | 角色 | 烘焙头-脚距 | 颅顶余量 crownM | 世界站高 worldStandH | 备注 |
  |---|---|---|---|---|
  | 小蓝 | 1.284m | 0.058m（56px：眼线236/下巴298/颅顶180） | **1.342m** | |
  | 阿澈 | 1.328m | 0.054m（49px：眼线281/下巴335/颅顶232） | **1.382m** | 高 3.0% ✓ |

- 显示规则：所有相位画/stand 段显示高 = worldStandH × 相机 ppm ÷ cel 内容高；
  转身段冻结规则（r9：入场帧锚定+支撑脚对位零平移）不变。对话段坐姿 cel 的座垫锚定不动
  （r2 起已验收；坐姿世界高≠站高，scope 见 NOTES 历史）。
- probe：跨相位跨段显示人高 err ≤0.91%（±1% 内）；女：男显示比 0.9709 == 目标 0.9709（err 0）；
  既有断言（冻结/支撑脚/躯干相似配准/相位/嘴态/表情/敲杯/接触/有限性）全绿。package 两窗口 passed。
- r12 sha256：dialogue_a `4b98e4b3…`（对话段未动，逐字节同 r7-r11）、turn_full `4c6f414c…`、
  对照 `0e1d4512…` / `9e6cb2a2…`。r11 四片已先改名 *_r11.mp4。
- 验证帧 hybrid/review/fix_r12/：pair_40.08.png / pair_38.93.png（双人同框：男孩明显略高）、
  v5_40.08.png（原片同帧对照）、phase0..7 八相位整帧。

## r12 遗留

1. 试片人物整体比 V5 小（V5 的 3D 绘画头大）——以 cel 比例为准是有意裁定；跟原片的绝对大小差
   在 A/B 对照里可见，若要贴回原片大小需另定 crown 语义（把 V5 大头算进站高）。
2. 其余同 r11。

---

# r13（显示尺度贴回 V5 同机位 + 人物-背景脉冲同步）

1. **人物-家具尺度脱节修复**：r12 的 cel 实测 crown 让整体人物比 V5 小（"两人还没桌子高"）。
   r13 锚定 V5 同帧实测：stand_height_measure.json → V5_anchor_40.08
   （发顶→头关节投影点：girl 437.1−320=117px、boy 421.9−294=128px @span2.78/ppm388.6；
   V5 目标人高 girl 615px / boy 649px）。**注意：V5 本身女孩显高（3D 绘画头大），
   与烘焙体格 1.284:1.328 矛盾**——女男比锁 0.9709：girl=V5 实测 1.582m、
   boy=1.582/0.9709=1.629m（V5 实测 1.655m 的 −1.6%，在 ±3% 容差内）。
   worldStandH：Girl 1.582 / Boy 1.629（cel_slots.json）。
2. **忽大忽小修复**：r9-r12 人物按入场帧相机冻结，背景按当前帧脉冲 → 人物相对背景呼吸。
   r13：**入场帧姿势冻结 + 当前帧相机投影**（projectWorld 重投影锚点；脚=固定世界点，
   不滑；人物与背景同一相机脉冲缩放，与原片 3D 一致）。

## probe（r13 重写版 probe_adapter.mjs——此前多轮追加致同名块堆叠，已全清重写）

- V5 显示高 err ≤1.61%（阈值 ±3%）；女男比 0.9711 vs 0.9709（err 0.03%）；跨相位跨段
  spread 0.04%（阈值 ±1%）；脉冲同步：人高缩放比==ppm 比（err 0%）、脚位移动==固定世界点
  投影差（Girl 0.09px / Boy 0.75px，阈值 2px）。
- 冻结断言升级：脉冲期躯干残差先做**脉冲缩放校正**（B 帧按 ppm 比绕支撑脚锚点缩放），
  残差对照**自参考重采样底噪**（A 帧自身缩放往返的残差 floor）——判据 ≤2×floor+60
  （实测 Girl 47/0 vs floor 200、Boy 200/0 vs floor 449/0）。
- 全部既有断言（相位/边界/冻结/表情/嘴态/敲杯/接触/有限性/相似配准拉伸/missingAssets）全绿。
- package 两窗口 passed（音频相关性 0.9997/0.9993）。

## 产物与验证

- r12 四片已先改名 *_r12.mp4。r13 sha256：dialogue_a `4b98e4b3…`（对话段未动，逐字节同 r7-r12）、turn_full `abb7b123…`、
  对照 `0e1d4512…` / `4474e974…`。
- 验证帧 hybrid/review/fix_r13/：phase0..7 八相位整帧；v5_40.08_crop.png 与
  pilot_40.08_crop.png（同帧对照：人物大小、家具比例正常）；pulse_a_40.10/pulse_b_40.30
  （脉冲两帧对照：人物随背景同缩放）。

## r13 遗留

1. 脉冲期人物缩放是整画重采样（纹理 AA 级变化），非逐帧重画——与原片 3D 重采样同性质。
2. 其余同 r12（转身眨眼未接、stand 嘴部静止、turnB 未完工等）。

---

# r14（比例门：女孩裙摆有界修画 + 男孩地标表首建）

- 驳回项：①女孩 6+ 张侧/背面转身画裙摆下缘比锚低 +3~4%（裙偏长→观感腿短）；②男孩从未过比例门。
- 量纲实证：prop_tables 分数=raw cel（hybrid/assets/cels/*_v1.png）内容高占比
  （girl_body_v1 内容高 1506≈锚表 H1505；girl_t3 蓝格底缘实测 0.5817≈表 0.583）。
- 修画 `hybrid/tools/fix_r14_hem.py`（幂等，源恒取 `cels/r14_pre/` 备份）：垂直分区重映射——
  腰结行以上/袜口结行以下逐像素恒等（断言），[腰,裙摆] 压缩使 hemFrac=0.544±0.005
  （压缩后底缘行被皮肤混色稀释，按蓝格检测残差迭代补偿目标行，≤3 次），
  [裙摆,袜口] 大腿皮肤区延展补齐，脚底不动（内容框不变断言）。
- 女孩修 8 张（side_cross/t1r/t3/back_open/t5/t6/t7/t7r）：hem 0.563~0.583 → 0.5440~0.5447，
  裙区 -27~-56px，大腿区延展 ×1.9~3.1（平肤色，无纹理风险）。front_open(0.551)/t1(0.557) 门内未动。
- 男孩地标表首建（刻度图人工读数，2%/10% 线，腰=皮带顶/裤脚=支撑腿裤脚下缘；自动深色检测
  复踩女孩教训——鞋描边吃到内容底，弃用）：boy_anchor {waist.top 0.389, pants.bottom 0.912}；
  8 相位全部落入 ±3% 门内（最大偏差 t1 裤脚 -2.7%——抬腿相裤脚上移属姿势固有，读支撑腿），
  **男孩零修画**。
- 门：`check_cel_proportions.py` girl 10/10 ok、boy 8/8 ok
  （报告 hybrid/tmp/prop_tables/r14_gate_{girl,boy}.json）。
- 修后链路：重清理 8 画 → t1r/t7r 嘴部变体重贴（头部零改动，锁区外零差分断言）→
  **girl_t3/t5 补入 stabilize_turn7_girl.json**（r7 起漏配——mir 镜像源此前是 19:55 旧配准遗留，
  现纳入相似配准正轨）→ similarity_register 两角色（男孩 14/14 产物 sha 逐字节不变；
  女孩修画 scale/translate 与 r13 一致——内容高未变）→ t3_mir/t5_mir 重派生 →
  turn7_measures.json 重测（运行时消费的是 cel_slots.json，未动；修画不改内容框/支撑脚，槽位值仍有效）。
- 复跑：render turnFull 195 帧（10 项复捕全等）→ remux → probe 全绿（含 torsoChecks 28/28：
  修画后白区面积比 vs scale² 偏差 ≤1.8%）→ package passed（音轨相关 0.9993）。
  对话段未动不重渲（r13 片 sha `4b98e4b3…` 逐字节保持，已归档 *_r13.mp4 四片）。
- r14 sha256：turn_full `e1e0e388…`、turn_full_comparison `a26b5a74…`。
- 验证帧 hybrid/review/fix_r14/：cel_{t3,side_cross,back_open}_before_after.png（raw 修前/修后+
  0.35/0.544/0.601 参考线）、pair_t{37.22..41.65}.png（8 相位 r13上/r14下 同帧对照：
  裙摆上收、大腿变长可见，腰/袜结线无接缝 artifacts，机位/尺度/落位不变）。

## r14 遗留

1. turn_reg/girl_t1.png、girl_t7.png 为旧配准遗留（女孩转身序用 t1r/t7r，未被引用），未清理。
2. 男孩 t5 腰 -2.3%、t1 裤脚 -2.7% 接近门边（读数精度 ±0.5%）；如下轮驳回可同法修。
3. 比例门只覆盖转身画集；sit/stand 画未建表。

---

# r14-M10（probe 断言盲区修复：渲染后实测内容框）

- 盲区：heightChecks 的 personPx 是**摆放参数**（frozenPlacement 的意图值，
  跨相位恒定是构造使然），测不出各相位画真实内容边距差异。**纪律：断言必须测渲染结果，
  不是摆放参数。**
- 新增 `renderedHeightChecks`（probe_adapter.mjs 块 h）：renderAt(t, {noSubtitle:true}) 帧上
  按角色区色掩码量发顶-鞋底内容框（女孩发顶=暗蓝发 rgb≈(0-20,27-50,104-152)——b<185/g<115
  排除天空（天空 (19,170,242) 与旧掩码同构曾把发顶测成 y≈30 的天空行）；女孩鞋底=深袜黑鞋
  lum<80；男孩发顶=黑发 lum<110、鞋底=白鞋低饱和 lum>195），逐相位 spread ≤2%。
- **字幕污染教训（两级）**：字幕是全局覆盖层（y≈985-1030，描边 #243748 lum≈55 命中深色
  鞋底掩码、浅色填充命中白鞋掩码）。初版仪表 7 相位 bottom=1024-1025（字幕底行）、t1r=984
  （该时刻字幕行不在她窗内）——与主代理实测"7 相位 1025/t1r 985"完全同构，即主代理的
  **t1r -4% 也是同一污染**，非真实身高差（placement 参数 t1r vs t6：personPx 615.1/616.4、
  pinY 987.1/988.1 全等）。art_pass.js 的 draw(t, opts) 加 noSubtitle 选项（默认行为不变，
  成片仍带字幕），测量帧排除覆盖层。
- 修正后真值（r14 片）：女孩 7 相位 623-635px（±1.9% 内），t1r 625（-1.59%，门内）；
  **back_open 693（+9.11%）**——目检证据：该相位画头发向上扬起（画法内容，非缩放错误，
  见 review/fix_r14/m10_backopen_top.png 对照 front_open）；男孩 spread 1.41% 绿。
  门保持严格（≤2%），当前片按设计报红：errors=["M10 rendered-height spread Girl: 11.0%"]。
- 校准机制（item 2，为批次6准备）：frozenPlacement 支持 cel.spanCorr（默认 1=不变），
  `hybrid/tools/derive_span_calib.mjs` 从 motion_check.json 派生每相位
  spanCorr=角色均值/实测跨距（dry-run 默认，--apply 写 cel_slots turnKeys）。
  **当前未 --apply**：back_open 的 +9% 由发量主导（颅-踝躯体只差 ~5%），按发顶-鞋底强压会
  把该相位躯体缩 8% 过小；且批次6 女孩 v2 链式重生成会改变发量，现值会作废。
  批次6 落地后：render → probe → 核对 renderedHeightChecks（发量差异须先修画而非校准）→
  derive_span_calib --apply → 重渲。
- 语义冲突记录：V5/heightChecks 的 personPx 是解剖身高语义（蓬发不计身高），M10 是
  发顶-鞋底内容框语义；若批次6 后两者仍张力（校准后 personPx 超 V5±3%），需主代理裁决
  是否把 heightChecks 也切到渲染实测。
- 证据帧：review/fix_r14/m10_renderat_feet.png（t1r/t6 鞋底同高 ~985）、
  m10_t6_mystery_region.png（probe bottom=1024 处实为字幕"笔尖停在，"）、
  m10_backopen_top.png（back_open 发顶 294=上扬发丝 vs front_open 349）。
- 未重渲（批次6 后随 v2 一起渲）；成片文件保持 r14（turn_full `e1e0e388…`）。

---

# r15（批次6 v2 换画 + 锚表袜口更正 + 嘴变体窗错位根治）

- 批次6 换画：girl_turn_{t1r,t3,back_open,t7r}_v2.png（主代理验收 4/4，generation.json batch6）。
  t3_v2 有界修裙摆（fix_r14_hem 同法，备份 r14_pre/girl_turn_t3_v2.png）：hem 0.5742→0.5437
  （裙区 -46px，大腿区 201→247px），腰上/袜下逐像素恒等断言 ✓。其余三张门内未动。
- **锚表更正（证据 zoom_r15_anchor_sock.png）**：anchor.json sock.top 0.601→**0.733**——
  原值与锚图 girl_body_v1 不符（锚图袜口实测 0.724-0.733）；v1 各表的 0.60x 全系统沿袭同一错误。
  全部女孩表袜口改为实测（检测器=深灰中性色顶行，抬腿相取支撑/伸直腿人工读数：
  t1 0.736/t5 0.740/back_open_v2 0.755）。更正后比例门 10/10 ok（r15_gate_girl.json）。
- v2 四张实测（刻度图+检测器交叉）：t1r 0.349/0.556/0.723、t3 0.352/0.544（修后）/0.707、
  back_open 0.361/0.546/0.755、t7r 0.354/0.542/0.709（腰/摆/袜）。
- 换画链路：v2→canonical _clean.png（v1 派生物归档 r14_pre/）→嘴变体重贴→相似配准
  （v2 scale 0.974-1.022，v1 的 t1r 1.157/back_open 1.137 巨人化消除）→t3_mir 重派生→
  turn7_measures 重测→manifest 162。cel_slots 未动（v2 比例锁+构图保持；placement 全兼容）。
- **r9 时代嘴窗错位根治**：girl_t1r/t7r 的 mouthInCrop（[225,160]/[105,150] 头裁区坐标）
  自批次5 起就偏到刘海/脸颊——donor 窗内容是头发/皮肤，贴回=隐形 no-op（女孩在 t1r 相位
  唱段 38% 时间 jaw>0.075 却从不张嘴）。v2 重贴用像素级唇线定位的修正窗
  （t1r donor(261,244,40,28)→raw(592,234) 后收紧 (266,248,30,22)→(592,240) 防 3/4 脸角度差
  溢出下颌；t7r donor(138,178,50,32)→raw(418,208)）。证据：review/fix_r15/mouth_*_variants.png、
  mouth_infilm_t1r.png（片中 t=38.20 half 嘴可见开合）。prepare_cels.py --r9 里的女孩旧窗
  已过期勿复用（男孩窗不受影响）。
- probe：除 M10 外全绿；M10 女孩 spread 11.17% 仍红——**唯一离群 back_open +9.21%
  （top=293 vs  siblings 349-360）**。根因定位（测量模型 T/S 精确复现 693→实测 694）：
  cel_slots girl back_open turnKey span=1309（contentTop 165，stabilize 时代排发残留值）
  vs 兄弟相位 1420-1446 → 该相位显示尺度大 8.5%。**v2 换画本身治不了它**（v2 注册后内容高
  与其他相位同为 ~1470）。主代理指示 back_open 超标先报不强压 → 未动 slots、未 --apply
  spanCorr。建议（待裁决）：contentTop 165→36（预测 span 694→629 落族内）或 spanCorr≈0.917；
  注意 v2 back_open 头发仍有上扬画法内容，修正后 M10 顶行仍可能略高。
- 复跑：render turnFull 195 帧（10 复捕全等）→ remux → probe（如上）→ package 两窗口 passed
  （0.9993/0.9997）。dialogueA 未动（sha `4b98e4b3…` 逐字节保持）。
- r14 四片已改名 *_r14.mp4（dialogue_a_r14 = r13 内容拷贝，对话段自 r7 未变）。
- r15 sha256：turn_full `4f7a8e5f…`、turn_full_comparison `8ffb8c70…`。
- 验证帧 hybrid/review/fix_r15/：phases_r15.png（8 相位整帧墙）、pair_{t1r,back_open,t3_mir,t7r}_v1v2.png
  （r14上/r15下 同帧对照）、mouth_t1r_v2_variants.png + mouth_t7r_v2_variants.png（三态）、
  mouth_infilm_t1r.png、gate_and_m10_output.png（门+断言输出图）。

## r15 遗留

1. **back_open M10 +9.21% 待主代理裁决**（slots contentTop 修正 vs spanCorr，数值见上）。
2. 嘴变体 donor 是 v1 头裁（t1r 与 v2 脸角度略差），紧窗下观感可接受；彻底方案是批次7 出 v2 同图嘴变体。
3. t7r 相位（41.53-42.11）女孩 jaw=0（她不唱），t7r 嘴变体本窗口闲置（仅 t1r 触发）。
4. turn_reg/girl_t1.png、girl_t7.png 旧配准遗留仍未清理（未被引用）。

---

# r15b（back_open 槽位残留修正——主代理裁决授权）

- `cel_slots.json` girl back_open turnKey contentTop 165→36（span 1309→1438，与兄弟相位 1420-1446 同族）。
  165 是 stabilize 时代排发残留，致该相位显示尺度大 8.5%（M10 渲染实测 +9.21%）；v2 发量补全后无排发需求。
- 复跑：render turnFull 195 帧（10 复捕全等）→ remux → probe **全绿（exit 0，errors=[]）**→
  package turnFull passed（0.9993）。dialogueA 未动（r15 包已过，内容逐字节 `4b98e4b3…`）。
- **M10 最终数值**：Girl spread **1.91%**（≤2% 绿；back_open 631px +0.54% 落族内，预测 629 实测 631）；
  Boy 1.41%。其余断言组（joints/contact/phase/boundary/freeze/height/face/tap/mouth/torso 28/28）全绿。
- r15 四片已改名 *_r15.mp4。r15b sha256：turn_full 与 comparison 见本节顶端。
- 验证帧 hybrid/review/fix_r15b/：pair_back_open_r15_vs_r15b.png（同帧前后对照：身高回落族内、
  脚底落位不变）、phases_r15b.png（8 相位整帧墙）、m10_output.png（断言输出）。
- spanCorr 钩子仍全默认 1（未需要校准）。

---

# r16（全片唯一尺度常量：stand 段眼线锚定；转身段女>男反转根治）

- 根因（主代理带尺帧实测 + 本方复核）：男孩 turnKeys 槽位 span 是 stabilize 时代残留
  （~1434 vs 相似配准真实内容 1281）→ 转身段男孩画小 ~11%；女孩 span 接近真值。
  结果：stand 段（standCel span 1505/1502 真值）男略高 ✓，转身段眼线关系反转。
- 修法（主代理裁决：stand 段为基准的每角色唯一尺度常量）：
  - cel_slots v13：turnKeys contentTop/Bottom 全部改为注册后实测真值（girl 0/1470、boy 189/1470）；
    `scaleKTurn = (WSH/standSpan) × (standSoleToEye)/(turnSoleToEyeConst)`——
    girl 1.076473e-3（stand 1521-160=1361 / turn 1470-141=1329）、
    boy 1.278361e-3（1519-180=1339 / 1470-334=1136）。
    眼线的选择是**锚定 stand 段实测眼线行**（grid 读数：girl_stand 160 / boy_stand 180 /
    girl_reg front 150 / boy_reg front 330；逐画表见 slots eyeRow 字段，est 标记=背面系估算）。
    总量校核：girl turn 1.5824m（+0.03% vs stand）、boy 1.6376m（+0.53%）——V5 高度断言不受影响。
  - art_pass frozenPlacement 支持 cel.scaleK 优先于 WSH/span（turn 分支接入；stand 分支不动）。
  - 注：眼线锚定与总量锚定对女孩等价（眼位比例 stand/turn 均为 0.904），男孩差 0.5%——
    选眼线锚因主代理以视线关系为验收基准。
- probe 新增 eyeChecks（块 i）：布线图闸门（常量眼线行经摆放变换，跨相位+跨段 ≤1.5%）
  + 逐画实测眼线行（信息项，画法姿势差）+ 同帧女/男眼高比（对 stand 实测比 ±1.5%，另报 vs 0.9709）。
  结果：布线闸门 worstDev 0%（两角色）；同帧比 0.9851==stand 0.9851（dev 0%，vs 0.9709 为 +1.47% 恰在沿）。
  逐画实测信息项：girl side_cross -1.43%、t1r +1.20%、t7r +0.75%；boy side_cross +1.66%、
  t6 -2.73%（低头画法，超 ±1.5% 但在 ±2% 姿势容差外延——r10 先例记为画法信息项不拦截）、t7 +0.78%。
- M10 spread：Girl 0.81% / Boy 1.15%（常量尺度后更平）。heightChecks V5 最大 err 1.57% 保持绿。
- 复跑：render 195 帧（10 复捕全等）→ remux → probe 全绿（exit 0）→ package turnFull passed（0.9993）。
  dialogueA 未动（逐字节 `4b98e4b3…`）。r15b 四片已改名 *_r15b.mp4（dialogue_a_comparison 默认名
  自 r15 起缺席——r15b 改名时该项不存在，记录备查）。
- r16 sha256：turn_full `8133f9c3…`、comparison `1eda2267…`。
- 验证帧 hybrid/review/fix_r16/：heightcheck_pre_turn.png / heightcheck_turn_p2.png（dim_scan 同格式
  带尺帧：两段男孩眼线均略高于女孩）、phases_r16.png（8 相位整帧墙）、boundary_seq.png
  （stand→turn 与 turn→stand 交界 6 帧：无线pop）、probe_eye_output.png（断言全表）。

## r16 遗留

1. 逐画眼线实测的男孩 t6（-2.73%，低头画法）/side_cross（+1.66%）为画法差异信息项；
   若后续批次重画男孩相位画可顺带收敛。
2. M10 男孩 top 行疑被背景绿植污染（lum<110 暗叶入窗）——spread 断言不受影响（常数偏移），
   绝对值读数偏大 ~150px；如需男孩绝对跨距，收紧 top 掩码或加背景排除。
3. 其余同 r15（girl_t1/t7 旧配准遗留、--r9 女孩旧嘴窗勿复用等）。
