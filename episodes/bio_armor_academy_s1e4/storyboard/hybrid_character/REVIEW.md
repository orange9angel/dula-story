# 混合角色与动作诊断 · 2026-10-14

用户指出 Tripo 头发像塑胶、身体像泥塑、手部动作扭曲；同意抽象小雪 craft3d 工艺，
询问生成方向与二维整理成本。当前为诊断和可切换试验，没有替换原片的定稿。

## 已完成与文件

- 工艺正本：`dula-skills/character-modeler/references/craft3d-drawn-characters.md`；
  从 character-modeler 与 cel-look 入口可发现。动作经验写入
  `dula-skills/direct-animation-craft/references/hybrid-motion.md`。
- 外观：`look_comparison.jpg`，原版/仅换光影/绘制色块/发束替换，同机位对照；
  `look/` 含正面、斜侧、半身和全场景四机位。
- 动作：`../../output/wrist_motion_ab_v1.mp4`，原片 35.5–39.5 秒与修正候选并排，
  4 秒、1920×540、30fps、有原音轨；完整 ffmpeg 解码通过。为候选对照，不是定稿。
- 数值：`baseline/wrist_audit.json`、`wrist_r6/wrist_audit.json`；全片 82 秒、30Hz。
  `motion_validation_final/imported_contact_report.json` 是**失败报告**，不是验收通过。
  `review_summary.json` 汇总角度与默认入口九帧回归；八帧像素一致，一帧最大差 2，
  所有帧超过 16 的差异像素为零，符合已有 JPEG 容差。

## 外观原因与当前边界

参考图提示词包含立体动画电影角色、雕刻式发束/衣褶；输入图本身已有强体积明暗。
回执为 `pbr=true`、精细几何/贴图、`delight=false`。这不能证明某个开关是唯一原因，
但说明本次输入及配置不是按小雪的二维色块目标准备的。

仅换光影后，发丝亮纹与衣褶暗沟仍存在；绘制色块可减少烘焙细节，但区域边界与
五官图形尚不统一。发束替换仍有发际线碎片，原发饰未恢复，次级运动未接入。
不推荐将最后一列作为成片造型。尚未生成新参考图或新 Tripo 模型，没有新增收费调用。

试验入口：`viewer.html?capture=1&cel=toon` / `cel=painted` / `cel=graphic`，仅女主。
共享着色与束面候选在 `dula-assets/lib/craft3d/imported-cel-look.js`、`graphic-hair.js`；
造型参数在 `dula-assets/characters/bioarmor/aoi-graphic-hair.js`。都明确标为实验。

下一轮先确定主发束轮廓与干净的语义区域，修发际线/脸面，再检查转头和对白。
若重做输入参考，保留当前人物身份和比例，避免继续要求密集雕塑细节；不要立即整集重生成。

## 动作原因与当前边界

主要问题来自本地接入层：旧角色腕位与新骨架比例不匹配、手骨独自承担世界掌向旋转、
左右掌面/屈指镜像、肘 pole 接近肩腕轴时的翻转。只有擦臂区间使用 Tripo 生成 clip，
不能将全片问题归为生成动作质量。

原版掌轴/前臂最大夹角：雷晓左 169.60°、右 124.83°；千堂葵左 87.37°、右 164.20°。
候选对应约 44.26°、47.98°、6.13°、8.17°；这些只是本片角度指标，不证明表演自然。
同时检查腕世界旋转，避免局部角度为零却整臂翻转；调整肘方向后女主最大世界步长
约 26.46°/30fps 帧，仍需结合连续动作节奏改进。

`wristfix=1` 是独立试验开关，默认关闭。候选已抬高叫停腕位、由前臂承担掌向、
校准镜像屈指，保留有限腕角约束。旧道具偏移与新掌向不匹配，30Hz 全片接触失败：
雷晓左手桌面最深 9.60mm、女主右手桌面 18.58mm、女主右手入罐 25.51mm；
持罐最近采样间距女主 39.25mm、男主 62.15mm。顺序/跳转一致通过；不能提升为默认。

下一轮需重标定握罐的掌心/指腹局部锚点、托本子的掌面支撑，协调接近/松开轨迹与
桌沿修正，保留叫停与对白手势。不要只继续收紧腕角或平滑画面来掩盖接触问题。
当前只检查代表静帧、数值与视频解码，未声明完整正常速度主观审片或新音轨审听。

## 复现

在本集目录启动 `node render.mjs --serve` 后：

```powershell
node tools/capture_hybrid_look.mjs
node tools/audit_wrist.mjs new_candidate '&wristfix=1'
node render.mjs --physics-only --fps 30 --q '&wristfix=1' --board storyboard/hybrid_character/new_validation --trace storyboard/hybrid_character/new_validation/trace.json
..\..\.venv\Scripts\python.exe tools/check_imported_contact.py storyboard/hybrid_character/new_validation/trace.json
```

原始视频与原始 GLB 保留；未运行整集重渲染。修改源码后重新生成对应检查，旧哈希不作新验收。
