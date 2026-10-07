# 《小雪游 T2》— 福州长乐机场 T2 航站楼游记（craft3d 工艺独立集）

小雪（元气 vlog 导游）带年糕（毒舌胖猫）逛长乐机场 T2。竖屏 720×1280，目标 85~95s。
工艺链路与 `yuki_laundry_musical` 同构（自包含 viewer 链，不走 dula-render）；
只读引用 `../yuki_morning_battle/craft_trial`（小雪 craft 模型，/craft/ 路由）与
`../yuki_fish_musical/craft3d`（mochi3d/mouth3d/performance3d，/fish/ 路由）。
**未修改** craft_trial / yuki_fish_musical / yuki_laundry_musical / dula-assets / dula-engine。

## 入口命令（都在 dula-story 下跑）

```bash
node episodes/yuki_airport_t2/render.mjs --check   # 60 检查帧 → storyboard/shot_NN.jpg + craft3d_trace.json + seek 校验
node episodes/yuki_airport_t2/render.mjs           # 全片 → output/craft3d_full.mp4
node episodes/yuki_airport_t2/render.mjs --serve   # 交互 viewer，端口 4213
node episodes/yuki_airport_t2/render.mjs --range 0,20 --out acting_preview.mp4
.venv/Scripts/python.exe episodes/yuki_airport_t2/tools/make_story.py      # Phase 1：估算时间轴重建 script.story
.venv/Scripts/python.exe episodes/yuki_airport_t2/tools/synth_lines.py     # Phase 2：TTS 逐句合成 → assets3d/dialogue/
.venv/Scripts/python.exe episodes/yuki_airport_t2/tools/build_audio.py     # Phase 2：对齐+排时+视素+混音（回写 script.story）
```

## Phase 1 状态（2026-10-07）：视觉骨架完成，无声

- `scenes/ChangleAirportScene.js`：马鞍墙波浪条板吊顶（白+木相间、随剖面倾斜）、
  涟漪天窗、5 面树叶状吊顶航班信息屏（CanvasTexture）、玻璃幕墙+停机坪+飞机剪影+海+天、
  零高差值机示范岛（行李带贴地）、3 台青橄榄自助值机、候机椅排（扶手顶面 USB 小方块+蓝点）、
  洗手间门口（厕位余量智能显示屏 + 独立掌纹感应桩 + 里面一只智能马桶）、纪念品商店、登机口吊牌。
- `performance.js`：小雪 establish(拖箱入场)/guide_wave/point_up(×2)/sea_point/sea_listen/
  checkin_push(推箱上带)/checkin_idle/seat_usb/seat_talk/explain(走向洗手间)/press_watch/
  finale_proud(走回+双手张开)/speechless/outro(绕开值机岛走向海景)；
  年糕 trot_follow/beg/talk/logic/follow_checkin/talk_checkin/walk_seat/cat_phone(瘫坐举手机)/
  walk_restroom/paw_press(按爪印)/walk_back/peek/smug/outro。
- `viewer.js`：camFor 机位表 establish/wide/yuki/cat/sea/ceiling/roof/checkin/seat/restroom/pad/pullback；
  行李箱三态 pull/park/push + L9 后留在行李带上（条目序号 ≥10 锁定，防瞬移）；
  猫爪手机仅 cat_phone 可见；掌纹桩按下时绿爪脉冲。
- 静态验证：scene_tool 0 错误（CAM002 无相机障碍警告=有意，自定义固定机位逐镜验收，同 laundry 口径）；
  story_tool 0 错误（PA 画外音需 --allow-character PA；17 条 dialogue-timing 警告是 Phase 1 估算时长的固有现象，Phase 2 实测重排后消除）。
- `--check`：60 帧全出、顺序渲染 vs 反向 seek 逐字节一致。已目检约 25 帧，修掉的 P0/P1：
  cat 机位埋进候机椅（换到椅排前方）、checkin 机位小雪出画（改 staging yaw -1.9 + 机位移右前）、
  座椅机位双角色不可兼得（yuki 走到椅排前 + 机位退到 z=7.6 中轴）、掌纹桩反复被猫身遮挡
  （从洗手间墙面移到门口独立桩，pad 机位侧拍）、树叶屏贴图朝天（法线翻转向下）、
  行李箱推完后瞬移回原地（按条目锁 belt 姿态）、outro 走位穿值机柜台角（改道 +x）、
  finale_proud 正 bob 腿超程（双脚随体离地=小跳）、长距离 walk 脚部 IK 超程
  （laundry 的世界锚定步法只适用短位移，改 craft3d 原地踏步+平移）。
- `output/acting_preview.mp4`：0-20s 无声预演（establish 入场 + L1-L2）。
- 估算总时长 116.8s 超出目标——Phase 2 用实测 TTS 重排时会压缩 gap/尾垫到 95s 以内
  （旋钮在 tools/make_story.py 的 GAP/OUTRO_TAIL 与 build_audio 的尾垫）。

