# 《猫带我去的地方》E01《晴天便利店》V1 晨报（2026-07-28 凌晨自动完成）

## 成片

- **V1**：`output/output_0-60.mp4` — 1920×1080 / 30fps / 60.0s / H.264+AAC
- 首渲 55.0s 截尾版已删除（原因见「坑与修复」#1）

## 一天做了什么（全流程复盘）

1. **风格定稿「晴印」**：淡彩 3 张（商业日漫底色未除，否）→ 刮夜 1 张（太暗黑，否）
   → 晴印 v1（天空阶梯感，修正）→ 晴印 v2 定稿。风格圣经 `STYLE_BIBLE.md`：
   锐边平涂零纹理、两段色天空（唯一允许的柔和过渡）、互补色阴影（无黑灰）、
   形状阳光、冷暖轮廓线。废案图存 `assets/style_tests/` 留档。
2. **母版链 6 张**（风格母版 + 小蓝/小橘 + 房间/街道/便利店内景），全部一审通过。
3. **关键帧 26 + 中间画 4 = 30 构图**：29 张一审通过，frame_10 废 1 roll 1
   （猫背对镜头嘴不可见，23.4s 猫叫 cue 无 rig 可挂——正是上集 frame_03 的坑，
   审查当场拦下重 roll）。
4. **口型/眨眼变体 25 张**：全部 imagegen 局部编辑 + `tools/auto_lock_variants.py`
   自动 diff 定位羽化贴回，区域外零像素变化（25/25）。
5. **场景代码**（agent 派生自 RainyRooftopSequenceScene）：保留 crop 运镜/眨眼调度/
   12fps 三态口型 cel/中间画快切/收尾 crossfade；雨丝系统整体替换为晴印四件套——
   cloudDrift（云漂移）、dappleSway（洒金光斑摆动）、steam（平涂蒸汽）、
   doorBand（自动门光带），全部确定性纯函数、画在源图空间随 crop 移动。
6. **音频**：CosyVoice 龙小夏 5 句独白（2 句超速重录，时隙误差 ≤50ms）；
   缺的 4 个 SFX 程序化合成（蝉鸣/门铃/店内底噪 numpy 合成、房间底噪走引擎生成器，
   seed 固定，出处见 `assets/audio/sfx/README.md`）；mixed.wav 精确 60.0000s，
   BGM 53.5s 扬起（占位曲目=上集钢琴，见遗留 #2）；真实口型 cue 已生成
   （5 条 energy-gated-text + 2 条猫叫 energy-gated-sfx）。
7. **校准**：12 个 rig 坐标全部用变体真实 diff 重写（frame_01 嘴位估值偏 40px 被抓出）；
   蒸汽/光斑/门光带位置按实际帧重测；frame_21 猫眼基帧已闭，撤销其眨眼 rig
   （靠呼吸 crop 起伏表"活"）。
8. **verify + 渲染**：dula-verify 12 张截图通过；dula-render 出片。

## 坑与修复

1. **首渲只有 55.0s**：script.story 最后 cue 结束于 53.5s，渲染管线按剧本时长
   出片，56–60s 的收尾（店外空镜+天空+crossfade）整段被截。修复：script.story
   补尾部 cue 13（59.0–60.0 空镜尾拍，沿用上集 `{Voice:calm}` 尾 cue 模式），
   重渲显式 `--duration 60`。**教训：剧本时长=成片时长，尾镜长度必须写进 script.story**。
2. 新发现记录：mjpeg 抽帧在本机 ffmpeg 报 Non full-range YUV，抽帧验收改 PNG。

## 验收

- ffprobe：60.0000s / 1920×1080 / 30fps / H.264+AAC，18.4MB（`output/output_0-60.mp4`）
- check_lipsync：43 beat / 7 mouth rig / 7 cue / 44 图全过，零 placeholder WARN
- dula-verify 12 张截图无报错，抽查：猫叫口型 cel（6.25s）、门光带（27.83s）、
  店内蒸汽（30.83s）、独白5 字幕+暖金调（53.13s）✓
- 成片抽帧（output/probe/）：t=6.2 猫张嘴（猫叫 cel）✓ / t=51.0 独白5 口型微张 ✓ /
  t=57.0 店外空镜+窗内双影 ✓ / t=59.3 天空收尾+cloudDrift 云在漂移位 ✓
- 观察项：frame_25 程序化云的椭圆感比烘焙云略"几何"，观感可接受，下集可优化形状

## 遗留

1. BGM 为占位曲目（沿用 rainy_rooftop_cat 的治愈钢琴 mp3），晴日气质可以再挑
   更合适的吉他/明亮系曲目，换曲后重跑 `tools/generate_audio_cosyvoice.py` 即可。
2. frame_06 猫在画外前方（符合"猫在前引导"的银幕方向，记录在案不重 roll）。
3. ib_02 换步中间画复用于 frame_11 走近镜头（中间画只有 4 张），若观感上
   尺度跳变明显，frame_11 需要专属 walk alt。
4. 独白 2 句音频有 ~50ms 尾音略超字幕槽（5.45s 结束，与 5.8s 猫叫不撞），
   在意可再提速重录。
5. 密度 0.5 构图/s 低于上集 V3 的 1 张/s 标准，补偿手段是全程 crop 运镜 +
   程序化层 + rig/循环；V1 观感若嫌闷，优先补中间画而非新构图。

## 成本

- imagegen 共 ~68 张：风格探索 6 + 母版 6 + 关键帧/中间画 30 + 废帧 1 +
  变体 25（当日额度未触发上限）
- 现金 0 元（TTS 走 DASHSCOPE key 已有额度，SFX 程序化合成，BGM 复用）
