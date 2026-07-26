# Built-in imagegen 提示词记录

本集所有新增位图均使用 Codex 内置 `imagegen`（built-in image generation）生成；没有调用外部图片服务或仓库脚本。生成器的默认原始输出保持在 `C:\Users\orang\.codex\generated_images\`，项目采用的副本位于：

```text
assets/character_reference.png
assets/male_character_reference.png
assets/keyframes/frame_00.png … frame_32.png
```

其中 `frame_07.png` 因胸口多出一条投篮手臂、`frame_28.png` 因女生迈步方向与右侧出口矛盾而退出正式时间线；它们分别由 `frame_07_landing_fixed_v3.png` 和 `frame_32.png` 替代。当前正式时间线共使用 42 张基础画面，并通过口型变体在运行时扩展。

## 女生角色母版

```text
Use case: illustration-story
Asset type: master character reference for a basketball animation
Primary request: One original Japanese-anime-style 18-year-old woman basketball player, standing in a relaxed ready pose with a basketball at hip height.
Scene: clean modern indoor basketball court, empty, warm late-afternoon light through high windows.
Design lock: slim athletic build; warm light skin; amber-brown eyes; dark teal high ponytail reaching the shoulder blades; straight side bangs; exactly two gold hair clips above the left temple; white sleeveless jersey with navy side panels and navy number 07; navy knee-length shorts; exactly one red wristband; white crew socks; white high-tops with cyan accents; exactly one orange basketball.
Style: original polished 2D Japanese animation, clean cel shading, crisp line art, natural athletic anatomy.
Composition: 16:9 landscape, full body, eye-level three-quarter front view, composition-safe margins.
Avoid: extra people, duplicate limbs, extra balls, logos, captions, watermark, signature, sexualized pose or clothing, photorealism, 3D render.
```

## 男生角色母版（frame 08）

```text
Use case: illustration-story and identity-reference creation
Asset type: immutable male character reference plus episode entrance keyframe
Primary request: Create one original 18-year-old Japanese schoolboy just inside the open side door of the referenced basketball gym. He has stepped in from the lit corridor, carries one charcoal rectangular school bag in his left hand, and looks toward the court with a friendly, slightly teasing expression.
Input reference: Use the female master only to lock the original polished 2D Japanese-anime linework, cel shading, warm palette, gym design and late-afternoon lighting; do not copy her face, hair or costume.
Male design lock: slim age-appropriate build; warm light skin; slate-blue eyes; short tousled black hair with one distinct cowlick; dark navy Japanese gakuran with exactly five small brass front buttons; matching navy trousers; white indoor shoes; exactly one charcoal school bag.
Scene lock: same clean modern indoor basketball gym, open side door and warm corridor on screen right, rear-left hoop, polished wood floor, no crowd.
Composition: 16:9 landscape, medium-wide full figure at the doorway, readable entrance direction and generous safe margins.
Style: original theatrical-quality 2D Japanese animation, crisp line art, clean cel shading, natural anatomy.
Avoid: extra people, basketballs, duplicate limbs or fingers, malformed hands, altered door geography, text, captions, subtitles, logos, watermark, signature, photorealism or 3D render.
```

## 全集共享身份与连续性锁

除角色母版外，每一张后续图还引用紧邻的前一帧或同镜头前一张，以锁定构图和银幕方向。下面这段固定加入每个镜头指令：

```text
Use case: identity-preserve.
Generate a new 16:9 landscape keyframe for the same original polished 2D Japanese-anime short, with clean cel shading, crisp line art, believable anatomy and the same warm late-afternoon school gym.

Female lock: the same slim athletic 18-year-old; warm light skin; amber-brown eyes; dark teal high ponytail to shoulder blades; straight side bangs; exactly two gold clips above the left temple; white sleeveless jersey with navy side panels and clearly readable navy 07; navy knee-length shorts; exactly one red wristband; white crew socks; white high-tops with cyan accents.

