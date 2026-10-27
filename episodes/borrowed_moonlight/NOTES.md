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

## A5 配乐换 Suno v6-mini（2026-10-27，替换 P6 的 Seed-Audio 音乐层）

- **动机**：bible 音乐规格「钢琴独奏渐入弦乐与童声合唱，高潮后收回安静」走 Suno（用户会员）
  重生成，替换 P6 的 4 支 Seed-Audio stem。对白/环境/Foley 层不动，仅换音乐总线重混。
- **生成清单**（suno-driver headed 持久会话，3 次提交各回 2 clip，低频自用；全 instrumental
  =Advanced 歌词框留空；style 全英文白描， prompt 与 song_url/sha256 见各 .source.json）：
  | 素材 | song_id | 时长 | 选用理由 |
  |---|---|---|---|
  | suno_piano_open_a.mp3 | 202926ff-e7f3-45f2-b8bd-370f2183b371 | 178.4s | 开场钢琴独奏：冷色童话摇篮曲，留白多，0-176.5 铺底 |
  | suno_piano_open_b.mp3 | 61f52c1a-5779-49b4-afe3-12ead2571e56 | 187.6s | 同次提交的第二 clip，与 a 交叉 3s 续到 230（a 不够长） |
  | suno_strings_choir.mp3 | 37d98370-126b-44d4-8d68-d5ed81679636 | 180.0s | MUSIC_RISE 段：弦乐+无词童声哼鸣；选段 off=28s 起，源曲 148-158s 自然渐弱恰好落 347-348 收尽口 |
  | suno_spring_return.mp3 | 60394075-b555-4e35-853f-eaebd0b9f808 | 193.0s | MUSIC_RETURN 段：暖金日出+钟琴；选段 off=84s（避开源曲 168-181s 末尾再高潮），源曲 161-167s dip 落片尾 |
- **对位**（tools/remix_audio.py music 总线，锚点=timeline.json cues）：
  piano_a 0-176.5（fadeIn 2.5/fadeOut 3）→ piano_b 173.5-230（交叉 3s）→
  strings_choir 227-348（fadeIn 3/fadeOut 6，MUSIC_RISE@227 与钢琴交叠 3s）→
  **348-400 静默区**（音乐分轨实测 RMS=0，含 TEAR_FALL 366-369）→
  spring_return 400-478（fadeIn 2.5/fadeOut 20：458=FINALE_DIM 起退净，478 归零，片尾仅铜灯）。
  电平沿用 P6 纪律：音乐 RMS=人声-12dB（choir/return 段 -11.5/-11）+对白 duck -7dB。
- **验收**（数值，本环境无音频输出、未听审）：混音成片峰值 -3.77dBFS（≤-3.8 口径）；
  音乐分轨 348-400/366-369 RMS=0；mixed 泪落三秒 RMS 0.0028（旧 0.003）、尾声 473-478
  RMS 0.0063（旧 0.004，逼近鸟鸣床底噪 -49dB）；check_audio_sync 15 事件 onset 全过；
  三支素材 whisper（no_speech_threshold=0.2）0 段=无歌词证据（哼鸣不产生文本，不证明
  合唱有无，听感待审）。
- **成片实测**（`output/craft3d_full_v2.mp4`，478.000s h264 1280×720 30fps + AAC 192k 48kHz
  立体声，91.4MB）：全片 peak -3.8dBFS；泪落三秒 366-369 mean -50.2dB（与 P7 旧版一致）；
  静默区 348-400 mean -27.1dB（仅对白+环境床）；尾声 473-478 mean -43.4dB（旧版 -48.4dB，
  新尾奏略暖但 478s 音乐归零）。
- **留档**：旧 Seed-Audio 4 支移至 `assets3d/music/_archive_seed_audio/`（含 source.json），
  回滚=把文件名改回 remix_audio.py 旧 4 行 music() 调用。
- **踩坑写回**：① suno-driver `--download-id` 的 Download 悬停展开已失效，需**点击**展开
  （已修 scripts/suno_generate.py，主生成流程不受影响）；② UI 选 WAV 落盘实为 **MP3 48k**
  （codec=mp3 附 mjpeg 封面流），source.json 记 actual_container/actual_codec，按 MP3 接入；
  ③ v6-mini 单曲 ~180s 不足以覆盖 229s 开场，用同次提交的第二 clip 交叉续接（省一次抽卡）；
  ④ title 输入框选择器仍失效，Suno 自动命名（"Snow Kingdom Lullaby"），定位靠 clip id 回执。
- **遗留**：⑤ 四支素材均未听审（配器/合唱是否到位、段落情绪与画面贴合度待用户复听）；
  ⑥ piano_b 与 a 是同 prompt 不同 take，交叉点乐句衔接未验；⑦ strings_choir 的 PALACE_HUSH
  （276）后"音乐减弱"靠源曲自然动态+fade，未做额外增益包络。

## A1 cel-cinema 第一批文生图资产（2026-11，产物全在 hybrid/assets/）

- **范围**：三角色身份锚（refs/ 全身+肖像×3，共 6 张）+ 五场景底图（plates/ 1920×1080，
  S01 雪夜/S01 春日同构图/S02 工坊/S03 星阶/S04 月宫，共 5 张）。全部 codex CLI gpt-image
  （订阅配额，零现金），串行前台，11/12 次调用一次通过（仅 S02 抽 2 次）。
- **工具**：`hybrid/assets/gen_assets.py`（skip-if-exists 幂等；逐文件 source.json 记
  provider/model/prompt/refs/sha256；manifest.json 汇总 11 项已验收资产；重生成删 png 再跑）。
  S02 的 v2 prompt 已回写脚本 JOBS，脚本即权威 prompt 源。
- **prompt 纪律**：画风锁逐字写进每条 prompt（19 世纪欧洲童话手绘动画电影感，水彩+柔和
  赛璐璐；负面=3D 渲染/塑料/照片/霓虹/金属盔甲/现代元素/文字水印）；p2/p3 的 3D 帧作 --ref
  时显式声明"仅锁身份/构图，全面重绘为二维手绘，勿复制 3D 平面感与灰底"——11 张无一滑回 3D 感。
- **S02 迭代**：v1 墙面被模型脑补成书架（读成图书馆）且暖琥珀×深青对比弱；v2 prompt 加
  "walls are dark wood panels and brass clock mechanisms, NOT bookshelves, no books"+"amber vs
  teal contrast must be obvious"后达标。v1 留档 plates/_candidates/s02_v1.png。
