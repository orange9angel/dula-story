# 《初雪狐》生成记录

风格锁与色板见 `STYLE_BIBLE.md`。生成工具：`codex exec` 内置 imagegen
（脚本 `tools/gen_refs.sh`、`tools/gen_keyframes.sh`），成品 1672×940 PNG。

## 参考图

| 文件 | 内容 | 参考图 | 审查 |
|------|------|--------|------|
| style_master.png | 雪夜神社参道空景：鸟居、雪台阶、石灯笼、谷地灯火 | 无（首张） | 一 roll 通过（2026-08-15） |
| tsumugi_reference.png | 小紬全身正面：朱红外衣、奶白围巾耳罩、深棕短发、纸袋 | 无 | 一 roll 通过（2026-08-15） |
| fox_reference.png | 小狐正面 3/4 坐姿：橙红、奶油胸、白尾尖 | 无 | 一 roll 通过（2026-08-15） |

## 关键帧

| 帧 | 内容 | 参考图 | 审查 |
|----|------|--------|------|
| frame_00 | 大远景空景（同 style_master 构图） | style_master | 一 roll 通过（2026-08-15） |
| frame_01 | 侧景：小紬提袋上台阶 | style_master + tsumugi_reference | 一 roll 通过（2026-08-15） |
| frame_02 | 中景：小紬停步望向右下 | style_master + tsumugi_reference | 一 roll 通过（2026-08-15） |
| frame_03 | 供台全景：小狐蜷缩发抖 | style_master + fox_reference | 一 roll 通过（2026-08-15） |
| frame_04 | 小狐特写：抬头竖耳 | fox_reference + frame_03 | 一 roll 通过（2026-08-15） |
| frame_05 | 小紬蹲下身（口型/眨眼基帧，台词1） | tsumugi_reference + frame_02 | 一 roll 通过（2026-08-15） |
| frame_06 | 手部特写：掰开烤红薯冒热气 | tsumugi_reference | 一 roll 通过（2026-08-15） |
| frame_07 | 雪地特写：半个红薯放手帕上，狐鼻凑近 | fox_reference + frame_06 | 一 roll 通过（2026-08-15） |
| frame_08 | 小狐低头吃红薯特写 | fox_reference + frame_07 | 一 roll 通过（2026-08-15） |
| frame_09 | 小紬温柔微笑中近景（台词3） | tsumugi_reference + frame_05 | 一 roll 通过（2026-08-15） |
| frame_10 | 屋檐下一人一狐全景，灯笼暖光 | style_master + 双参考 | 一 roll 通过（2026-08-15） |
| frame_11 | 一人一狐同时抬头看天 | 双参考 + frame_10 | 一 roll 通过（2026-08-15） |
| frame_12 | 小紬仰头面部特写（台词4×2） | tsumugi_reference + frame_09 | 一 roll 通过（2026-08-15） |
| frame_13 | 小狐端坐对视特写（眨眼基帧） | fox_reference + frame_04 | 一 roll 通过（2026-08-15） |
| frame_14 | 小紬起身拍雪（台词5） | tsumugi_reference + frame_09 | 一 roll 通过（2026-08-15） |
| frame_15 | 背影全景：小紬下台阶（近） | style_master + tsumugi_reference | 一 roll 通过（2026-08-15） |
| frame_15_far | 同机位远景：人影已小 | frame_15 | 一 roll 通过（2026-08-15） |
| frame_16 | 收尾空镜：小狐守在供台边 | style_master + fox_reference | 一 roll 通过（2026-08-15） |

## 口型/眨眼变体（2026-08-15，全部一 roll 通过）

工艺沿用 cat_leads：codex 局部编辑（tools/gen_variants.sh）→
auto_lock_variants.py 羽化贴回（14/14 框外零泄漏）→ calibrate_rigs.py
从 diff bbox 自动标定 rect 写入 config/mouth_rigs.json + eye_rigs.json。

- 口型：frame_05 / frame_09 / frame_12 / frame_14 × (half, open) 共 8 张
- 眨眼：小紬 frame_05/09/12/14 + 小狐 frame_04/13 共 6 张
- frame_12 的 mouthRig 覆盖 SRT 条目 10+11（两句钟声台词共用一块说话板，
  场景侧 normalizeMouthRigs/_mouthStateAt 支持 entry 数组）

## 程序化层坐标标定教训（2026-08-15）

lanternFlicker 的光斑椭圆必须叠在源图里灯笼窗上。初版坐标靠整图目测，
frame_00/frame_16 的光斑漂在天空/雪地上，渲染成浑浊色块（琥珀低 alpha
叠深靛 = 泥巴色）。修法：逐张放大源图实测窗心（frame_00: (1005,490)/
(1475,532)；frame_10: (1150,395)；frame_16: (195,660)/(975,515)）。
规则：程序化层坐标一律实测，不目测。breathFog 同理（emitter 用
变体 diff 实测的嘴位，不是构图估计）。
