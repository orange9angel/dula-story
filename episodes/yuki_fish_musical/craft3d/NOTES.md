# 《谁动了我的小鱼干》三维化管线 · craft3d/

Phase 4（2026-09-26）：**完整剧情短片**。开场（建立镜头缓推 → 小雪端小鱼干进场
「年糕～今天奖励你」→ 年糕「好耶！」→ 小雪叮嘱离场 → 空盘）+ 正片 46.3s 整体后移
+ 结尾（年糕水槽洗碗「……洗碗就洗碗。」→ 偷瞄零食袋 → 小雪画外「我看着呢。」→
泄气缓拉收尾），共 65.62s。双主角形象精修（标准动画规格）。全片
`output/craft3d_full.mp4`（含新混音音轨）。
**不改动** cel 版任何文件，不改 craft_trial / dula-assets / dula-engine。

## 入口命令（都在 dula-story 下跑）

```bash
# 扩展数据重建（TTS 已在 assets3d/dialogue/，重跑会重新对齐/平移/混音）
dula-story/.venv/Scripts/python.exe episodes/yuki_fish_musical/craft3d/tools/build_extension.py
node episodes/yuki_fish_musical/craft3d/render.mjs --check   # 90 张关键帧 → storyboard/shot_NN.jpg + craft3d_trace.json
node episodes/yuki_fish_musical/craft3d/render.mjs           # 全片 → output/craft3d_full.mp4（约 2 分钟）
node episodes/yuki_fish_musical/craft3d/render.mjs --serve   # 交互 viewer，端口 4210
# 自由机位片段：--range 起,止 --camera "px,py,pz,lx,ly,lz[,fov]" --out <相对 output/>
# --norefine：关闭精修层（任务 B 前后对比用）
```

## 新台词（TTS：volc-voice-casting/scripts/seedtts_say.py，emotion-scale 2，QC 全绿）

| 文件（assets3d/dialogue/） | 角色 | 台词 | 声线 / emotion |
|---|---|---|---|
| o1_yuki_reward.mp3 | 小雪 | 年糕～今天奖励你，小鱼干加餐！ | vv_uranus_bigtts / happy |
| o2_mochi_yay.mp3 | 年糕 | 好耶！ | ICL_uranus_youmodaye / happy |
| o3_yuki_water.mp3 | 小雪 | 我去浇个花，不许偷吃哦。 | vv_uranus / calm |
| e1_mochi_wash.mp3 | 年糕 | ……洗碗就洗碗。 | ICL youmodaye / sad |
| e2_yuki_watching.mp3 | 小雪（画外） | 我看着呢。 | vv_uranus / calm |

注：年糕的 ICL 音色实测在 `seed-tts-2.0` resource 下可合成（与 skill 文档的
resource 配对笔记相反，已写回 volc-voice-casting）。

## 结构

- `tools/build_extension.py` — 扩展构建器：5 条新台词 faster-whisper DTW 逐字对齐
  （复用本集 tools/align_all.py 的 align_text）→ V17 同一 `build_viseme_track` 生成
  新段口型轨道 → 原 config 全量后移 T0=11.544s 并拼接 → 新 mixed.wav
  （music_bus 床层垫开场/结尾 + 新 TTS 落点 + 原 mixed 后移）。产出
  `script3d.story` + `config3d/{timeline,viseme_yuki,viseme_mochi,final_voice_features}.json`
  + `assets3d/mixed.wav`。viewer/render 只消费 craft3d 自有数据。
- `viewer.js` — 新增：六个新机位（establish 缓推 / entry 右前 3/4 / depart 送出门 /
  plate 空盘低机位 / sink 水槽侧写 / pullback 缓拉，均支持条目内动画）；道具时间轴
  （端盘→落地餐盘+鱼干→空盘+嘴角饭粒→结尾洗碗摆位：餐盘/盘子堆挪到水槽、
  零食袋、饭粒结尾收起）；`?norefine=1` 精修开关。