## Phase 2 状态（2026-10-07）：成片完成 `output/craft3d_full.mp4`（111.7s，含事实修正 R1）

- TTS：19 句全部由 `volc-voice-casting/scripts/seedtts_say.py` 合成（小雪 vv_uranus_bigtts
  happy/calm、年糕 ICL_uranus_youmodaye_tob（seed-tts-2.0 resource 直出）、PA 小雪音色 calm），
  `qc_lines.py` 拼音级验收 **19/19 全绿**（报告 `assets3d/dialogue/qc_report.md`）。
  首轮 3 条 ❌ 全部是"超 Phase 1 估算窗"，内容/峰值均合格；窗口改为实测+0.5s 后全绿。
- 时长事实：19 句锁定台词的原始语音合计 **107.6s**，已超 95s 目标上限。处理：小雪 1.12x、
  年糕 1.05x ffmpeg atempo（保慵懒不压猫）、PA 原速；gap .06 / 尾垫 .08 / establish 1.8 /
  outro 尾 1.2 → 成片 105.1s。**仍超目标 ~10s**：要进 95s 只能删台词（内容决策，留给监制）。
- `tools/build_audio.py`：faster-whisper small DTW 逐字对齐（atempo 后音频）→ 实测重排
  回写 `script.story`（原版在 `tmp/script_pre_audio.story`）→ `config/timeline.json`
  （segments+逐字+字幕）、`viseme_yuki.json`（V17，1086 keys）、`viseme_mochi.json`
  （jaw-only，2322 keys）、`final_voice_features.json`（10ms amplitude/gate）→
  `assets3d/mixed.wav`（台词零点=对齐零点防口型偏移；PA 低通 2600+高通 300+aecho 广播感；
  程序化棕噪大厅底噪；峰值 -5.15 dBFS，报告 `storyboard/audio_check.json`）。
- 最终 `--check`：60 帧 + seek 一致；成片 ffprobe：h264 720×1280@30 + aac，105.100s，
  14.6MB。成片抽帧 12 张复查（tmp/final_*.jpg）：口型开合落在台词内、表情（smug/worry/
  shock/happy）按条目生效、行李箱 L9 后留在行李带上、PA 字幕 📢 画外音。
- 加分项：volc-song-gen 经 veFaaS 中转一次成功，`assets3d/t2_song.wav`（29.56s，四句
  赞歌歌词 `config/t2_song_lyrics.txt`）。**未混入正片**——正片已超时长目标，插曲若用
  建议做单独彩蛋版；保留为资产。
- 本阶段翻车/经验：
  - align_text 对拉丁字符（T2/USB/WiFi7）会保留成 char，pypinyin zip 长度不齐 →
    视素轨道只喂 CJK 字（build_audio.py 里过滤）。
  - 混音放置零点必须与逐字对齐零点一致（差 50ms 都会口型偏）。
  - qc_lines 的 manifest 若 expect_text=null + kind=dialogue 会全 ❌，别这么调。

## R1（2026-10-07）：设计方事实修正（监制指出）

- L3 由「T2 是北京建院设计的，主题叫千秋福韵丝路帆远」改为完整事实链：
  马鞍墙/古厝 + 2020 国际竞赛第一名=设计新加坡樟宜机场的 CPG × 中国建筑设计研究院联合体
  + 落地深化由北京建院完成（删主题名换字数）。改动点只有 `tools/lines.json` 的
  `03_yuki_roof` 一条；年糕 L4 不动。
- 重走链：删 03 的 mp3 与 tmp/proc 缓存 → synth_lines 重合成（同声线 happy scale 2，
  实测 18.29s，拼音 99% ✅）→ QC 19/19 全绿（注意 qc_manifest2 的窗口要按当前实测
  重建，旧窗口会把新长句误判 ❌）→ build_audio 重排（GAP .05 / 尾垫 .06 压总长，
  111.69s ≤ 监制上限 ~112s）→ `--check` 60 帧 + seek 一致 → 全片 111.700s。
- 新坑：viewer 字幕原来只按标点断片再拼 17 字行，含拉丁长片段（…CPG 和中国…联合体）
  单片超 17 字直接溢出画框——已加硬切（>17 字片段先切再拼）。目检 shot_10/11/13/17
  与成片抽帧 tmp/fix_*.jpg：L3 窗口口型开合正常、表情 happy、字幕全在框内、L2/L4/L5
  无回归。
- 当前恢复入口同下（lines.json 已是新台词；旧 105s 版时间轴备份在 tmp/script_pre_audio.story，
  但注意那是 R1 前的剧本）。

## R2（2026-10-07）：屋顶按实景改造（监制看实景照片后提出）

