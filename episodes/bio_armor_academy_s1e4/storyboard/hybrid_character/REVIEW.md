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

## 2026-10-14：五官、发束与衣裤的绘制融合候选

用户确认上一版宽发束“比原来更像动漫”，同时认为仍弱于动画片，随后要求五官
参考小雪的绘制工艺、衣裤也向漫画方向调整。此反馈确认方向，并非整套模型验收。

`cel=anime` 为本轮独立候选，两人均使用新曲面头型、可绘制五官和简化发束；
身体、手脚和服装仍来自原 Tripo 蒙皮网格。葵保留侧马尾、叶形发饰、绿色背心、
领结、深绿裙、深色袜与棕鞋；雷晓保留棕色短发、浅衬衣、深裤与棕鞋。
两人的眼形、眉粗与下颌参数不同，不直接复制小雪的脸。

眼睛支持独立视线、眼睑裁剪和高光，眉与嘴角读取原表演情绪；发音开合继续使用
原对白视素。新颈部连接原颈根与头骨，葵的马尾读取确定性转头延迟。衣料换为
作者色板及一档阴影，平滑细碎表面法线，原几何主褶保留。

证据与验证：

- `anime_character_comparison.jpg`：两人同机位中性脸、全身对照。
- `anime_review/aoi_sheet.jpg`、`lei_sheet.jpg`：表情、左右转、侧后、抬低头。
- `anime_review/report.json`：26 个状态，逆序重绘 PNG 字节一致，无浏览器/着色器错误；
  含共享资产与输入文件哈希。
- `anime_review/default_regression.json`：四张原版同机位 JPG 解码后完全一致。
- `output/anime_character_dialogue_v2.mp4`：11.5–19.8 秒原对白，8.3 秒、249 帧、1280×720。
- `output/anime_character_ab_v2.mp4`：上述片段与原成片并排，1920×574，保留原对白。
- `output/anime_character_closeups_v2.mp4`：同一 8.3 秒对白的双人近景，前 3.6 秒看葵、
  后 4.7 秒看雷晓；1280×720、249 帧，音轨直接取原混音 11.5–19.8 秒。
  各段机位保存在 `anime_close_aoi/render_build.json` 与 `anime_close_lei/render_build.json`，
  成片抽帧为 `anime_motion/decoded_closeups.jpg`。
- `anime_motion/decoded_contact_sheet.jpg`：最终对照 MP4 的四个解码帧；
  `anime_motion/trace.json` 保存实际表情/视线/口型和构建输入。已检查代表帧与控制范围，
  未声称完成正常速度主观审听或全片接触复验。

已修正试制中暴露的指尖染成裤色、袜子误作皮肤、裙腰碎斑，以及旧下颌/残发碎片。
仍有领口与袖根的分区边界不够整洁、侧面发束附着偏生硬、脸部设计细节较简化等
美术问题。此版是风格候选；原 82 秒成片未替换。腕部/握物问题沿用上文已知状态。

复现（本集目录，已有 4215 服务）：

```powershell
node tools/review_drawn_characters.mjs
node tools/capture_hybrid_look.mjs --modes anime,original --out storyboard/hybrid_character/anime_final
python tools/build_drawn_review.py
node render.mjs --range 11.5,19.8 --q '&cel=anime' --out anime_character_dialogue_v2.mp4 --board storyboard/hybrid_character/anime_motion --trace storyboard/hybrid_character/anime_motion/trace.json
```

工艺与翻车记录已回写 `character-modeler/references/craft3d-drawn-characters.md` 与 `cel-look`。

## 2026-10-14 V3：眼睛、发型与服装配色

用户认为方向正确，但要求眼睛、头发更好看，衣服摆脱褪色感，并学习日式动画
少年少女主角的造型方法。本轮保留两人的身份与 Tripo 身体，进一步修改绘制层。

葵使用有弧度的眼型、渐细上睫线和明亮金色虹膜；雷晓使用较收敛的眼型、眉形
及短发尖束。虹膜增加上下明暗与少量高光，短而浅的眼睑褶线避免双眉感。
前发束改用贴合头壳的局部框架，发梢独立弯曲；亮面沿发束，马尾根与发饰挂点
一并调整。早期试制的水平亮带和圆拱短发束未采用。

