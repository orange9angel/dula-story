# 《迟到的一拍》（late_beat_musical）制作笔记

社区剧院汇演夜音乐剧：调音师少年阿拍被推上台顶替缺席主演，第一句唱砸僵住，
灯光师少女小灯用追光明暗呼吸带他找回拍子，二重唱收尾谢幕。
**观众席第一排 POV**（相机永不越台唇平面 z=0，坐姿眼高 1.2m，仰角 5-12°），
总时长 170s，viewer 端口 4216（serve 模式）。工艺基线：stage-musical skill。

## P1（脚手架 + 舞台场景 + 剧本汇本 + 静默版 + Suno 探针）

- 脚手架：`init_viewer_episode.py` 从 S1E3 参照复制 viewer 链骨架（render.mjs 的
  sourceSha256 清单改为本集场景文件——复制后必改，ENOENT 翻车实录）。
- 场景 `scenes/TheaterStageScene.js`：木地板台面（板条顺台口+错缝）/台唇/台裙、
  台口框+檐幕、红丝绒主幕两片对开（正弦几何褶皱+顶点色深浅，curtainK 纯时间函数
  8-11s 开 / 166-169s 落）、双侧翼幕（斜排出上下场门）、脚灯排亮壳+朝上弱光、
  追光×2（SpotLight+假光斑地贴+additive 锥片；主备；迟疑/呼吸由谱面数值驱动）、
  右翼幕后灯控台轮廓（小灯的位置：台面指示灯+手灯）、观众席前两排近黑剪影
  （头+肩，防风单球悬浮读成气球）。
- 汇本：`config/timeline.json`（13 段，含唱砸/呼吸/找回子段与四句占位对白的
  字幕轨）；`config/lyrics_song1.txt`《拍子》10 句（首句弱起可唱破设计——
  「灯一亮，我嗓子先慌」从弱拍起，唱破点=30.8s）；`config/lyrics_song2.txt`
  《同台》8 句（【小灯】【阿拍】【合】轮换/合唱标记）。原创中文、口语、宽松押韵。
- 静默版：`performance.js` 占位积木小人（怯场细颤/唱砸 freeze 掐颤/解冻从指尖到
  肩膀/上步台唇/二重唱走位/鞠躬晚 0.2s 跟随），追光迟疑（30.5-34.5 目标漂移+暗抖）
  与呼吸（36-50s 2.4s 周期）全部纯函数。相机四机位全是观众席内（house/center/
  lip/side_glance）。
- 静默版翻车实录：①姿势对象不带身高字段（p.h undefined→torsoPivot NaN→只剩
  两条腿）——applyPose 用 fig.h；②暗场里演员与幕布/后墙糊成一团——加台口轮廓光
  （幕后天桥方向暖边光）是暗场必须层；③相位复位即瞬移：talk_2/bow 段没继承上一段
  走位（谱面每段基值是默认值不是"上一段终点"），阿拍从台唇瞬移回台中、小灯谢幕瞬移
  回灯控位——每段显式写站位；④翼幕是交错排列挡观众视线的——"侧台隐约可见"必须站
  翼幕口内侧（x 3.7），站在门缝正中反而被前片翼幕挡死（视线与翼片求交算出来的）；
  ⑤正面 POV 鞠躬读不出来：前倾 35° 在正前低机位几乎不可见，谢幕鞠躬要 0.9rad+
  头朝地板+手臂前垂才成立；⑥结尾字卡全不透明会盖住幕落——字卡 alpha 延后到
  168.3s 淡入，幕落 166-168.5 先读完。
- 验收：`storyboard/p1_silent/check5/`（53 帧 + seek 53/53 passed）+
  `fix4/`（侧台举灯/上台走位/鞠躬/幕落/字卡逐节拍近景）。
- Suno 探针（tmp/suno_probe/，只读 --probe）：**登录态有效**（My Workspace 里有
  历史产出，无登录墙）。选择器对照：Create 按钮 `has-text("Create")` ✓、Advanced
  开关 ✓、歌词框 placeholder "Start writing lyrics..." ✓ 活着；**Styles 框文案
  变了**（placeholder 变成风格标签示例 "moog synthesizer, ..."，脚本
  `placeholder*="style"` 系失效，但 `xpath=(//textarea)[2]` 兜底仍命中 Styles 框，
  建议 P3 前把该校准进选择器表）；Instrumental 开关仍未找到（沿用 SKILL.md 已知
  失效——器乐需求写进 style 文本）；下载链本轮未触发（P3 抽卡时才走，
  2026-09-27 的 expect_download 修复后的 v6 UI 未验证——P3 第一首要盯下载）。
  账号侧栏显示 "Upgrade to Premier"（有历史生成记录，档位目测 Pro 档，配额 P3 自查）。

