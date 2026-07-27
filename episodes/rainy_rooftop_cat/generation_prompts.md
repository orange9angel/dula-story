# Built-in imagegen 提示词记录

本集所有位图均使用 Codex 内置 imagegen 生成（与模板集 `anime_girl_basketball_5s` 同一通路），
通过 `codex exec -i <参考图>` 携带母版与连续性帧。未调用外部图片服务。

角色母版：`assets/girl_reference.png`、`assets/cat_reference.png`
正式关键帧：`assets/keyframes/frame_00.png … frame_17.png`（18 张，全部一审通过，无废帧）

## 少女角色母版（girl_reference）

```text
Use case: master character reference for an anime short. One original Japanese-anime-style
16-year-old girl standing in a relaxed neutral pose on a rainy school rooftop, holding one
transparent vinyl umbrella closed at her side. Design lock: slim build; warm light skin;
large amber eyes; long straight deep-blue hair reaching her waist; straight bangs; white
short-sleeve school shirt; navy-blue plaid pleated skirt; black knee socks; black loafers;
exactly one navy school bag slung on one shoulder; exactly one transparent umbrella.
Style: original polished 2D Japanese animation, clean cel shading, crisp line art, luminous
overcast sky, wet concrete rooftop with puddle reflections, Makoto Shinkai inspired lighting.
Composition: 16:9 landscape, full body visible, eye-level three-quarter front view.
Avoid: extra people, duplicate limbs, extra umbrellas, text, captions, logos, watermark,
signature, photorealism, 3D render.
```

## 橘猫角色母版（cat_reference）

参考图：girl_reference（锁定画风与场景）

```text
Use case: master character reference for a cat in an anime short. One original orange tabby
cat huddled beside a small cardboard box in the corner of the same rainy school rooftop.
Design lock: orange tabby fur with darker stripes; white chest patch and four white paws;
green eyes; fur soaked and matted from rain, ears drooping, tail wrapped around its body;
small skinny body. Style: same polished 2D Japanese animation, cel shading, same luminous
overcast rainy rooftop with puddle reflections as the reference image.
Composition: 16:9 landscape, cat at center-left beside the box, eye-level view.
Avoid: humans, extra cats, duplicate limbs, text, watermark, photorealism, 3D render.
```

## 全集共享锁（每帧提示词均含对应段落）

- Girl lock：同母版逐字描述（发色/瞳色/衬衫/格裙/及膝袜/乐福鞋/书包/透明伞）
- Cat lock：橘虎斑 + 深条纹 + 白胸白爪 + 绿眼；湿态随剧情从「湿透打绺」渐变到「干燥蓬松」
- Scene lock：学校天台、积水镜面、铁栏杆、远处城市与山、画面右侧楼梯间小屋、屋墙根纸箱
- 银幕方向：少女从画面左侧入画、始终朝右行动；猫的庇护点在画面右侧
- Avoid：extra people or cats, duplicate limbs, malformed hands, text, watermark, photorealism, 3D render

## 逐帧记录（参考图链）

| 帧 | 内容 | 参考图 | 审查 |
|----|------|--------|------|
| frame_00 | 暴雨天台空镜（建立镜头） | girl_reference | 通过 |
| frame_01 | 少女撑开伞从左侧入画，全身远景 | girl_reference + frame_00 | 通过 |
| frame_02 | 中景停步，侧头察觉右侧小屋方向 | girl_reference + frame_01 | 通过 |
| frame_03 | 角落纸箱旁湿透橘猫蜷缩（直接复用 cat_reference） | — | 通过 |
| frame_04 | 猫特写：发抖、耳朵耷拉、半闭眼 | cat_reference | 通过 |
| frame_05 | 少女蹲下伸手初次靠近，猫仍未被触碰；书包放在地上 | 双母版 | 通过 |
| frame_06 | 伞倾向猫、自己右肩淋雨，猫抬头惊讶 | 双母版 + frame_05 | 通过 |
| frame_07 | 特写侧脸：湿发贴颊、肩膀淋湿、温柔闭口微笑 | girl_reference + frame_06 | 通过 |
| frame_08 | 猫抬头对视特写，伞沿入画，耳朵竖起 | cat_reference + frame_06 | 通过 |
| frame_09 | 少女近景温柔闭口微笑（口型基帧，嘴部闭合无遮挡） | girl_reference + frame_07 | 通过 |
| frame_10 | 云缝金色光柱洒下，雨势减弱（无人物） | frame_00 | 通过 |
| frame_11 | 伞沿水珠特写，水滴落入金色积水涟漪 | frame_06 + frame_10 | 通过 |
| frame_12 | 彩虹全景：蹲姿撑伞护猫对视，天空镜面倒影 | 双母版 + 早期测试图构图 | 通过；书包背回肩上（frame_05/06 中在地上），记录在案不重 roll |
| frame_13 | 猫站立蹭她手心特写，闭眼满足 | 双母版 + frame_12 | 通过 |
| frame_14 | 少女开心近景，闭口微笑（口型基帧，独白6 用） | girl_reference + frame_13 | 通过 |
| frame_15 | 蹲姿双手把猫抱起到胸前对视，伞放在地上 | 双母版 + frame_13 | 通过 |
| frame_16 | 背影离场：抱猫走向小屋门，伞留在原地，长影子 | 双母版 + frame_15 | 通过；猫趴在肩上而非怀里，可接受的演绎，记录在案 |
| frame_17 | 空镜收尾：彩虹 + 镜面天台 + 孤伞 | frame_12 + frame_16 | 通过 |