上一版的褪色主要来自偏灰的作者色板及较弱的显示明暗差。本轮采用奶白衬衣、
深绿背心/裙、莓红领结、蓝灰长裤，分别给定底色与阴影色；增加衣物轮廓对比。
仍有领口/袖根分区毛边和局部袖面误染肤色，侧发根也偏生硬；这些是明确保留
的待修问题，不能因颜色改善而认定服装或发型已经完成。腕部/握物状态沿用前文。

证据：

- `anime_character_polish_v3.jpg`：V2 / V3 同机位正脸与全身对照，四列。
- `anime_v2_baseline/`：精修前快照；旧 V2 图和短片继续保留。
- `anime_v3/aoi_sheet.jpg`、`lei_sheet.jpg`：表情和转头检查。
- `anime_v3/report.json`：26 个状态，逆序 PNG 字节一致，无浏览器/着色器错误。
- `anime_v3/default_regression.json`：四个原版机位解码像素零差异。
- `output/anime_character_closeups_v3.mp4`：原 11.5–19.8 秒对白近景，8.3 秒、
  249 帧、1280×720，含原混音截段；前 3.6 秒葵，后 4.7 秒雷晓。
- `anime_v3/close_aoi/render_build.json` 与 `close_lei/render_build.json` 保存各自
  实际构建输入；女主片段生成后仅再调整男主顶发，男主片段随之重渲染。
- `anime_v3/decoded_closeups.jpg` 是最终 MP4 的四个解码帧；`video_probe.json`
  保存流参数。已检查静帧、转头图与成片抽帧，未声明正常速度全片主观审片。

复现对照（本集目录，4215 服务启动后）：

```powershell
node tools/review_drawn_characters.mjs --out storyboard/hybrid_character/anime_v3
node tools/capture_hybrid_look.mjs --modes original,anime --out storyboard/hybrid_character/anime_v3/scene
python tools/build_drawn_review.py --source storyboard/hybrid_character/anime_v3 --before storyboard/hybrid_character/anime_v2_baseline --output storyboard/hybrid_character/anime_character_polish_v3.jpg --scene-source storyboard/hybrid_character/anime_v3/scene
```

通用方法与本轮失败尝试已回写现有 `character-modeler` / `cel-look`，未新增平行 skill。

## 2026-10-14：以二维绘制样稿重新确定五官目标

用户提供 `cat_leads_e07_river_willow/storyboard/check_shot_13.jpg` 作为五官绘制
质量参考，随后明确指出之前给 Tripo 的二维文件本身有三维质感，应重新生成
二维质感的人物图。已复看 `assets3d/tripo_aoi_trial/aoi_reference_v1.png` 和
`assets3d/tripo_lei_trial/lei_reference_v1.png`：鼻梁/皮肤渐变、发束和衣料都偏
立体动画渲染。它们可用于身份与服装核对，不直接充当二维线条与上色样板。

使用内置 image_gen 生成 `face_design_v1/face_target.png`，以用户图片为绘制质量
参考，以现有两人截图保留发色、侧马尾/短发、叶形发饰和服装。实际提示词与
输入角色分别记录于 `prompt.txt`、`manifest.json`。已检查五官线条、虹膜层次、
嘴形、脸部比例和发束流向；男主最顶发梢触及画框。此图是单张二维造型候选，
当时尚未确认；用户随后以“这个可以，用这个改吧”确认其美术方向，状态已更新到
manifest。它不是现有 3D 模型渲染，也不是已经拆层的动态脸贴图。

后续接入应从正面与转面设计、眉眼/虹膜/口型拆层及头部轮廓开始；不要把含刘海、
三分之四透视与固定表情的整张插画直接包到头上。该次记录时 `cel=anime` 为 V3。

## 2026-10-14 V4–V5 与生成绘画直接接入试验

用户进一步指出内眼角不应收尖、侧额头后缩、下巴缺失，并提醒补下巴也不能前顶。
V4–V5 调整了眼白轮廓、眼睑、额头/鼻/下颌剖面、发束流向和配件贴合；服装暖白
区域的肤色误判有所减少。`anime_v5/report.json` 记录当时 30 个头部/表情状态、
5 个场景时刻逆序一致。默认 `cel=anime` 为此路线，仍不是用户已认可的成片人物。
接入直接纹理分支后又用当前源码复查，`anime_v5_current/report.json` 的 30 个
头部/表情状态和 5 个默认场景时刻同样通过。

随后按用户要求尝试省掉“照原图重画一张简化参考”的步骤。`cel=direct` 为葵启用
实际生成的脸面和前后头发生产纹理：脸图映射到有额鼻唇颌起伏的头部，发图映射
到有厚度的曲面并配后脑壳，均随头骨转动。雷晓仍沿用 V5。没有把完整头像卡片
固定朝向相机，也没有把九宫格参考冒充最终角色；九宫格仅作为可选结构资料保存。