## P2（真角色建造 + 谱面升级 + 探针铺全）

- **角色**（`characters/theater.js`，集内建造、验收后另行晋升；结构契约同 bioarmor：
  setPose/setEmotion/mouth.apply/lookAtWorld，工艺模式参考不照抄参数）：
  - 阿拍（1.72m 瘦高）：工装背带裤（兜片+双肩背带=服装一体件）、右耳耳返+短线、
    软塌短发（发帽收高露额——符号承载区）、大眼怯场相。情绪通道 fear/focus/smile。
  - 小灯（1.62m）：oversized 白衬衫（下摆 3 片襟摆铰链 group，枢轴在腰、几何下摆
    −y、`userData.hinge='hem'`+probeExclude）、袖口挽边、腰间手电（挂点+手持状态机）、
    马尾三节链（viewer 驱动次级摆动）。锐利眼。
  - 脸=自绘 canvas 动画头（paintFace 参数化五官比例+符号叠加层：汗滴/大汗滴/黑线罩脸，
    符号进 draw() 缓存 key）。四肢 LimbSurface + ArticulatedHand + twoBone IK。
  - 建造翻车实录：①脸 canvas 512 配 setTransform(×2)=五官全压下半张（画布 1024 起步）；
    ②符号被发帽盖住（发帽 thetaLength 收 .52→.46 露额）；③前额碎发小盒片在脸贴片
    前读成肤色片（取消，发际线归发帽下沿）；④mesh.position.y=台面高别忘
    （setPose 不动 y，角色沉进舞台 0.6m——sole penetrates 探针抓）。
- **谱面**：P1 走位/幕布/追光节拍保留；演唱姿态升级（攥卡胸前→唱砸垂臂冻结→
  解冻抬手→副歌张臂肘极随 open 渐变）；阿拍 70-74.5 上步台唇与小灯 115-121 上台都走
  walkingFeet 足踝滚动；鞠躬=lean+沉髋+低头+臂前垂（正面 POV 读法）。
- **探针铺全**（contact_contract.json）：env（翼幕/台口柱）/gait（小灯上台；
  阿拍迟疑上步=表演步不进 cadence 域）/limb_body_mesh（嵌入+elbEx+翼角）/reach/
  cloth_body（襟片换号穿透）/worn_prop（腰间悬挂件）/supporter（歌词卡+手电
  道具状态机：8-31s 持卡、30-31s 收袋 transit、102.8s 取灯）+ POV 本地探针
  `tools/check_pov.py`（相机永不越台唇/眼高/仰角带）。
- **探针级翻车实录（全部进门禁纪律）**：①contact_probe.py 演员名硬编码 lei/hong
  （换卡司即死）——已修 skill 脚本为最长前缀匹配（S1E3 零退化验证）；②卡通短臂比例：
  站姿腕部最低≈肩高−臂长（apai 1.44−.355），手目标低于髋位必 clamp 超伸——坐姿数值
  不可照搬站姿；③站姿垂臂/持物前臂与竖直夹角 35° 是豁免边界，别贴着写；
  ④服装一体件（兜片/背带/耳返）不走三角相交探针（贴合≠穿透，探头必假阳性），
  自由悬挂件（腰带/手电挂点）才走 worn_prop；⑤render.mjs --shots 无 camera 字段的镜
  会继承上一镜自由相机——本集 render.mjs 已修（回时间轴机位），S1E3 同款未修；
  ⑥站立帧要重置足踝旋转（走动段残留跖屈=seek 不一致，S1E3 同款纪律）。
