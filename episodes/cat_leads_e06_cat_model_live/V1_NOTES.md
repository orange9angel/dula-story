# E06 真人版《模特小橘》制作记录

## V1（2026-09-06，已备份 output/output_v1_backup.mp4）

- 工艺：11 段 I2V（Seedance 2.0 720p）+ 8 镜 OmniHuman 1.5（Boy×3 Girl×5）
  + 1 镜 DreamActor 2.0（猫台词）+ bed60 单底床混音。
- 成本 ≈¥64–72（tmp/cost_e06live.md V1 段）。
- 导演观后三个问题：① 数字人僵（omni 正脸模板感）② 说话镜与 I2V 段背景跳变
  ③ 语音槽环境音被 duck 到 0.15 造成"环境音断"。

## V2（2026-09-06，正式版 output/output.mp4 = output_v2.mp4）

- 导演决议（方案 A）：接受视频参考链新建的角色面孔，全片统一为新脸。
- 工艺：9 个说话镜全部改用 Seedance 2.5 视频参考链（T2V 建角色 →
  reference_video 锁脸锁场景 + reference_audio 驱动说话），11 段 I2V 原样保留；
  四总线混音（ambience 全 60s 连续不 duck / dialogue 原 TTS 换轨 / foley V1 位置
  / music 单独 sidechain duck）。构建：tools/build_v2.py（config/v2_edit.json）；
  生成/续接：tools/resume_v2.py（台账 tmp/video_chain/resume_tasks.json）。
- 角色参考：Boy=tmp/video_chain/step1_ache_t2v.mp4；Girl=v2_girl_t2v.mp4；
  Cat=v2_cat_t2v.mp4（均 720p T2V 建立镜）。
- 废案记录：s01 r1 背景漂成石板路（r2 场景锚定后采用）；s04 r1 画面多出
  三花猫（r2 去猫采用）；s08 r1 输出审核误杀 PolicyViolation（改写措辞后 r2 通过）。
- 收尾（s12/s17）：taskId cgt-20260906212035-r2fk4 / cgt-20260906212853-jz9xh，
  各 173700 tokens；对齐参数 generatedSpeech/targetSpeech/audioOffset 见
  config/v2_edit.json（s12 语音锚点与能量起点差 0.44s，按包络互相关锚定；
  s17 差 0.06s；两段语音段视频变速因子 1.09/1.14）。
- 验收（正式版 output/output.mp4）：60.000s、1920×1080、1800 帧、
  blackdetect 无命中；9 语音槽 ambience RMS -38.3~-38.6 dBFS 非静音；
  9 说话镜抽帧（tmp/v2_accept/）逐镜目检脸/服装/场景一致、口型在语音窗内。
- 成本：V2 生成 ≈¥131.60（¥60/M 估算口径，未对账单；明细 tmp/cost_e06live.md）。

## 遗留问题

1. 新角色与 V1 不同脸（导演方案 A 已接受）；Boy 视觉年龄偏小。
2. 场景非几何级锁定：s09 背景仍为大块石坡无河面；女孩/猫树干石阶与 I2V 段
   非同一几何，仅靠调色接近。
3. TTS 换轨为区间级对齐：字内节奏未经实时播放主观验收；s12 语音锚点
   分歧 0.44s（>0.15s 阈值，已按互相关锚定并记录）。
4. 成本估算口径 ¥60/M 未经账单核实；V2 实际扣费应以火山账单为准。
5. output/compare_v1_v2.html 可同步对比 V1/V2（preview 为 7+2 占位版，
   正式版为 output.mp4 / output_v2.mp4）。

## 下周计划：世界统一实验（导演定案 v2，总预算 ≤¥45）

**第 1 步 · 静帧定调（¥0，codex）**：角色设计锁（阿澈/小蓝/猫）+ 场景主
视觉，监制验收改到点头。角色 prompt 用无数字年龄的成熟锚定词
（防输出端误杀）。注意分工：**静帧只做设计定调，不进生产**——真人脸
图片过不了 Seedance 审核墙；场景静帧（无脸）可直接作 I2V 首帧。

**第 2 步 · 生产锚点（~¥10–15）**：按定调稿 T2V 生成角色建立视频
（~¥5/角色），监制验收脸与纹理（第二道门）。纹理纪律：全部镜头走视频
模型生成（环境镜若 2.0/2.5 纹理差肉眼可辨则统一 2.5）；对齐用音频加垫，
禁视频变速。

**第 3 步 · 6 秒稳定性实验（≤¥30）**——橘猫 2s 不说话 → 2s 说话 →
2s 再不说话：

- **V-a 单段 6s**：Seedance 2.5 一次生成，音频参考只含中间 2s 台词。
  验证单段内"只在语音区动嘴 + 前后静默段身份/场景零漂移"（≈¥10–15）。
- **V-b 三段拼接**：2s I2V（静默）→ 2s 视频参考链（说话）→ 2s I2V（续帧）。
  验证跨段接缝连续性（≈¥12–16）。
- 验收：全 6s 猫脸/花色/背景逐段 1-5 分；动嘴是否严格落在语音区；
  V-b 两个接缝逐帧对比；2.0 vs 2.5 单帧纹理并排比。通过后才谈全片重制。
- 执行纪律：先 V-a 确认锚点可行再放 V-b；TTS pad ≥1.8s；批次生成前
  先用一镜验证与本集既有素材一致再放全量。
