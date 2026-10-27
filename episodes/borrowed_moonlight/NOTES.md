# 《借走月光的女孩》borrowed_moonlight — 制作笔记

## 立项

- 用户定稿来源：`D:\Download\借走月光的女孩_动画制作圣经_完整版.docx`（提取件存 `bible_source.txt`）。
  五幕 / 60 镜头分镜表 / 约 450s / 人物与场景设定全部锁定。**台词逐字不可改**。
- 用户裁示：按圣经执行；工艺走本仓既定路线（hybrid-craft-scene 文生图混合 3D + 童话美感粒子 +
  S1E2 级艺术化去 3D 感）。
- script.story：64 条 / 478s（含首末黑场缓冲），逐镜头对应圣经附录 C 的 60 镜（少数镜头按
  "台词较长允许拆反应镜头"拆分）。台词逐字引自圣经正文。
- 圣经为监制定稿，剧情不再走对抗式批评改写；结构合规性（时间轴、逐字一致）由编译工具校验。

## 人物（设定锁定，见圣经附录 A）

| ID | 名 | 造型锁定 | 表演锁定 | 特效绑定 |
|---|---|---|---|---|
| Eileen | 艾琳（11岁） | 银白短发齐下颌左侧碎发、灰蓝大眼、深蓝天鹅绒斗篷、米白亚麻裙、棕色短靴、旧铜灯（灯罩一道细裂纹） | 说话轻而坚定；害怕时先握紧灯柄再抬头；步伐短而急 | 灯芯微金粒子；坚定时粒子轻微上浮 |
| Alder | 奥尔德（约70） | 略驼背、长白胡须灰眉、酒红旧礼服、铜扣马甲、圆框眼镜、胸前多枚怀表、手指沾铜锈 | 慢而沙哑；习惯摸怀表；星醒时手指颤抖；终幕泪水克制 | 齿轮反光、琥珀微光；不放攻击魔法 |
| LadyMoon | 月亮夫人 | 修长、银发及腰、象牙白半透明长裙、发间碎银星尘、银白光晕、冷珍珠肤色 | 动作极慢如水中飘；泪珠落下前静止三秒 | 银蓝丝带粒子、低密度光雾 |

旁白 Narrator 第四声线。配音全火山 seed-tts-2.0。

## 场景（附录 B，5 景）

| ID | 景 | 要点 |
|---|---|---|
| S01 | SnowTownScene 雪国小镇 | 钟楼居中、左木屋右巷口、远景绘画天幕分层；午夜冷蓝+窗内琥珀；雪粒小而疏，落地前化蓝光点 |
| S02 | ClockTowerScene 钟楼工坊 | 高挑圆形空间、前景木桌、中景悬浮星瓶、背景巨齿轮；暖琥珀×深青；星醒逐瓶点亮 |
| S03 | TowerTopScene 钟楼顶/星阶 | 屋顶为锚点，透明星阶向月亮盘旋；云层≥3 层视差；深蓝背光+银蓝阶缘+金粒 |
| S04 | MoonPalaceScene 月亮宫殿 | 银白纱幕、破碎王座、镜面地板、大片负空间；冷银顶光；泪碎时中心向外柔和渐亮 |
| S05 | 春天归来 | 沿用 S01 建筑与机位基准（匹配转场），冷蓝渐变金色日出，雪花转花瓣 |

## 粒子系统（圣经总指令，全粒子）

- 星辰：金色细粒+柔和拖尾（萤火、星瓶星云、星阶、星座连线）
- 月光：银蓝流体粒子、透明丝带、光晕（阶梯波纹、纱幕、泪珠星河）
- 春天：雪花→花瓣形态转化；钟声三响=金色声波/绿金微粒/琥珀光点
- 纪律：密度随高潮递增，避免全程满屏；空间遮挡+深度+风场+面部光照反馈
- 色彩：前期冷蓝/银白/暗金，后期转暖金/浅粉/春绿；低谷单冷光源大阴影

## 镜头与音乐

- 镜头：缓慢推轨/环绕/仰拍/特写/长镜头；对白保持视线匹配；拒绝无意义快切
- 配乐：钢琴独奏 → 弦乐+童声合唱（m31 起）→ 高潮后收回安静；m48-m49 留静默与眼神特写
- 终幕：黑场仅铜灯亮，金粒聚成文字「只要还有人等待，光就不会真正消失。」

## 负面约束（圣经统一约束）

不要现代城市、霓虹赛博、金属盔甲、过曝粒子、镜头无故抖动、脸部漂移、服装颜色变化、
手指畸形、对白改写、无情绪停顿。

## 制作阶段（按圣经附录 D 适配本仓工艺）

1. P1 链路：timeline 编译 + viewer 链 check 出帧（本目录）
2. P2 角色锁定：三角色程序化建模（character-modeler 纪律），先用文生图出设定参考图锁定比例/配色
3. P3 五场景：S01-S05 混合工艺（文生图纹理/背景板 + 程序化几何；S01/S05 同锚点双皮肤）
4. P4 粒子 8 系统 + 灯光色彩方案
5. P5 表演谱 + 运镜 + contact/seek 探针门禁
6. P6 音频：4 声线选声/TTS 演绎 QC + 环境音 Foley + 配乐 + 混音
7. P7 总验收：角色身份连续性、空间轴线、粒子连续性、灯光反馈、字幕、音乐情绪（圣经第五步）

## P2 角色锁定（2026-11，本节目检证据在 storyboard/p2/）

