# E03《暮色归途》进度存档（2026-08-28 深夜）

## 状态：等 codex 配额重置（2026-08-29 03:07 AM）

**已完成**（全部验收通过）：
- 分镜/剧本/骨架：storyboard.md、script.story（story_tool 校验 0 错误）、bootstrap.js、
  scenes/DuskHomecomingSequenceScene.js（E02 场景类改名，逻辑通用零改动）、
  config/scene_contract.json（黄昏版）
- 场景母版×4：scene_riverbank_dusk / scene_street_dusk / scene_bridge /
  scene_lane_home_dusk（codex 一次通过）
- 关键帧 26 张：frame_00–19 + I2V 首帧×4（frame_run_01/frame_bridge_02/frame_wall_03/
  frame_lane_04）+ ib_01/ib_02（codex，零现金）
- I2V 4 段全过：**wan2.6-i2v 标准档**（非 flash），720P，10s 共 ¥6.0
  （cat_run_bank 2s / girl_bridge_walk 3s / cat_wall_walk_dusk 3s / girl_lane_walk 2s）。
  抽帧验收：跑步猫 f_0012/f_0024 无 off-model（E02 flash 的漂移问题标准档未复现）
- 音频：TTS CosyVoice 5 句全 OK、SFX 6 个新合成（seed 20260828，README 已记）、
  BGM=Pixabay《Even Light – Gentle Folk Guitar Serenity》(DesiFreeMusic)
  assets/audio/music/、混音 mixed.wav 60.000s、lipsync_cues.json 8 条
- config/keyframe_timeline.json：142 条（22 静态 + 120 I2V cel）
- 口型变体 5/26 完成并贴回验证（frame_01 half/open、frame_04 half/open、frame_06 half）

**卡点**：codex 用量上限，2026-08-29 03:07 重置。剩 21 张变体
（口型：frame_06_open、frame_11 half/open、frame_16 half/open、猫 frame_02/08/12
half/open；眨眼：少女 01/03/04/06/11/14/16 + 猫 02/08/12 的 closed）。

## 2026-08-29 06:00 更新

- 03:22 定时任务续跑成功：21 张变体完成 17 张（全部口型 16 张 + 眨眼 6 张），
  22/22 auto_lock 贴回验收干净（diff  confined 在特征矩形，区域外零像素变化）。
- 06:00 前后配额再次耗尽（08:22 AM 重置）：只剩 4 张猫/少女闭眼变体
  （frame_16 / frame_02 / frame_08 / frame_12 的 closed）。
- 已设 08:32 定时任务续跑收尾（变体→贴回→rig→verify→渲染→验收→晨报）。
- 已知工具漂移（遗留）：scene_tool.py 的 _find_project_root 还在找
  `docs/skills` 旧布局，当前工作区 skills 在 dula-skills/，contract 验证跑不了。

**续跑步骤**（gen_variants.sh 已改幂等，直接重跑即可）：
1. `bash tools/gen_variants.sh`（自动跳过已完成的 5 张）
2. `../../.venv/Scripts/python.exe tools/auto_lock_variants.py`
3. `../../.venv/Scripts/python.exe tools/build_rigs.py`
4. `npx dula-verify ./episodes/cat_leads_e03_dusk_homecoming`，逐张查截图
5. `npx dula-render ./episodes/cat_leads_e03_dusk_homecoming`
6. 成片抽帧验收：猫叫 6.6/26.0/40.6s、独白 3.2/12.6/20.6/37.6/50.3s、
   I2V 段中段 11.5/19/34/36.5s
7. 写 V1_NOTES.md

**纪律提醒**：口型/眨眼变体只走 codex 局部编辑（E02 V2–V4 教训，已写回 skill），
配额不够就等，不要 fallback qwen/wanx/程序化。

**成本至今**：现金 ¥6.0（I2V 4 条）；codex 约 45 张走订阅额度。