直接试验的正面眼线、虹膜、发丝比程序重画更接近生成图。生产图本身也有脸型/
年龄感漂移，拆层生成没有完全保持像素位置，脸和头发分别做了对齐。这意味着
“原画 → 生产图”和“生产图 → 模型”两段都要比较，不能声称完全还原了原画。

实际复查看到并修正了耳纹拉到太阳穴、发帽内侧黑板、部分横向拉伸和粗边墙。
**正侧面仍有发层薄壳、顶部接缝，后发的纹理与束体也不完全对应。** 颈领分区
仍有碎边，马尾暂随头部刚性运动；腕部扭曲和握物接触不属于本次改善的验收范围。
当前结论是可运行的直接绘画试验，不能称为全角度成熟角色能力。

本次证据在 `direct_paint_v1/`：

- `comparison.jpg`：已确认原图、实际生产图、V5 与直接纹理模型。原画为斜角，
  生产图为正面；两版模型是同机位对照。
- `aoi_views.jpg`、`expressions.jpg`：真实模型的转面、俯仰、眨眼与口型，包含缺陷。
- `render_final/report.json`：15 个脸部状态、5 个场景时刻逆序一致，无浏览器/
  着色器错误。它验证接入与确定性，不验证审美通过。
- `output/direct_paint_aoi_v1.mp4`（相对单集根）：原 11.5–15.1 秒对白近景，
  3.6 秒、108 帧、1280×720、30fps，含原混音截段。`decoded_clip.jpg` 为解码帧；
  `video_probe.json` 和 `video/render_build.json` 保存流信息与构建输入。已检查抽帧，
  未声明正常速度完整主观审片。
- `manifest.json`、三个 prompt 文件：真实生成输入输出关系、纹理和证据哈希、
  已知缺陷；实际纹理归 `dula-assets/characters/bioarmor/textures/`。

复现（单集目录，静态审查先启动 `node render.mjs --serve`）：

```powershell
node tools/review_drawn_characters.mjs --mode direct --actors aoi --out storyboard/hybrid_character/direct_paint_v1/render_final
node render.mjs --range 11.5,15.1 --camera '0.60,1.48,1.35,0.60,1.46,0,35' --q '&cel=direct' --out direct_paint_aoi_v1.mp4 --board storyboard/hybrid_character/direct_paint_v1/video
python tools/build_direct_paint_review.py
```

用户强调 skill 应积累审美判断。本次写回现有 `character-modeler`：
`character-aesthetics.md` 记录“为什么好看、差在哪、何时改过头”，
`generated-character-paint.md` 记录直接绘画方法、验证范围及失败机制。
判断先于参数，用户认可原画与认可最终模型分别登记。

## 2026-10-14：R2 正面获认可，V2 修订留作对照

用户先指出 V1 R1 正面“头发弄顺滑就很美了”，随后看到
`direct_paint_v1/render_r2/aoi_neutral.png` 说“这张就很不错了”，并认可同目录的
`aoi_talk.png`、`aoi_firm.png`。这三张实际模型截图现作为正面保留基准。
认可的是展示出来的正面造型与表情，不扩展到侧后方、全身动作或后续 V2。

V2 对应此前的内眼角、脸颊/下颌、毛糙头发与衣服串色反馈：

- 保留生成绘画的刘海、睫线和虹膜，动态眼白内端改为圆弧；下颌后方补体积，
  正面仅小幅丰满，避免下巴前顶或整张脸变宽。较宽的中间候选已收回。
- 前发细节用薄曲面保留；马尾侧后用闭合曲线束补体积。后脑 UV 连续展开，
  减少拉条。补体积曾撑厚正面轮廓，按用户认可图缩回；极侧面的接缝仍可见。
- 衣服分区结合骨骼影响、静止骨轴距离和实际袖口。修正肩袖的肤色误判、领结
  红色上串，以及调试中产生的裙侧肤色和前臂绿色块；袖口保留暖白与冷色阴影。

当前 `cel=direct` 仍只为葵启用生成绘画头发/脸；默认 `cel=anime` 保持程序绘制
路线。两者共用的葵衣服分区同时获得修正。雷晓没有改用本次生成绘画。

证据位于 `direct_paint_v2/`：