Male lock: the same slim 18-year-old; short tousled black hair with one cowlick; slate-blue eyes; pristine dark navy Japanese gakuran with exactly five small brass front buttons; matching navy trousers; white indoor shoes; exactly one charcoal rectangular school bag when the shot geography includes it.

Scene lock: same empty modern basketball gym, rear-left hoop, polished wood floor, open door and warm corridor on screen right, consistent late-afternoon lighting and screen direction.

Constraints: exactly the intended visible characters, exactly one orange basketball, at most one school bag; natural hands, fingers, limbs, feet, gaze and weight shift; preserve character ages, faces, proportions and outfits.

Avoid: extra people, balls or bags; duplicate limbs or fingers; malformed anatomy; face, hair, costume, jersey-number, hoop, door or lighting drift; captions, dialogue text, signs, logos, watermark or signature; sexualized framing; photorealism, 3D render and heavy motion blur.
```

## 画面 00–07：独自练习

- `frame_00`：放松的准备姿势，球在髋侧。
- `frame_01`：低重心右手膝高运球，自由手打开保持平衡。
- `frame_02`：极低右至左换手，球在双脚之间、略高于地板。
- `frame_03`：双手在下胸收球，屈膝并抬眼看篮筐。
- `frame_04`：最深投篮预备，球举至脸前，两鞋仍着地。
- `frame_05`：垂直起跳，两脚刚离地，球在额头上方，马尾上扬。
- `frame_06`：接近最高点，压腕出手，球离指尖约一个球径。
- `frame_07`：原始生成记录，胸口错误长出额外投篮手臂，已退出正式时间线；修正版要求投篮结束落地、双臂自然下垂。

## 画面 09–15：男生进门与斗嘴

所有镜头引用女生母版、男生母版和最近的连续性帧，并叠加共享锁。

- `frame_09`：男生从画面右侧门内迈步进入，左手提包、右手举起招呼；女生在远处左侧抱唯一篮球并转身。中广景。
- `frame_10`：门口男生中近景，右手拢在嘴边、朝画面左侧开口喊；女生马尾和肩膀只占左前景虚焦边缘。
- `frame_11`：从男生右肩后的过肩镜头；女生在中景回身，把唯一篮球夹在右臂下，表情略意外。
- `frame_12`：女生腰部以上近景，球在右髋，朝画面右侧开口自信回应；男生肩膀只作极窄虚焦前景。
- `frame_13`：右侧边线双人中广景；男生左手把书包放到场外，女生在左侧抱球等候。
- `frame_14`：女生头肩特写，单边挑眉、视线向右下打量男生校服，开口调侃。
- `frame_15`：男生站到场内作略笨拙但认真的防守姿势；女生和球在左前景，书包在男生后方右侧边线外。

## 画面 16–23：一对一动作组

每帧均要求唯一篮球、书包固定在右侧边线、两人保持无身体冲撞的友好比赛关系。

- `frame_16`：中广角双人全身；女生低位右手运球，男生笨拙防守，右侧留突破空间。
- `frame_17`：女生用左肩和视线假动作，右手继续控球；男生重心被骗向画面左侧。
- `frame_18`：极低双脚间换手，唯一篮球略高于地板；男生被晃后转肩反应。
- `frame_19`：女生向画面右侧爆发突破，马尾向左拖曳；男生转髋追赶，两人之间留空气间隙。
- `frame_20`：侧向跟拍；女生领先并护球；男生落后半步伸出一手但明确不接触球或身体。
- `frame_21`：女生急停后撤，前鞋刹地；男生因惯性多冲一步，双方距离拉开。
- `frame_22`：女生双手收球并垂直起跳，两鞋刚离地；男生只举一手迟到封盖，手与球有安全距离。
- `frame_23`：女生接近最高点压腕出手；红腕带清楚在投篮右腕，脸无遮挡；球与指尖分离约一个球径，男生仍够不到。

`frame_23` 首轮因红腕带缺失且前臂遮脸被淘汰；最终图是在完全相同锁定下仅修正这两点的重试版本。

## 画面 24–31：入网与结尾

- `frame_24`：向上广角，单球高空飞向左后篮筐；两人在下方小比例仰望，女生保持投篮手型，男生刚完成迟到封盖。
- `frame_25`：低机位篮筐特写，唯一篮球正穿网而下；两人在下方虚化但可辨认。
- `frame_26`：中广景，女生落地保持随挥并满意微笑；男生停在惊讶封盖姿势；球从篮筐后下方落下。
- `frame_27`：男生反应近景，张口抗议并举起一只五指自然的手；女生肩膀与马尾占前景边缘，球在篮下远景。
- `frame_28`：男生弯腰接弹向他的球，女生开始离开；此图身份和球数正确，但女生错误地偏向画面左侧迈步，因此不用于正式时间线。
- `frame_29`：门在画面右侧；女生明确朝门走并回肩开口微笑；男生把唯一篮球夹在髋侧，书包仍在门边。
- `frame_30`：深橙夕照告别全景；女生在门口背身挥手，男生同时拿球和书包。
- `frame_31`：男生收尾中近景，球夹在一臂下、另一手提包，望向门口无奈微笑；女生只作走廊远处剪影。

## frame 32 精确纠偏提示词

本帧引用 `frame_28`（原故事动作）、`frame_29`（正确出口与银幕方向）、女生母版和男生母版。

```text
Use case: identity-preserve precise continuity correction.
Asset type: corrected 16:9 keyframe for a polished original 2D Japanese-anime short.

