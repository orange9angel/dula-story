# E04《夏夜流萤》进度存档（2026-08-30 00:30 深夜）

> **已完结**：当晚改道 Seedream 变体通路后全链路跑通，成片与验收结论见
> `V1_NOTES.md`。本文件留档配额等待期的中间状态。
>
> **V1.2 注（08:30）**：Seedream 版因几何漂移被判不合格，codex 重做中
> （9/23 完成后再遇配额墙，11:37 自动续跑）。注意：Seedream 变体已移入
> `tmp/seedream_backup/`，**当前 assets 变体不完整，勿直接重渲染**；
> 如需应急恢复 V1.1 资产，把备份移回再跑 build_rigs.py 即可。

## 状态：等 codex 配额重置（2026-08-30 03:32 本地）

**已完成**（全部验收通过）：
- 分镜/剧本：storyboard.md、script.story（story_tool 校验 0 错误；含猫开口
  3 句台词）、bootstrap.js、scenes/FireflyNightSequenceScene.js（E03 场景类
  夜景改造：夜晚调色板 + 新增 starTwinkle / fireflies 程序化层 + 嘴型 rig
  多 cue 绑定 entries[]，node --check 通过）、config/scene_contract.json
- 场景母版×4：scene_lane_home_night / scene_street_night / scene_bridge_night /
  scene_riverbank_night（codex 一次通过，零重 roll）
- 关键帧 26 张全过：frame_00–19 + I2V 首帧×4（frame_wall_01/frame_bridge_02/
  frame_run_03/frame_bank_04）+ ib_01/ib_02（codex，零现金）
- I2V 4 段全过：**seedance-2.0-mini-260615**（注意必须带日期后缀，裸 ID 方舟
  404——已写回 skill 文档），4s 取前段抽 12fps cel（24/36/36/24），
 浪费了首轮 4 次 404 调用（模型 ID 笔误）。抽帧验收：4 段中段全 on-model。
- 音频：CosyVoice 龙华×5 + **seed-tts-2.0 咪仔×3（猫开口首秀，情感参数
  calm/happy/happy）**；环境音/BGM 全部切**火山 Seed-Audio 1.0**（
  `/api/v3/tts/create`，语音控制台 key，非方舟——已写回 build-character-voice
  备忘）；程序化 SFX 留作 fallback；BGM 混音包络 48→52.5 渐强；
  mixed.wav 60.000s
- config/keyframe_timeline.json：142 条（22 静态 + 120 I2V cel）
- config/lipsync_cues.json：11 条（8 台词 + 3 喵 SFX 能量驱动）
- 口型变体 4/27 完成并贴回验证干净（frame_01 half/open、frame_04 half/open）

**卡点**：codex 用量上限，2026-08-30 03:32 重置。剩 23 张变体
（口型：frame_06/11/16 half+open、猫 frame_02/08/12 half+open；
眨眼：少女 frame_01/03/04/06/11/13/14/16 + 猫 frame_02/08/12 的 closed）。

**续跑步骤**（gen_variants.sh 幂等，直接重跑即可）：
1. `bash tools/gen_variants.sh`（自动跳过已完成的 4 张）
2. `../../.venv/Scripts/python.exe tools/auto_lock_variants.py`
3. 眨眼变体逐张目检（防"肿眼泡"，E03 V2. 1 教训）
4. `../../.venv/Scripts/python.exe tools/build_rigs.py`
5. `npx dula-verify ./episodes/cat_leads_e04_firefly_night`，逐张查截图
   （重点：萤火层效果、星闪、猫叫时猫嘴动（多 cue 绑定验证）、字幕安全区、
   LAMP_POOL/月光带坐标校准）
6. `npx dula-render ./episodes/cat_leads_e04_firefly_night`
7. 成片抽帧验收：独白 3.2/13.6/21.6/39.1/52.3s、猫叫+猫台词 6.6/7.3、
   26.6/27.3、42.2/42.9s、I2V 段中段 12.5/20/35.5/38s
8. 写 V1_NOTES.md；更新 dula-story/AGENTS.md 最新 Episode 行

**已知遗留**：
- scene_tool.py 的 _find_project_root 仍找 docs/skills 旧布局（E03 遗留，
  contract 验证跑不了，dula-skills 侧待修）
- 猫声线后处理（轻抬音调）暂不做，等成片混音验收再定

**成本至今**：现金 ≈ ¥3.2（I2V 4 条 4 折价）+ Seed-Audio 3×60s（邀测额度内）；
codex 约 56 张走订阅额度。