- 参考图（`tmp/ref/`，福州新闻网/福州晚报/中国日报网福建频道新闻图，仅供造型参考）：
  `t2_hall_ceiling.jpg`（出发大厅吊顶主参考）、`t2_exterior2.jpg`（联检区吊顶全景）、
  `t2_hall2.jpg`（问讯岛+木色圆柱+幕墙）、`t2_exterior1.jpg`（候机区伞形柱中庭）。
- `scenes/ChangleAirportScene.js`：吊顶从"平面直条板"推倒重做——参数化波浪曲面
  `roofY(x,z)=6.0+1.0·cos(xπ/8)+0.55·sin((z+2)π/6)`（横向马鞍弧 + 纵向滚浪，
  104×96 网格 + computeVertexNormals + DoubleSide），贴 CanvasTexture 条板
  （74 条暖木色板 + 板缝 2px 白色发光带）；白色膜结构喇叭口天窗阵列
  （LatheGeometry 倒漏斗，口部发光圆盘，中列 3 + 侧列 2×4=11 个）；
  前排木色包柱大圆柱、后排 Y 形树状分叉柱；整体照明调暖（3500K 氛围）。
  树叶航班屏保留，吊杆长度改挂浪面（roofY(x,z)）。
- 目检结论（60 帧全过 + 逐张看 establish/roof/ceiling/sea/wide/outro）：
  马鞍弧与发光板缝清晰、喇叭口阵列成立且不压角色、字幕无洗白；修掉的穿帮：
  中列喇叭口与树叶屏同轴互穿（z 错开 -2→-2.8）、前景 (0,6) 喇叭口切镜碍读（删）、
  outro 双人走位穿青橄榄自助机（终点左移到 -.6，猫改走小雪左侧）。
  finale 开场 1.4s 小雪从洗手间位走回主舞台（画面右缘入画）是既有走位，非本次回归。
- 音频/时间轴未动（111.700s 不变）；全片重渲 `output/craft3d_full.mp4`（14.6MB）。
- 新坑：竖屏里纯几何条板堆浪不如"曲面+条纹纹理"立体；喇叭口 LatheGeometry 的
  剖面末尾半径决定口部大小，口部发光片要略小于膜口沿（1.42 vs 1.55）防露边。

## R3（2026-10-07）：BGM 铺底（监制要求）

- 来源路线：① 火山 Seed-Audio 1.0 一次成功（`volc-voice-casting/scripts/seedaudio_gen.py`，
  凭证 `.env.speech`，计费 112.0s）→ `assets3d/bgm_src.wav`（112.0s 器乐，尤克里里+钢琴+
  轻打击乐旅行 vlog 风）。无需 Pixabay/程序化兜底。
  无歌声验证：faster-whisper small 对 5s/55s/100s 三段转写，只得纯音乐上著名的
  「字幕by索兰娅」幻觉串 = 无歌词语音内容（注意：这个串是纯器乐上的假阳性，不是有人声）。
- 混音（build_audio.py 内，放置零点与对齐零点不变的纪律沿用）：
  BGM 基准 RMS = 人声 RMS −12dB；对白段按 final_voice_features 的 gate 包络 duck 再 −7dB
  （150ms 平滑）→ 台词下约 −19dB；PA 彩蛋段整体 ×0.7 稍收；开场 1.0s 淡入、结尾 1.0s 淡出。
  全长 111.694s（源 112s 裁尾）。实测：台词段混音 RMS ≈ −18dBFS、PA 段 −23.2、
  纯 BGM 段（开场）−40.2（含淡入）、成片峰值 −4.96 dBFS（不过载）。
- 翻车：place() 加侧 bus 参数时第一版把人声只写进侧 bus 没进 mix（peak 掉到 −19dB 才
  暴露）——旁路 bus 必须是"额外再写一份"，主 mix 永远要写入。
- 重渲染 `output/craft3d_full.mp4`：111.700s，h264 720×1280@30 + aac 48k 立体声，14.7MB；
  抽帧 t=5/55/100 正常；成片音轨抽测 0.5-8.5s 与 mixed.wav 一致。
- 恢复：删 `assets3d/bgm_src.wav` 后重跑 build_audio 会回到无 BGM 版；重生成 BGM 用
  NOTES 顶部命令区的 seedaudio_gen 调用（prompt 见本仓库 git 历史或上文风格描述）。

## R4（2026-10-07）：白色马鞍脊梁 + GTC 台词与建筑（监制实拍指正）

- 参考：`tmp/ref/t2_concourse_saddle.jpg`（监制实拍，候机指廊 208-212 段）。指正：马鞍墙
  是屋顶正中连续的白色几字形拱脊梁（不是泛指条板波浪），顶部长条采光天窗，两侧才是
  木色条板；地面灰底橙红叶片轮廓地毯。