- **三主角程序化角色**（集内 characters/，craft3d 积木直接 import，不改 engine/assets 源码）：
  - `characters/face.js`：共享动画头（canvas 五官贴曲面雕刻头 + 发帽/刘海/后颈发片，
    结构移植 late_beat_musical theater.js 已验收工艺）。表情通道按本集扩展：
    awe/sad/smile/firm/shock/daze/weary/tear + blink/gaze/jaw；**眨眼=皮肤色上睑遮罩
    从上往下盖住固定虹膜**（不压扁整眼，direct-animation-craft 纪律）。
  - `characters/rig.js`：buildPose（站/走 walkingFeet 有限落脚/坐 sit 分支）+
    applyRigPose（三角色共用 setPose 主体）+ lean 绕髋枢轴（肩锚点随躯干转，手臂根不脱节）+
    orientHand（上方向投影定拇指轴，不用角色前向——S1E2 掌面反转教训）。
  - `characters/eileen.js`：1.40m，圆脸大眼（灰蓝）+银白短发齐下颌+**左侧（+az）碎发**；
    斗篷=肩铰链开襟筒（枢轴在肩线，几何下移）；裙摆环列+褶；棕短靴（圆头鞋+矮靴筒）。
    表情：curious/lonely/tearful/smile/determined。**铜灯** makeCopperLamp：裂纹玻璃罩
    （折线管贴罩面）+提梁+灯芯火苗+`flameAnchor` 粒子锚点（P4 接微金粒子）；
    setLamp {hand:'right'|'left'} 手提垂挂腕下 / {at} 递出 / {ground} 落地 / null。
    **星瓶** makeStarBottle（抱瓶道具，星核加色发光）。DIMS strideFactor .55=步伐短而急。
  - `characters/alder.js`：驼背烘进几何（躯干环列 zc 逐节前移+头肩前移，不用 lean，
    避免手臂脱节）；酒红礼服+铜扣马甲+胸前三枚怀表+表链；圆框眼镜（环+鼻梁+镜腿挂头组）；
    长白胡须（上宽下窄压马甲面）+唇须；手部材质带铜绿调（手指沾铜锈）。
    表情：dazed/shocked/relieved。
  - `characters/ladymoon.js`：1.85m 修长，象牙白**双层半透明裙**（内 .78/外 .42 透明度，
    外层 renderOrder 后渲），广袖=肢体件；银发及腰=脑后长发片+胸前垂绺；发间 26 颗
    碎银星尘（LCG 定点，seek 安全）；银白光晕（加色环）；表情 weary/revived
    （revived 增强光晕/星尘不刺眼）。
- **姿势接口**（P5 表演谱直接消费）：`characters/poses.js` 命名 spec——Eileen
  stand/walk/look_up/hold_bottle/offer_lamp，Alder stand/touch_watch，LadyMoon
  stand/sit/slow_raise；spec 内联 lamp/bottle 道具态。viewer 待机驱动=角色自带
  `drive(t,staging)`（(t,state) 纯函数：站位+眨眼包络+微动；LadyMoon 按 staging y>.3
  自动坐姿）。
- **viewer 接线**：`makeEileen/makeAlder/makeLadyMoon` 工厂签名不变（P1 契约），返回根
  Group 上挂 setPose/setEmotion/setActing/mouth/hands/feet/dims/applyPose/drive/
  setLamp/setBottle；`userData.flame/flameAnchor/lamp` 保持 LAMP_OUT/RELIGHT 链路。
  placeholders.js 已删；audit_inputs 指纹换新角色五文件+craft3d 四模块。