Use image 1 as the target composition and story moment, image 2 as the immutable screen-direction and right-side doorway reference, image 3 as the girl's identity/outfit master, and image 4 as the boy's identity/outfit master.

Change the staging so the basketball girl is clearly turning and taking her first step TOWARD THE OPEN DOOR ON SCREEN RIGHT. Her torso and lead foot travel rightward toward that door, while she looks back over her LEFT shoulder toward the boy with a playful open-mouth smile. The schoolboy remains farther left on the court, bending naturally to catch exactly one bouncing basketball with both hands. The charcoal school bag remains beside the right-side doorway, outside the playing lane.

Female identity lock: same slim athletic 18-year-old; warm light skin; amber-brown eyes; dark teal high ponytail to shoulder blades; straight side bangs; exactly two gold clips above left temple; white sleeveless jersey with navy side panels and clearly readable navy number 07; navy knee-length shorts; exactly one red wristband; white crew socks; white high-tops with cyan accents.
Male identity lock: same slim 18-year-old; short tousled black hair with one cowlick; slate-blue eyes; pristine dark navy Japanese gakuran with exactly five brass front buttons; matching navy trousers; white indoor shoes.
Scene lock: same warm late-afternoon empty school gym, rear-left hoop, polished wooden floor, open door and lit corridor on screen right.
Style: original theatrical-quality 2D Japanese animation, crisp line art, clean cel shading, natural anatomy, cinematic medium-wide composition.

Constraints: exactly two teenagers, exactly one basketball, exactly one school bag; girl must visibly move toward screen right and the open door; boy catches the ball; natural hands, feet, gaze, and weight shift.
Avoid: girl walking screen left, closed or relocated door, extra people, balls or bags, duplicate limbs or fingers, malformed anatomy, outfit or face drift, wrong jersey number, text, captions, subtitles, signage, logos, watermark, signature, photorealism, 3D render, heavy motion blur.
```

内置生成器原始输出：

```text
C:\Users\orang\.codex\generated_images\019f7f33-1ef8-7e32-bd80-197f05125dc0\exec-ea92b4a5-e3f8-47ec-b6a4-dc504e78ab9d.png
```

项目采用副本：`assets/keyframes/frame_32.png`。

## 2026-07-26 解剖修正与动作桥

以下三张最终采用素材均由 Codex 内置 `imagegen` 以参考图编辑/派生模式生成。前两轮落地修图错误地删除了正常手臂，未进入时间线；最终版按“删除胸口斜向投篮手臂、保留左右两条自然下垂手臂”重新生成。

### 落地帧双臂修正版

参考图：原始 `assets/keyframes/frame_07.png` 与 `assets/character_reference.png`。

```text
Edit the original 16:9 anime basketball keyframe while preserving the same girl, gym, camera, warm sunset lighting, outfit, proportions, face, hair and jersey number 07. This moment is AFTER the shot, when she has landed.

