# STYLE BIBLE — 《9章》S1E01「墨燃 Inkblaze」

> 本文件是本集画面生成的唯一风格契约。所有 imagegen 提示词必须逐字包含第 2 节的 hardLock 段。
> 定位：**剧场版 2D 动画电影静帧**——高清、电影感、浓郁暮色；漫画书的灵魂（气泡、拟声词、翻页、冲击帧）全部在 overlay 层承载。
> 世界观原则：**平行世界，看不出年代、看不出国家**。服装、建筑、器物一律去国籍化/去年代化：无文字招牌、无旗帜、无现代商标、无和服/剑道服等可识别日式元素。

## 1. 五要素（每帧必查）

1. **电影感 (cinematic)**：剧场版 2D 动画静帧质感——干净的线条 + 厚涂渲染，体积光、逆光轮廓、景深。不要网点、不要印刷纹理。
2. **浓郁暮色 (dusk palette)**：本集主色调 = 金橙夕阳天空 + 深蓝阴影 + 铁灰钢筋，电影级调色，微妙胶片颗粒。
3. **发光色点睛**：生物机械发光是画面最饱和的点——殖装核/殖装刃青绿 #3DFFC8、冲击/警戒血红 #FF3B3B、细胞刀苍白生物光 #D8E6DC。
4. **昆虫仿生质感**：殖装 = 昆虫特征从人体里长出来——黑亮几丁质甲壳、甲虫腹节式分节、关节处半透明薄膜、气管状发光纹路沿接缝流动。武器必须是**活器官**（蝉翼刃、角、捕捉足、鞘翅盾），禁止刀剑形态，禁止棱角科幻硬表面。
5. **平行世界中性化**：角色全部是**混血感、不可辨认族裔**的长相；服装器物是世界混搭架空风，不可读出具体国家与年代；背景无任何文字、招牌、旗帜。

## 2. imagegen 提示词 hardLock 段（逐字复用）

```text
Style hard lock: high-definition cinematic 2D animated film still, theatrical-feature
quality, clean confident line art with painterly rendering, rich vivid film colors,
warm dusk palette (golden orange sunset sky, deep blue shadows, iron-gray steel),
dramatic volumetric backlight, subtle film grain, movie-grade color grading, dynamic
cinematic composition, insectoid bio-organic armor grown from the body: glossy black
chitin carapace with beetle-elytra segmentation, translucent membranes at the joints,
glowing teal trachea-like channels (#3DFFC8) along the seams, weapons as living insect
organs (cicada wing-blades, horn crests, raptorial limbs), never metal swords, never
mechanical hard-surface, blood red #FF3B3B only for danger accents. Timeless
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
canvas satchel slung on one shoulder. Small hexagonal chitin patches with faint teal
glow (#3DFFC8) appear ONLY on his right forearm and the back of his right hand, like
insect shell forming under the skin; his left arm and left hand are completely normal
skin.
```

### 雷晓（初羽态·右臂展开）
```text
Lei Xiao first-emergence form: his right forearm is covered by glossy black chitin,
segmented like a beetle's abdomen plates with translucent membranes at the joints,
fingers slightly segmented and claw-tipped; elytra-like shield plates flared open from
the forearm, glowing teal trachea-like channels (#3DFFC8) running along every seam,
same boy's face and student attire otherwise, teal glow also visible under the collar
at the chest (the bio-core); his left arm stays normal.
```

### 白岚
```text
Bai Lan: a young adult blades-master, tall and straight-backed, weathered handsome face
of European descent, ash-blond shoulder-length hair tied back loosely, full short
beard, a pale scar crossing his left eyebrow and cheek, calm merciless gray eyes.
Mixed timeless world attire: dark indigo cross-collared long robe layered with a
weathered leather harness strap and one small battered metal pauldron, dark trousers
tucked into worn leather boots. He carries NO sword: from his right forearm extends a
single translucent amber cicada wing as long as a blade, its veins glowing like living
circuits (pale amber #F5B85A), the wing blurred at its edge from high-frequency
vibration (the resonance blade "Ming-Qie").
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
| 蝉翼（鸣切）琥珀光 | #F5B85A |
| 气泡/旁白框 | #FFFDF8 / #F4EFE6 |

## 8. 打斗场景追加锁（《9章》30s 试片）

- **冥王篇光泽**：虫甲在打斗帧必须呈黑曜石湿亮镜面 + 硬轮廓光（glossy obsidian sheen + hard specular rim light），禁止哑光。
- **动感语法**：运动主体 motion-smear、速度线、碎屑/血滴悬浮、倾斜构图（dutch angle）；静止拍（林/山）则尘埃悬浮、动势全收，动静反差就是风林火山。
- **风**：所有室外打斗帧角色发梢/衣袍/篷布必须有风的方向性运动。
- 详见 `storyboard_fight.md`（分镜、台词双关、音频设计、印章 overlay）。

## 7. 历史决策

- v1 黑白网点 + v2 彩色网点：均因「不要网格感」被否（2026-08-23）。
- v3 起定稿：高清电影感帧 + 漫画语法 overlay。工程依据：rainy_rooftop_cat 已验证高清画风下的口型 rect 羽化贴回不露接缝。