- **验收目检结论**：艾琳（灰蓝大眼/齐下颌银白短发/深蓝天鹅绒斗篷+铜扣/米白亚麻裙/棕短靴/
  旧铜灯手提）✅，左侧碎发在全身版弱读、肖像版可见；铜灯裂纹读成玻璃 X 骨架，特写镜头再强调。
  奥尔德（驼背偏弱/长白须/灰眉/圆框眼镜/酒红旧礼服/铜扣马甲/胸前四枚怀表/指尖铜绿）✅。
  月亮夫人（修长/银发及腰/象牙白半透明双层裙广袖/碎银星尘发饰/冷珍珠肤/环形光晕）✅。
  场景锚点逐一核：S01 钟楼偏右+月在塔右+左右木屋群+琥珀窗 ✅；S01 春日同机位同布局+
  低日轮左三分+花瓣替雪 ✅（匹配转场对成立）；S02 圆形高挑+巨黄铜齿轮+悬浮星瓶+中景工作台 ✅；
  S03 屋顶锚点+天窗+透明星阶旋向右上月亮+三层云视差 ✅；S04 纱幕+破碎王座+镜面地板+
  负空间+冷银顶光 ✅。
- **遗留**：① S01 夜版/S03 的月亮偏亮（圣经"黯淡细银轮廓"），合成阶段压暗或加遮罩；
  ② S02 v2 墙面空搁架略空，可接受（作坊储物架读法）；③ codex 无 seed/negative 旋钮，
  S01 夜→春的同构图是"参考图权重"级对齐（塔/屋位置一致，云与植被细节不同），
  匹配转场建议叠化而非硬切；④ refs 肖像为横构图（约 1.2:1）、全身为竖构图 1024×1536，
  进 art_pass 按需裁剪。

## A0 cel-cinema 工程底座（2026-10-27，bake 骨架，证据在 storyboard/a0/）

- **范围**：cel-cinema（绘本电影管线，dula-skills/cel-cinema/SKILL.md 首次落地）的工程底座，
  不做文生图。源片锁定 `output/craft3d_full_v2.mp4`（sha256 `568958cf…0907a`）。
- **目录**：`hybrid/`——`config/art_pipeline.json`（draw-over-pipeline-v1 配置，baseUrl
  127.0.0.1:4217=`node render.mjs --serve --port 4217` 常驻）、`config/bake_adapter.mjs`
  （逐帧 capture 适配器）、`config/art_shots.json`（64 拍镜表，`hybrid/tools/build_shots.mjs`
  从 timeline.json 生成+时轴无缝校验，kind 分布 face_close 18/macro 14/wide 10/mid 6/
  establish 4/walk 4/stairs 4/two_mid 3/two_close 1）、`config/a0_probe.mjs`（probe 适配器）、
  `art_pass_a0.html/.js`（占位骨架原型页，契约同 viewer：renderAt PNG/stepAt/ready/duration）、
  `assets/draw_over_runtime/`（prepare 同步的 19 个共享模块+哈希清单，A0 暂未消费）。
- **viewer.js 改动（唯一一处）**：末尾加 `window.__dbg={actors,camera,anchors:fx.anchors}`
  只读暴露活体对象树；不进 draw/state，渲染路径零改动（回归见下）。
- **bake 产物**：`hybrid/config/motion_full.json`（94MB，14341 帧 = 0..478s×30fps 含端点）。
  每帧：三角色 root/head/faceCenter/faceFront/双肩/双肘/双手/双脚/pelvis 世界坐标+同帧
  像素投影+根 yaw+**头世界四元数 headQuat**（headPitch 望月抬头必须靠它，yaw-only 偏
  ~25px）+planted 接触（走拍 walkingFeet stance 布尔，站桩拍 null=无元数据而非通过）；
  相机 position/quaternion/fov（8 位小数）；粒子活体锚点 6 个（flameAnchor/wakeBottle/
  eyeAnchor/tearAnchor/chestAnchor/clockFace 世界坐标+可见性）。
- **验证**（`pipeline.mjs --step probe` 全绿）：帧数 14341 ✓；全帧有限性 ✓；
  **相机重建指纹**：重投影 vs bake 投影最大差 0.0107px（102 抽样，最差=m01 艾琳左手）✓；
  fov 域 17..68 ✓；staging 显隐取样（m05/m15/m39/m01）✓；planted 语义（m04 走拍一脚
  stance=true、m05 站桩 null）✓。
- **A/B 对照**（`hybrid/tools/ab_compare.mjs`，m05 艾琳望月近景 + m15 工坊双人，各取
  始/中/末三点）：并排 `ab_*.png` + 骨架叠原帧 `overlay_*.png`。目检：肩线压领口、
  右手点在灯柄、骨盆/躯干/腿线贴身、m15 双人相对位置与尺度正确、朝向短线指向月亮
  （m05 抬头）与工作台（m15 低头）。数值：头圆心实测 (631,183) vs bake 投影 (631.7,181.1)。
- **回归**：`node render.mjs --check --board storyboard/a0/check` 全绿（234 帧捕获 +
  234 项 seek 像素比较全 equal）。
- **翻车实录**：
  ① **renderAt 先抓图后画**：`{image:canvas.toDataURL(),state:draw(t)}` 字面量求值顺序
  导致拿到上一帧画布——m05 骨架整体偏高 74px 排查半小时，实为 t=36.5 画面贴 t=39 标签
  （look_up 运镜帧间差放大了错位）。正解：先 draw 赋值再抓图。已写回
  draw-over-animation/references/executable-pipeline.md。
  ② **远画外/相机平面前方的投影是数值奇点**：不可见角色驻留点 (0,-50,0) 在月宫机位后方，
  相机参数 1e-6 舍入被放大到 7470px 像素差；即使 NDC 在窗外但深度小（2.7m）也差 153px。
  正解：projected 只保留 viewZ<-0.1 且 NDC |x|,|y|≤2 的点，其余记 null。已写回同一参考。
  ③ **头占位锚点别信 profile 端点**：几何下巴尖（profile y=-.070）投影 271px 被斗篷领口
  遮挡（可见颌线 197px）、发帽超出颅顶极点 29px；眼点投影与实测像素精确吻合（UV 约定
  eyeY=246→头局部 y=.0856，三角色共享）。故 bake 加 faceCenter/faceFront（localToWorld
  含 headScale），占位头圆心锚眼高面心。
- **已知边界**：projected 对远画外点是 null（语义=不可投影，不是数据缺失）；占位骨架腿
  不画膝（bake 未采膝关节，LimbSurface 不存关节点，需要时再扩）；不可见角色的肩/肘/
  骨盆为 null（performAt 对不可见角色 continue 不跑 emitTrace）；m15 t=113 艾琳下蹲
  灯已落地（接触帧 112.7）在 A/B 图中与 3D 原帧一致。
- **下一步（A1 起）**：文生图资产（身份锚→场景底图→姿势 cel）→ art_pass 页接 cel-stage
  刚性摆放（runtime 已同步）→ raster-face 接 voice_envs.json 能量包络 → 粒子 3D 层重宿主。

## A2 cel-cinema 第二批文生图资产（2026-11，产物全在 hybrid/assets/{cels,cels/walk,faces}/）

