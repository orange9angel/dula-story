# 《谁动了我的小鱼干》三维化管线 · craft3d/

Phase 2（2026-09-26）：剧情时间轴 + 口型 + 全片初版已通。小雪三维表演
（YukiCraft3D + V17 几何嘴），年糕为**临时 cel 混排**（StudioMochi 快照描边），
出 46.3s 全片 `output/craft3d_v1.mp4`（含 mixed.wav 音轨）。
**不改动** cel 版任何文件，不改 craft_trial / dula-assets / dula-engine。

## 入口命令（都在 dula-story 下跑）

```bash
node episodes/yuki_fish_musical/craft3d/render.mjs --check   # 63 张关键帧 → craft3d/storyboard/shot_NN.jpg + craft3d_trace.json
node episodes/yuki_fish_musical/craft3d/render.mjs           # 全片 60fps → craft3d/output/craft3d_v1.mp4（约 2-3 分钟）
node episodes/yuki_fish_musical/craft3d/render.mjs --serve   # 交互 viewer，端口 4210（点击播放，带音轨）
```

## 结构

- `viewer.html` — importmap 同 cel 版
- `viewer.js` — 数据链与 cel viewer.js 一致：`StoryParser.parse(script.story)` 取
  entries/storyEvents（不用 Storyboard 执行器，避免它实例化旧 Yuki 资产）+
  timeline.json + viseme_*.json + final_voice_features.json；`makeLip`/`segAt`/
  `drawSubtitle`/shot→机位映射全部照 cel 逐行移植。机位表：wide 6.25 /
  yuki 3.8 / cat 3.55 / evidence 3.10，fov 35，720×1280。
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
- `mouth3d.js` — V17 几何嘴上脸：肤色补丁（#ffe3d1 无光照椭球，z=.205）
  埋住纹理脸的贴图笑线，v13 五片条形嘴组（cavity/upper/lower/teeth/tongue，
  数学逐行复制）挂在 `headAssembly.head` 的 (0,-.150,.233)；v17 的
  purse/teeth 通道在 apply 入口先做同样映射。闭口时 upper 条画闭口线，
  无双嘴。
- `render.mjs` — 60fps；`--check` 只编码 checkTimes 帧（其余 stepAt 空跑保状态），
  全片带 `-i assets/audio/mixed.wav`（aac 48k）出 mp4。

## 节奏与口径

- 一拍二：身体/手型/眨眼/发梢在 `tq=floor(t*12)/12` 网格；口型与相机 60fps
  （60fps 输出下 12Hz 姿态=5 帧整保持，无 2/3 帧交替）。cel-look 纪律。
- ink：craft 壳 0x25222a / 0.012（Phase 1 的 customProgramCacheKey 替换）；
  Mochi 走 StudioMochi 自带 cleanOutline 0x25222a / 0.006（静态几何快照描边，
  猫是临时混排所以允许）。
- 渲染 `NoToneMapping` + sRGB（craft toon ramp 口径；Mochi 的 celGradient
  硬切在 NoToneMapping 下略亮于 cel 版 ACES，属已知混排差异）。

## 当前状态

- 63 帧抽查已目检：开场指认（point+fist 手型对）、双人全景（唱段分工正确——
  songA 猫唱小雪闭口、songB 小雪唱猫闭口）、evidence 特写（嘴角饭粒+盘子道具）、
  闻香手位（修正后在脸侧）、抓到啦（point+open）、freeze 收尾、cat_wash
  海绵在手上/休息海绵互斥切换。描边单层无断线，人猫无穿模，字幕与 cel 同版式。
- 口型开合与 viseme 轨道一致（抽查帧落在 gate=0 的闭口音节间隙属数据真相，
  已用 final_voice_features 核对）。
- 已知差异（相对 cel 版）：小雪表情只有眨眼（cel 的 actFace 情绪眼/眉/腮红
  未迁移，Phase 3）；发梢用 craft 内置摆动而非 cel 的 tq 正弦（等价量级）；
  Mochi 是 cel 资产混排。

## Phase 3 待办

1. **MochiCraft3D 新建**：照 YukiCraft3D 结构用 LimbSurface/ringsGeometry 搭年糕
   （胖猫体型 radii 表、猫耳/尾、爪），替换临时混排；songMouth 双圆片逻辑可直接
   挂在猫头组。`buildHomeProps(scene,cat)` 需要 `headGroup`/`rightArm` 句柄——
   在 craft3d 侧做适配 shim 或让 MochiCraft3D 暴露同名属性。
2. **表情 5→17 迁移**：craft 脸是 CanvasTexture（point/blink 两参）。把 cel
   actFace 的 emotion 表（eye/brow/slope/asym/gaze/blush）映射成 faceTexture 的
   参数化绘制分量；注意纹理重绘按 key 缓存，情绪键要进 lastFace key。
3. **校验链合并**：把 cel 版 `tools/golden_frames.mjs` 的黄金帧回归思路引入
   craft3d（先存本版 baseline）；e08 hybrid 的骨骼长度/落地校验可移植
   （twoBone 已保证链长，主要查 footContact 漂移与手-头穿插）。
4. **一拍二抽检视频级确认**：静帧已确认 5 帧保持；全片连看确认口型同步与
   落脚不滑步后再封版。
