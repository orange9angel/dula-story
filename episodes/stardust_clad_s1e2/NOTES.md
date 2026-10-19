# 《星屑战壳》S1E2《焰阶宫·盾与暗链》R22

2026-10-19 用户认可R21肩甲，继续指出护臂像圆环加铁块，要求类似金属手套。
R22保留肩甲，改为收腕的连续前臂壳、内侧护片、手背甲和随原指骨开合的分节指甲。
补齐金属指尖，活动缝保留柔性衬层；盾/武器挂点、脸、动作与声音保持。

[12秒护臂开合A/B](output/gauntlet_comparison_r22.mp4)、
[26秒实战片段](output/palace_duel_preview_r22.mp4)、
[213秒正片](output/stardust_clad_s1e2_palace_r22.mp4)、
[262.2秒带原片头版](output/stardust_clad_s1e2_palace_tv_r22.mp4)。
[修订证据与复现](storyboard/palace_r22/REVIEW.md)。R21肩甲已认可，R22护臂待用户评价；
不把局部装备认可扩展为整个人物造型通过。
常用入口 `craft3d_full.mp4` / `craft3d_tv_s1e2.mp4` 已指向R22，R21固定版本与
`output/archive/pre_palace_r22/` 保留。全片60Hz回归与12个最终抽帧对照通过，
5个声画检查窗口偏移均为0ms，音轨与原片头未重做。

## R21 历史修订（肩甲后续获认可）

2026-10-19 当前修订：用户指出R20肩甲折纸感与盾背透明，并补充铠甲角色参考。
改为有前后包裹、内壁及厚边的曲面肩壳；盾牌封闭背面，保留挂点和接触坐标。
刻纹降为微弱表面起伏，金属大面与宽高光为主。沿用现有脸、人体、动作、宫殿、声音和故事。

[18秒肩甲与盾牌转面A/B](output/armor_shape_comparison_r21.mp4)、
[26秒反击片段](output/palace_duel_preview_r21.mp4)、
[213秒正片](output/stardust_clad_s1e2_palace_r21.mp4)、
[262.2秒带原片头版](output/stardust_clad_s1e2_palace_tv_r21.mp4)。
[修订证据、复现与范围](storyboard/palace_r21/REVIEW.md)。R21肩甲后续获用户认可；
R20特定失败已明确记录，不再沿用“待评价”概括其肩甲和盾背。
常用入口 `craft3d_full.mp4` / `craft3d_tv_s1e2.mp4` 已更新至R21；旧入口备份在
`output/archive/pre_palace_r21/`，R19/R20固定版本保留。全片12,780个60Hz采样、
154条盾牌正反射线和最终封装检查通过，5个声画窗口偏移均为0ms。

## R20 历史修订

2026-10-19 当前修订：按用户最新要求优先做圣衣金属纹理，保留程序模型、动作与脸，
暂不接 Tripo。新增刻纹金属反射、曲面甲片；四肢仅调连续轮廓；补宫门内殿遮挡、
柱间通行和实例化碰撞火星。剧情仍为213秒、22句对白，配乐不变。

历史状态：R20已导出并通过封装验证；用户随后指出肩甲薄板感与盾背缺面，见R21修订。
[12秒圣衣转面A/B](output/armor_comparison_r20.mp4)、
[26秒反击预览](output/palace_duel_preview_r20.mp4)、
[213秒正片](output/stardust_clad_s1e2_palace_r20.mp4)、
[262.2秒带原片头版](output/stardust_clad_s1e2_palace_tv_r20.mp4)。
常用入口 `craft3d_full.mp4` / `craft3d_tv_s1e2.mp4` 已更新；R19固定命名文件和
`output/archive/pre_palace_r20/` 保留，原OP未重做。
[改动、检测范围与复现](storyboard/palace_r20/REVIEW.md)。环境检查覆盖70个实际障碍，
60Hz全片12,780帧通过；原路线穿柱负例会失败。不能将此称为全身自碰撞或连续零穿模。
脚步按新路线由50次改为48次；走路窗口之外混音PCM逐样本保留。

## R19 已认可改进基线（历史记录）

当前正本：`script.story`，213秒，22句对白，28个动作段，1280×720 / 30fps。
2026-10-19 用户反馈：“效果好了非常多，可以先同步文档，skill和git”。
记录为对R19改进效果的认可；后续沿用本版的分宫叙事、双人圣衣区分和接触声光工艺。
精确成片哈希与反馈范围见 `storyboard/palace_r19/user_feedback.json`。
本轮按用户要求改为阿鏊独守焰阶宫、对战夜刈。小凿、 大釜、阿箸分守各自宫殿，
只有开头通信与字幕交代去向；正片战场只有两人，没有总坛大锅。