- **范围**：姿势 cel 15 张（艾琳 7：stand/look_up/hold_bottle/offer_lamp/crouch/hold_lamp_close/
  wave_goodnight；奥尔德 5：stand_work/touch_watch/shock/stand_hope/relieved；夫人 3：
  sit_throne/slow_raise/revived）+ 走拍相位画（艾琳 8 相位背面三四分 2x4 宫格 + 裁格、
  奥尔德 4 相位正面三四分 2x2 宫格 + 裁格）+ 脸部同图变体 17 张（每角色嘴 half/open +
  眨眼 + 表情：艾琳 lonely/tearful/smile/determined、奥尔德 dazed/shocked/relieved、
  夫人 revived；closed/curious/weary 基底=A1 已验收肖像锚）。全部 codex CLI gpt-image，
  34 个净生成调用 + 1 次超时重试，零现金。
- **工具**（幂等，skip-if-exists）：`hybrid/assets/gen_assets_a2.py`（任务表+逐文件
  source.json；走拍条 `timeout: 560`）、`hybrid/tools/slice_walk_strip.py`（宫格裁切+
  逐格 alpha bbox JSON）、`hybrid/tools/lock_face_variants.py`（raw→锁回，手工窗
  faces/rects.json）、`hybrid/tools/clean_alpha.py`（杂点清理）、
  `hybrid/tools/make_grid_overlay.py`（比例门刻度图）、`hybrid/assets/update_manifest_a2.py`
  （manifest 登记）。重生成=删 png 再跑。
- **姿势 cel 工艺**：refs=[身份锚（权重首位）, 3D 底稿姿势帧（仅锁姿势）]；透明底由 prompt
  直接产出（"FULLY TRANSPARENT background, real PNG alpha"——gpt-image 经 codex 支持真
  alpha，1024×1536）。缺失的 3D 姿势帧用 `render.mjs --shots hybrid/config/a2_pose_shots*.json`
  补出（storyboard/a2/ref/：走拍一周期 8 相位固定背三四分机位 + 奥尔德工作台/钟楼下两张）。
- **走拍朝向依据**：bake（motion_full.json）相机-面朝夹角分析——艾琳全部走拍拍背
  （m04 avg 151°、m11 -159°、m12 178°；m18 正面单步用 stand 系 cel 近似），故 8 相位全部
  背面三四分；奥尔德 bake 无位移（任务要求慢步备用集），取正面三四分通用朝向。
  相位取自 m04 实测步态周期（t=30.50 起 0.83s 八等分）。
- **脸部变体工艺**：codex 同图局部编辑（EDIT_NOTE：仅改指定特征、其余像素不变）→
  auto_lock_variants.lock_one 按 rects.json 手工窗羽化锁回肖像锚——17/17 锁回成功，
  羽化光晕外与底图逐像素零差异；对比裁片目检（storyboard/a2/face_lock_verify_*.jpg）确认
  编辑落点正确无接缝。raw 全图保留在 faces/raw/ 供追溯。
- **比例门**（人工地标表 cels/landmarks/ + draw-over-animation/scripts/check_cel_proportions.py，
  容差 0.04；走拍奥尔德 0.05）：艾琳站姿 6/6 ok、奥尔德站姿 4/4 ok、夫人站姿 2/2 ok、
  艾琳走拍 8/8 ok、奥尔德走拍 4/4 ok。eileen_crouch / ladymoon_sit_throne /
  alder_stand_work 为蹲/坐/俯身姿势类差异，不进数值门（目检过）。报告 report_*.json。
- **验收目检结论**：身份跨画一致（发型/斗篷/铜扣/灯/怀表串/胡须/眼镜/夫人光环裙裾逐项核）；
  画风统一水彩+柔和赛璐璐，无一滑回 3D；透明底全真 alpha；走拍相位腿交换可读（背面跟靴：
  p1 双支撑→p3/p7 交叉→p5 摆动→p8≈p1 镜像闭环；奥尔德 4 格左右脚交替明确）。
- **翻车实录**：
  ① **2x4 宫格+双 ref 的走拍条 280s 超时**（prompt 长+两张参考）——提到 560s 一次过；
     宫格任务要给 codex 更长 timeout（已写进 gen_assets_a2.py 的 per-job timeout）。
  ② **水彩墨点杂点经低 alpha 雾桥与主体连通**——普通连通域（alpha>10）清理 0 收益；
     正法=硬核（alpha>96）连通域筛选（保 ≥最大域 2% 的组件，灯不离身）+ 膨胀 8px 回收软边
     （走拍格专用；姿势 cel 杂点极少，通用 clean_alpha 即可）。
  ③ **比例门 REJECT 先复查锚读数再返工**：首轮艾琳 boot_top 全员 +0.03~0.04 系统性偏移、
     奥尔德 waist 两张 -0.06——区域放大复读发现是**锚表读数错**（靴筒上沿 81.5→82.9%；
     马甲下沿误读衣襟线 42%→36.5%），修锚后全绿。系统性同向偏移=锚错，零散超差=画错。
  ④ ladymoon 裙为半透明多层：alpha 清理阈值只能动 ≤10 的不可见雾，不可碰裙缘半透明区。
- **遗留**：① 走拍格在宫格内不居中（逐格 alpha bbox 已存 *_cells.json，art_pass 摆放时
  按 bbox 对脚底锚点）；② 艾琳背面走拍腿被斗篷遮至靴部，换腿靠靴读——近景走拍（若有）
  需补正面相位；③ m18 正面单步暂无正面走拍相位（用 stand/look_up 近似，需要时补 4 格）；
  ④ 表情 lonely/tearful 差异含蓄（圣经"眼泪不夸张"，刻意克制）；⑤ faces/raw 与锁回品并存，
  raw 不进 manifest；⑥ 灯罩裂纹仍读成 X 骨架（A1 遗留，微距镜头合成阶段再评）。

## A3 cel-cinema 合成页 + 粒子重宿主 + 两窗口试片（2026-10-28，证据在 storyboard/a3/）

- **范围**：`hybrid/art_pass.html`+`art_pass.js`（1280×720 二维合成页，消费完整 64 拍镜表）+
  `hybrid/fx_rehost.js`（粒子 3D 层重宿主）+ `hybrid/config/art_cast.json`（选角/选画表）+
  `plate_grade.json`（底图压暗）+ `static_anchors.json`（静态锚点快照）+
  `config/art_pass_w1.json`/`art_pass_w2.json`/`art_pass_smoke.json`（pipeline 配置）+
  `config/a3_probe.mjs`（probe 断言）。
