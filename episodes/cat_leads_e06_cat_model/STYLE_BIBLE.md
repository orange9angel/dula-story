# 《猫带我去的地方》风格圣经 —「晴印」（Sunprint）纯净版 · E06 版

继承 E04/E05 STYLE_BIBLE 全部规则（画风五要素、通用 hardLock、母版链）。
本文件记录 **E06 的新增与覆盖**。E06 使用**白天基准时段**（通用 hardLock
的默认白天，无 time-of-day override），重点是新增的「亮场景美术密度规则」
和「布料关键帧语法」——这是 E05 导演复片后的核心改进项。

## E06 亮场景美术密度规则（bright-scene density，2026-09-05 立）

E05 教训：晴印平涂在大平光亮场景里会显得"空"。E06 起亮场景镜头必须满足：

1. **前景遮挡**：尽量每个镜头带一个前景平涂元素——树叶框架（画面上缘/侧缘
   伸入的树冠）、前景草叶、台阶边缘。前景用大形状深色或深色剪影感平涂，
   把视线框向中景主体。
2. **三层纵深**：前景元素 / 中景主体 / 背景（河、城、天空）三层分明，
   禁止"主体直接贴在空背景上"的构图。
3. **色彩脚本**：全片明度/色温随情绪走——开场暖金、追逐段最高饱和、
   结尾树荫段落转凉绿。同一场景不同段落的母版/关键帧要体现这个变化。
4. **光斑即设计语言**：树荫场景必须用平涂洒金光斑（dapple，晴印五要素
   第 4 条）——**一律画进关键帧位图**。不要叠加程序化半透明椭圆层：
   E03/E06 两次实测半透明椭圆在平涂画面上显假，烘焙进关键帧才是正解。

imagegen prompt 追加段（亮场景镜头逐字携带）：

```text
Composition density rules: every shot has THREE depth layers -- a foreground
framing element (overhanging tree canopy or grass blades, large flat darker
shapes), the midground subject, and a layered background (river, distant town,
sky). Never place the subject against a flat empty background. Dappled
sunlight spots are flat gold shapes (#F5B942) under the tree shade.
```

## E06 布料/微动关键帧语法（cloth keyframe grammar，2026-09-05 立）

E05 教训：I2V 做布料/发丝特写运动有"橡胶布条"形变感。E06 起：

1. **布料/发丝/耳朵/尾巴的可见运动 → 关键帧姿势变体**：同一构图出 2 张
   仅目标部位不同的变体（A/B），时间线 0.4-0.6s 交替（一拍三的手绘顿挫感），
   `move: static`。变体生成走 codex 编辑式 prompt（"change ONLY the hair
   tips / skirt hem / ear angle, keep everything else pixel-identical"）。
2. **I2V 只用于**：全身位移（跑下台阶）、运镜、大环境运动——本集仅
   1 段（小橘跳下台阶跑向草地）。
3. **有具体形状的动物/物体（蝴蝶、鸟、落叶）画进关键帧**，不做程序化图层。
4. 可用的程序化图层：cloudDrift（云漂移）等**不透明或点状**元素。
   半透明椭圆/色块叠层（dappleSway 光斑类）在平涂画面上显假，禁用——
   光斑画进关键帧。

## 母版链

1. `assets/style_master.png` — 沿用 E05（晴印 v2 定稿）
2. `assets/girl_reference.png` / `cat_reference.png` / `boy_reference.png`
   — 沿用 E05（阿澈 = E05 sunprint 版母版，设计锁源自 xiaoju_secret）
3. `assets/scene_riverbank_day.png` — 本集新母版：上午河堤台阶 + **大树荫**
   （E05 清晨母版的白天版，新增台阶旁大树，树冠可伸入画面上缘做前景框架）

## 配音（沿用 E05 V2 定型）

全角色 seed-tts-2.0：Girl=Vivi 2.0（uranus）、Boy=小天 2.0（taocheng）、
Cat=dayi；emotion_scale=2 弱档。本集 Girl 用到 bright/curious/amazed/gentle，
Boy 用到 bright/calm/gentle，Cat 用到 proud/calm——均在 E05 voice_config
键表内。