## 早期测试图

`output/imagegen/anime-rainy-rooftop-blue-haired-girl-orange-cat.png` 为通路测试图，
未直接进入时间线，但作为 frame_12 的构图参照使用。

## 口型变体（V1 已就位，V2 补齐）

闭口 = 基帧本身；half/open 为 imagegen 局部编辑（只改嘴部），再用
`tools/lock_mouth_variant.py` 羽化贴回基帧，产物 `assets/mouth_variants/*_locked_v1.png`。
逐张 PIL 像素 diff 校验：差异全部 confined 在嘴部小矩形内，其余像素零变化。

| rig | 基帧 | rect（源图坐标） | 驱动 cue | 审查 |
|-----|------|------------------|----------|------|
| girl_frame02_entry2 | frame_02 | [630, 308, 74, 72] | 对白总线 entry 2（独白1） | 通过 |
| girl_frame05_entry4 | frame_05 | [620, 262, 76, 66] | 对白总线 entry 4（独白3） | 通过；V2 新增 |
| girl_frame07_entry5 | frame_07 | [818, 462, 92, 78] | 对白总线 entry 5（独白4） | 通过 |
| girl_frame14_entry10 | frame_14 | [690, 420, 104, 90] | 对白总线 entry 10（独白6） | 通过 |
| cat_frame04_meow | frame_04 | [744, 634, 124, 104] | SFX 能量 cue #103（cat_meow @7.5s） | 通过；V2 新增（猫） |
| cat_frame08_meow | frame_08 | [716, 436, 128, 104] | SFX 能量 cue #6（cat_meow_soft @16.5s） | 通过；V2 新增（猫） |

## V2 动作中间画（assets/action_inbetweens/）

| 文件 | 内容 | 参考图 | 审查 |
|------|------|--------|------|
| walk_alt.png | 与 frame_01 同构图、腿部相反步相的行走中间画 | girl_reference + frame_01 | 二roll通过 |
| crouch_mid.png | frame_02(站立)→frame_05(全蹲) 半蹲过渡，手开始伸向猫 | frame_02 + frame_05 | 通过 |
| tilt_mid.png | frame_05(伞遮自己)→frame_06(伞全倾向猫) 的半倾角 | frame_05 + frame_06 | 通过 |
| nuzzle_alt.png | 与 frame_13 交替的蹭头姿势（猫头角度略不同） | frame_13 | 通过 |
| pickup_mid.png | frame_13→frame_15：猫刚被抬离地面、前爪下垂 | frame_13 + frame_15 | 通过 |
| walkaway_alt.png | 与 frame_16 同构图、腿部相反步相 | frame_16 | 通过 |

### 废帧记录

- `walk_alt.png` / `walkaway_alt.png` V2 版（2026-07-27 三 roll 后替换）：两张「相反步相」
  中间画实际都保持了基帧的同一腿部相位，时间线交替时腿不动。根因：模型被参考图姿势锚定
  （codex 侧三稿都被拉回「向右行走」默认语义），最终用腿部区域单独放大编辑 + 回填锁定才拿到
  相位交换。验收盲区：V2 只查了「图在时间线里出现」，没核对相位标记本身。
- V3 第一次重 roll（相反触地相策略，已废弃）：腿部相位换过来了，但两只鞋的朝向被拧反
  （鞋尖不朝行走方向，像脚反装）。教训：模型被强制做相反触地相时会牺牲脚部朝向；
  行走循环应改用**触地相 ↔ 过渡相（passing pose）**交替——过渡相抬起的脚自然下垂、
  鞋尖朝下，模型能稳定画对（walkfix2 两 roll 直接通过）。验收行走帧必须同时核对：
  哪条腿在前 + 鞋尖是否朝行走方向 + 抬起的脚是否离地。