- **合成架构**（骨架学 stardust_clad_s1e2 art_pass_full_r6）：
  1. 场景底图：plates 按镜表 scene 切（snowtown 夜版 t<422 / 春版 t≥422 = skinFor 同规则）；
     视差取景=**相机朝向差**（方位/俯仰角 delta × 像素/弧度，阻尼 .5）+ 缩放
     （dolly×fov 比，阻尼 .45，**拍内只放不收**）；overscan 1.2。
  2. 人物 cel：cel-stage 刚性摆放（rigid:true），位置/尺度全部来自 bake 逐帧投影——
     眼线锚 faceCenter 投影、座/足锚 root 投影，drawnH =（眼到锚世界差 × ppu）/（画内分数差）；
     走拍=baked-cel-clip 距离驱动相位 + 逐格 bbox 底中对脚底锚点（A2 遗留①落实）；
     m46 过肩背影用 walk_p1 双支撑相位当静立背面（无正面背影资产，见遗留）。
  3. raster-face：新共享模块 `locked-variant-face.js`（已回 dula-skills/draw-over-animation/assets/，
     prepare 同步）——底图肖像+锁回变体同位贴窗（jaw 三态接 voice_envs.json 能量包络、
     blink 阈 .60、表情按镜表 emotion 映射表；m49 用 emotionTimeline 在 369.55 切 revived）。
     face_close=整肖像当镜头（drawnH 1000，macro 1150，s1e2 纪律：尺度是艺术常量，
     位置/滚转仍跟 bake faceCenter/headQuat）。
  4. 接触影 drawGroundContact 按 bake 足部投影（抬脚不画）；字幕条逐字同 3D 版
     （TL.subtitles + 角色分色 + 24 字断行规则原样）。
  5. 泪光/灯焰的 3D PointLight 反馈在 2D 以同包络径向辉光承担（'lighter'）。
- **粒子重宿主**：`effects/magic.js` 拆成 `buildMagicFX`（viewer 链不变）与
  `assembleMagicFX({TL,world,mode})`（装配核心）——world.anchors 支持 Object3D 或
  fn(t,out)（ParticleSystem 原生双形态），静态件（22 星阶/28 瓶阵/5 窗/天窗/双月轮/塔）
  由 `hybrid/tools/capture_static_anchors.mjs` 一次性快照（t=1 与 t=470 双捕零漂移）。
  art_pass 页内 20 系统全部原参数重建，锚点=bake 逐帧世界坐标 fn，相机=bake
  position/quaternion/fov 重建 PerspectiveCamera，合成=透明 WebGL 层 'lighter'。
  **3D 回归**：重构后 `node render.mjs --check --board storyboard/a3/check` 全绿
  （234 帧像素 seek 全等，bad max 0）。
- **试片**（pipeline.mjs --step render --render，`pilot.audio:"assets3d/mixed.wav"` 新增
  共享选项，已回 skill 的 pipeline.mjs + executable-pipeline.md）：
  - `output/art_pass_a3_m45_47.mp4`（331-352s，630 帧，递灯→「我还在这里呀」）
  - `output/art_pass_a3_m48_49.mp4`（352-374s，660 帧，含泪独白→泪碎→夫人句）
  - 确定性：24+25 项顺序/逆序/重复取帧 PNG 哈希全等。
  - 音轨数值：w1 e15 段 mean -20.9dB/max -5.7dB；w2 夫人句 mean -23.0/max -3.9；
    **泪落三秒（窗口内 14-17s）mean -50.2dB，与 P7 成片实测一致**（绝对时间对位正确）。
- **probe 断言全绿**（`storyboard/a3/motion_check.json`）：manifest missingAssets=0；
  眼线上段实测断言 err 0.1/0.3px（t=345.5 offer_lamp / t=341 sit_throne）；
  画中灯对 bake 灯焰锚点像素命中（maxAlpha 253，ONE_SPARK 与画灯同位）；
  肖像层裁剪后期望跨高实测 err 0；走拍相位 plants 11 vs wraps 10（换腿节拍对齐）；
  seek 乱序双渲 12/12 全等；粒子存在性（ONE_SPARK 348.5 / 泪碎 370 / 夫人边缘消散 360）。
- **翻车实录**：
  ① **底图视差别投影场景锚点**：微距拍（m45 递灯）相机看灯、宫殿锚点在机位后方，
     锚点投影 zFull 算出 0 → 整幅底图消失（黑场）。正法：底图位移用相机**朝向差**
     （四元数 forward 的方位/俯仰 delta），缩放用 |机位-锚点| 欧氏距离，永不奇异。
  ② **拍内底图只放不收**：推近主体时远景真实缩放 <1（相机离背景更远），但底图是
     有限画幅，收缩露黑边（m47 末帧左侧 65px 黑带目检抓获）——z 夹到 [1,2.5]，
     overscan 提到 1.2。
  ③ **baked-cel-clip 的 spec.cuff 不是可选项**（state 返回必填）——缺省 undefined
     直接 throw；调用方给 anchor 同值即可。
  ④ **cel-stage 的 clamp 是单参 [0,1]**：当三参 clamp(x,lo,hi) 用会把负值全夹成 0
     （底图 z=0 全黑的直接原因之一）。跨模块用 clamp 先确认签名。
  ⑤ walk cycleTravel 不能用"均速×周期"估算（0.62m/s×0.83s=0.515 错）：要从 bake
     接触事件实测——相位画取自 t=30.50 起 0.83s 周期，该周期根位移 0.402m，
     左脚落地事件间距稳态 0.37-0.40m，取 0.40（probe plants↔wraps 对齐验证）。
  ⑥ 管线探针的"人高断言"要算**画幅裁剪后的期望跨高**——近景全身 cel/肖像必然
     出画，裸比 measuredH vs drawnH 全假红。
- **遗留（A4 候选）**：① m46 艾琳过肩背影=walk_p1 静立近似（无背面站姿资产；
  她要递灯的话需补"背面递灯"cel）；② m47 e16 台词段她的画内脸在画幅上缘静止
  （短句 3.2s，可用 locked-variant 嘴窗贴姿势 cel 脸，A4 评估）；③ 坐/蹲/俯身 cel
  的 eyeFrac 为目测估计（sit_throne .128/refFrac .422、crouch .30、stand_work .16），
  A4 用刻度图复测进地标表；④ 泪碎点亮纱幕在肖像拍读作整体辉光近似（3D 为逐层点亮，
  肖像遮底图后层次不可见）；⑤ 底图 pop 感：plate 与 cel 是两层平贴，m45 灯前景与
  宫殿底图无景深过渡（可接受，A4 看全片再评）；⑥ m49 字幕 364 起而人声 369.6 起
  （TL.subtitles 既有摆点，3D 版同——内容侧决定，不在本层改）；⑦ 灯罩裂纹仍读成
  X 骨架（A1/A2 遗留，微距下依旧）。

## A4 cel-cinema 整集渲染 + 验收 + 审片（2026-10-28，证据在 storyboard/a4/）