- `front_target_comparison.jpg`：用户认可的 R2 与后续候选的正面 neutral/talk 同机位
  对照；`comparison.jpg`、`hair_comparison.jpg`、`clothing_comparison.jpg` 对照 V1
  最后版本与本次修订，`views.jpg` 展示多角度和眨眼。
- `final/report.json`：15 个脸部状态与 5 个场景时刻逆序结果一致，无浏览器或
  着色器错误。`default_regression/report.json`：默认路线两人共 30 个状态与 5 个
  场景时刻也通过。技术检查不等于美术通过。
- `output/direct_paint_aoi_v2.mp4`（相对单集根）：原 11.5–15.1 秒对白，3.6 秒、
  108 帧、1280×720、30fps，含原混音。已检查 `decoded_clip.jpg` 的四个解码帧；
  未声明正常速度完整主观审片。输入清单在 `video/render_build.json`，流参数在
  `video_probe.json`。
- `manifest.json`：记录 R2 认可范围、三张基准图及本次证据哈希，V2 状态仍为
  后续候选。R2 原图保留，未被新渲染覆盖。

仍存在侧后发层与后脑接缝、后发细节弱于正面、颈领小碎片。180° 仅用于暴露
头部后侧几何，并非人物可表演的生理转头。马尾次级摆动、腕部扭曲与接触动作
未在本轮解决，不能由本轮静帧或确定性检查推定通过。

复现（单集目录，静态检查使用 4215 服务）：

```powershell
node tools/review_drawn_characters.mjs --mode direct --actors aoi --out storyboard/hybrid_character/direct_paint_v2/final
node tools/review_drawn_characters.mjs --out storyboard/hybrid_character/direct_paint_v2/default_regression
node render.mjs --range 11.5,15.1 --camera '0.60,1.48,1.35,0.60,1.46,0,35' --q '&cel=direct' --out direct_paint_aoi_v2.mp4 --board storyboard/hybrid_character/direct_paint_v2/video
python tools/build_character_polish_review.py
```

审美上的“认可后要保留”与上述失败机制已写回现有 `character-modeler` 的
`character-aesthetics.md`、`generated-character-paint.md`。

## 2026-10-14：按生成侧面参考修订侧脸 V3

用户继续认可正面的接近原画程度，同时指出侧脸不够柔和。此轮复看既有
`face_design_turnaround_v1/aoi_nine_views.png` 的侧面与三分之四；没有重新生成
简化参考，也没有将生成图当作模型截图。R2 正面认可范围保持不变。

当前侧面的主要差异包括：鬓发在脸前遮住眼神、额鼻唇颌起伏偏硬、耳朵偏前、
下颌与颈的衔接像楔形。先保留模型正面宽度与绘制 UV，改纵深与曲率，再检查
正面漂移。鼻唇起伏限定在面中部，下巴略收；鬓发绕回太阳穴；耳朵向后调整，
并使用已有生成脸图里的独立耳区绘画。

中间候选增大整张脸的曲率后，侧面虹膜仍偏圆、三分之四近眼变宽，因此单独
调整承载虹膜的小范围曲面。侧视虹膜现在会收窄，未把整只眼睛缩小或换成朝向
相机的贴片。眼睛偏视、半眨、说话仍使用原有表演接口。

修复的实现问题还包括：眼睛局部清底重新把耳纹带回脸上、耳贴图乘肤色变橙、
前后面区位移不连续，以及极窄下巴截面造成交叉描线。失败机制已写回现有
`character-modeler` 两份参考文档；共享实现仍在 `dula-assets/lib/craft3d/`。

证据在 `profile_polish_v3/`：

- `profile_comparison.jpg`：生成侧面参考、修前模型、修后模型。生成图不是严格
  正交测量；模型前后为同机位。`front_preservation.jpg` 同时保留认可 R2、修前、
  修后正面；`turns.jpg` 展示两侧与中间角度。
- `final/report.json`：14 个侧面、绕行、裸头诊断及侧面表情状态逆序一致；头部
  顶点有限、前后面区接缝连续，无浏览器错误。`expressions/report.json` 的
  15 个表情/头部状态和 5 个实际场景时刻通过。
- `default_regression/report.json`：默认路线两人 30 个状态和 5 个场景时刻通过。
  `manifest.json` 另比较其 30 张脸部图与 V2 的哈希，确认默认脸部结果一致。
