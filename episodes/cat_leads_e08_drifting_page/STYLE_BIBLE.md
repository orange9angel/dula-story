# 晴印（Sunprint）风格圣经 · E08 增量

继承 E04-E07 全部规则。E08 只记录新增：白天基准时段（午后），无
time-of-day override。

## 生成分辨率档（E08 起首次全量执行）

- 文生图 + 图生视频统一 **720p 档**（`config/render_spec.json`，
  `generation_tier: "720p"`），新生成图片由 `normalize_img()` 归一到
  1280×720，I2V `--resolution 720p`。
- 验收：抽 still↔I2V 剪辑点两侧帧对比，不得出现锐度跳变。
- 输出画布保持 1920×1080（字幕锐利），源素材统一低档不构成缺陷——
  均匀软读作风格，跳变才读作错误。

## 新道具设计锁：阿澈的速写本与画页

- 牛皮纸封面速写本（沿用 BOY 设计锁中 "kraft-paper-cover sketchbook"）
- 画页：活页，铅笔速写——河堤风景，平涂晴印风格的"画中画"处理
  （页面内是铅笔单色线稿，与彩色世界形成层次）
- 英文设计锁（imagegen prompt 用）：

```text
The sketchbook: kraft-paper cover spiral sketchbook. The loose page:
a pencil sketch of the riverbank scenery — monochrome pencil linework
only, no color, gentle confident strokes.
```

## F01 符号设计锁（伏笔，登记在 docs/cat_leads_series_bible.md）

- 位置：速写本摊开页面的**右下角**，只占页面约 1/12
- 形态：齿轮状的细密花纹，介于霜花与电路纹路之间，铅笔线条，
  与阿澈的速写笔迹明显不同（更规整、更精密）
- 呈现纪律（向往语法）：**好看的奇异**——精致、对称、像雪花一样
  吸引人凑近看；禁止血丝状、扭曲、锐利攻击性线条
- 全片无人提及、无角色反应镜头
- 英文设计锁：

```text
In the bottom-right corner of the sketch page, a small intricate
gear-like pattern — between a frost flower and a circuit trace,
fine precise pencil lines, visibly more mechanical and regular than
the freehand sketch around it. Beautiful, symmetrical, quietly
strange, occupying about one twelfth of the page.
```

## 母版链

1. `assets/style_master.png` — 沿用 E05
2. `assets/girl_reference.png` / `cat_reference.png` / `boy_reference.png` — 沿用
3. `assets/scene_riverbank_day.png` — 沿用 E06 河堤母版