- **补缺（A3 遗留①）**：新增 `eileen_offer_lamp_back` 背面三四分递灯 cel（codex gpt-image，
  `hybrid/assets/gen_assets_a4.py`，refs=[身份锚 eileen_full, 3D 摄影棚背面姿势帧
  `storyboard/a4/ref/a4_eileen_offer_lamp_back.jpg`——check_characters 新增 backq/backq_hi
  机位与 --only 过滤]），一次通过；`clean_alpha` 清杂点；比例门
  `check_cel_proportions.py --anchor _anchor_eileen_walk` ok（hem +.023 / boot_top +.029，
  容差 .04，报告 `cels/landmarks/report_eileen_back.json`）；manifest 登记（58 项）。
  m46 选画由 walk_p1 静立近似换成 offer_lamp_back。背面无眼可读，eyeFrac=0.10 按耳中上沿
  水平线估计（probe 实测 err 0.3px 兜底）。
- **eyeFrac 复测（A3 遗留③）**：trim 图（alpha>32，同 art_pass）+ 1% 细刻度图人工读数
  （`storyboard/a4/eyefrac/`）——**crouch .30→.215**（蹲姿眼线实测 21.5%）、
  **stand_work .16→.123**、**sit_throne .128→.135**（refFrac .422 经 A3 试片目检对位，保留）。
  crouch/stand_work 的原目测偏差会让 m15/m14 的人物落位错 ~40px/~20px（眼线锚定法下
  eyeFrac 偏差直接变成纵向错位）——复测必要。
- **整集配置**：`hybrid/config/art_pass_full.json`（start 0/end 478/30fps/1280×720/crf18/
  audio=assets3d/mixed.wav/hashEvery 60/26 采样点）+ `hybrid/config/a4_probe.mjs`
  （全片探针：manifest missingAssets=0、五姿势 cel 眼线渲染实测、三角色肖像跨高、
  走拍相位对齐、m46 构图回归、22 点 seek 双渲、十大场面粒子点名）。
- **渲染**：R3 定版 `output/art_pass_full.mp4`——478.000s / 14340 帧 / h264(crf18)+aac 192k /
  102MiB，单次全长渲染 18.8 分钟（~13fps，无分段拼接）；确定性 243/243（顺序哈希+逆序
  重取+重复取帧全等）。
- **验收全绿**：`pipeline --step probe` 六项全绿（`storyboard/a4/motion_check.json`）；
  `verify_full_episode.py` 11/11 全过——含 audio_packets/PCM 与 craft3d_full_v2 完全相同
  （=mixed.wav 同链 AAC）；音轨实测：泪落三秒 366-369 mean -50.2dB、全片峰值 -3.8dBFS，
  与 3D 成片一致（绝对时间对位正确）。
- **审片**（抽帧 53+12+对照 8 张，frames/frames_r3/frames3d/；每幕 8-13 时间点覆盖全部
  指定节点 m01/m05/m08/m10/m13/m21/m24/m31/m37/m39/m44/m46/m47/m49/m54/m55-57/m58/m61/m63
  +关键对照 3D 同时刻帧）。**圣经第五步清单**：① 身份连续性 ✅（三人跨五幕发型/斗篷/铜扣/
  怀表串/光环一致，走拍/蹲/坐/递灯各姿势 cel 无漂移）② 空间轴线 ✅（m46 过肩与 3D 同侧）
  ③ 动作连续 ✅（灯：手提→蹲放→捧递→未接→抱怀；瓶：捧→离瓶→脱手；走拍相位与接触对齐）
  ④ 粒子连续 ✅（萤火落睫/星瓶苏醒/星阶/泪碎/钟声三响/窗灯/聚字逐帧连续，seek 全等）
  ⑤ 灯光反馈 ✅（灯焰跟锚辉光/泪光包络/星核暖光/终幕渐暗后灯焰与聚字仍亮）
  ⑥ 字幕 ✅（抽帧全部逐字同圣经，断行规则同 3D 版）⑦ 音乐情绪 ✅（音轨=3D 成片同一
  mixed.wav，PCM 级一致；静默区数值同前）。
  负面约束：现代城市/霓虹/金属盔甲/过曝粒子/镜头抖动/脸部漂移/服装变色/手指畸形/
  对白改写——均未发现；情绪停顿在位（m47-49/m52 静默区）。
- **审片发现并修复（全部重渲进 R3 定版）**：
  ① **P0 终幕纱罩压死聚字与灯焰**：FINALE_DIM/FADE 黑纱原画在粒子层之后，m63 金粒聚字
     被 ×0.08 压到不可读（3D 版纪律=黑纱先画、灯焰与加色粒子后画保持亮度）——纱罩移到
     辉光/粒子层之前（art_pass.js draw 次序 2.5），首帧淡入仍盖一切。
  ② **P1 m62 奥尔德站上右房屋脊**：bake 脚底投影 (893,434) 落在底图屋脊（3D 他在塔门口
     地面，底图塔身比几何窄，且底图无逐件遮挡）——placeBody 新增 `groundY` 画幅落地修正
     （静态机位限定），m62 脚底落屋前草甸线 575。
  ③ **P1 m56 同族**：横移拍（pan）里投影点沿左房屋脊爬升——groundY 定点会滑脚，新增
     `shiftXY` 整画随镜平移 [0,+150]。
  ④ **P1 m58 同族**：establish 里奥尔德落在塔身中横梁——groundY 545 落塔门草甸线。
  ⑤ **P1 m33 选画与底稿表演相反**：底稿=抬头望星阶说「失传的星辰魔法」，A3 选了低头
     摸表的 touch_watch——改 stand_hope（抬头仰望）。
  ⑥ **P1 m53 第一片花瓣丢失**：3D 版 petalHand 网格实体在 2D 重宿主 mode 守护下不建——
     art_pass.js 重宿主为画片（同纯 t 闭式轨迹 395.2 飘落→396.3 落手背→407 前静止），
     m53 选画换 touch_watch（底稿=摊掌接瓣于胸前），花瓣锚画内手背 `handXY`（刻度图初读
     (405,401)，试片帧校准 +79/+73——画内手≠bake 手，bake 手是 3D 摊掌高位）。
- **A3 遗留②④结论（评估后不动）**：m47 画内脸在画幅上缘静止——短句 3.2s、画内脸仅
  ~35px，读感成立，不贴嘴窗（若用户复看嫌呆，可用 locked-variant 嘴窗贴 offer_lamp 脸区
  升级）；泪碎点亮纱幕在肖像拍=整体辉光近似——读感成立（泪碎粒子层+同包络回暖辉光，
  肖像遮底图后逐层本就不可见），不做。
- **翻车实录（A4 新增）**：
  ① **渲染命令别接 `| tail`**——tail 收管道缓冲，进度日志全憋住，只能盲等；后台任务要
     `> log 2>&1` 直写文件。本伦因此白烧 4 分钟首渲。
  ② **JSON 对象重复键静默后者胜**——art_cast.json 已存在 `"m62"` 行，追加新行不报错但
     永远不生效（groundY 假绿一轮）；改选角表先 grep 既有键。
  ③ **`const x` 上加 shiftXY 修正直接 pageerror**（Assignment to constant）——pipeline 把
     页面错误一律 throw，试片渲染最先暴露；改代码后先跑无 --render 的采样快检再进整渲。
  ④ **中途改源文件=整渲作废**：build.json 指纹在启动时固定，渲染中途改 art_pass.js/
     art_cast.json 后 verify 的 render_sources_current 必红；两次停跑重启因此损失 ~10min，
     正确顺序=全部改完→采样快检→probe→整渲。
