# STYLE BIBLE — 《殖装学园》S1E01「墨燃 Inkblaze」

> 本文件是本集画面生成的唯一风格契约。所有 imagegen 提示词必须逐字包含第 2 节的 hardLock 段。
> 定位：**剧场版 2D 动画电影静帧**——高清、电影感、浓郁暮色；漫画书的灵魂（气泡、拟声词、翻页、冲击帧）全部在 overlay 层承载。
> 世界观原则：**平行世界，看不出年代、看不出国家**。服装、建筑、器物一律去国籍化/去年代化：无文字招牌、无旗帜、无现代商标、无和服/剑道服等可识别日式元素。

## 1. 五要素（每帧必查）

1. **电影感 (cinematic)**：剧场版 2D 动画静帧质感——干净的线条 + 厚涂渲染，体积光、逆光轮廓、景深。不要网点、不要印刷纹理。
2. **浓郁暮色 (dusk palette)**：本集主色调 = 金橙夕阳天空 + 深蓝阴影 + 铁灰钢筋，电影级调色，微妙胶片颗粒。
3. **发光色点睛**：生物机械发光是画面最饱和的点——殖装核/殖装刃青绿 #3DFFC8、冲击/警戒血红 #FF3B3B、细胞刀苍白生物光 #D8E6DC。
4. **生物质感装甲**：殖装 = 有机甲壳 + 机械接缝：圆润弧形甲壳、关节处生物褶皱、发光纹路沿接缝流动。禁止棱角科幻硬表面。
5. **平行世界中性化**：角色全部是**混血感、不可辨认族裔**的长相；服装器物是世界混搭架空风，不可读出具体国家与年代；背景无任何文字、招牌、旗帜。

## 2. imagegen 提示词 hardLock 段（逐字复用）

```text
Style hard lock: high-definition cinematic 2D animated film still, theatrical-feature
quality, clean confident line art with painterly rendering, rich vivid film colors,
warm dusk palette (golden orange sunset sky, deep blue shadows, iron-gray steel),
dramatic volumetric backlight, subtle film grain, movie-grade color grading, dynamic
cinematic composition, bio-organic armor with rounded carapace plates and glowing teal
#3DFFC8 channels along the seams, blood red #FF3B3B only for danger accents. Timeless
parallel-world setting: no recognizable real-world country or era signifiers, no
signage, no flags. Avoid: halftone dots, screentone, print texture, manga paper texture,
photorealism, 3D render, monochrome, text, captions, speech bubbles, watermark, logo.
```

注意：提示词里必须避免让模型自己画对白气泡/文字（气泡由 overlay 叠加，保证清晰可读）。

## 3. 角色 design lock（逐字，每帧复用对应段落）

### 雷晓（日常态）
```text
Lei Xiao: 17-year-old boy of ambiguous mixed heritage, lean build, tousled dark
chestnut-brown hair with two strands sticking up, hazel eyes with small shadows
underneath. Timeless mixed-world student attire: plain off-white short-sleeve cloth
shirt with sleeves rolled to forearms, simple dark cloth trousers, canvas shoes, worn
canvas satchel slung on one shoulder. The black vein-like bio-corrosion pattern with
faint teal glow appears ONLY on his right forearm and the back of his right hand; his
left arm and left hand are completely normal skin.
```

### 雷晓（殖装态·右臂展开）
```text
Lei Xiao armored form: his right forearm is covered by black-iron bio-organic carapace,
rounded beetle-like armor plates with biological wrinkles at the joints, glowing teal
channels (#3DFFC8) running along the seams, the forearm unfolds into a curved organic
bio-blade grown from the arm itself, same boy's face and student attire otherwise,
teal glow also visible under the collar at the chest (the bio-core); his left arm
stays normal.
```

### 白岚
```text
Bai Lan: a young adult blades-master, tall and straight-backed, weathered handsome face
of European descent, ash-blond shoulder-length hair tied back loosely, full short
beard, a pale scar crossing his left eyebrow and cheek, calm merciless gray eyes.
Mixed timeless world attire: dark indigo cross-collared long robe layered with a
weathered leather harness strap and one small battered metal pauldron, dark trousers
tucked into worn leather boots. He holds one straight single-edged broad blade whose
steel is wrapped in pale gray-white living bio-tissue with faint pulsing veins (the
cell-blade), with a very faint pale-green #D8E6DC glow.
```

## 4. 场景 design lock

### 西岸废工地（主战场）
```text
Abandoned construction site at the city edge at dusk: exposed steel rebar skeleton of
an unfinished building, a tower crane silhouette against the orange sunset, scattered
concrete pipes and sand piles, puddles reflecting the sky, distant timeless city
skyline with warm lights coming on, crows flying home, wind blowing dust and a loose
tarp. No signage, no text anywhere.
```

### 城市黄昏天际线（开场 establishing）
```text
City skyline at dusk seen from a hill: school buildings in the foreground below, the
river, the abandoned construction site with a tower crane at the west bank, dramatic
orange-purple sunset cloud bands, crows flying home. Timeless parallel-world city, no
signage, no text.
```

## 5. 气泡字幕与拟声词规范（overlay，不进生图）

- 气泡：白底（#FFFFFF 微米黄）、2.5px 黑描边、圆角矩形、尾巴指向说话角色一侧；字体：粗黑体（思源黑体 Bold）。
- 内心独白/旁白：矩形旁白框（米黄底 #F4EFE6、黑边），置于格子上缘——漫画旁白框语法。
- 拟声词：手写爆裂体大字，冲击格血红 #FF3B3B 黑描边，变身/能量格青绿 #3DFFC8 黑描边，带 2-3px 白色外发光；随冲击帧同步缩放弹入。
- 冲击帧：命中瞬间整帧黑白反转 + 对比拉满，持续 0.08-0.12s（2-3 帧 @30fps）。

## 6. 色板

| 用途 | 色值 |
|------|------|
| 黄昏天空 | 金橙 #E8863C → 紫红 #8E4A6B 渐变 |
| 阴影 | 深蓝灰 #2E3A52 |
| 钢筋/铁骨 | 铁灰 #5A5A60 + 锈橙 #A85B2A 点缀 |
| 殖装核/能量 | #3DFFC8 |
| 警戒/冲击 | #FF3B3B |
| 细胞刀生物光 | #D8E6DC |
| 气泡/旁白框 | #FFFDF8 / #F4EFE6 |

## 7. 历史决策

- v1 黑白网点 + v2 彩色网点：均因「不要网格感」被否（2026-08-23）。
- v3 起定稿：高清电影感帧 + 漫画语法 overlay。工程依据：rainy_rooftop_cat 已验证高清画风下的口型 rect 羽化贴回不露接缝。
