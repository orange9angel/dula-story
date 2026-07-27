# 《雨后天台》V2 晨报（2026-07-27 凌晨自动完成）

## 成片

- **V2（动态版）**：`output/output_0-31.mp4` — 1920×1080 / 30fps / 31.0s / AAC，14.7MB
- V1（相册版，备份对照）：`output/output_0-31_v1_slideshow.mp4`

## V2 相对 V1 的改动（针对"像相册联播"的四条批评）

1. **雨滴动了**：场景渲染器新增程序化雨丝层（420 条雨丝 + 地面涟漪，确定性 seed），强度随剧情：0–19.5s 暴雨 → 19.5–21.2s 渐弱 → 22.6s 彩虹出现彻底停
2. **身体有连续动作了**：6 张动作中间画插入时间线快切——行走换步循环（3.5–5.0s）、半蹲过渡（9.5s）、伞倾斜过渡（11.3s）、蹭头交替（24.8–26.5s）、抱猫起手（28.0s）、离场换步循环（29.2–30.2s）
3. **猫嘴动了**：frame_04（7.5s 猫叫）和 frame_08（16.5s 轻叫）加了猫口型 rig，cue 直接由猫叫 wav 的能量包络驱动（新增 SFX_CUES 机制）
4. **缺口的口型补了**：frame_05（独白3「湿透了呢，会感冒的哦。」）新增少女口型 rig；全片现有 6 个 rig

## 验收抽帧（ffmpeg 精确提取，output/v2_probe/）

- t=2.0 雨丝可见 ✓ / t=20.8 渐弱 ✓ / t=23.0 彩虹镜头零雨丝 ✓
- t=4.0 walk_alt 换步入画 ✓ / t=25.4 nuzzle_alt 蹭头交替 ✓ / t=28.1 pickup_mid ✓
- t=8.55 猫嘴微张 ✓ / t=10.5 少女 frame_05 口型 ✓ / t=16.8 猫 frame_08 嘴张 ✓
- check_lipsync：30 拍 / 6 rig / 8 cue / 36 图全过；story_tool 0 error 0 warning；dula-verify 12 张截图无报错

## 遗留问题（按优先级）

1. **frame_03 段（6.8–8.4s）猫叫前半程猫嘴不动**：第一声猫叫 7.5s 起，但 frame_04 特写 8.4s 才切入，rig 只能演叫声尾部。要修需给 frame_03 也做一组猫嘴变体（约 10 分钟工作量）
2. **独白1 前 1 秒（3.97–5.0s）frame_01 远景无口型**：脸上嘴部不可辨，观感无影响；在意可补
3. 音色仍是龙小夏（longxiaoxia_v3）；想换龙小淳跑 `python tools/generate_audio_cosyvoice.py --voice longxiaochun_v3 --force` + build_lipsync + 重渲染
4. 混音电平（dialogue 1.12 / bgm 0.3 / sfx 0.82）听后想调改 tools/generate_audio_cosyvoice.py 常量重混即可
5. V2 废帧记录：walk_alt 一 roll 伞脱手漂浮，二 roll 通过（已记入 generation_prompts.md）

## 成本

V2 全部改动 0 元现金（图像走 ChatGPT 订阅，音频无重合成）；百炼余额约 ¥7.3 未动。