- **遗留（待用户复看/审美批准）**：
  ① 肖像拍 roll 时四角露底图三角区（m05/m16/m19/m22/m52 等 face_close 可见，A3 起既有
     风格，读作画框式取景；若要消除可给肖像层加 1.08 过扫描）；
  ② 底图画内钟面指针是画死的（夜版≈4:00、春版≈2:00，两版不一致；3D 的"指针缓转"在
     2D 不成立）——修=给钟面单独加 2D 指针层（clockFace 锚已在 bake）；
  ③ m59 艾琳站塔身中段（3D 为外挑阳台几何，底图无阳台）——她脚底恰好压在塔身横梁线上，
     读作"站在横梁"弱穿帮，可接受；要根治需底图补阳台或该机位换构图；
  ④ m63 灯焰辉光点落在画内脸鼻区（bake 捧灯升高锚点在面部特写投影中落入脸区）——
     读作灯光映脸，可接受；
  ⑤ 灯罩裂纹仍读成 X 骨架（A1 起）、ONE_SPARK 静帧弱读、m55-57 钟声环为细点环
     （3D 版同弱读，P7 已记）；
  ⑥ 声线/配乐本体仍未听审（沿用 P6/P7/A5 遗留，本环境无音频输出）。
- **并排对照片**（3D 底稿 vs cel-cinema 成片，`storyboard/a4/compare/`）：m05 望月特写 /
  m21 星瓶苏醒 / m46 过肩递灯（新背面 cel）/ m63 终幕聚字。

## R2a 音频返修（2026-11，监制反馈：女配音不符合角色 + 环境音多处不同步）

- **三女声全部重选**（Alder 唐僧 2.0 保留；试听工艺：volc-voice-casting 目录刷新 466 音色 →
  每角色 4 候选 × 2 代表句（生产 delivery 同参：rate/context/emotion）→
  `tmp/voice_audition/r2/`（run_audition.py 驱动，24/24 合成成功、时长窗全 ✅、
  qc_lines 拼音全 ✅；本环境无音频输出**未盲听**，按目录气质+F0+时长+拼音选定，待监制复听）：
  | 角色 | 旧（P6） | 新（R2a） | 候选对比 | 理由 |
  |---|---|---|---|---|
  | Narrator | 少儿故事2.0 | **温柔妈妈2.0** wenroumama | xiaoxue（儿童绘本，清甜但长句余量小）/vv（客服标签风险）/shaoergushi（现任，偏活泼） | 舒缓温润母性=炉火边讲故事；F0 155-185Hz 四候选最低最稳 |
  | Eileen | 萌丫头2.0 | **文静毛毛2.0** wenjingmaomao | linjianvhai（F0~200 偏青年龄）/qingchezizi（清澈但 e16 1.92s 偏赶）/yingtaowanzi（演绎类但跳脱，e16 F0 341 元气风险） | 轻柔安静萝莉=11 岁"天真不奶气、轻而坚定"；规避 mengyatou 元气过头+整词崩坏前科 |
  | LadyMoon | 林潇2.0 | **魅力苏菲2.0** sophie | gufengshaoyu（清冷古典但 F0 255-277 偏年轻）/wenroushunv（太暖太近）/gaolengyujie（气场过强） | "外表疏离、内心细腻柔软"=超然+慈爱；F0 193-197 成熟偏冷；无资讯感 |
- **逐句重生成**：女声 28 句（n01-04/e01-19/m01-05）全部新声线重录（台词逐字与演绎指令不变，
  缓存三元组因 speaker 变更自动失效重录；Alder 9 句 SKIP 复用）。旧音频留档
  `assets3d/dialogue/_archive/p6/`（28×3 文件+旧 qc_report）。QC：**37✅/0⚠️/0❌**
  （P6 的 2⚠️ 消除：n03 不再临界、e13「您」新声线拼音 100%）；e17 长句 rate 25 下 9.19s/窗 11.9 ✅
  （新声线无 sad 拖腔问题，seedEmotion 维持 null）；无 emotionDropped。
- **环境音对位返修**（以成片 output/art_pass_full.mp4 实际画面帧为准重核：5fps 瓦片网格
  31 事件窗目检 + 帧差/ROI 亮度数值扫描，`tmp/r2_frames/`）：
  | 事件 | 旧摆点 | 新摆点 | 依据 |
  |---|---|---|---|
  | 踩雪脚步 m04 | 27.2 连续 excerpt | **27.583 起 25 步逐 stance** | bake planted false→true 接触时刻（27.633-34.133）；`tools/build_footsteps.py` 从 footsteps_snow.wav 切 11 个步片 LCG 轮换+增益抖动 .8-1.0 |
  | 踩雪脚步 m11 | 78.3 连续 excerpt | **78.483 起 22 步逐 stance** | 同上（78.533-83.767） |
  | petal_touch | 396.0 | 396.3 | 花瓣落手背实测 396.3（magic.js 395.2 飘落→396.3 落手，帧目检一致） |
  | star_chest | 446.0 | 446.4 | 胸口 ROI 亮度实测 446.5 起升 |
  | gold_text | 466.0 | 466.4 | 金粒聚集画面首见 466.5 |
  | 其余 18 事件 | 不变 | 不变 | 帧核全部与 cue 一致（门 85/天窗 184/泪碎 369.0/钟声 408·413·418/星醒 156/灯灭 58/灯燃 430 等） |
- **2D 版画面事实**：m12 木门在 cel 底图上是画死的（84-89 门区亮度零变化），门轴声 85.0
  是"她在门前、开门靠声效叙事"的画外承担，保留；若监制仍觉出戏，选项=删 door_creak 或
  挪到 88.5 黑场前。
- **产物**：`config/voice_envs.json` 重建（37 句新包络，哈希与当前 wav 全对、无超窗）→
  remix → `assets3d/mixed.wav`+四 stem 重出（Suno 音乐层未动）；`check_audio_sync.py`
  23 事件全过（脚步 stance 抽查 6 点 offset ≤0.069s；钟声三响 +0.112 同 P6=素材起音延迟）。
- **电平**：成片峰值 -4.4dBFS（-2 上限内）；泪落三秒 366-369 mean -50.6dB（旧 -50.2）；
  尾声 473-478 mean -43.7dB（旧 -43.4）；音乐分轨 348-400 静默 -91dB；钟声高潮段 max -5.9dB。
