# 《猫带我去的地方》风格圣经 —「晴印」（Sunprint）纯净版

本系列（含 E01《晴天便利店》）所有位图的唯一画风基准。每张 imagegen 提示词必须
逐字携带「风格 hardLock」段落，并附风格母版 `assets/style_master.png` 作为第一
参考图。任何镜头不得偏离本文件。

> 废案留档：淡彩钢笔绘本风（商业日漫底色未除，否）、刮夜 Scratchnight
> （太暗黑，否）。测试图存于 `assets/style_tests/`，教训：质感纹理=马赛克感，
> 本系列**零纹理**。

## 画风五要素

1. **锐边平涂**：全画面色块边缘干净如刀切。零颗粒、零噪点、零纹理、零喷枪、
   零模糊——高清复古丝网海报感。
2. **天空两段色**：顶部深青蓝 `#2E9BD6` → 地平线浅湖绿 `#7FD4E8`，中间只允许
   **一条宽而柔和的过渡带**（自然天空）。禁止阶梯/条纹分带。这是全画面唯一
   允许的柔和渐变。
3. **互补色阴影**：阴影一律用薰衣草紫 `#8E7CC3` 或青绿，严禁黑灰。云的暗部、
   地面树影、人物投影全是紫色系——"明亮感"的来源，也是与新海诚写实光影的
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
Makoto Shinkai style, text, captions, logos, watermark, signature.
```

## 后期统一层

- Three.js 合成时**不加**任何颗粒/纹理层（纯净是风格的一部分）。
- 程序化动效层（蒸汽、云漂移、洒金光斑摆动、走路循环、眨眼/口型 cel）全部
  画成平涂矢量形状，与位图同一语言，画在源图空间随镜头 crop 移动。

## 母版链

1. `assets/style_master.png` — 风格母版（晴印 v2 测试图定稿）
2. `assets/girl_reference.png` / `assets/cat_reference.png` — 角色母版
   （设计锁沿用 rainy_rooftop_cat：蓝发少女小蓝、橘虎斑小橘；无伞无书包）
3. `assets/scene_{room,street,store}.png` — 场景母版（白天版：房间/街道/便利店）