当前看片文件：[213秒正片](output/stardust_clad_s1e2_palace_r19.mp4)、
[262.2秒带片头版](output/stardust_clad_s1e2_palace_tv_r19.mp4)、
[26秒反击预览](output/palace_duel_preview_r19.mp4)。封装验证已完成，常用入口
`craft3d_full.mp4` / `craft3d_tv_s1e2.mp4` 已指向新版本；旧入口备份在
`output/archive/pre_palace_r19/`，旧 R18 固定文件保留。

## 本轮变化与执行入口

- 场景：焰阶宫九阶前庭、铜闸、固定导火槽及下方街区。生活目标是恢复街坊早灶，
  反击依赖试闸时铺垫的卡槽与夜刈收链棘轮。独立剧本复审24/30，六项均4分。
- 阿鏊：铜金叠甲、肩甲分层、铆钉炉门盾、太阳纹章、臂甲导火鳍、胫甲。
  夜刈：紫银斜链胸纹、非对称月肩甲、腕部棘轮。均沿用已有脸型与骨架。
- 光效：紫白光刃带、蓄力光粒、实际接触点白核、冲击环与碎屑、局部回光、
  0.1秒短停；回火从铜槽沿链到腕甲，再在胸甲爆发。左腕、裂盾、断鳍保留到结尾。
- 声音：22句原角色火山配音，6个新增 Seed-Audio 资产，50次实际脚点 Foley，
  25个剧情 SFX，保留既有两首配乐，未更换音乐生成后端。
- 默认入口 `viewer.html → viewer_palace.js → duel_performance.js`。
  可复用资产位于 dula-assets 的 `palace-clad.js`、`pose-rig.js`、
  `EmberTierPalaceScene.js`、`combat-light.js`。
- 编译、配音、混音及质检依次使用 `compile_story.py`、`direct_palace_audio.py`、
  `gen_dialogue.py`、`gen_sfx.py`、`build_foley.mjs`、`mix_serial.py`、
  `check_palace.py`、`check_audio_sync.py`、`package_palace.py`。

## 验证范围

`storyboard/palace_r19/` 保存试片、全片60Hz轨迹、顺序/跳转一致性、12个画面样本、
配音QC、模型音频观察与最终交付报告。固定槽口最大盾沿偏差4.18毫米；
出招窗口支撑脚无平移，骨长与接触光核检查通过。该检查不覆盖所有变形三角面的穿插。
10个关键声画落点通过，总线峰值0.767、对白与背景能量检查无告警。

配音QC为21条通过、1条警告、0条失败：p07原创招式名的拼音转写重合率83%，
属于需人工复听的读音观察项，不将转写当成漏字定论。148—178秒混音经过音频模型
单独观察，报告认为对白清晰、没有明显异常重复爆点；模型措辞和精确时间不作为测量。
用户后续认可改进效果，独立记录于上述反馈文件；技术证据仍不等于人耳全片审听、
完整网格无穿模或商业画质认证，p07读音观察项继续保留。

场景 JSON Schema、story catalog 与 DSL 验证通过。`Beat/Cue/Act` 是本集编译元数据，
其真实消费入口见 `config/palace_runtime_contract.json`；通用 scene_tool 的 SceneBase
回调验证不支持此模式，未添加空回调伪造通过。旧 `check_contact.py` 与
`config/contact_contract.json` 仅适用于R18，当前门禁使用 `check_palace.py`。

系列正本已同步 [各宫分守安排](../../docs/stardust_series_bible.md)。
本轮工艺教训已回写并提交 dula-skills（80b7e69）。
实现提交：dula-story `9cd1ddb`、dula-assets `d118555`。本次文档同步补充认可记录、
资产接口与最终小型证据文件；MP4按仓库既有规则保留在本地 `output/`。
长逐帧trace、派生四总线和中间试片留本地，可按执行链重建；不会把旧版数值报告
当作R19证据提交。

---

## R18 历史记录（以下不代表当前制作状态）

2026-10-19 接续制作。当前动作母版为 434 秒；正片经剧本明示的四处静拍删减后为 414.6 秒（6 分 54.6 秒），带片头为 463.8 秒（7 分 43.8 秒）。画面为 1280×720、30 fps；54 句角色配音、72 个剧本条目、19 个段落。以人形先锋夜刈取代旧兽版，按连续剧的关系变化与战斗因果展开。旧笔记仅供追溯：`storyboard/legacy_notes_r16.md`。