- **踩坑/教训**：① 文静毛毛基线语速慢（e01 4.44s vs 同句他人 ~2.8s），长句要留 rate 吸收
  余量——本次 28 句零超窗，但换声线后务必全量重测时长（QC manifest 已按实测重建）；
  ② 帧差扫描会被镜头切换淹没事件信号（切镜帧 diff 远大于粒子事件），事件对位要 ROI 裁剪+
  瓦片目检兜底，不能全帧 diff 一把梭；③ bake 的 planted 接触表是 cel 走拍的画面真值
  （相位由 bake 距离驱动），脚步对位直接用它，不要再从成片帧反推。
- **遗留**：① 三新声线仍未盲听（无音频输出环境），监制复听后若再换：改 voice_config.json
  + 删对应 id 的 dialogue/*.{mp3,wav,source.json} 重跑 gen_dialogue→build_voice_envs→remix；
  ② 旧 mixed.wav 已被覆盖未留档（旧版音轨仍封存在 art_pass_full.mp4/craft3d_full_v2.mp4 内可回溯）；
  ③ 视频未重渲（画面侧拿新 voice_envs.json 自行重渲）。

## R2 监制整改（2026-10-28，证据在 storyboard/a4/full 采样帧 + compare_r2/；**本轮不出整集**——音频侧重选女配音中，voice_envs.json 到达后先重跑 probe 再整渲）

监制四条反馈全部修复到 ready-to-render。验证基线：`pipeline --step probe` 十项全绿
（storyboard/a4/motion_check.json）；3D viewer 链回归 `node render.mjs --check --board storyboard/r2/check`
全绿（234 帧像素 seek 全等——本轮未动 viewer 链任何文件，全改在 hybrid/）。

### R2-1 贴地系统化（"人走到天上" P0）

- **机制**：新配置 `hybrid/config/ground_calib.json`（tools/build_ground_calib.mjs 构建）——
  每拍每角色一条**底图空间**（1920×1080 plate 像素）地面线（1-3 点折线，人工从采样帧读数、
  经当帧 plateTransform 反解落盘；多点折线因走拍/横移拍地面沿路径不共线）。帧级摆放时
  脚底屏幕 x → 底图 x → 折线插值 → 屏幕 gy，修正量 **dy=gy−cel当前底边**（±140 钳制）。
  底图平移/缩放逐帧跟镜头，pan/推轨不滑脚（取代 A4 的 groundY/shiftXY 补丁，已从
  art_cast 移除）。星阶拍豁免（m37 脚踩悬浮星阶=bake 台阶锚，正解）。
- **断言**：`__art.groundReport()`（probe 第 8 项 groundBand）——64 拍×三角色全覆盖：
  22 条 ground 目渲染实测脚底/cel 底边在地面线 ±tol(14-22px) 全绿；豁免逐条登记理由
  （肖像/微距/脚底出画/王座坐姿/被遮挡/剔除/星阶/黑场遮蔽/m59 平台）。
- **人工读数修正的悬空拍**：m04 末幅（她在塔身中横梁→塔门基座 530）、m56/m58/m62
  （A4 已修的屋顶三拍迁入标定表）、m13 末幅（coverage clamp 顺带修复——俯仰差曾把底图
  上抬露出 105px 底黑带且人物踩黑，现平移以"永不露边"为硬约束）。
- **m59 塔顶阳台**：底图无 3D 外挑阳台构件——画补木质平台（栏杆立柱+扶手+板缝，
  木料色=她脚底处底图塔身实测采样，宽 1.25m 世界），她站上台面、接触影落在台面。

### R2-2 人景融合三层（"贴纸感" P0）

1. **分区 color grade**：`cel-stage.place` 新增 `tint`（MeshBasicMaterial.color 相乘，
   共享模块回合 dula-skills）。帧级采样**站位处**底图（脚下到小腿小盒均值，底图 1/4 缩图
   采样器）→ 色度方向偏 32% + 亮度钳 [-18%,+12%]——人物是主体不压没。逐拍逐人站位实测，
   非全片一刀切（m21 工坊琥珀暖调、m62 春日暖金、m44 宫殿冷银实测可分读）。
2. **方向性接触影**：LIGHT_STYLE 按场景主光给投射方向与强度（夜=窗灯侧 [66,-8]、
   工坊顶光短后坠、星阶月在右上映左下、宫殿顶光正下、春日左低影向右），
   半径 22→24、不透明度 .26→.38-.45。走拍脚底单椭圆同步。
3. **rim 环境边光**：cel 剪影外圈（blur+source-in 填色+destination-out 抠本体+降 alpha .14）
   按 (cel, 底图) 惰性生成注册为 order=1 底层 cel，颜色=该底图站位带实测主色，
   迎光向微偏移——贴纸边消除。

### R2-3 环境动态补齐（"环境全静态" P0）——3D 有 vs art_pass 有 对照表

| 环境件（3D 场景 update 驱动） | art_pass R2 | 实现 |
|---|---|---|
| S01 落雪（小而疏持续飘落，m54 空中转粉） | ✅ 补 | fx_rehost 新粒子系统（240 粒，取模回绕+微漂，场景 drift 同式） |
| S01 雪落地前化蓝光点 | ✅ A3 已有 | magic.js 雪化蓝光点系统（60 粒，404 渐隐） |
| S01/S05 花瓣飘落（m54 转化窗+春皮常驻） | ✅ 补 | fx_rehost 花瓣系统（150 粒，更慢更飘） |
| S01 窗灯低谷压暗/依次亮起/终幕熄 | ✅ 补 | **底图空间**琥珀辉光×5（window_glows.json 人工读数锚到画出来的窗户；包络同场景 update，加呼吸摇曳） |
| S01 门缝暖光（m12 84-92s） | ✅ 补 | 世界锚辉光（塔门，包络同 doorGlow） |
| S01/S03 月亮光晕衰减+月辉 | ✅ 补 | 世界锚双层银蓝辉光呼吸（衰减小结 dim/fade 包络同场景；底图月亮已压暗，特写仍"黯淡细银"） |
| S01 钟面指针 m55 起缓转 | ❌ 未补（记遗留） | 底图钟面是画死的；补=加 2D 指针层（clockFace 锚在 bake，下轮可做） |
| S01 终幕渐暗/片尾淡出 | ✅ A4 已有 | 黑纱罩在辉光/粒子层之下（A4 修复） |
| S02 齿轮转动+GEARS_STOP 制动 | ❌ 不补（注明理由） | 整幅底图不可局部旋转；制动节拍由音效 gears_stop + 星瓶苏醒承担 |
| S02 星瓶苏醒逐瓶点亮/浮动 | ✅ 已有+增强 | 星核脉冲/星云粒子 A3 已重宿主；R2 补台面油灯琥珀呼吸辉光（warm=24+14·wake 包络） |
| S02 环境微尘 | ✅ 补（3D 本无，监制令新增） | fx_rehost 微尘系统（90 粒暖光锥缓浮） |
| S03 天窗滑开/星阶凝形 | ✅ 已有 | 凝形由底图+星阶晶化粒子承担（A3 重宿主） |
| S03 星阶金尘缓升（m31+） | ✅ 补 | fx_rehost 金尘系统（44 粒，场景 sparks 同式） |
| S03 云层视差漂移 | ❌ 不补（注明理由） | 底图为整幅画；镜头运动由视差取景承担，云自身漂移优先级低 |
| S04 银粉缓沉（失光加速/泪碎回暖） | ✅ 补 | fx_rehost 银尘系统（130 粒，场景分段积分距离同式） |
| S04 月光逐缕熄灭→泪碎回暖 | ✅ 补 | 宫殿失光纱罩（dimK/glowK 包络同场景灯光，cel 之后粒子之前） |
| S04 纱幕微光呼吸/逐层点亮 | ◑ 近似（A3 起） | 整幅辉光近似，肖像拍读感成立（A4 结论保留） |
| S01 m50-52 低谷单冷光大阴影 | ✅ 补 | lowK 冷暗纱罩（包络同场景灯光） |

### R2-4 表演微动 + R2-5 口型（P1）

- **呼吸微动**：站姿 cel 从 rigid 改为 cel-stage 呼吸项（breath=1.1/0.9/0.75px 按角色，
  time=绝对 t，seek 安全）；走拍保持相位换画刚性（运动来自换画纪律不动）、肖像保持刚性
  （脸由变体承担）。
- **表情切换对齐眨眼**：拍内 emotionTimeline 切换点吸附到下一眨眼峰值（snapToBlink，
  纯 t 解析解，>2.2s 等不起就直切）；切镜边界的表情变化由镜头切换天然掩护。
- **口型**：载入期预处理 voice_envs.json（**只依赖 lines[].jaw/dt 接口，音频侧重生成后
  重载即生效**）——逐角色阈值（艾琳 .10/.34、奥尔德 .07/.28、夫人 .085/.31）+ 相邻帧
  均值 + 三态迟滞（升阈开/降阈关，防能量抖动的开关嘴；长停顿闭口）。态→合成 jaw 值喂
  locked-variant-face 既有 .075/.32 阈，共享模块零改动。
- **断言**（probe 第 10 项 lipSync）：m48/m22/m49 台词窗三态开合变化存在（35/13/8 次切换）
  且切换率 <9/s（无抖动），泪落静默窗闭口 ✅。

### 翻车实录（R2）

① **cel-stage 的 clamp 单参 [0,1] 陷阱重犯**（A3 翻车④已写进 executable-pipeline 仍复发，
   且三处）：groundDy 的 ±140 钳制被夹成 1（修正量全军覆没却表现为"轻微偏差"）、
   底图采样器的坐标钳制把站位采样变成**左上角天空色**（tint 全程错色而不自知）、
   tintFor 亮度钳同病。教训升级：**共享模块的单参 clamp 一律不许当三参用；凡"小幅差异"
   的回归先怀疑修正量被吞**。已写回 cel-cinema SKILL。
② 修正量必须对 **cel 当前底边**（y0）而非 bake 根投影：蹲姿 cel 底边=灯底（画面接触面）
   而 bake 根更低，对根修正会把灯抬离地面（m15 实测 -21px 且修正方向反了）。
③ 环境辉光锚点别混空间：月/油灯/门缝=世界锚（跟镜头走）✓；**窗灯必须底图锚**
   （3D 世界窗位投影到底图房屋上方悬空——画出来的窗户在哪，辉光就在哪）。
④ 底图覆盖钳制要随 plateTransform 改完再重建标定表（builder 读活 plateView；
   顺序：改代码→build_ground_calib.mjs→probe）。
⑤ 画补构件先小样：m59 阳台平台首版宽 1.9m+采样色读到了天空（同①的采样器 bug），
   读成跨画面白钢梁；收窄到 1.25m+栏杆立柱扶手+脚底处采样木纹后成立。

### 遗留（待整渲轮或用户复看）

- 底图钟面指针画死（夜≈4:00/春≈2:00 不一致；3D"指针缓转"在 2D 未补——可做 2D 指针层）。
- S03 云自身漂移未补（注明理由见对照表）；S02 齿轮不转（注明理由）。
- 肖像拍 roll 露底图三角区（A4 起，风格读作画框取景）、走拍格 rim 未加（小尺寸人物靠
  tint+接触影承担，记录）。
- 口型/微动参数为数值验收+抽帧目检；**voice_envs.json 重生成到达后：probe 重跑→
  整渲→verify_full_episode 11/11**（本轮按监制令不跑整渲）。
- 声线/配乐听审遗留同 A4/P6。

### R2 整渲定版（2026-10-28 晚，新配音交付后）

- **音频侧交付**：新 `config/voice_envs.json`（37 句新声线能量包络，接口不变，载入期预处理
  直接生效）+ `assets3d/mixed.wav` 重混（478.000s，泪落三秒 366-369 mean -50.6dB 静默纪律
  保持）。`tools/check_audio_sync.py` 重跑：全事件 onset 对齐（failures: []，含金粒聚字
  cue 466.7s）。
- **probe 重跑（新包络下）**：十项全绿——lipSync 断言重过（m48/m22/m49 台词窗开合
  35/13/8 次无抖动，静默窗闭口）。
- **整渲**：`output/art_pass_full.mp4` = R2 定版（478.000s / 14340 帧 / h264 crf18 +
  aac 192k / 104MiB，单次全长 20.3 分钟；确定性 243/243 全等）。A4 版留档
  `output/art_pass_full_r1.mp4`。
- **verify_full_episode.py**：全过。音轨验收按监制口径改为
  `audio_pcm_matches_pilot_audio`（输出解码 PCM == 新 mixed.wav 同参 AAC 编码的 PCM，
  同机同编码器确定性一致）——verify 脚本新增 pilot.audio 分支（旧行为=无 pilot.audio 时
  与源片音轨比对，不变），已回合 dula-skills/draw-over-animation/scripts/。
  3D 基线片 craft3d_full_v2.mp4 仍是旧混音（sha256 未变，accepted_source_unchanged ✅）——
  它是画面底稿基线，音轨口径以 mixed.wav 为准（监制令）。
- **终审抽帧**（frames_final/，全部亲看）：m04 走拍贴地+落雪+月晕+窗灯 ✅、m04 末幅
  落塔门基座 ✅、m05 望月肖像 ✅、m21 星醒（琥珀融合+苏醒拖尾）✅、m37 星阶金尘 ✅、
  m46 过肩递灯+宫殿失光+银尘 ✅、m48 含泪独白（迟滞口型低能量闭口正确）✅、
  m49 366.2 泪珠蓄积/369.5 泪碎 ✅、m58 日出花瓣+窗灯 ✅、m63 黑场聚字+灯焰+字幕 ✅。
- **遗留**（同 R2 清单，无新增）：钟面指针画死、肖像 roll 露角、走拍格无 rim；
  新声线/配乐本体听审仍是用户侧事项（本环境无音频输出，仅数值+对位验收）。