- 场景（ChangleAirportScene.js）：
  - `saddleP(x)=1.9·exp(-(x/1.05)²)+0.6·exp(-((|x|-2.6)/.5)²)`（中央尖拱+双肩+垂边），
    6 个单元沿 z（zc=-12.4,-8.8,-5.2,-1.6,2.0,5.6，节距 3.6、节长 2.6），单元内
    端部微垂（Q=0.85+0.15cos），壳色 #ece7dc（NoToneMapping 下纯白会糊成云，压灰一号）；
    顶部采光带是跟随 `saddleTopY(z)` 起伏的连续发光 ribbon（宽 .56）。
  - 喇叭口中列 3 个拆除（与脊梁同轴冲突），只留两侧 8 个（出发大厅区 vs 指廊区，
    实景里本就不同区域）；中央树叶屏吊杆改挂脊梁下（saddleTopY-.10）。
  - 地毯 CanvasTexture：灰底 #aaa69f + 橙红/米白叶片轮廓（透明度 ≤.45，repeat 4×4——
    第一版 .85 透明度 3×3 太抢戏）。
- GTC（窗外左侧，陆侧口径折衷到海景窗）：体量 + 波浪金属屋面雏形（与 T2 呼应）+
  绿防护网（#2f8d4e 半透明）+ 脚手架 + 双塔吊（近侧塔吊高 12.5 探进天窗带）。
  飞机剪影右移 (5.5,-21) 并转向——白色机身侧对窗时尾翼曾读成悬浮绿色十字。
- 新台词（插在 L8 海景后，gtc 机位 pos[1.2,1.45,3.0] look[-3.6,1.7,-13] fov50）：
  09_mochi_gtc「窗户外面那个大工地，是什么？」/ 10_yuki_gtc「那是 GTC 综合交通中心！…」/
  11_mochi_cold「哦。小鱼干的冷链直通车。」猫 gtc_watch（背身回头 3/4，头转 .55≤±60°
  可达域）→ gtc_back（转回冷面）；小雪 gtc_tell 指向窗外。
- 音频链：22 句 QC 全绿；新总时长 **124.23s**（≤125 上限；GAP .04/尾垫 .05/establish 1.5/
  outro 尾 1.0 压出来的）；BGM 112s 源接环 1.5s 交叉淡化覆盖全长。
- **新坑（重要）**：mochi jaw-only 轨道按 lines.json 顺序生成、不二分排序——新台词
  追加在文件尾部（时间却在中段）导致轨道乱序、二分查找全失效（trace 里 mjaw 恒 0 暴露）。
  修复：生成前按 seg.start 排序；句尾零点 emit 不得超过下一句起点（GAP=.04 < 尾部
  +.1 曾造成最后一个乱序对）。教训：time-keyed 轨道生成后断言单调递增。
- 行李箱 belt 持久判断从硬编码条目序号改为按 move 查 checkin_push 位置（插入条目不再错位）。
- 成片 `output/craft3d_full.mp4`：124.233s，h264+aac，16.6MB；69 检查帧 + seek 一致；
  抽帧 tmp/r4_*.jpg：新台词口型正常、GTC 可读（防护网+塔吊+体量）。

## R5（2026-10-07）：树叶屏改宣传片内容（监制指正：实景放宣传片不是航班表）

- 贴图：`flightBoardTexture`（FU 航班表）删除，改 `promoTexture(variant)` 三变体——
  蓝绿/暖橙渐变底 + 白色茉莉花（五瓣+花心）+ 白色海浪波纹，变体 0 带
  「有福之州 / 幸福之城 · 滨海福州」标题；5 片叶子按 li%3 轮换。从下方可见的是
  屏幕下半（波纹区），花在画面上半——镜头里读作"在播宣传片"成立。
- 台词（lines.json，其余不动）：05_yuki_leaves →「…在循环放福州的宣传片——茉莉花都开到
  天上去啦！」；06_mochi_gate →「等它开始播小鱼干广告，朕再抬头。」
- 音频链：两句重合成（声线同前）→ QC 22/22 全绿 → build_audio 重排
  （新时长 **123.63s**；L5 7.20s/L6 4.23s atempo 后）。字幕无溢出（R1 的硬切已覆盖）。
- 成片 `output/craft3d_full.mp4`：123.633s，16.3MB；69 检查帧 + seek 一致；
  目检 establish/roof/ceiling/cat 镜：树叶屏全部读作宣传片画面，口型/字幕正常。

## 恢复入口

全部重建（在 dula-story 下）：

```bash
.venv/Scripts/python.exe episodes/yuki_airport_t2/tools/synth_lines.py   # mp3 已存在则跳过
.venv/Scripts/python.exe episodes/yuki_airport_t2/tools/build_audio.py   # 重排+对齐+混音
node episodes/yuki_airport_t2/render.mjs --check && node episodes/yuki_airport_t2/render.mjs
```
