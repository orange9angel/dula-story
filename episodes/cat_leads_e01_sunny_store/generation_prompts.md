# imagegen 提示词记录（E01《晴天便利店》）

全部位图走 Codex 内置 imagegen（`codex exec -i <参考图>` 携带母版与连续性帧），
不调用外部图片服务。风格基准见 `STYLE_BIBLE.md`（「晴印」纯净版），每张提示词
必须含「风格 hardLock」整段（下方以 `[STYLE LOCK]` 标记引用）。

> 废案留档：淡彩 3 张（style_vA/vB/vC）、刮夜 1 张（scratchnight_v1）、
> 晴印 v1（天空阶梯感）均作废，图存 `assets/style_tests/`。
> 定稿母版：晴印 v2 → `assets/style_master.png`。

## 风格 hardLock（引用自 STYLE_BIBLE.md，逐字）

```text
Style lock: original illustration style "sunprint" -- bright sunny-day scene
rendered as razor-clean flat color shapes, like a high-definition retro
silkscreen poster with zero texture. Sky: deep clear cyan blue (#2E9BD6) at
the top softening into light aqua (#7FD4E8) near the horizon through ONE wide
soft smooth transition band -- no steps, no stripes; this sky transition is
the only soft gradient allowed in the entire image. Clouds: hard-edged rounded
bubble shapes, pure white (#FDFBF4) with a single flat lavender shadow tone
(#8E7CC3). Shadows everywhere use complementary colors (lavender, teal-green),
never black or grey. Sunlight is rendered as flat geometric shapes (diagonal
light bands, round dappled light spots) in flat gold (#F5B942), never glow,
never haze. Characters in crisp cel-style flat color with one shadow layer;
outlines warm brown on the lit side, muted purple on the shadow side.
Avoid: stepped or striped sky, banding, grain, noise, paper texture, halftone,
airbrush, blur, photorealism, 3D render, lens flare, glow effects,
Makoto Shinkai style, text, captions, logos, watermark, signature.
```

## Day 1：母版链（生成脚本 `tools/gen_day1_masters.sh`）

| 图 | 内容 | 参考图 | 审查 |
|----|------|--------|------|
| style_master | 晴印 v2：便利店门口的小蓝小橘（白天） | — | ✓ 用户定稿 |
| girl_reference | 小蓝正面全身：蓝发/琥珀瞳/齐刘海/白衬衫/格裙/及膝袜/乐福鞋，无伞无书包 | style_master | 待生成 |
| cat_reference | 小橘坐姿：橘虎斑/深条纹/白胸白爪/绿眼/干燥蓬松 | style_master + girl_reference | 待生成 |
| scene_room | 午后房间：阳光斜照书桌、单人床、木窗台，无人物 | style_master | 待生成 |
| scene_street | 晴空小巷：白墙、电线杆、绿树、洒金光斑，远处便利店，无人物 | style_master | 待生成 |
| scene_store | 便利店内景：明亮货架、关东煮柜台（不画蒸汽）、窗边长凳、自动门，无人物 | style_master | 待生成 |

## 全集共享锁（每帧提示词均含）

- Girl lock：母版逐字描述（深蓝长直发/琥珀瞳/齐刘海/白衬衫/藏青格裙/及膝袜/乐福鞋；无伞无书包）
- Cat lock：橘虎斑 + 深条纹 + 白胸白爪 + 绿眼；全片干燥蓬松
- 银幕方向：小蓝始终朝右行动；小橘在她前方/右侧引导
- 位图不画"动势"：蒸汽、云的位置变化、光斑摆动等一律不画/不动，留给程序化层
- Avoid：extra people or cats, duplicate limbs, malformed hands, text, watermark, photorealism, 3D render

## 逐帧记录（参考图链，生成后填审查结果）

### seg1（Day 2，0–30s）