## 看片入口

- [带片头版：7 分 43.8 秒](output/craft3d_tv_s1e2.mp4)
- [纯正片：6 分 54.6 秒](output/craft3d_full.mp4)
- 固定版本文件：`output/stardust_clad_s1e2_tv_r18.mp4` 与 `output/stardust_clad_s1e2_r18.mp4`。
- 旧的 320 秒兽版与 369.2 秒 TV 版保存在 `output/archive/pre_r18/`。R17 和 R18 动作母版均保留，常用入口以 R18 剪辑版为准。

最终正片 12,438 帧，TV 版 13,914 帧；完整解码检查通过。15 个源/成片映射样本一致，正片 4 个、TV 版 3 个抽检音频窗口相对最终 PCM 均为 0 ms 位移。实际查看的最终抽帧、片头接缝、剪辑接缝及证据局限记在 `storyboard/serial_r18/delivery_report.json`，没有将其写成人耳全片审听或商业画质验收。

## 剧情与后续

本集完成守火战：修盾夜谈 → 链镰的两道刀路 → 三人各自失败 → 受伤后把窗口交给同伴 → 封路合击 → 处理伤口 → 第一宫求援。最后抵达焰阶宫外的雨幕，第一宫战斗留给后续，不在本集赶完十二宫。

十二名人形宫主、各自信念、招式规则与跨集代价见 [系列圣经](../../docs/stardust_series_bible.md)。E3 / E4 接续焰阶宫；左腕伤、裂盾、两个损坏盘孔和大釜胸伤持续。夜刈败退而未被感化；镰柄残月只作为物证，暂不解释。

## 当前执行链

- `script.story` 是时序正本；`tools/compile_story.py` 编译对白、段落、事件秒点、运行时 cue，以及四条 `Event:EditCut`。动作源时间与成片时间分别保存，`config/editorial_cuts.json` 是派生缓存，不是第二份手写时间表。
- 本集沿用自包含 viewer 渲染。`Event:Beat`、`Cue`、`Act`、`EditCut` 由本集编译器解释，并非通用引擎事件处理器。
- `bootstrap.js` 注册六名角色和三个共享场景。主场为殿前广场；来袭与夜谈使用柱廊；结尾使用宫门场景。
- `performance.js` 负责有限落脚和 IK；`serial_direction.js` 负责人物的剧情动作；`shot_direction.js` 负责镜头、视线和表情；`story_fx.js` 负责链镰回刃、战损、扣带、星雨与雨界；`look_direction.js` 整理材质色块。
- 人物与武器原件在 `dula-assets/characters/stardust/characters.js`，招式共享件在同目录 `moves.js`。保留接手时已做的主角去披风与甲件修型。

## 站姿问题的处理

接手时的调整没有彻底解决行走与静立基线不一致：走路结束后骨盆会下落，形成半蹲。现在按每个角色实际腿长计算自然站高，走路和静立使用相同的高度基线，转身和移动分时，后退不再把脚轴直接扭向移动方向。

`storyboard/stance_review/` 保留同机位基线与修订图。当前 44 次起停边界的最大骨盆跳变为 3.2 mm，正常静立膝角约 170°。受伤承压、坐姿与落地卸力仍有明确屈膝，不能把这些表演统一拉直。

## 战斗与表演

- 夜刈是成年男子，使用主镰与柄尾短链回刃，脚步、受击与配音均按人重新制作。
- 回刃绕盾伤腕，两道划痕留在原地；链节沿曲线紧密排列，按绝对时间更新，避免跳转残影。
- 小凿的阵盘与掉落件使用同一造型；拾盘省略手接地镜头，切回时盘已收回。两个暗孔在后续蓄力仍保留。
- 星雨封右侧，大釜封左侧；俯视战术镜头交代三人的位置。大釜听到“收半步”先刹住，再蓄力、起跳、命中与卸力。
- 伤腕不能因喊招恢复；阿鏊以右手支持左前臂。余波中大釜拉紧可见扣带。
- 第一宫门内有雨、门外干燥，三人停在边界前；阿箸只有前方的声音，本集不提前展示宫主。

## 声音

对白使用已有角色声线与火山 seed-TTS 原生语境演绎。54 句 WAV、源文件与演绎参数在 `assets3d/dialogue/n*.{wav,mp3,source.json}`。54 句均已做识别与时长检查；识别中的四处提示另外核对，最终所有句子均落在实际发声窗口内。