- **定妆帧目检**（tools/check_characters.mjs + tools/check_characters.html 摄影棚，
  27 帧 storyboard/p2/*.jpg）：三视角（正/四分之三/侧）+最难姿势（双手递灯/摸怀表/王座
  坐姿）+走/抬头/抱瓶/缓慢抬手+全表情特写。结论：剪影三人可区分（小个斗篷提灯/驼背
  红礼服眼镜/高个白裙光晕）；头颈领口无缝隙；刘海贴颅；递灯双手包覆成立；怀表串可读；
  夫人坐姿裙摆罩凳（裙摆不穿腿的简化：裙为静态环列，坐下时随 body 下沉罩住座面）。
- **回归**：`node render.mjs --check --board storyboard/p2/check` 全绿——234 帧抽帧、
  像素容差 seek 234/234 全等、无 pageerror。实拍抽查 m04/m05/m14/m15/m39/m43/m46/m49/
  m59 构图成立。m49 tear_macro 锚点按真角色坐姿头高 1.75 下调（占位版 2.35 拍空）。
- **翻车实录**：
  ① ringsGeometry 裙摆环列按 y 降序写 → 绕序翻转法线朝内，整裙渲成阴影色（深紫灰）；
     环列必须升序。已写回 character-modeler 踩坑。
  ② pose spec 缺 headYaw/headPitch → rotation.set(undefined) → matrixWorld NaN →
     **整头静默消失**（几何/纹理探针全正常，只有 localToWorld 出 NaN）；求解器 `??0` 兜底。
     已写回 character-modeler 踩坑。
  ③ 递灯灯位贴脸高度时提梁在脸前读成"胡子"——道具视觉高度要低于下颌。
  ④ 艾琳左侧碎发起初写在 -az（她的右侧）：角色面 +z 时解剖左=+x=+az，别按观众左右写。
- **遗留**：夫人长裙为静态环列（坐姿靠罩住座面，无布料屈膝）；奥尔德胡须为单片锥形
  （近景可加层）；艾琳颅顶发帽在极近景有轻微网格纹（Basic 顶点色）；手型库
  fist/open/point 由 ArticulatedHand 承担，P5 按 beat 配手型；接触探针 contract
  （config/contact_contract.json）仍是 P1 版，P5 按 contact-and-hands 口径重铺。

## P3 混合场景（hybrid-craft-scene，2026-10-26）

- **纹理生成**：`tools/gen_textures.py`（复制适配 S1E2 链，Ark Seedream，skip-if-exists +
  逐文件 source.json + 截断重试 3 次——meadow/backdrop_snow 各触发一次截断，重试救回）。
  11/11 全生成：`assets3d/tex/`{snow,woodwall,roof_tile,brass,woodplank,ice_crystal,veil_silk,
  mirror_floor,meadow,backdrop_snow,backdrop_spring}.png。meadow 为清单外加项：S05 春皮地面
  换图用（雪→春=换 meadow 纹理，不调色压色，守"纹理件不二次压色"）。
- **法线派生**：`tools/derive_maps.py`（亮度 Sobel 梯度 + wrap padding），强度分档
  snow 1.4 / woodwall·woodplank·roof_tile 1.6 / brass 2.2 / ice_crystal·veil_silk 1.2 /
  mirror_floor 0.8（镜面保读感）/ meadow 1.4。9 张全出。
- **共享助手** `scenes/hybrid.js`：planarUVWorld 用 updateWorldMatrix 后的完整 matrixWorld
  （S1E2 R15 只算 Y 旋转+位置会让 CircleGeometry 投影退化的教训）；数据贴图 NoColorSpace、
  基础色 sRGB；inst() clone 纹理做 per-mesh repeat；radialTex 径向渐变（月轮/光晕不平涂）。
- **四场景 applyHybrid**（几何/锚点/动画全不动，只换皮肤）：
  - SnowTownScene：地面+雪堆=雪纹理世界顶视投影 .12；木屋墙=woodwall 按尺寸 repeat；
    屋顶/尖顶=roof_tile；钟楼墙身=woodwall（木构钟楼）、顶台/木门=woodplank；背景板=
    continuousBackdrop 圆柱全景（repeat 2 offset 1.5 图心对 -z 主视野），原单板的
    backdropPlane/远山剪影隐藏；月轮保持程序化世界锚定 (14,30,-70) 且 fog:false——
    背景板 prompt 刻意不出现月亮本体，m06 moon_close 锚点方位无需对图。
  - **双皮肤**：setSkin 在 applyHybrid 之后跑（viewer.js 启动时 await applyHybrid，
    draw 里每拍 setSkin）；spring=切 bdSpring 背景板（offset 1.14 把图内左 28% 的日轮
    对准 m58 sunrise_wide 画面左三分）+ 地面/雪堆换 meadow + 灯光/雾/背景渐变切换；
    纹理件不再 set/multiplyScalar 压色。无纹理目录时整套静默回退 P1 程序化外观。
  - ClockTowerScene（有顶内景）：地板 woodplank 顶视投影 .35；圆筒墙 woodwall repeat 24×6；
    顶盖锥筒 BackSide 贴 woodwall（顶盖=带纹理几何）；齿轮/砧=brass+法线。
  - TowerTopScene：台面 roof_tile 顶视投影 .3、护墙/天窗=roof_tile/woodplank；
    同图背景板（center [0,10,0] r90 h60）；月轮锚点 (6,26,-70) fog:false（m26 望远镜锚点）。
  - MoonPalaceScene（有顶内景）：新增半球穹顶（r26 BackSide）；镜面地板 mirror_floor
    顶视投影 .15；王座件=ice_crystal；纱幕贴 veil_silk（透明度仍由 update 剧情驱动）。
- **目检（storyboard/p3/probe2-5，15 镜/场景 establish+中景+仰拍）**：纯色平涂件清零
  （塔身/屋面/地板/齿轮/王座/纱幕全吃纹理）；天幕无接缝亮线（仰拍探针帧连续过渡到天顶色）；
  月轮径向渐变不再贴纸；春皮不吹白（草甸+金粉日出，日轮贴地平线）。
- **翻车实录**：
  ① BackSide 内表面（宫殿穹顶/工坊顶锥）法线内翻朝下，吃 hemi 的 groundColor≈黑，
     灯光强度拉满也照不亮——宫殿穹顶改 MeshBasicMaterial 自辉（map×暗色），工坊顶锥
     靠大功率 topGlow 点光（120/30）+ 压亮 color 救回可读；教训：内景顶盖要么自辉要么
     专灯伺候，别指望半球光。
  ② 物理衰减点光（decay=2）在 10m+ 大空间里强度要给到百倍量级才读得出（S1E2 是 3-5m
     小场景，40 就够；本集工坊高 23m）。
  ③ 冷色夜景 hemi 0.8 不够，正面还要加弱 DirectionalLight 补光（0.5-0.95），否则贴图
     立面全黑（"夜景灯光别浪费纹理"）。
  ④ probe3 首跑浏览器报 "Invalid shorthand property initializer" 后 ready 超时，
     重跑自愈——疑似 puppeteer 读到写入中途的文件；node 侧 vm.SourceTextModule 全绿
     可作语法自检手段。
  ⑤ 木屋顶锥（ConeGeometry 4 段）贴 roof_tile 未出现放射拉花（repeat w/1.6,1.4），
     但尖顶/锥面贴图仍需逐帧目检兜底。
- **回归**：`node render.mjs --check --board storyboard/p3/check` 全绿——234 帧抽帧、
  像素容差 seek 234/234 全等（max 单像素差 33 在 JPEG 块噪声容差内）、无 pageerror。
- **遗留**：m62-m64 渐暗/黑场灯光调度未实现（P4）；占位角色铜灯悬浮（P2/P5）；
  背景板自带辉光团在小镇 establish 里月亮后方读出一圈暗晕（图内内容，特写机位干净，可接受）；
  春季屋顶瓦纹理含薄霜（prompt 固化），远景可读性影响小。

## P4 魔法粒子系统 + 灯光色彩调度（2026-11，本节目检证据在 storyboard/p4/）

- **引擎 `effects/particles.js`**（集内新文件）：确定性 LCG 种子 + 绝对时间闭式轨迹
  （不积分，seek 天然一致）；ShaderMaterial 点精灵（逐粒 size/alpha/color，uScale 按相机
  fov 换算世界尺寸→像素），加色混合、depthWrite false、depthTest true（吃场景遮挡）、
  径向羽化 sprite（不露方/菱形边界）；FX 创建即 visible=false、update 每帧驱动窗口外自隐。
  `ParticleDirector` 按场景键分组，反馈光源（活体锚点+包络函数）每帧全字段驱动。
- **装配 `effects/magic.js`**：发射器锚点一律活体 getWorldPosition——灯芯 flameAnchor、
  眼睫/泪点（P4 新挂 headGroup 子锚点 eyeAnchor/tearAnchor）、怀表 watches[1]、
  钟面 clockFace、天窗、星瓶道具；静态件（台阶/瓶阵/窗）装配时从活体对象快照世界坐标。
  系统清单（密度随高潮递增）：灯芯余烬(8)/萤火(8，m08-10 最后一颗落睫)/星核脉冲(24)/
  星云(140)/群瓶星座连线(192，15 边链+节点星点)/一星离瓶长尾(90)/群星穿天窗(180)/
  星阶晶化(352)/登阶环形波纹(120×3)/星阶长尾(130)/月缘银粉(36×2)/夫人边缘消散(70)/
  ONE_SPARK(7)/泪珠星河(26)/**泪碎螺旋(700，全片最高点)**/雪化蓝光点(60)/钟声金波环(138)/
  绿金微粒(170)/窗灯琥珀点(60)/日出花粉风场(140)/星阶远去(40)/胸口升星(80)/
  **金粒聚字(~850，m63 签名镜头：canvas 生成文字底图→亮度阈值采样点→粒子吸附，
  持字微烁后散去，最后一粒升向月亮)**。
