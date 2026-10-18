# 《星屑战壳》S1E2《夜守》制作笔记（320s 正片节奏长剧）

> 故事载体=storyboard.md（候选取舍/因果大纲/强度曲线/批评 pass/对白语义版/接触帧清单/规格继承清单）。
> 系列约束：F01/F02 冷静期全程沉默；F03（驭纹）已先入册 docs/stardust_series_bible.md（注册提交独立）。

## 执行链（继承 S1E1 R13/R14 全规格，零回退）

- 场景：夜版原生（无 morningize）+ OP 夜版纹理集整目录复制（assets3d/tex/，零新图成本）；
  圣殿广场=战斗主场（背对圣火的防线构图），柱廊=夜铺/兽登场。
- 新资产：蚀星兽（dula-assets characters/stardust/beast.js）——狼形黑躯+蚀纹紫光脉动+
  颈后驭纹（F03 镜头才点亮）；剪影优先，动作集=潜行拖步/扑击前爪前伸/肩撞立压/倒地侧翻/逃窜，
  位移靠根不走连续四足步态；探针锚点=claws/shoulderL/spineBack/napeMark（头注契约）。
- 探针契约 config/contact_contract.json：c1 兽爪×盾（bite 段 pawExt 前伸帧）/c2 兽肩×大釜胸甲/
  c3 兽域×弹雨扇面射程/c4 大釜双拳×兽背 + gait（兽 speed_max 8=奔逃实测）+ reach 白名单
  （动作本体/过渡帧窗口制）+ clad_fit 36 条（静立域子窗）。

## 翻车实录（本轮）

1. **viewer.html 没随链复制**——init_viewer_episode 拒绝非空目录后我只拷了 js；
   页面 404 静默挂起（ready 永不置位）。教训：脚手架三件套=viewer.html/viewer.js/render.mjs。
2. **PerspectiveCamera(44,W,H,.05,200)** 少写 `/H`：aspect=1280/near=720/far=.05，
   全片渲染成竖缝。夜戏黑场放大这种错（以为进了几何体）。教训：probe 先 dump
   camera.fov/aspect——三行数值直接定案。
3. **beast.js 用了 mix() 没定义**（ReferenceError 冒泡成 poseAt 栈）。模块级小工具
   每个文件自带，别假设。
4. **走拍守卫再犯**：`if(w<1)` 在 w=0（未起步）也挂 walk 标志 → gait 探针抓到
   0.05m/s 假 bout（"gait too slow/cadence off"）。守卫必须 `w>0&&w<1`（R13 同类：
   后写条件块踩走拍 rootX）。R13 已写回的教训在同轮以另一形态复发——白名单式
   `if(a<1)` 起手式在整个库里都要按 `0<a<1` 审。
5. **clad_fit 窗口要落在静立域子窗**：撞击/承压极端帧（c1 后坐/c2 撞飞/被逼连退）的
   甲件嵌入是物理本体，贴身断言是静立域探针——窗口挪到段内平稳子窗即绿，
   不改阈值。

## 音频链（火山-only 新规首轮）

- 底床加厚（氛围感=大片感）：ambience_night 夜旷野（0.30，存在感强于 S1E1）+
  fire_crackle 圣殿火盆层（14-316s，0.16）；双段 BGM：bgm_nightwatch（0-140 沉隐）/
  bgm_nightbattle（140-296 压迫爆发落定）。
- 事件 11 摆点（敲盾/兽吼/抓盾/肩撞/盘滚/银星雨/陨落/逃窜）。
- 24 句 TTS（声线 R12 定案）+ 2 喊招压帧（c1 银星雨 252 / c2 陨星落 274）。

## 验收证据（数值全绿；无音频输入环境，戏感等监制耳朵终裁）

- QC（qc_lines.py 拼音级）：**26/26 全 ✅**，报告 `tmp/voice_audition/qc_s1e2_report.md`。
- 混音对位：11 事件/底床 320s/26 句，AAC 留量 peak 0.7762 ≤0.8（`assets3d/audio_sync_report.json`）。
- 探针：contact（c1 爪盾/c2 肩撞/c3 压点/c4 拳背）+gait（含兽）+reach+clad_fit 36 条全绿
  （`storyboard/s1e2_phys/contact_validation.json` + `clad_fit_validation.json`）。
- seek：双渲染沉淀后 80 帧逐位全等（`storyboard/s1e2_check/seek_check.json`）。
- 追加翻车：FX builder 只在窗口内调用=初始态停原点裸奔（slamFX 尘埃落定环在 216s 帧
  亮成焦点）——每帧 update 是 OP 纪律；道具/特效可见性初值=false（dustRing 初值可见
  导致顺序/倒序回放不一致）；setMarkGlow 必须先于 update（顺序反=滞后一帧，seek 失配）。
- gate ALL GREEN（`storyboard/gate/gate_report.json`）。
- 成片：`output/craft3d_full.mp4`（320.0s h264+aac）；final_check 同镜表抽帧复审。


## 收尾结论（E4 机位修正后重渲定稿）

- 余韵推镜终点原切掉阿鏊的脸（落点特写物证失败）→ 推镜终点抬到头高重渲——
  **落点特写必须逐帧目检，数值探针管不到构图**。
- TV 版：`output/craft3d_tv_s1e2.mp4`（369.2s = OP 49.2s + 正片 320s，concat 同编码直拷，
  接缝抽帧 `storyboard/final_check/tv_op_end.jpg`/`tv_e2_start.jpg`）。
- 回归：OP / S1E1 gate 各 ALL GREEN（S1E2 改动零外溢）。