- `output/aoi_profile_polish_v3.mp4`（相对单集根）：6 秒、144 帧、900×900、24fps
  无声转头检查。`output/aoi_profile_dialogue_v3.mp4` 是原 11.5–15.1 秒对白近景，
  3.6 秒、108 帧、1280×720、30fps，保留原混音。检查了静帧、侧面表情和两个
  最终 MP4 的解码帧；未声明完整实时主观审片。

正面中心五官区域的像素差保存在 `manifest.json`；它用于发现漂移，不是审美
相似度评分。V3 侧脸仍为用户待复看的修订。后脑/马尾接缝、大幅转头的颈领碎片、
较大侧面表情仍有局限；本轮不构成腕部和接触动作验收。

复现（单集目录，4215 服务开启）：

```powershell
node tools/review_character_profile.mjs --out storyboard/hybrid_character/profile_polish_v3/final
node tools/review_drawn_characters.mjs --mode direct --actors aoi --out storyboard/hybrid_character/profile_polish_v3/expressions
node tools/review_drawn_characters.mjs --out storyboard/hybrid_character/profile_polish_v3/default_regression
node tools/render_character_profile_turn.mjs
node render.mjs --range 11.5,15.1 --camera '0.60,1.48,1.35,0.60,1.46,0,35' --q '&cel=direct' --out aoi_profile_dialogue_v3.mp4 --board storyboard/hybrid_character/profile_polish_v3/dialogue
python tools/build_profile_polish_review.py
```

## 2026-10-15：自主侧面迭代 V4（待用户复看）

用户授权休息期间继续自查和迭代。当前候选保留 R2 的正面绘画，重点减少
45°/65° 横飞的鬓发，补后脑到耳后/后颈的体积，分开马尾与后脑，重画简化耳纹，
修整颈部宽度与颈领误分色，并清除眼睛清底取样里的耳缘线。没有更换剧情、音频
或手部动作；原来认可的 R2 文件仍完整保留。

采用的是固定在头骨上的曲面绘画层与闭合发束体积。后脑采用静态侧向纹理，
马尾的细节和 alpha 随观察方向调整；脸、眼、耳仍是有纵深的曲面与原表演接口。
不是把整个头像换成朝向相机的图片，也不是已经恢复了任意视角的物理发型。

试过整张侧面曲面、alpha 体素/距离场、导入后发、方向投影体积和多视图变形。
其中出现断层、重影或脸面穿插的候选均未保留为运行模式。失败证据在
`profile_polish_v4/r12`、`r14`、`r15`、`r17`、`atlas_r1`、`morph_r2`、
`morph_r3`，实现快照见 `rejected_variants.zip`。最终保留局部有效的纵深修型、
独立发束及图表整理；经验写回现有 character-modeler，不另建重复 skill。

先看这些实际输出：

- [前后对照](profile_polish_v4/before_after.jpg)、[六角度](profile_polish_v4/turns.jpg)、
  [生成图与实际模型](profile_polish_v4/reference_comparison.jpg)、
  [认可正脸对照](profile_polish_v4/front_preservation.jpg)。
- [6 秒无声转头](../../output/aoi_profile_polish_v4.mp4)：900×900、24fps、144 帧。
  [原对白近景](../../output/aoi_profile_dialogue_v4.mp4)：原 11.5–15.1 秒，
  1280×720、30fps、108 帧，保留原混音。
- `final/report.json` 的 25 个角度/结构状态，`expression_r13/report.json` 的
  15 个头部/表情与 5 个场景状态均逆序一致，无浏览器/着色器错误。
  `default_regression` 的两人 30 张脸与 5 张场景截图哈希与 V3 一致。
- 两个 MP4 完整解码成功；检查了十张转头解码帧与两张原对白解码帧，见
  `decoded_turn.jpg`、`decoded_dialogue.jpg`。这不是完整实时主观审片声明。
- 新生成资产仅为从既有九视图提取的透明头发 atlas。原始九视图未更换；提示词、
  生成标识、素材/源码/证据哈希、视频参数与尚存问题都在 V4 `manifest.json`。

自评：鬓发收拢、后脑填充、耳纹及颈形较 V3 更清楚；但 45°/65° 主刘海仍有
扫向一侧的块感，近侧马尾偏厚，转动时绘画层与体积的交接仍能察觉。俯视发顶、
后颈下沿与颈领小碎片也未达到生成图水平。**V4 是可比较的新候选，不宣布侧脸
已达到正面的完成度。** 本轮也不构成手腕、握物或马尾次级摆动的验收。

复现（单集目录，静帧工具需要 4215 服务）：