| 帧 | 内容 | 参考图 | 审查 |
|----|------|--------|------|
| frame_00 | 午后房间全景，阳光斜照书桌（建立镜头） | style_master + scene_room | 通过 |
| frame_01 | 小蓝书桌前托腮，中景（独白1 口型基帧，嘴闭无遮挡） | girl_reference + frame_00 | 通过 |
| frame_01_closed_v3 / locked_v3 | 仅修正闭眼相：画面左眼弧线缩短、压平、减薄到与右眼一致；脸型、眼眶、头发和全画幅不变 | frame_01 + closed_locked_v2 | 通过（锁定区仅占全图 0.7%，区外最大像素差 0；成片闭眼无左眼肿胀） |
| frame_02 | 窗台小橘回头看室内，特写（猫叫口型基帧） | cat_reference + frame_00 | 通过 |
| frame_03 | 小蓝抬头看猫，中景（独白2 口型基帧） | girl_reference + frame_01 | 通过 |
| ib_01 | 门口弯腰穿鞋（中间画） | girl_reference + frame_03 | 通过 |
| frame_04 | 阳光街道远景：她跟猫走，全身 | scene_street + 双母版 | 通过 |
| frame_04_walk_alt_full-v4 | 侧面等幅反相触地 B：保留同一前后落脚点，画面左髋腿明显交叉至右前鞋、右髋腿接左后鞋 | frame_04 + v3 | 通过（大腿/膝部交叠在远景也可见；双脚落地，步幅相同） |
| frame_05 | 猫走前头回头，中景 | cat_reference + frame_04 | 通过 |
| frame_06 | 她跟走背影，远处可见便利店 | frame_04 + frame_05 | 通过（猫在画外前方，符合"猫在前引导"银幕方向，记录在案） |
| frame_06_walk_contact_a_full-v6 / b_full-v6 | 背面等幅反相触地 A/B：远脚左、近脚右 ↔ 远脚右、近脚左；脚心横向至少分离约一只鞋宽 | frame_06 + v5 | 通过（远近脚的外轮廓直接左右互换；双脚落地，鞋轴沿道路透视） |
| frame_07 | 猫停巷口，阳光下便利店白绿立面 | frame_06 + style_master | 通过 |
| frame_08 | 她站定望向巷口，中景（独白3 口型基帧） | girl_reference + frame_07 | 通过 |
| frame_09 | 便利店外景全景：白绿立面、自动门、洒金光斑 | style_master + frame_07 | 通过 |
| frame_10 | 猫坐门口回头叫（猫叫口型基帧） | cat_reference + frame_09 | 通过（roll 2 中景回头版；roll 1 废：猫太小且背对，嘴不可见，23.4s 猫叫 cue 无 rig 可挂。废帧存 tmp/frame_10_roll1_rejected.png） |
| frame_11 | 她微笑走近，中近景 | girl_reference + frame_10 | 通过 |
| frame_11_walk_contact_a_full-v2 / b_full-v3 | 门口近景新 A/B：画面右腿前伸 ↔ 画面左腿前伸，等幅、落地 | frame_11 + 反相大腿参考 | 通过（不再使用中立站姿；前伸大腿大小一致，上半身固定） |
| frame_12 | 自动门全开，一人一猫走入明亮店内 | frame_09 + frame_11 | 通过 |

### seg2（Day 3，30–60s）

| 帧 | 内容 | 参考图 | 审查 |
|----|------|--------|------|
| frame_13 | 店内全景：明亮货架、关东煮柜台 | scene_store + frame_12 | 通过（无人无动物；关东煮无蒸汽；自动门外晴天街景；1672×941 PNG） |
| frame_14 | 关东煮特写（不画蒸汽） | frame_13 | 通过（无蒸汽 ✓，留给程序化层） |
| frame_15 | 她蹲下看脚边的猫，中景（独白4 口型基帧） | 双母版 + frame_13 | 通过 |
| frame_16 | 猫抬头对视特写 | cat_reference + frame_15 | 通过 |
| frame_17 | 她从热柜拿热牛奶，中景 | girl_reference + frame_13 | 通过 |
| ib_03 | 伸手中间画 | frame_17 | 通过 |
| frame_18 | 收银台特写：牛奶杯+硬币，窗光斜入 | frame_17 | 通过 |
| frame_19 | 窗边长凳全景：她坐下，猫跳上蜷着 | 双母版 + frame_13 | 通过 |
| ib_04 | 坐下中间画 | frame_19 | 通过 |
| frame_20 | 特写：她双手捧杯，眨眼基帧 | girl_reference + frame_19 | 通过 |
| frame_21-v2 | 猫蜷在女孩身旁的同一张长凳上特写（猫呼噜）；左侧必须看出女孩坐姿 | frame_21 + frame_19 | 通过（裙摆、弯膝和从凳沿垂下的小腿明确为坐姿；猫眼闭合，靠呼吸 crop 起伏表“活”） |
| frame_22 | 她近景微笑（独白5 口型基帧，嘴闭无遮挡），阳光偏暖金 | girl_reference + frame_20 | 通过（暖金色调 ✓） |
| frame_23 | 窗边全景：一人一猫映在明亮玻璃上 | frame_19 + frame_22 | 通过 |
| frame_24 | 店外空镜：夕阳前奏暖金色的便利店，窗里两个影子 | frame_09 + frame_23 | 通过（窗内双影可见 ✓） |
| frame_25 | 天空云与屋檐（收尾空镜） | frame_24 | 通过 |

## 口型/眨眼变体（Day 2–3，局部编辑）

闭口 = 基帧本身；half/open 为 imagegen 局部编辑（只改嘴部/眼部），再用
`tools/lock_region_variant.py`（从 rainy_rooftop_cat 复制）羽化贴回基帧，
产物 `assets/mouth_variants|eye_variants/*_locked_v1.png`。
逐张 PIL 像素 diff 校验：差异 confined 在小矩形内，其余像素零变化。

口型基帧清单：frame_01、frame_03、frame_08、frame_15、frame_22（小蓝）+
frame_02、frame_10（猫，SFX 能量驱动）。
眨眼基帧清单：frame_01、frame_03、frame_08、frame_11、frame_15、frame_20、
frame_22（小蓝）+ frame_02、frame_05、frame_10、frame_16、frame_21（猫）。

## 废帧记录

（生成过程中追加，沿用 rainy_rooftop_cat 制度：roll 序号、问题、处置）
