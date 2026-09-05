# 《猫带我去的地方》E02《清晨河堤》生成记录（generation_prompts.md）

E01 制度沿用：所有生成 prompt 模板在 `tools/gen_*.sh` / `tools/gen_variants_bailian.py`
内联，本文件只记事实、翻车与成本。

## 生成批次

| 批次 | 脚本 | 内容 | 结果 |
|------|------|------|------|
| I2V 探针 | gen_i2v.py | E01 frame_04 走 3s 链路验证 | 一次通过，¥0.45 |
| 场景母版 | tools/gen_masters.sh | scene_room_morning / scene_street_wall / scene_slope_steps / scene_riverbank | codex 4/4 一次通过 |
| seg1 关键帧 | tools/gen_seg1.sh | frame_00–08、ib_01、I2V 首帧×3 | codex 13/13 一次通过 |
| seg2 关键帧 | tools/gen_seg2.sh | frame_09–19、ib_02、frame_grass_04 | codex 14/14 一次通过 |
| I2V 视频 | tools/gen_i2v.sh（逐条后台跑） | cat_wall_walk / girl_street_walk / cat_hop_steps / girl_grass_walk，各 3s 720P 无声 | 4/4 一次通过，¥1.8 |
| frame_13 重 roll | tools/gen_frame13_reroll.sh | 首版猫背对镜头嘴不可见（E01 frame_10 同款坑，审查拦下）→ 重 roll 为头转向四分之三侧面 | 1 roll 通过 |
| 口型/眨眼变体 | codex 局部编辑（tools/gen_variants.sh） | 只出了 frame_01_half/open 两张就撞 codex 用量上限（2026-08-28 00:39 重置） | 2/26 |
| 口型/眨眼变体 fallback | tools/gen_variants_bailian.py | 其余 24 张走 qwen-image-edit 全图编辑 + 实测矩形羽化贴回 | 24/24，约 ¥7 |

## 翻车记录

1. **codex 用量上限**：变体批次第 3 张起全部失败（usage limit）。转入百炼 fallback。
2. **qwen-image-edit 裁剪模式错位**：小 crop（300×220）输入被模型按自己的构图
   重渲染并改变分辨率（300×220→1184×864），嘴部在输出里移位，椭圆贴回贴空
   （diffpx=3）。结论：qwen 裁剪模式不可用于定点贴回。
3. **wanx2.1-imageedit 掩码重绘小特征重构图**（xiaoju_secret 已记录的现象复现）：
   宽松 crop（正脸）掩码外几乎不动但嘴部只微改（diffpx=522，不达 half-open 强度）；
   紧裁剪（140×110）则整图重新理解（把嘴画到眼睛位置）。结论：嘴/眼级小特征
   不走 wanx 掩码。
4. **最终采用**：qwen-image-edit **全图**编辑（构图/角色保持好，全幅像素微漂但
   五官位置对齐）+ 手工测量的特征矩形羽化贴回基帧，矩形外零像素变化。
   矩形坐标靠 ReadMediaFile 原生分辨率逐帧实测（见 gen_variants_bailian.py JOBS 表）。
5. frame_01 基帧本身是单眼 wink（揉眼），眨眼变体是"另一只眼也闭上"，
   rig 正常，记录在案。

## 成本

- codex imagegen：27 张（母版 4 + 关键帧 26 + frame_13 重 roll 1 - 探针复用），
  走订阅额度，现金 0 元
- 百炼：I2V 4 条 ×3s 无声 = ¥1.8（+探针 ¥0.45）；qwen-image-edit 24 张 ≈ ¥7
  （按 0.3/张估）；TTS CosyVoice 5 句（额度内）
- **现金合计 ≈ ¥9.3**

## V2 修复轮（2026-08-28 凌晨）

| 批次 | 路径 | 内容 | 结果 |
|------|------|------|------|
| qwen 修复尝试 | tools/regen_variants.py | 16 张（克制嘴型+强制闭眼 prompt） | 全部失败：嘴仍喊叫级、眨眼仍半眯/不动 |
| wanx 眼睛测试 | wanx_crop_edit.py | frame_03 闭眼 | 失败（眼球仍在） |
| 程序化嘴 | tools/fix_mouths_procedural.py | 8 张 | 废弃（黑边椭圆太假） |
| codex 修复 | tools/gen_variants_fix.sh | 少女口型 8 + 少女眨眼 6 + 猫眨眼 2 | **16/16 一次通过** |
| 保留的 v2 | relock_variants.py | 猫嘴×3（02/05/13）+ 猫眼 02/13 | 内容感知贴回达标 |

最终 rig 映射：少女口型/眨眼 + 猫 05/10 眼 = codex v1（auto_lock 区域外零像素）；
猫嘴 + 猫 02/13 眼 = qwen 全图 + 内容感知贴回 v2。

## V3 修复轮（2026-08-28 凌晨）

| 批次 | 内容 | 结果 |
|------|------|------|
| codex 猫嘴重做 | frame_02/05/13 × half/open（自然开口 prompt） | 6/6 一次通过 |

边界确认：qwen 全图变体 + 内容感知贴回可用于「猫眼闭合」这类小面积低对比变化，
但猫叫张嘴这种大结构变化 qwen 会画成盖住吻部的巨洞——**猫嘴也归 codex 工艺**。
最终 qwen 在成片里只剩 frame_02/13 两个猫闭眼变体。