```powershell
node tools/review_character_profile.mjs --angles '15,25,35,55,75,-15,-25,-35,-45,-55,-75' --out storyboard/hybrid_character/profile_polish_v4/final
node tools/review_drawn_characters.mjs --mode direct --actors aoi --out storyboard/hybrid_character/profile_polish_v4/expression_r13
node tools/review_drawn_characters.mjs --out storyboard/hybrid_character/profile_polish_v4/default_regression
node tools/render_character_profile_turn.mjs --revision v4
node render.mjs --range 11.5,15.1 --camera '0.60,1.48,1.35,0.60,1.46,0,35' --q '&cel=direct' --out aoi_profile_dialogue_v4.mp4 --board storyboard/hybrid_character/profile_polish_v4/dialogue
python tools/build_profile_polish_v4_review.py
```

`face_lab.html?actor=aoi&cel=direct&hair=legacy` 可对照旧头发结构（脸/颈仍为
当前 V4）；完整旧版以 V3 提交与已保存输出为准。

对应提交：资产 `376498f`；skill `531b101`、`12af102`。工作区其他任务的未提交
修改未纳入本轮提交；具体渲染输入仍以报告中的逐文件哈希为准。

## 2026-10-15：侧脸轮廓与多维特征实测

用户指出侧脸内陷，要求提取文生图和模型特征以提高拟合质量。本轮建立可复跑
测量及控制变量试验，共享角色源文件未修改；局部拟合是待复看的实验候选。

- [边界提取与人工标点](profile_feature_study_v1/01_extraction.png)：参考两侧与模型
  两侧，边界叠回原图检查。原画鼻根被刘海遮挡，未推断其完整曲线。
- [同尺度叠加](profile_feature_study_v1/02_contour_overlay.png)与
  [去除倾斜后的对照](profile_feature_study_v1/04_pose_neutral_contours.png)：平移、
  等比缩放及刚性旋转分开显示，不采用横纵拉伸或非刚性变形来隐藏误差。
- [多维特征](profile_feature_study_v1/03_feature_metrics.png)：外轮廓、嘴位、眼高、
  眼耳间距分开记录。人工点约±3像素，数值不是美术评分。
- [真实渲染控制变量](profile_feature_study_v1/05_controlled_experiments.jpg)：V4、
  眼面后压减半、参考轮廓拟合三组各14个角度/表情状态；前脸和侧脸逆序取帧一致，
  无浏览器错误或非有限顶点。只检查静态表情，不冒充连续对白验收。
- [拟合后的曲线](profile_feature_study_v1/06_fitted_contour.png)：右向鼻下凹入相对
  鼻尖—下巴距离 D，原画约0–0.008D，V4约0.101D，局部候选约0.012D。
  保留鼻尖、下巴端点和眼面，修正鼻下—唇部剖面；正面与基线逐像素相同。
  只减小眼面后压时，眼心前移约11.7像素，外轮廓提取变化为0像素，因此不能
  把该参数直接认作此次外轮廓内陷的根因。
- [斜面姿态检查](profile_feature_study_v1/07_oblique_pose_check.png)：原画未标定
  yaw/俯仰，不能直接叫45°。两眼连线归一化只是姿态敏感性演示，未反推出真实
  相机；原画鼻部笔画和模型几何鼻尖不是严格同名点。

数据与标注：`config/profile_feature_annotations.json`、该输出目录的
`measurements.json`、`experiment_metrics.json`、`oblique_features.json`。
`fit_candidate.json` 保存拟合方法与具体剖面变更；三组 `report.json` 保存源文件
哈希、浏览器实验源码哈希和各帧哈希。人工点/边界扰动仅作敏感性检查，不是统计
置信区间。最终画面仍存在眼耳关系、面长和发型差异，不能称已与文生图一致。

在本集目录重跑（沿用 `node render.mjs --serve --port 4215` 的本地服务）：

```powershell
python tools/analyze_profile_features.py --phase measure
node tools/render_profile_feature_study.mjs --variants baseline,eye_relief
python tools/analyze_profile_features.py --phase fit
node tools/render_profile_feature_study.mjs --variants contour_fit
python tools/analyze_profile_features.py --phase review
```

通用诊断教训已写回
`dula-skills/character-modeler/references/multiview-character-fit.md` 的侧脸特征测量章节。

## 2026-10-15：补斜面参考与整图漏检复查

用户指出后脑头发已坏，重点要求45°/60°参考，并提醒检查注意力局限于脸部。
本轮补绘画参考、重拍模型同名角度、记录整图问题；没有把头发修好，也没有替换
共享角色。旧鼻下拟合的局部有效性不能视为整个人物完成。