- **灯光色彩调度**（写进各场景 update 的绝对秒纯函数）：SnowTown 低谷窗（m50-52 单冷光源
  大阴影）→钟声后渐暖（warmK 407-422 过渡）→春皮接管；FINALE_DIM@456=7s 渐暗至黑场——
  **黑场纱罩方案**：BackSide 全球壳普通混合黑（renderOrder=-1 先画压黑一切受光/自辉景物，
  灯焰与加色粒子 renderOrder=20 后画保持亮度），灯光×fin、雾色→黑、窗灯×fin；
  FADE@473 灯焰 opacity 缓灭。Palace：MOONLIGHT_DIM@317 逐缕熄灭（dimK）→m44 失光
  （顶光单源）；TEAR_BREAK@369 起纱幕**逐层依次点亮**（i×.45s 由内向外）+顶光/半球回暖。
  ClockTower：GEARS_STOP@179 齿轮逐一指数制动；星醒暖光反哺工坊（warm+14×wake）。
- **面部光照反馈**（与粒子同包络）：lampLight 四场景各一盏跟 flameAnchor（点燃/重燃包络+
  颤动，FADE 收）；萤火映脸光（59-77s）；星瓶暖光（150-192s 脉冲）；泪光（蓄积→碎裂闪
  →余辉）；胸口升星光（446-456）。
- **viewer 接线**：m15 起灯搁脚边、m20-m24 捧瓶（setBottle，星云锚点剧情正确）；
  fx.update 在相机就位后调用。window 契约未动。performance.js 仅导出 ANCHORS +
  四处镜头锚点微调（lamp_close/lamp_macro 对准真灯位、hand_bottle/bottle_macro 对准
  捧瓶手位、goodnight fov20→22 后拉让"灯+聚字"同屏——签名镜头需要，原 P1 极近景改 22）。