Remove the entire anatomically impossible diagonal shooting arm, red wrist and hand that grow from the center of her chest. Reconstruct the jersey and torso cleanly underneath it. Keep exactly two real arms: her anatomical right arm hangs naturally down on the viewer-left side with the single red wristband on that right wrist, and her anatomical left arm hangs naturally down on the viewer-right side. Both shoulders must connect normally to those two arms; both hands are relaxed near the thighs.

Do not keep a raised follow-through arm. Do not remove either natural hanging arm. Exactly two arms, two hands and one red wristband. Preserve the same polished original 2D Japanese-anime style. No text, captions, logos, watermark, extra limbs, duplicate fingers or malformed anatomy.
```

内置生成器原始输出：

```text
C:\Users\orang\.codex\generated_images\019f9a25-acd4-7820-8ebf-5fab74b26fa1\call_i2F7kwbhxsRRR0rM64isIGIL.png
```

项目采用副本：`assets/keyframes/frame_07_landing_fixed_v3.png`。

### 出手到落地动作桥

参考图：投篮出手帧、最终落地修正版与女生角色母版。

```text
Generate one new 16:9 in-between keyframe for the same polished original 2D Japanese-anime basketball scene. It is the midpoint immediately after ball release and before landing: the same girl is descending from her jump, knees soft, feet just above the floor, and both arms are beginning to lower naturally from the shooting motion. Exactly one basketball continues toward the upper-right edge. Preserve her face, dark-teal ponytail, two gold clips, white-and-navy 07 jersey, navy shorts, white shoes with cyan accents, and exactly one red wristband on her anatomical right wrist.

Same camera, gym geometry and warm late-afternoon light as the neighboring frames. Exactly two arms and two hands with natural shoulders, elbows and fingers. No chest-grown arm, no duplicate limbs, no extra ball, no text, logos, watermark, photorealism or 3D render.
```

内置生成器原始输出：

```text
C:\Users\orang\.codex\generated_images\019f9a25-acd4-7820-8ebf-5fab74b26fa1\call_UHEq6nroPaxX43SG2OFbQbMb.png
```

项目采用副本：`assets/action_inbetweens/opening_06_07_landing_v3.png`。

### 后撤到收球动作桥

参考图：`frame_21.png`、`frame_22.png`、女生与男生角色母版。

```text
Generate one new 16:9 midpoint keyframe between the step-back stop and jump-shot takeoff in the same polished original 2D Japanese-anime gym. The girl has completed the backward plant and is gathering exactly one basketball with both hands at chest height, knees bent and weight loading upward. The boy is recovering from forward momentum and starting a late one-hand contest, with a safe air gap and no contact.

Preserve both character identities, costumes, the girl's 07 jersey and single red right wristband, the boy's navy gakuran, the school bag at the right sideline, camera direction, gym layout and warm sunset light. Natural anatomy; exactly two arms and two hands per person; exactly one basketball and one bag. No duplicate limbs, malformed hands, extra people, text, logos, watermark, photorealism or 3D render.
```

内置生成器原始输出：

```text
C:\Users\orang\.codex\generated_images\019f9a25-acd4-7820-8ebf-5fab74b26fa1\call_V3f5oCLRpnjxOllYIAD201LC.png
```

项目采用副本：`assets/action_inbetweens/duel_21_22_gather_v3.png`。