- [整图问题标注](oblique_feature_study_v2/whole_frame_review.jpg)：全幅模型上六区
  人工定位，覆盖刘海/发顶、后脑/耳后、马尾/发根、鼻口/下巴、眼眉/叶饰、
  头颈/领口。右转马尾只露颈后短束，左转马尾根部硬接、末端管状；后脑纹理
  拉伸、耳后三角裸露、刘海上拱和领口碎片仍未解决。遮挡原因与具体改法尚须
  对几何和图层分别验证，不能仅凭截图声称发束丢失或确诊某个参数。
- [45°全图对照](oblique_feature_study_v2/comparison_45.jpg)、
  [60°模型与斜面绘画对照](oblique_feature_study_v2/comparison_60.jpg)：依次显示
  新绘画、原V4、仅鼻下拟合。模型沿用实际头部旋转输入，身体朝前；绘画半身
  随头转。未扭曲图像对齐，服装仅作边界检查，不据此计算整体形状误差。
- 原九视图仍是身份母图。内置 image_gen 共返回三张单图，原始输出均保留，
  提示见 `oblique_feature_study_v2/references/prompts.json`。首张左右方向重复；
  第二张方向与非对称发型正确，45°格可作绘画候选，60°格偏纯侧；第三张
  纠正为双眼可见斜面，但角度仍偏浅。**没有获得可作测量基准的精确60°参考。**
  图中45/60标签是生成目标，不能当实测yaw；不从这些图计算同角度拟合分数。
- 两组各16个角度/表情状态，无浏览器错误，顶点有限，正面/90°逆序一致。
  正面逐像素无变化；±45°/±60°拟合变化仅落于下半脸局部。没有连续动画验收，
  没有因技术检查通过而判定造型合格。

复现（单集目录，4215本地服务）：

```powershell
node tools/render_profile_feature_study.mjs --variants baseline,contour_fit --out storyboard/hybrid_character/oblique_feature_study_v2 --additional-angles 60,-60
python tools/build_oblique_feature_review.py
```

`review.json` 保存参考选择/裁切、生成失败状态、人工观察、像素变化和截图哈希。
通用教训写回 `character-modeler/references/character-aesthetics.md` 的“全图复查”
章节：先全图、再逐区和连接、最后再全图；每个可见区域必须有观察记录，不能
依赖用户逐个提醒。

## 2026-10-15：眼周向前恢复，纠正转身对照

用户指出侧面眼眶被压扁、45°/60°远侧眼显露不足，并要求先直接把眼眶拉出来。
现已将共享 `aoi-generated-paint.js` 中眼周后压由14mm取消，眼面斜率`.36`、
宽高及正面绘画保持。眼区中心向前恢复14mm，±60°重新看见远侧虹膜；正面
逐像素相同。这是运行角色的实际修改，旧鼻下剖面拟合没有混入此次修改。

- [右向45°/60°/90°前后对照](eye_orbit_study_v1/before_after_right.jpg)、
  [左向对照](eye_orbit_study_v1/before_after_left.jpg)：所有图头和身体一起转。
- [参考与修订全图](eye_orbit_study_v1/reference_and_fix.jpg)：45°目标绘画、旧模型、
  修订模型并排。新图改善远眼显露，仍有后发、耳后三角区、刘海上拱、鼻下凹口
  和领口碎片；不能称已经与原画一致。
- 旧60°截图重新复现且哈希一致，实际头部yaw为59.999998°，身体0°；并非错放
  90°文件。旧模型远眼被脸面过早遮挡，造成近纯侧观感。之前将独立转头测试
  配转身人设图是对照方式错误；现分为`--turn-mode head`和`body`，记录两者朝向。
- 五组控制变量各16帧。只改斜率没有解决，斜率`.60`加减后压也未恢复60°远眼；
  取消后压、保留`.36`斜率有效。实际源码重拍16帧与采用试验逐帧一致；新旧正面
  逐像素一致；顶点有限，无浏览器错误，正面及90°逆序一致。没有连续动画验收。
- 25点面部射线测试记录虹膜附近被脸面遮挡的变化，不包括头发alpha和眼睑，
  不等同可见像素比例。不能把此前“鼻下外轮廓不变”推广成眼眶没有问题。

数据和源码快照位于`eye_orbit_study_v1/`。历史实验复现时使用快照，避免新源码
覆盖旧证据；当前运行源码直接渲染采用`--variants baseline`：