- `performance3d.js` — craft 空间原生新动作：fish_enter（端盘入场步）/
  fish_serve（弯腰放盘，道具交接）/ fish_idle / fish_depart（叮嘱指猫落在
  "不许偷吃"后半句→出门→回头）/ fish_offscreen；年糕新增 cat_happy（眼睁圆小跳）/
  cat_wash_sink / cat_glance（视线落在袋上）/ cat_freeze / cat_resign。
- `refine3d.js` — 小雪精修：增强纹理脸（虹膜径向渐变 + 双层高光 + 上睫线外角挑，
  线色对齐 0x25222a；复用 head3d 的 aperture 眨眼裁剪参数，按 point/blink 键缓存
  覆盖 faceMat.map）；皮肤换柔和四档 ramp；头顶高光带（无光照椭圆贴片）；
  刘海三根分缕丝；百褶裙顶点色压褶谷（与 ringsGeometry 的 cos(θ·10) 同相）。
- `mochi3d.js` — 年糕精修：背部深色分区环带（贴皮、无描边、边缘落在体侧明暗交界）、
  尾巴两道环纹、后腿归入深色区、眼睛分层（虹膜渐变片 + 双层高光 + 上睫线弧）、
  胡须细弧线下垂（.0012 管）、耳芯更粉（#f2a3ab）。
- 机位/描边/节奏口径与 Phase 2/3 相同（ink 0x25222a，小雪 0.012 / 年糕 0.006；
  一拍二 tq 12Hz，口型/相机 60fps；NoToneMapping）。

## 目检结论（90 帧全量 + 定点复查）

- 开场：establish 缓推厨房 ✓；端盘入场+放盘交接（端盘与落地餐盘互斥切换）✓；
  「好耶」猫睁圆眼小跳 ✓；叮嘱指猫落在后半句 ✓；空盘低机位特写 ✓。
- 正片：与 v2 逐镜一致（仅时间平移），无回归。
- 结尾：水槽侧写洗碗（海绵在爪、餐盘在手边）✓；偷瞄零食袋（脸转向袋、袋同框）✓；
  画外「我看着呢。」猫僵住 ✓；泄气缓拉收尾（全景含零食袋）✓。
- 精修对比帧在 `storyboard/refine_compare/`（before 取自 craft3d_v2.mp4 同机位帧）。
- 已知限制：小雪表情仍只有眨眼档（cel actFace 情绪眼未迁移）；depart/enter 的
  步行为原地踏步+平移（无脚步声）；年糕唱段口型是双圆片而非视素几何嘴
  （角色设定如此，与 cel 一致）。

## 翻车记录（本阶段实测）

- **`false || undefined` 坑**：`placed = t>=x || prop?.placeDone` 在 prop 缺键时得
  `undefined`，`dish.visible=undefined` ≠ false（three 的 visible 检查是
  `=== false` 才剔除）——道具该藏不藏。布尔可见性赋值要显式 `=== true` 或 `!!`。
- 水槽镜头三连调：胖猫侧面是 loaf 长轴，竖屏下"侧面正打"必然爆框——
  侧写机位要按体长（而非身高）估取景。
- 猫转头可达域：身体朝水槽（yaw π）时头部只能转 ±60°，偷瞄目标必须放在
  它面朝的扇区内（零食袋最终放水槽边地上）。
- 后台渲染期间改 viewer 文件会让下一次加载拿到中间态崩溃——渲染与改代码串行做。

## Phase 5 待办

1. 表情 5→17 迁移（refine3d 的增强纹理脸已提供挂载点：把 emotion 参数加进
   face key，逐情绪画眉/眼/腮红分量）。
2. golden frames 回归链引入 craft3d（本版 90 帧可作 baseline）。
3. 全片连看验收（音画同步、一拍二保持、落脚）。
4. 可选：enter/depart 加脚步声 SFX 轨（build_extension 混音点已就位）。
