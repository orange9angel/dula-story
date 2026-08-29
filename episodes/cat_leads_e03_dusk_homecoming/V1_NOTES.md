# 《猫带我去的地方》E03《暮色归途》V1 晨报（2026-08-29 完成）

## V2 修订（2026-08-29 中午）：I2V 全部改投 Seedance 2.0 mini

观众反馈：V1 的 wan2.6-i2v 标准档虽然治好了漂移，但**动作量太保守**（人物并腿滑行、
猫跑变快走），观感不如 E02 的 flash 档。对比拼图确认后，4 段 I2V 全部改用
**火山方舟 seedance-2.0-mini 重拍**（4s / 720p / 无声，限时 4 折约 ¥0.8/条）：

- 动作量达标：猫跑是真四足离地奔跑、少女过桥/巷走是真迈步摆臂
- 一致性达标：白胸毛/条纹/发型全程稳定
- **结论：seedance 2.0 mini 实现了「动作量+一致性兼得」，是 E02 flash 和
  wan2.6 标准档都没有同时做到的。本集 I2V 最终版全为它。**

成本：V1 百炼 4 条 ¥6.0 + V2 seedance 4 条 ≈¥3.2（4 折价，控制台实扣已确认）= 累计 ≈¥9.2。
（限时 4 折 2026-09-07 到期，之后 mini 恢复 ¥0.5/s 约 ¥2/条，仍低于百炼标准档。）

## V2.1 修复（2026-08-29 中午）：9s/14s 眨眼变体重 roll

观众反馈 frame_03/04 的闭眼像"肿眼泡"。根因：codex 局部编辑这两张没遵守
"极细浅色弧线"约束。强约束 prompt 重 roll 后解决。**教训：闭眼变体要逐张目检
（贴回 diff 只能验证位置，验证不了"肿"），不能只看 auto_lock 的 PASS。**

技术要点：seedance mini 最短 4s，比我们 2-3s 的镜头槽长——从 4s 里取动作最好的
前段抽 12fps cel 填入原槽位，时间线不变。`gen_i2v_seedance.py`（新）支持
`--ref` 多图参考模式（与首帧模式互斥，本集未用，留给需要强锁身份的场景）。

以下为 V1 晨报原文。

## 成片

- **V1**：`output/output.mp4` — 1920×1080 / 30fps / 60.000s / H.264+AAC
- 故事：接 E02 同天傍晚，小橘带小蓝走一条白天没走过的归途：
  河堤 → 石桥 → 黄昏小巷 → 家门门灯。5 句独白 + 3 次猫叫。
- **银幕方向反转**：出门集（E01/E02）向右，归途全程向左（含 I2V 首帧构图：
  角色放右 1/3、面向左、前方留空）。

## 本集关键验证：wan2.6-i2v 标准档 vs flash

E02 观众反馈 flash 档跑步镜头角色轻微 off-model。本集 4 条连续动作镜头全部
改用 **wan2.6-i2v 标准档**（720P，¥0.6/s）：

| 段 | 时长 | 成本 | 验收 |
|----|------|------|------|
| cat_run_bank（猫小跑下草坡） | 2s | ¥1.2 | 首/中/尾帧白胸毛、条纹、尾型全程稳定，**E02 flash 的漂移未复现** |
| girl_bridge_walk（过桥） | 3s | ¥1.8 | 发型/制服中段帧稳定 |
| cat_wall_walk_dusk（黄昏墙头走） | 3s | ¥1.8 | 稳定 |
| girl_lane_walk（巷走） | 2s | ¥1.2 | 稳定 |

**结论：同 vendor 升一档（flash→标准）就解决了跑步漂移，不需要引 Seedance。**
gen_i2v_seedance.py（火山方舟适配器）已备好留作未来对照，本集未使用。

## 口型/眨眼：全 codex 工艺，零 fallback

E02 V2–V4 的 qwen/wanx 教训本集全程执行：26 张变体（口型 16 + 眨眼 10）全部
codex 局部编辑 + auto_lock 羽化贴回，贴回验收 26/26 干净（diff confined 在
特征矩形、区域外零像素变化）。**qwen 在本集成片零残留。**

代价：codex 配额两次耗尽（2026-08-28 23:00 一次、2026-08-29 06:00 一次），
靠幂等 gen_variants.sh（skip 已有产物）+ 定时任务在重置后自动续跑两轮收尾，
无废案、无 fallback 污染。

## 一天做了什么

1. 分镜 storyboard.md + script.story（story_tool 校验 0 错误；独白 2/3/4 按
   语速估算器收紧到槽内）。
2. 场景母版×4：河堤/街道由 E02 母版 codex 黄昏变体编辑，石桥/巷口家门新生成，
   4/4 一次通过。
3. 关键帧 26 张（含 4 张 I2V 专用首帧 + 2 中间画）codex 全部一次通过。
4. I2V 4 段（见上）。
5. 音频：CosyVoice 龙华 5 句全 fit；新合成 SFX 6 个（傍晚蝉鸣/石桥脚步/巷内
   脚步/傍晚街底噪/门灯嗡鸣/木门滑开，seed 20260828，出处
   `assets/audio/sfx/README.md`）；BGM=Pixabay《Evening Light – Gentle Folk
   Guitar Serenity》（DesiFreeMusic，免费商用），46s 起扬、独白5 满幅。
6. 变体 26 张 + rig 校准（8 口型 rig + 10 眨眼 rig，build_rigs.py 实测 diff
   bbox）+ lipsync cues 8 条（pinyin 表扩 E03 用字）。
7. verify 17 张截图 + 成片抽帧 13 张全过；check_lipsync 142 beats 零 WARN。

## 验收

- ffprobe：60.0000s / 1920×1080 / 30fps / H.264+AAC
- 音频 astats：Peak -3.10dB / RMS -24.7dB，无削波
- check_lipsync：142 beats / 8 mouth rigs / 8 cues / 158 图全过
- 抽帧：t=3.9 独白1 开口 ✓ / t=6.8 猫叫1 ✓ / t=11.5 I2V① 猫跑 ✓ /
  t=13.2 独白2 ✓ / t=19.0 I2V② 过桥 ✓ / t=21.5 独白3 ✓ / t=26.2 猫叫2 ✓ /
  t=34.0 I2V③ 墙头 ✓ / t=36.5 I2V④ 巷走 ✓ / t=38.5 独白4 ✓ /
  t=40.8 猫叫3 ✓ / t=51.0 独白5 侧脸开口 ✓ / t=58.5 暮色天空收尾 ✓

## 遗留

1. 收尾镜 frame_19 暮色天空为整幅柔和渐变（风格上算"天空过渡带"的边界情况，
   合规但偏空）；若在意可重 roll 一版带云团的。
2. scene_tool.py 的 `_find_project_root` 还在找 `docs/skills` 旧布局（skills
   已迁到 dula-skills/），scene contract 验证跑不了；dula-skills 侧待修。
3. 门灯光斑层（LAMP_POOL）坐标沿用估算值，播放中正常；若要精修对照 frame_13
   实测。

## 成本

- 现金 ≈ **¥6.0**：I2V 4 条（wan2.6-i2v 标准档 10s × ¥0.6）
- codex imagegen 约 52 张（母版 4 + 关键帧 26 + 变体 26，含重试）走订阅额度，
  现金 0 元
- BGM Pixabay 免费；TTS CosyVoice 额度内
- 对比 E02（¥14）：标准档 I2V 更贵但省掉了全部修复轮，总现金更低