```powershell
node tools/render_profile_feature_study.mjs --source storyboard/hybrid_character/eye_orbit_study_v1/source_before.js --experiments config/eye_orbit_experiments.json --variants baseline,depth_only,slope_only,orbit_01,natural_curve --out storyboard/hybrid_character/eye_orbit_study_v1 --additional-angles 60,-60 --turn-mode body --eye-diagnostics
node tools/render_profile_feature_study.mjs --variants baseline --out storyboard/hybrid_character/eye_orbit_study_v1/applied_body --additional-angles 60,-60 --turn-mode body --eye-diagnostics
node tools/render_profile_feature_study.mjs --source storyboard/hybrid_character/eye_orbit_study_v1/source_before.js --variants baseline --out storyboard/hybrid_character/eye_orbit_study_v1/angle_audit --additional-angles 60,-60 --turn-mode head
node tools/render_profile_feature_study.mjs --variants baseline --out storyboard/hybrid_character/eye_orbit_study_v1/applied_head --additional-angles 60,-60 --turn-mode head
python tools/build_eye_orbit_review.py
```

复盘已写回`character-modeler/references/multiview-character-fit.md`。

## 2026-10-15：远侧脸、眼角与耳朵试修；按部位拆分混合对照

用户连续指出远侧额头/脸颊支撑不足、外眼角过露、耳朵偏后及双耳感、鼻侧眼白
过多与短睫毛缺失，并要求把由大到小、多维度的大模型观察与算法证据结合，
写入skill后实际运用。当前是修订候选，不是整体造型通过。

- [近远眼对照](face_support_study_v1/parts/01_eyes.jpg)：用户提供的眼部局部图、
  本轮前模型、当前模型。鼻侧眼眶收紧至虹膜附近，补短鼻侧睫毛；近眼虹膜仍
  偏圆、外侧睫毛偏厚，远眼遮挡与绘画仍有差异。
- [脸部关系对照](face_support_study_v1/parts/02_face_relations.jpg)：额头眉眼、
  眼下腮部下巴、鼻口下巴；[耳发对照](face_support_study_v1/parts/03_ear_hair.jpg)
  包含耳根、太阳穴、鬓发、后脑与马尾根。参考和模型独立等比放大，未作形变。
- [裁切索引](face_support_study_v1/parts/00_region_map.jpg)与
  [完整头肩回查](face_support_study_v1/parts/04_whole_frame.jpg)保留局部的来源
  和整体关系。原画角度未标定；没有借局部排图宣称45°精确匹配。
- 实际资产加入Aoi局部视角修型：增加远侧皮肤支撑、外眼角往后绕转、较低的
  腮部轻微补量；头发使用较宽的过渡以免弯出眼区波浪。UV平移等失败分支已从
  共享实现去掉，实验参数和截图保留为失败证据。此项是GPU绘制时修型，非刚性
  同一头网格的纯透视，也不进入CPU射线测试；工具阻止用旧探针给它背书。
- 耳中心z由-.043改为-.015、y由1.460改为1.467；耳外形改为上宽下收、前缘内收，
  耳内阴影由分离图形合为连续耳腔。耳根连接较前版改善，内部形状仍偏简化。
- 渲染20个姿态/表情样本，含正面、左右45/60/65/90、40/50相邻角与半眨/说话。
  头身yaw一致，无浏览器错误，顶点有限；正面、90°和左右45/60逆序重拍一致。
  正面并非像素不变：本轮眼形和耳朵也有修改。完整动态、头发修复仍未通过。
- 混合审查记录见`parts/review.json`：算法只核验姿态、差分范围、确定性；观察
  结论由模型填写，区分用户指出与本轮自主发现。此次仍由用户补出鼻侧眼白、
  内侧睫毛和双耳感，不把新skill的格式校验或这次带提示实践当能力提升证明。

复现（单集目录、4215服务）：

```powershell
node tools/render_profile_feature_study.mjs --variants baseline --out storyboard/hybrid_character/face_support_study_v1/applied --additional-angles 60,-60,40,50,-40,-50 --turn-mode body
python tools/build_oblique_feature_review.py --parts
```

`face_support_study_v1/source_after.js`及共享辅助代码快照保留本轮实现；部分归档
失败参数依赖旧试验代码，当前工具遇到已删除的分支会明确报错，不假装成功套用。
后发/马尾纹理与造型、鼻下轮廓、颈领碎边仍未由这轮解决。
