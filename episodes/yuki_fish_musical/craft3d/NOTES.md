# 《谁动了我的小鱼干》三维化管线 · craft3d/

Phase 3（2026-09-26）：**年糕已三维化**（`mochi3d.js` MochiCraft3D，替换 cel 混排），
全片 `output/craft3d_v2.mp4`（46.3s，含音轨）。新增**自由机位**能力
（`window.setFreeCamera` / `--camera`/`--range`/`--out`），证据指证段三条演示短片在
`output/angles/`（俯视/小雪视角/贴地低角度）。
**不改动** cel 版任何文件，不改 craft_trial / dula-assets / dula-engine。

## 入口命令（都在 dula-story 下跑）

```bash
node episodes/yuki_fish_musical/craft3d/render.mjs --check   # 63 张关键帧 → craft3d/storyboard/shot_NN.jpg + craft3d_trace.json
node episodes/yuki_fish_musical/craft3d/render.mjs           # 全片 60fps → craft3d/output/craft3d_v2.mp4（约 75s）
node episodes/yuki_fish_musical/craft3d/render.mjs --serve   # 交互 viewer，端口 4210（点击播放，带音轨）
# 自由机位片段（--camera "px,py,pz,lx,ly,lz[,fov]"，--range 秒，--out 相对 output/）：
node episodes/yuki_fish_musical/craft3d/render.mjs --range 19.0,24.66 \
  --camera "0.1,3.6,1.7,0.1,0,0.2,42" --out angles/evidence_top.mp4
```

## 结构

- `viewer.html` — importmap 同 cel 版
- `viewer.js` — 数据链与 cel viewer.js 一致：`StoryParser.parse(script.story)` 取
  entries/storyEvents（不用 Storyboard 执行器，避免它实例化旧 Yuki 资产）+
  timeline.json + viseme_*.json + final_voice_features.json；`makeLip`/`segAt`/
  `drawSubtitle`/shot→机位映射全部照 cel 逐行移植。机位表：wide 6.25 /
  yuki 3.8 / cat 3.55 / evidence 3.10，fov 35，720×1280。
  `window.setFreeCamera({pos,lookAt,fov?})` 设置后忽略机位表（`clearFreeCamera` 解除）。
- `performance3d.js` — 表演桥。`authored()` 只保留本集用到的 6 个 fish_* 动作
  （数值与 cel `performance_v11.js` 相同），输出旧 StudioYuki 空间的手/脚目标，
  再重定向到 craft rig：肩线 1.28→1.075（K=0.84）、臂展钳到 .362、脚落点
  (±.105,.044,.025)→(±.086,.095,0)、髋高按腿链可达性回算（同 samplePose3D 的
  `.596` 余量），肘/膝用 craft `twoBone`（RiverKid 契约：`setPose` 收
  `[肩,肘,腕]`/`[髋,膝,踝]` 三点链）。手型经 cel `handPoseRule` 映射到
  ArticulatedHand 的 `{point,fist,open}`（mitten=放松手，hold=fist .55，
  wave=open .85）。**fish_smell 右手 +.15y 修正**：craft 头比旧 rig 高，
  线性映射后手在胸口，提到脸侧恢复"闻香"语义。Mochi 半侧是 cel poseActors
  猫分支逐行移植（songMouth 双圆片在 `prepareMochi` 预建）。
- `mochi3d.js` — **MochiCraft3D**：ringsGeometry 胖球身（6 环收头）+ 奶白肚皮、
  头/吻部椭球、ringsGeometry 锥耳（共享顶点法线，规避 cel-look 记录的
  ConeGeometry 尖端炸线）+ 粉色耳芯、半睁恹眼（rim/amber/竖瞳/高光/睫盖组，
  与资产同坐标）、鼻/ω笑线/胡须/眉锚、前爪与后腿为组内局部 LimbSurface
  （组 pivot 旋转契约同资产，表演桥原样驱动）+ 掌垫/趾球、肥尾 LimbSurface
  弧 + 奶白尾尖。句柄全对齐：headGroup(0,.60,.22)/headBaseY/leftArm(±.13,.30,.40)/
  rightArm/leftLeg/rightLeg/tail(0,.38,-.34)/mouth(0,-.055,.225)/mouthBaseY/
  leftEye/rightEye/leftEyelid/rightEyelid。buildHomeProps 的嘴角饭粒与海绵
  直接可用。眼/鼻/胡须/嘴线为无描边 Basic 件（对应资产 noSketch 口径）。