- **验收**：`storyboard/p2/checkF/`（contact 全绿+POV 绿+locomotion passed+seek 54/54）；
  形象帧 `storyboard/p2/look3/`（L2 阿拍正面脸/双手持卡、L5 小灯侧）、唱砸符号
  `storyboard/p2/sym4/sym_break_close.jpg`（黑线罩眉上+双侧汗滴+大汗滴 billboard）；
  审片组 `storyboard/p2/review/`（10 组）；全片拼图 `storyboard/p2/tile_all.jpg`
  （54 帧零阻塞）。成片不重出（P3 音频后一起出）。
- **遗留 P3**：音频链（提示音/对白 TTS/两首歌）；Suno 抽卡前校准 Styles 选择器
  （P1 探针结论）；歌户口型走 song-lipsync；唱砸破音的表演音效设计（破音瞬间的
  处理：音高抖动+立刻收）；追光呼吸与副歌音频节拍的相位对齐；episode_gate 接音频步。

## P2 返修（形象不达线打回 → 曲面头/发际线/分层眼）

主代理目检 look3 打回，逐条修复：
1. **头型**：圆角方柱头 → 曲面雕刻头（`characters/theater.js` 的 `headSurface()`：断面表
   [y,半宽,前深,后深] 插值曲面、下颌收窄/脸颊微凸/颅顶圆、UV 前后面缝——精简自
   bioarmor character_look.js surface() 模式，去鼻部高斯/四点平滑，两人各自断面表）。
2. **发型**：发帽=发际线方位角函数 boundary(az) 的整片头皮曲面 + 刘海片
   （fringePanel：发根进帽内、片体贴颅）+ 后颈发片（napeLock）——前额横带消失；
   小灯发际线压低到眉上（初版大额头=发际线后移翻车）+马尾三节链保留。
3. **眼睛**：canvas 内复刻分层动漫眼层序（眼白→缘圈→虹膜渐变→光池→瞳孔→双高光
   →上眼线），阿拍大眼怯相/小灯窄眼锐相由 eyeH/irisR 参数分叉。
4. **背带裤**：兜片深一档 #39435c + 背带浅一档 #5a6a86 加粗过肩（正面两条带可见）。
5. **形象帧纪律**：look 帧必须完整出头——按角色实际世界高度算构图（台面 0.6+头组
   高+颅顶），`storyboard/p2/look4/`（每人正面全身/脸特写/侧面/演唱 4 张）。
   翻车实录：render.mjs --shots 无 camera 字段会继承上一镜自由相机（本集已修：
   缺省回时间轴机位；S1E3 同款未修）；脸画布 512×setTransform×2=五官压下半张
   （1024 起步）；符号被发帽盖住（发帽收高露额=符号承载区）。
6. **小灯下摆**：平面顶点改形做弧形底边（两端上提+中段微鼓），不再是方盒切边。

验收：`storyboard/p2/checkF2/`（contact 全绿 + POV 绿 + locomotion passed +
seek 54/54）；形象帧 `storyboard/p2/look4/`（8 张）；拼图扫片
`storyboard/p2/tile_all2.jpg`（54 帧零阻塞）。探针零退化（头型换了但颈/肩衔接
不穿模——elbEx/嵌入/穿戴件读数与 checkF 一致）。

## P2 返修 R2（小灯形象三修，主代理只看小灯）

- **刘海条形码**：窄片+边缘深色条纹读成条形码 → fringePanel 片体加宽+az 交错重叠
  （4 片、width .19-.22、两色弱对比 .93）、根部进帽内、发梢才分叉；阿拍刘海同工艺同步。
- **睁眼脸特写补拍**：D2 闭眼笑验不了分层眼 → 新增 D5_face_open（t=105 talk_2a 举灯，
  focus 睁眼：缘圈/虹膜渐变/光池/瞳孔/双高光/上眼线全可读）。
- **废片重拍纪律**：D1（头顶出画）/D2/D3（人躲翼幕后只见衣角）重拍——她走到无遮挡位
  （SR 位或自由相机对准全身），每张拍完 ReadMediaFile 自检"头脚完整、无遮挡"再入库。
  构图翻车实录：侧写近机位 fov 竖直覆盖 ±0.5m 必裁头——按实际身高算覆盖域再拍。
- 入库：`storyboard/p2/look4/`（D1/D3/D4 替换 + D5_face_open 新增；A 组不变）。
  探针回归：checkF3（100-135 段窗）contact 全绿（worn/cloth/env 零命中零退化）。