- **验收**：`node render.mjs --check --board storyboard/p4/check` 全绿（234 帧、像素容差
  seek 234/234 全等、无 pageerror）；32 镜审片帧 storyboard/p4/*.jpg 逐张目检；
  连续段 output/p4_tear.mp4（364-375 泪碎点亮纱幕）/p4_morph.mp4（399-409 雪转花）/
  p4_goldtext.mp4（464-473 聚字散场）抽帧确认动态连续无跳变。
- **翻车实录**：
  ① **rnd() 写进 pos/alpha 闭包**（每帧推进 LCG 种子）→ 顺序/seek 粒子分叉，check 像素
     seek 抓获（m61 两帧 7855px 漂移、m57 窗灯段三帧 113-314px；diff 图只有粒子点差异）——
     随机量一律 build 期捕获。本类 bug 本轮犯了四处（胸口升星/泪珠壳层/绿金微粒/窗灯琥珀点），
     泪珠壳层那处因落在高光区没过容差，**靠 diff 目检才看见**——容差不是免检金牌。
  ② **粒子偏移加在世界空间**：艾琳 yaw=π 脸朝 -z，手写 "+z=脸前" 偏置把萤火盘旋埋进
     颅骨（只剩逃出剪影的一颗可见）。正法：脸外向=锚点−头心活体反解（且 y 分量要清零，
     否则头心在眼下、outward 上抬把"落睫"抬成"落眉骨"）。
  ③ **眼睫/泪点锚点 z 必须大于该高度前脸曲面深**（约 .128）：锚在面表内→落点粒子被
     头部网格 depthTest 挡死；探出量还要压过刘海碎发片（bulge 后 ~.635 世界），
     3mm 级深度差就得逐轮探针帧逼进。
  ④ **远景粒子按像素换算尺寸**：世界 .01m 在 10m 外广角=亚像素——星座连线/星阶晶化
     首版全隐形。uScale=H/(2tan(fov/2)) 落引擎，逐镜按距离核算。
  ⑤ **m20 苏醒瓶锚点选错对象**：工坊悬浮瓶阵离手部特写机位 3m+（星云拍出画外只剩地板）；
     应锚艾琳手中星瓶道具（viewer 接线 setBottle 显形），镜头 look 同步对准真实瓶位。
  ⑥ **泪碎闪光 22 + 纱幕增益 .30 直接爆白半屏**（负面约束"过曝粒子"）——闪 9/增益 .16
     后冰晶纱幕纹理可读。黑场里艾琳身体挡住聚字左半（她站在文字平面前 5cm）——
     文字平面右移让开人体。
- **遗留**：m54 雪转花在广角下仍偏含蓄（粒子粉化可读但密度低，P5 表演谱可再加近景转化
  特写）；m36 脚部特写画面被天窗舱门板占去大半（P1 构图，P5 运镜轮再评）；m62-64
  黑场中奥尔德立于远处仅下半身入镜上缘（剪影可读，保留）；钟面指针 m55 起缓转但
  钟面冰融/枯树抽芽的形体变化未做（P5 或接受现状）。

## 验证与翻车记录

- **P1（viewer 链路基线，2026-XX）**：timeline 编译器（tools/compile_story.mjs，64 拍/37 句/478s）+
  四场景占位（scenes/）+ 三占位角色（characters/placeholders.js）+ 每拍运镜表（performance.js）。
  `node render.mjs --check --board storyboard/p1/check`：234 帧抽帧、像素 seek 全等、无 pageerror；
  `node render.mjs --physics-only --board storyboard/p1/physics`：14340 帧 trace + 234 点数值 seek 全过。
  翻车两则：① 场景 update 里 `if(t>407)` 才写指针 rotation → 顺序渲染末帧角度泄漏进 seek 直渲
  （m02 三帧 221px 漂移）——视觉态每帧全字段驱动，条件分支不豁免；② viewer 的 draw state
  带了 `t` 键，render.mjs 数值 seek 比较前会剥掉 reference 的 t → 每帧报 missing field，
  state 契约不含 t。构图修正：girl/lamp 系特写原从角色背后拍（拍背），全部翻到朝向侧；
  m59 钟楼顶站位原埋在尖顶锥体里，新增外挑阳台（topBalcony，世界锚点 (0,21.24,-12.4)）。
  遗留：m62–m64 渐暗/黑场灯光调度未实现（P4）；天幕背景板为单色板位（P3 文生图替换）；
  占位角色铜灯悬浮于手侧（无手臂 articulation，P2/P5 接接触纪律）。

## P5 表演谱 + 运镜细化 + 物理探针门禁（2026-11，审片证据在 storyboard/p5/）

- **表演谱**（performance.js 重写为按拍表演谱，viewer 的 drive() 待机被 performAt 取代）：
  64 拍逐拍表 `B`（beat→角色→patch）：姿势 spec 由基底（呼吸 bob/眨眼/微动）+ 累积航点 keys
  合成；emotion 映射角色表情集（act.emotion→EMO 表+通道补丁，如 worried=lonely+firm.35）；
  gaze 活体锚点解算（月亮/灯/瓶/怀表/对话者头/星阶/天窗……face.lookAtWorld）；手型逐拍
  （fist 静息 .12 / open / point / 抱瓶 open.35 / 捧灯 open.4-.5 / 攥灯柄 fist .92）；
  台词 mouth=jawEnv 音节包络占位（P6 接真口型）。静默留白：m47 后段/m48/m49/m52 只留呼吸与
  泪光蓄积；m49 TEAR_FALL(366)→TEAR_BREAK(369) 夫人 freeze（bob/眨眼/发片全写零位）。
  次级运动（纯 t 闭式）：斗篷阵风阻尼衰减振荡（WIND_GUST/WIND_HIGH）+行走摆动、奥尔德胡须
  微摆+震惊颤抖、夫人发片水中飘。m22 震惊=站直+手指 tremble + shock 表情；m27=攥拳→抬头两段；
  m46 夫人 7s 缓慢摇头一次。
- **走拍 walkingFeet 有限落脚**：m04 街口（4.5m/.62m/s）/m11 走向钟楼木门（4m/.67m/s）/
  m13 入工坊/m15 走到放灯位/m18 向前一步/m37 登星阶（活体读场景台阶位置，XZ 步态+根高随阶，
  strideFactor 1.15 大跨步剪影）/m38 入殿/m40 小心走近（.25m/s 慢步）。到位后保留落脚步宽
  （footX .078 与 walkingFeet footHalf 对齐）。gait 探针实测：p50 .57m/s、p95 1.29、
  步频 2.02-3.6/s（短而急）、足踝滚动三不变量全过（130 支撑 run）。
- **道具状态机**：灯=手提（腕下 -.175）/落地（m15 蹲放 112.7→114.9 释放，沉降 ~.2m 诚实
  放行，身高 1.4m 臂长 .29m 不蹲到髋 .20 够不到地）/m44-m49 与 m62-m64 lampKeys 关键帧驱动
  （提起→捧→递出→未接→收回抱怀全程，切换帧与腕位重合零跳变）；瓶=切镜即已捧住（m20/m29），
  m30 星离瓶后 220.6 脱手；奥尔德摸怀表=m16/m19/m50/m61 四拍（m61 举表看画像）。
  捧灯高度 0.90（P2 教训：灯位贴脸时提梁读成胡子——0.97 版复发一次，压到下颌以下）。
- **接触门禁**（config/contact_contract.json + tools/check_contact.py → 通用 contact_probe）：
  carry×9 段（灯手提/过渡/捧递全程、瓶两段、怀表四段）、supporter（灯/瓶可见必有支撑，
  灯落地段 transit 豁免）、bite（夫人髋-座面 .412<.55 坐实王座）、seated（夫人扶手静息手）、
  gait/foot_roll（艾琳走拍）、reach（ratio .97+垂臂豁免 35°；递灯全展/蹲下放量按窗口白名单）、
  limb_attach（肩线/肩轴 sanity）。全绿：14340 帧 trace + 数值 seek 全等。
- **运镜细化**：对白轴线全表核查（轴线两侧叉积判据）——修正越轴：girl_step（改奥尔德肩后）、
  alder_side、girl_lookback、girl_stars、lady_side、girl_frown；m54 雪转花锚点压低拉近+缓推
  （前景花瓣可读）；m36 脚部特写改星阶外侧低位回看（原机位舱板占画面，次轮发现护墙圈挡
  一切内侧浅角机位——阶在圈外是场景事实）；m46 two_close 改真过肩双人（原机位把艾琳切出画）；
  m40 two_mid 改真双人（原锚点把她甩出 33° 半角外）；offer_lamp/girl_lamp 对准真实递灯点；
  m63 goodnight 随捧灯升高重取（脸+灯+聚字同屏）；m27 并肩望天场景特写回正面低位（背影机位
  读不出"抬头"）。m50-58 奥尔德仰望/垂视/摊掌接瓣/逐次追钟声的视线链。
- **新视觉件**：m53 第一片花瓣实体（magic.js，活体右手锚点，395.2 飘落→396.3 落手背，
  纯 t 闭式）——P4 只有 cue 没有花瓣本体。
- **翻车实录（P5 新增）**：
  ① **道具状态机必须先于 buildPose 调用**（setPose 当帧消费 lampMode）：先 buildPose 后
     setLamp=顺序渲染晚一帧不觉察，seek 逆序访问读到未来帧道具态（t=113 灯在地面 vs 在手上，
     数值 seek 抓获）。同族：SKILL 踩坑"生长/变身状态先于姿势求解"。
  ② **keys 航点必须累积合并**（cumKeys）：朴素"末 key 即终态"实现下，最后一个只写 tear 的
     patch 把双手从捧灯打回垂手（m48/m62 捧灯半途撒手，探针 carry 抓到 xz .18）；航点语义=
     叠加在之前所有 key 之上，"保持"写 {}，"恢复"必须显式写字段。
  ③ **冻结帧也要写零位，不能跳过**：m49 泪前静止三秒若跳过次级运动写入，发片残留"上一帧"
     旋转——顺序渲染残留 t-1/30 的值、seek 残留逆序上一访问帧的值，像素 seek 在 366/369
     抓获（735-1089px）。视觉态每帧全字段驱动，没有例外分支。
  ④ **--shots 的自由相机逐镜清零**：setFreeCamera 不残留到下一句——旧 shots 循环一个带
     camera 的镜会污染后续所有默认机位镜（m16/m20/m22 全部变成 m15 的机位）。render.mjs 已修。
  ⑤ 够不到的姿势别硬写：工作台手位/拍灯手/护灯手初版全部超臂长被 clamp 成全展直（reach
     探针抓 .98）；收进可达域或诚实加 lean/蹲。奥尔德工作姿态前移 z=-4.5→-3.95（原站位
     够不到台沿）。
  ⑥ **管道会吃掉 render.mjs 的退出码**：`node render.mjs --physics-only | tail -2 && 探针` 里
     数值 seek 红被 tail 的 0 退出码掩盖、探针照样跑（tearA 哨兵 135 帧红差点漏网）——
     回归链要看 seek_check.json 的 passed，不能只看"命令跑完了"。另：不可见角色的内部矩阵
     驻留合法（不渲染），诊断键（tearA）只在角色可见段记录，否则 seek 逆序残留误报。
  ⑦ 审片机位也要做左右侧分析：放灯拍第一版机位在她的左手侧，灯（右手侧）被斗篷挡死；
     按 yaw 算右向量再摆机位。
- **遗留**：夫人长裙/艾琳裙摆仍是静态环列（无布料屈膝）；夫人高王座赤足悬空（腿长 .8
  够不到地，"破碎王座"高大设定下接受，或 P6 加踏脚残块）；m61 怀表盖无女儿画像（纹理级，
  P2 起未做）；m37 登阶极远景的脚部是平面步态+根高近似（剪影成立，逐阶踏步未做）；m62 起
  艾琳从顶台到地面的换装切镜靠黑场掩护；m19 奥尔德深色裤腿在暗地板上前鲜有剪影弱读。

## P6 音频（全火山：seed-tts-2.0 配音 + Seed-Audio 环境/Foley/配乐，2026-11）

- **链路**：`tools/direct_audio.py`（audio_direction.json 导演 pass，37 句逐句 intent/subtext +
  delivery，6 床 32 事件 3 cue 4 排除，validate 过）→ `build_dialogue_config.py`（timeline+{Event:Act}
  → config/dialogue.json 逐句演绎档：rate→speech_rate、context→additions.context_texts（角色人设+
  逐句指令）、emotion→audio_params.emotion scale 2）→ `gen_dialogue.py`（seed-tts 逐句，缓存三元组
  text|speaker|delivery，emotion 被拒自动降级重试并记 emotionDropped）→ qc_lines 验收 →
  `gen_sfx.py`/`gen_music.py`（Seed-Audio 单要素，skip-if-exists+source.json）→ `remix_audio.py`
  （四层总线+level_bed 三道验收+对白 ducking）→ `build_voice_envs.py`（口型包络）→
  `check_audio_sync.py`（onset 对位）。
- **选声**（config/voice_config.json；12 候选×2 句试听 24/24 合成成功，时长窗全 ✅；本环境无音频
  输出**未做盲听**，按目录气质+时长窗+拼音 QC 暂定接片）：Narrator=少儿故事2.0（演绎类，儿童故事
  讲述）/ Eileen=萌丫头2.0（唯一中文女童龄音色；元气风险用 context 压）/ Alder=唐僧2.0（候选中最慢
  最平缓；沙哑=中文男声无原生音色的已知坑，context"苍老沙哑"逼近）/ LadyMoon=林潇2.0（清冷沉稳，
  "很远的地方"由混音轻混响链 highpass250+lowpass6500+aecho 实现，不动音高）。
- **逐句 QC**：35✅/2⚠️/0❌（⚠️：n03 临界-0.12s 在容差内；e13 拼音 80%=Whisper 把「您nín」
  转成「你nǐ」的声调级差异，两轮同现，发音正确性待导演听审）。超窗句全部语速档吸收未改台词：
  n04 -8→+35（17.69→11.78s/窗12.7）、e17 -3→+25 且摘 sad 情感标签（悲伤拖腔停顿是超窗主因，
  哭腔由 context 承担；13.92→9.82s）、m03 -8→0、a04 -5→+8（tangseng 语速方差大，-2 反而更慢
  8.62s——speech_rate 只是倾向不是保证）、n03 -8→-2。e04 首轮 mengyatou 把「常常一个人」读成
  「藏藏一個卵」（拼音 57%），同参重抽一次即 93% ✅——女童音色偶有整词崩坏，QC 拼音红线必要。
- **摆点**（speechWindow 与镜头窗分离）：默认 lead-in 旁白 1.2s/其他 0.5-0.6s；m05 夫人的
  「原来……还有人在等我。」绝对摆点 369.6=TEAR_BREAK 泪碎之后；n04/e17 贴窗头争取余量。
- **环境/Foley**：6 床（雪夜风/齿轮/高处寒风/月宫空寂/深夜将尽/日出鸟鸣，区间=场景，边界 2s
  交叉淡化，level_bed 后 RMS max/mean≤1.30、4-8k 嘶声≈0 全过；wind_predawn 首轮自相关 0.271
  超 0.15 阈，换"极弱极静"prompt 重生后 0.057 ✅）+ 26 事件素材 32 摆点，钟声 bell_deep 一素材
  三摆点（408/413/418，增益 1.0/.95/1.1）。脚步用连续踩雪 excerpt 摆进走拍窗（27.2/78.3），
  未逐 stance 对帧——近似，见遗留。
- **配乐**：piano_open_a/b（115s×2 交叉 3s，0-229）→ strings_choir（227-348，弦乐渐入+无词
  童声合唱哼鸣，fadeOut 6s 于 345 前收尽）→ 348-400 静默区（数值验证音乐分轨 RMS=0）→
  spring_return（400-478，fadeOut 7s）。童声合唱走 Seed-Audio 无词哼鸣单要素（监制令火山-only），
  volc-song-gen/Suno 抽卡链路本轮未启用。
- **混音**：对白峰一化 .5；音乐 RMS=人声-12dB（strings/return 段 -11.5/-11），对白 duck -7dB
  （75ms 高斯）、环境 -2dB；成片峰值 -3.77dBFS（≤-2 口径达标）。分轨存 assets3d/stems/，
  来源+哈希在 stems/mix_manifest.json。
- **口型**：voice_envs.json=最终对白 PCM 的 20ms RMS 能量包络（30ms hanning 平滑、8% 静默门控），
  t0=混音摆点同一零点；performance.js `setVoiceEnvs` 注入、performAt 里 jawReal 命中即用真包络，
  缺失回退音节占位 jawEnv。能量开合，不是音素视素。
- **声画对位**：check_audio_sync.py 15 事件 onset 全过（±0.15s 内；gears_stop 宽判 ±0.35 实测
  -0.048；钟声三响 +0.112 统一偏晚=素材自身起音延迟，同一偏移方向，可接受）。静默纪律数值验证：
  泪落三秒 366-369 mixed RMS 0.003（对照阵风段 0.054）；尾声 473-478 RMS 0.004。
- **回归**：口型补丁后 `node render.mjs --check --board storyboard/p6/check` 全绿（234 帧像素
  seek 全等）。
- **遗留**：① 四声线未听审（无音频输出环境），导演复听后若要换声线：改 voice_config.json +
  dialogue.json voices，删对应 id 的 dialogue/*.wav 重跑 gen_dialogue→build_voice_envs→remix；
  ② e13 ⚠️ 待听审；③ 脚步近似摆放未对 stance 帧；④ 艾琳声线读长句偏快（e17 窗内余量 2s），
  复听后若嫌赶可拆反应镜；⑤ 音乐未听审（仅数值验证静默区/电平/结构时长）。

## P7 总验收 + 全片渲染（2026-11，审片证据在 storyboard/p7/）

- **成片**：`output/craft3d_full.mp4`——478.000s / 1280×720 / 30fps / 14340 帧 / h264(crf18)+aac 192k 48kHz 立体声 / 90.9MB（`node render.mjs --out craft3d_full.mp4` 单次全长渲染，无分段拼接）。
- **审片方式**：成片抽帧 112 张（extract_review_frames.py，config1/2/3 → frames/frames2/frames3），
  每幕 8-15 时间点覆盖全部指定节点（m01/m05/m08/m10/m13/m21/m24/m31/m37/m39/m44/m47/m49/m54/m55-57/m58/m61/m63）
  + 四段动态序（泪碎 365-373.2、雪转花 400.5-406.5、钟声 408.2-420、聚字 464.5-471.5、登阶 267.5-275）+
  关键帧原生分辨率复核（m08/m10/m16/m21/m24/m31/m46/m49/m53/m55/m61/m63）+ 成片音轨 volumedetect 抽查。
- **发现并修复 3 处（修复后全片重渲定版）**：
  ① **m63 签名镜头聚字压脸**（P0 级可读性）：文字平面左缘与艾琳头部重叠，「只要」「光就」被遮挡。
     textTargets center (0.25,0.33)→(0.58,0.50)、W .80→.60——中间态 +.55/+.42 又压到奥尔德面部
     （他在文字后方 5.5m 仍投影进文字区），上移收窄后两人全让开。成片 470s 帧全句可读。
  ② **m30/m31/m32 星阶段特效远机位近隐形**（P1 弱读）：一星离瓶长尾/群星穿天窗/星阶晶化在
     follow_up/orbit/侧面全景机位全部亚像素——P4 按当时机位核的尺寸，P5 改运镜后失配。
     STAR_RISE 尾 .013→.026 头 .05→.08、STARS_SWARM .032→.052、STAIR_FORM .07→.09。
     成片 222.5/230.5 帧星轨与星群清晰，无过曝。
  ③ **m46 two_close 艾琳出画**（P1 构图）：P5 机位把她放在镜头旁侧 40°，画面只剩左缘一撮发梢。
     移到她正后方成真过肩（pos [0.85,1.7,-1.6] look [0,1.5,-8.6] fov 30，保持 +x 对话轴侧）。
     成片 341.5 帧：前景头肩+夫人中景摇头，双人关系成立。
- **回归（修复后同链重跑，全绿）**：`--check` 234 帧像素 seek 全等（max bad 0）；`--physics-only`
  234 点数值 seek 全等；contact_probe 全断言通过（carry_max_xz .095、bite_min .412、130 支撑 run）。
- **圣经第五步质检清单**：
  ① 角色身份连续性 ✅（三人剪影/配色/道具跨五幕一致，原生分辨率脸部 m10/m42/m48/m49 无漂移）；
  ② 空间轴线 ✅（双人拍逐镜在轴同侧，m46 修复未越轴）；③ 镜头前后动作 ✅（灯：手提→蹲放落地→
  捧递→未接→抱怀；瓶：捧→离瓶→脱手，探针 carry×9 全绿）；④ 粒子运动连续性 ✅（泪碎逐帧扩散+
  纱幕逐层点亮、聚字聚集→持字→散去→最后一粒升月、钟声窗灯渐序）；⑤ 灯光反馈 ✅（灯焰跟脸光、
  星瓶暖光反哺、泪光、胸口升星、FINALE_DIM@456 渐暗黑场、春皮接管）；⑥ 字幕 ✅（全程在位，
  抽帧与圣经台词逐字一致）；⑦ 音乐情绪 ✅（泪落三秒实测 mean -50.2dB、尾声 -48.4dB、对白/钟声段
  电平正常；音乐本体四声线同样未听审——环境无音频输出）。
- **负面约束核查**：现代城市/霓虹/金属盔甲/镜头抖动/脸部漂移/服装变色/手指畸形/对白改写——均未发现；
  过曝粒子未见（泪碎闪光克制）；情绪停顿在位（m47-49 静默区实测数值）。
- **本轮新增遗留（弱读/含蓄，不返工）**：m32 首级星阶凝形在侧面全景仍含蓄（台阶本体透明度低，
  m36 波纹/m37 台阶链承接叙事）；m55-57 钟声金色声波环在 20m 机位为 4-5px 细点环（三响由音频+
  指针启动+窗灯承担）；m08 萤火初段仅 3 点贴左缘（m09 肩绕/m10 落睫成立）；m49 悬浮泪珠静帧弱读
  （动态与泪碎粒子场成立）；m44 失光全景极暗（设计内"低谷单冷光源大阴影"）。
- **待用户复看**：① 四声线盲听 + e13「您」拼音⚠️（无音频输出环境，仅数值验收）；② 音乐本体听感
  （静默区/电平数值达标）；③ m54 雪转花含蓄度；④ m19 暗地板裤腿弱读；⑤ m37 登阶近似步态剪影；
  ⑥ m61 怀表盖画像缺失（纹理级，P2 起未做）；⑦ 夫人赤足悬空。