- `walk_alt.png` 一roll（2026-07-27 首版，已被二roll覆盖）：透明伞脱手漂浮在画面左上、
  右手垂在身侧，违反 frame_01 的持伞锁定；二roll在提示词中显式强调「右手始终握伞柄」后通过。
- 二roll 生成时 codex 进程超时被杀（900s），但文件已在被杀前完整写出，目检确认可用。

## V2 程序化雨丝层

V1 的雨全部烘焙在静帧里（整片静止）。V2 在 `scenes/RainyRooftopSequenceScene.js`
增加 Canvas2D 程序化雨丝层（关键帧之上、字幕之下）：seeded hash 纯函数 f(雨丝序号, 绝对时间)，
逐帧截图渲染两次结果一致；强度 envelope 对齐剧情（0–19.5s 全强度 → 19.5–21.2s 渐弱至 25%
→ 21.2–22.6s 细雨 → 22.6s 后随彩虹镜头完全消失），参数集中在文件顶部 `RAIN` 常量。
另含低 alpha 地面涟漪圈（同机制确定性）。

## V3 眨眼变体（assets/eye_variants/）与补缺口口型

V3 新增 7 个眨眼 rig（`config/eye_rigs.json`）与 2 个补缺口口型 rig。
流程与口型变体相同：codex imagegen 局部编辑 → 像素 diff 验证局部性 →
羽化锁定回基帧（`tools/lock_mouth_variant.py --rect ...`，或 agent 自锁后直接 diff 验证）。
批量脚本 `tools/gen_v3_variants.sh`（串行）+ 尺寸纠错重roll `tools/gen_v3_reroll.sh`。

| rig | 基帧 | rect（源图坐标） | 审查 |
|-----|------|------------------|------|
| girl_frame02_blink | frame_02（1664x936） | [585, 244, 114, 78] | 通过；首roll 尺寸错（1672x941）致构图偏移，按真实尺寸重roll |
| girl_frame05_blink | frame_05 | [613, 209, 115, 95] | 通过 |
| girl_frame06_blink | frame_06 | [606, 201, 141, 87] | 通过 |
| girl_frame07_blink | frame_07 | [741, 257, 288, 181] | 通过 |
| cat_frame08_blink | frame_08 | [680, 275, 390, 150] | 通过 |
| girl_frame09_blink | frame_09 | [811, 272, 250, 174] | 通过；单眼可见（头发遮挡） |
| girl_frame14_blink | frame_14（1672x938） | [626, 261, 295, 139] | 通过；同 frame_02 尺寸坑，重roll |
| cat_frame03_meow（口型） | frame_03 | [805, 468, 105, 68] | 通过；与 frame_04 共用 SFX cue #103 |
| girl_frame06_entry5（口型） | frame_06 | [629, 252, 61, 51] | 通过；补独白4 前 1.2s 缺口 |

### V3 废帧/翻车记录

- frame_02/frame_14 首roll：批量脚本 prompt 里硬编码「输出 1672x941」，但 frame_02 实为
  1664x936、frame_14 实为 1672x938，agent 被迫整体重渲染，构图偏移约 30px，报废重roll。
- 批量脚本初版让 codex 把成品保存到绝对路径，触发其 PowerShell Add-Type 合成步骤编译失败、
  文件丢失；改为从 `~/.codex/generated_images/<session-id>/` 自行回收（文件名可能是
  `call_*.png` 或 `exec-*.png`）。
- codex agent 自选输出文件名且不同 run 会互相覆盖（frame_06 的 half 先存成
  `frame_06_mouth_open.png`，open run 又写同名）——每 run 结束立即按日志归档。
- 羽化锁定 rect 余量不足（frame_08 首版 [680,275,390,150] feather 14）：右眼距 rect 下缘仅 12px，
  被羽化混回基帧睁眼内容呈「半睁」，全片渲染抽帧才发现；放宽至 [655,255,440,210] feather 10 重锁。
  教训：rect 每边留 ≥40px 羽化余量，锁定后全分辨率目检特征本身。
- frame_02 首版锁定 rect [590,190,105,80] 未覆盖闭眼特征区（实际 diff 在 y 253–310），
  放宽至 [565,225,155,120] feather 8 重锁。