- `mouth3d.js` — V17 几何嘴上脸：肤色补丁（#ffe3d1 无光照椭球，z=.205）
  埋住纹理脸的贴图笑线，v13 五片条形嘴组（cavity/upper/lower/teeth/tongue，
  数学逐行复制）挂在 `headAssembly.head` 的 (0,-.150,.233)；v17 的
  purse/teeth 通道在 apply 入口先做同样映射。闭口时 upper 条画闭口线，
  无双嘴。
- `render.mjs` — 60fps；`--check` 只编码 checkTimes 帧（其余 stepAt 空跑保状态）；
  全片带 `-i assets/audio/mixed.wav`（aac 48k）；`--range` 片段会同步切音频
  （`-ss/-t` 作用于音频输入）。

## 节奏与口径

- 一拍二：身体/手型/眨眼/发梢在 `tq=floor(t*12)/12` 网格；口型与相机 60fps
  （60fps 输出下 12Hz 姿态=5 帧整保持，无 2/3 帧交替）。cel-look 纪律。
- ink：craft 壳 0x25222a，小雪 0.012 / 年糕 0.006（对齐 cel 版 StudioMochi 的
  宽度档），全部走 customProgramCacheKey 判别替换（动态几何共享壳，非快照）。
- 渲染 `NoToneMapping` + sRGB（craft toon ramp 口径）。

## 当前状态

- 63 帧抽查已目检（v2，MochiCraft3D）：开场指认、双人全景（唱段分工正确）、
  evidence 特写（嘴角饭粒清晰）、闻香手位、抓到啦、freeze、cat_wash 海绵切换。
  猫唱段 songMouth 开合/ω互斥正确，cat_innocent 眯眼、cat_deny 抬爪成立。
  人猫同框 toon/描边同族，风格统一。
- 自由机位三条已目检：俯视（两人+空盘+碎屑关系清晰）、小雪视角（猫脸 3/4 +
  嘴角饭粒特写）、贴地低角度（盘子前景、两人对峙后景）。俯拍下三维描边/
  接触阴影都稳定（二维管线做不到的机位）。
- 口型开合与 viseme 轨道一致（抽查帧落在 gate=0 的闭口音节间隙属数据真相，
  已用 final_voice_features 核对）。
- 已知差异（相对 cel 版）：小雪表情只有眨眼（cel 的 actFace 情绪眼/眉/腮红
  未迁移）；发梢用 craft 内置摆动而非 cel 的 tq 正弦（等价量级）；
  猫爪掌垫从正前方略可见（读作趾豆，可接受）。

## Phase 4 待办

1. **表情 5→17 迁移**：craft 脸是 CanvasTexture（point/blink 两参）。把 cel
   actFace 的 emotion 表（eye/brow/slope/asym/gaze/blush）映射成 faceTexture 的
   参数化绘制分量；注意纹理重绘按 key 缓存，情绪键要进 lastFace key（head3d
   不可改——在 craft3d 侧控键或换贴图路径）。
2. **校验链合并**：把 cel 版 `tools/golden_frames.mjs` 的黄金帧回归思路引入
   craft3d（v2 帧可作 baseline）；e08 hybrid 的骨骼长度/落地校验可移植
   （twoBone 已保证链长，主要查 footContact 漂移与手-头穿插）。
3. **一拍二抽检视频级确认**：静帧已确认 5 帧保持；全片连看确认口型同步与
   落脚不滑步后再封版。
4. 自由机位进入正片：目前只用于演示片段；若导演要用，需在 .story 层设计
   机位标签到 setFreeCamera 的映射（或逐镜 --camera 渲染后剪辑合成）。
