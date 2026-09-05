# 《猫带我去的地方》风格圣经 —「晴印」（Sunprint）纯净版 · E05 版

本文件继承 E04《夏夜流萤》STYLE_BIBLE 的全部规则（画风五要素、色板、通用
hardLock、后期统一层、母版链），原文见
`../cat_leads_e04_firefly_night/STYLE_BIBLE.md`。本文件只记录 **E05 的新增与
覆盖**。每张 imagegen 提示词必须逐字携带「通用 hardLock + E05 清晨变体段」，
并附风格母版 `assets/style_master.png` 作为第一参考图。

## E05 清晨变体（morning variant，2026-08-31）

E05《清晨速写》全片为**夏日清晨（约 6:00，晴，日出后低角度金光）**。
以下规则覆盖通用条目，其余（零纹理、锐边平涂、互补色阴影、赛璐璐人物）不变：

1. **天空两段色（清晨版）**：顶部清晨青蓝 `#3E9BD8` → 地平线蜜桃金 `#FFC07A`，
   中间仍只允许一条宽而柔和的过渡带。低空一线更亮的日出金 `#F5B942`。
2. **太阳在东侧低空**：平涂淡金圆日 `#FFD97A`，硬边、无光晕；影子长而斜，
   一律投向画面西侧；受光边描暖金 rim，背光面影紫 `#8E7CC3` 不变。
3. **露珠是形状**：草尖/叶尖的露珠为平涂白色四角星形小闪光 `#FDFBF4`，
   硬边、无光晕，数量稀疏。**禁止薄雾**——晴印零纹理纪律优先于"清晨氛围"。
4. **晨光比黄昏更清亮**：整体明度高于 E03 黄昏，金色只出现在光带、光斑、
   rim 与圆日，不大面积铺色。
5. 清晨 hardLock 追加段（接在通用 hardLock 之后）：

```text
Time-of-day override: clear summer morning, about 6am, just after sunrise.
Sky: fresh morning cyan blue (#3E9BD8) at the top softening into peach gold
(#FFC07A) near the horizon through ONE wide soft transition band, with one
brighter flat gold (#F5B942) band low over the horizon. The sun is a low
flat pale-gold disc (#FFD97A) in the east, hard-edged, no halo. Shadows are
long and slanted, all pointing west; lit edges rimmed in warm gold, shadow
side stays lavender purple (#8E7CC3). Dew drops on grass and leaf tips are
tiny flat white four-point sparkle shapes (#FDFBF4), hard-edged, sparse.
Overall brightness is higher than dusk; gold appears only in light bands,
dappled spots, rim light and the sun disc. No glow, no halo, no haze, no mist,
no gradients other than the sky band.
```

## 角色设计锁

### 小蓝（Girl）——沿用 E04 母版

设计锁沿用 rainy_rooftop_cat / E04：蓝发少女小橘的主人。参考母版
`../cat_leads_e04_firefly_night/assets/girl_reference.png`。本集穿同款日常服，
无伞无书包。

### 小橘（Cat）——沿用 E04 母版

橘虎斑猫。参考母版 `../cat_leads_e04_firefly_night/assets/cat_reference.png`。

### 阿澈（Boy）——本集新增，设计锁沿用 xiaoju_secret

外貌元素锁（来自 `../../xiaoju_secret/storyboard.md` 与
`../../xiaoju_secret/generation_prompts.md`，**仅继承设计元素，画风必须重绘为
晴印**——xiaoju_secret 原图是新海诚式日漫风，禁止作为风格参考）：

- 17 岁男生，slim 偏瘦体型，暖调浅肤色
- 黑色短发微翘（slightly messy fringe），深灰色眼瞳
- 白色短袖衬衫（校服款）、藏青长裤、白色运动鞋
- 随身恰好一本**牛皮纸封面速写本**和一支铅笔
- 气质安静温和，略带腼腆

英文设计锁（imagegen prompt 用）：

```text
The boy: slim 17-year-old, warm light skin, short black hair with slightly
messy fringe, dark gray eyes, white short-sleeve school shirt, navy-blue
trousers, white sneakers, carrying exactly one kraft-paper-cover sketchbook
and one pencil. Quiet, gentle, slightly shy temperament.
```

## 新增工艺纪律（E05 起）

### 1. 表情分层描写（关键帧 prompt）

人物表情不再写整词（如 "smiling"），必须分层描写，至少覆盖三层：

- **眉**：位置（平/微挑/微蹙）+ 弧度
- **眼**：眼睑开合度、视线方向、高光
- **嘴**：开合、嘴角走向、对称性

示例（写进关键帧 prompt 的 Expression 段）：

```text
Expression: eyebrows level and relaxed; upper eyelids slightly lowered,
gaze directed down toward the cat, catchlights small and round; mouth closed
in a gentle asymmetric smile, left corner slightly higher.
```

### 2. 布料/发丝次级动态（I2V prompt）

I2V 提示词必须携带次级动态描述，词表与风力分级见
`dula-skills/build-continuous-story-images/references/i2v-motion-details.md`。
本集风级统一为 **L1 晨风**（微风，只动发梢、裙摆、草叶尖，不动轮廓主体）。

### 3. OmniHuman 神态分层（口型镜头 prompt）

omni prompt 从"姿态锁定"扩展为"姿态锁定 + 神态分层"：姿态锁句之外，
必须写眼神方向、眉部微动作、呼吸感。词表见
`dula-skills/build-character-voice/references/volcano-omnihuman.md`。

### 4. 配音语境密度

每句台词在 audio_direction 层面必须填 intent / subtext / breath / pause，
不只给 tone。Boy 声线弃用 xiaoju_secret 的 longshu_v3（叙事腔翻车记录），
新音色经盲听 A/B 从 longze_v3 / longjielidou_v3 / longyue_v3 选出。

## 母版链

1. `assets/style_master.png` — 风格母版（沿用 E04 晴印 v2 定稿，复制）
2. `assets/girl_reference.png` / `assets/cat_reference.png` — 复制自 E04
3. `assets/boy_reference.png` — **本集新生成**：sunprint 版阿澈母版
   （设计锁参考 xiaoju_secret/assets/boy_reference.png，风格锁参考 style_master）
4. `assets/scene_*_morning.png` — 场景母版（清晨版：家门口/巷子/石桥/河堤）