新增链响、靴步、镰风、刃盾接触、甲片受击、扣带、门内雨声与夜风走火山 Seed-Audio。最初的脚步带吱响、风底含雷感，已分别重生成与从原始风声做滤波、电平整理；编辑来源保留。混音不引用旧兽吼、兽冲刺和爪抓声。

保留已接受的 `bgm_nightwatch` 与 `bgm_nightbattle`，按剧情剪成五段，并保留观察与选择时的音乐留白。本轮未另换配乐生成后端。后续新配乐仍走 `episode-scoring` 与 `suno-driver`。

声音正本计划为 `config/audio_direction.json`。`tools/build_foley.mjs` 从实际落脚状态派生 427 个脚步；总混音包含 443 个事件。`tools/mix_serial.py` 输出对白、音乐、环境、音效四条总线及 `assets3d/mixed.wav`。峰值约 -2.2 dBFS，关键打击声对齐接触 cue，发声与口型共用实际 WAV 时间。

## 验收证据与限度

- 剧本验证：72 条、0 错误；小凿连续三句是有意的战术指挥。
- 独立批评：剧本与分镜六项各 4/5；这不代表成片画面、配音或商业动画质量已获认可。
- 最新全片数值检查：`storyboard/serial_r18/locked_physics/`，60 Hz、26,040 帧；接触、步态、可达与 42 项甲件窗口检查通过，77 个顺序/跳转数值样本一致。
- 站姿专项：`storyboard/stance_review/stance_report.json`。
- 最终混音：`assets3d/audio_sync_report.json`，434 秒、四总线求和一致、无削波、关键命中音存在、对白电平余量通过。
- 原始声音识别与模型辅助听觉记录：`storyboard/voice_qc_r17.md` 和 `storyboard/serial_r17/*listening.json`。这些是音频模型观察，不是人耳全片审听，也不能单独证明画面同步。
- 听觉模型复核了关键声音、12 条重要对白和合招混音段；静帧与片段检查记录在同目录。R17 母版抽帧已检查；R18 最终视频检查、源/成片 cue 映射、文件哈希与版本路径写入 `storyboard/serial_r18/delivery_report.json`。

当前仍是程序化三渲二制作，人物网格和脸部结构有既有工艺限制。数值接触使用声明的锚点与窗口，不是全身精确网格无穿模证明；最终戏感与美术观感交由成片评审。

## 开场剪辑复审

实际抽帧发现四处重复静止。R18 在剧本中明示删去源时间 41.2–48、61.2–65、72–76、87.2–92 秒，共 19.4 秒；保留关键转头、迟疑和承诺回应。所有对白完整保留，54 句配音与关键 cue 都不落入删减区。音画采用同一保留区间，音乐/环境切口仅做 5 ms 边缘淡化，不变速、不改打斗。`tools/package_release.py` 校验帧数、保护发声窗口、生成成片 cue/对白时间表，并从源 WAV 重建剪辑音轨。

音频模型对开场的停顿秒数和“没有音乐”判断与实测不符，该原始回复已标明不可靠，不能作为节奏通过证据。最终删减依据是实测语音窗口与画面内容。

## 本集复现命令

在本集目录执行，Python 使用 `dula-story/.venv/Scripts/python.exe`：

```powershell
python tools/compile_story.py
python tools/direct_audio.py
node --import ./tools/register_loader.mjs tools/build_foley.mjs
python tools/mix_serial.py
python tools/check_audio_sync.py
node render.mjs --physics-only --fps 60 --board storyboard/serial_r18/locked_physics
python tools/check_contact.py storyboard/serial_r18/locked_physics/trace.json
node render.mjs --check --board storyboard/serial_r18/pixel_seek
node render.mjs --out stardust_clad_s1e2_master_r18.mp4 --board storyboard/serial_r18/final_render --trace storyboard/serial_r18/final_render/trace.json
python tools/package_release.py
```

重新生成收费素材前按对应声音 skill 检查预算与缓存；上面的混音命令只读取已有素材。更改对白内容、角色动作或 cue 后，重新派生混音与对应检查，不能拿旧 trace 当新版本证据。

## 已沉淀到 skill

连载战斗的因果、人的信念、招式规则、对白/表情/行动联动、声音留白与跨集代价进入 `story-writer/references/serial-battle-direction.md`，并由编剧、表演导演和系列架构入口引用（提交 `e5d4e29`）。站高与起停、Windows 中文 UTF-8、最终总线验收教训分别进入对应 skill（提交 `5514265`）。

R18 开场时长实测、静拍收剪和源/成片时间纪律另已写回连载导演工艺（`2ea962d`）；音频模型错误秒数的处理已写回声音导演契约（`ef9b0b6`）。
