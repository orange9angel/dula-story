# 《猫带我去的地方》风格圣经 —「晴印」（Sunprint）纯净版

本集沿用 E01《晴天便利店》的晴天色彩与原图角色，场景改为日式街角咖啡厅。
当前唱跳修订使用真实三维蒙皮身体与原画曲面头脸；下方画风规则仍是目标。
复用身体的裙型、腰部与侧发体积还未还原原图，不将候选外观改写为系列新设定。
系列原始画风规则保留在下方，风格母版位于 `assets/references/style_master.png`。
本集已生成资产是参考该方向的插画适配版：保留水蓝窗框、白衬衫、蓝发和暖色日光，
局部头发与室内仍有柔和明暗，尚不等同于逐项严格满足下方 hardLock。实际提示词见
`config/*_prompt.txt`，采用图与哈希见 `config/image_sources.json`。

> E01 的历史风格试验仍保留在 E01 目录，本集未复制测试图库。

## 画风五要素

1. **锐边平涂**：全画面色块边缘干净如刀切。零颗粒、零噪点、零纹理、零喷枪、
   零模糊——高清复古丝网海报感。
2. **天空两段色**：顶部深青蓝 `#2E9BD6` → 地平线浅湖绿 `#7FD4E8`，中间只允许
   **一条宽而柔和的过渡带**（自然天空）。禁止阶梯/条纹分带。这是全画面唯一
   允许的柔和渐变。
3. **互补色阴影**：阴影一律用薰衣草紫 `#8E7CC3` 或青绿，严禁黑灰。云的暗部、
   地面树影、人物投影全是紫色系——"明亮感"的来源，也是与写实日漫电影光影的
   分界线。
4. **阳光是形状**：阳光以平涂几何形状出现（斜切光带、圆形洒金光斑）`#F5B942`，
   禁止光晕、薄雾、镜头光斑。
5. **人物赛璐璐**：平涂 + 一线阴影；轮廓线冷暖分边——受光侧暖棕、背光侧灰紫。

## 色板

| 色 | 用途 |
|----|------|
| 晴空青 `#2E9BD6` | 天空顶部、冷色主调 |
| 浅湖绿 `#7FD4E8` | 地平线天空、便利店立面点缀 |
| 云白 `#FDFBF4` | 云、衬衫、留白 |
| 阳光金 `#F5B942` | 光斑、暖色点缀 |
| 影紫 `#8E7CC3` | 一切阴影 |
| 叶绿 `#58A05C` | 植物 |

## 风格 hardLock（imagegen 提示词逐字段，英文）

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
realistic anime film lighting, text, captions, logos, watermark, signature.
```

## 后期统一层

- Three.js 合成时**不加**任何颗粒/纹理层（纯净是风格的一部分）。
- 程序化动效层（蒸汽、云漂移、洒金光斑摆动、走路循环、眨眼/口型 cel）全部
  画成平涂矢量形状，与位图同一语言，画在源图空间随镜头 crop 移动。

## 母版链

1. `assets/references/style_master.png` — E01 晴印母版。
2. `assets/references/girl_reference.png` / `boy_reference.png` — 原图片版小蓝与阿澈。
   小蓝长蓝发、白衬衫、蓝格裙；阿澈黑短发、白衬衫、深蓝长裤。
3. `assets/images/cafe_master_v1.png` / `cafe_table_v1.png` — 空景与桌边双人镜头。
4. `assets/images/girl_body_v1.png` / `boy_body_v1.png` — 透明全身原画，有限二维形变。
