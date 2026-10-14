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
