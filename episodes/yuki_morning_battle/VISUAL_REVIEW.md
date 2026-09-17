# 《早起大作战》Visual Review — yuki_morning_battle

62s 搞笑短片。小雪主角，配角：年糕（Mochi）、咕噜（Gulu）、旁白。
画面：引擎渲染 + sketchify 手绘描边（角色工艺同 yuki_cat_diet）。
场景：`scenes/YukiRoomScene.js` —— 小雪家少女卧室（episode 自定义场景，粉色系：
左墙床铺 + 床头柜闹钟（剧情道具）、右后书桌粉椅、后墙粉丝窗帘 + 海报 + 猫脸挂钟、
漫画书架、中央粉白圆地毯），不再是 RoomScene（大雄家）。
音频：全火山——seed-tts-2.0 四声线 + Seed-Audio 1.0 BGM/SFX。

## 审核记录

### Round 1（首版 verify）
| 问题 | 级别 | 状态 | 修复 |
|---|---|---|---|
| 条3 梦话镜头小雪甩头背对镜头（Gaze auto 转向咕噜） | P0 | ✅ | 该条 `Gaze mode=free` |
| 条10 年糕揭底镜头贴脸拍猫屁股（走位后朝向未复位 + 机位过近） | P0 | ✅ | 条目切镜处 `Position face=forward` 复位 + 机位拉到 2.4m |
| 条8/9 走位后小雪偏离后续特写机位 | P0 | ✅ | 条10 切镜时 Position 复位 |
| 开场全景咕噜半身在左边缘 | P2 | ✅ | 初始站位 x=-3.0 → -4.5 |

### Round 2（gaze/站位修复后）
| 问题 | 级别 | 状态 | 修复 |
|---|---|---|---|
| 年糕台词时被 auto gaze 转向小雪，侧脸示人 | P1 | ✅ | 年糕台词条 `mode=free`，正对镜头打破第四面墙（喜剧效果反而更好） |
| 条10/12 咕噜左边缘露半脸抢戏 | P2 | ✅ | 条10 咕噜移开 x=-2.6，条13 切镜时归位 |
| 条17 年糕被小雪走位碰撞挤到画面右边缘 | P0 | ✅ | 条17 切镜时 Position 复位（碰撞是 BodyCollisionGuard 正常行为） |

| 26s 右腿袜鞋交界像断口 | P0 | ✅ | 两道叠加：摘掉袜子的描边壳（描边壳从鞋面戳出形成锯齿），鞋头上移盖住交界。残余的袜鞋交界线就是手绘沸腾线风格本身，静态帧可见、动态中读作手绘质感；若还要更干净，下一步可以把袜/鞋合并成单一靴子网格 |

### Round 8（腿部最终重构）
| 问题 | 级别 | 状态 | 修复 |
|---|---|---|---|
| 22s 跑步腿鞋错位/像断了 | P0 | ✅ | 摘掉扁圆球鞋，换与腿同轴的靴子胶囊（同轴不可能错位）；所有改动在 sketchify 之前完成，靴子也有手绘描边 |
| 31s 安全裤漏出裙底 | P0 | ✅ | 裙子 scale.y 1.4 加长 + 裙摆下移，任何角度盖住；躺窗收裙参数同步加大 |

### Round 7（穿帮细节）
| 问题 | 级别 | 状态 | 修复 |
|---|---|---|---|
| 侧躺时裙内穿帮（开口圆锥裙内侧看穿/镂空） | P0 | ✅ | 裙摆改 DoubleSide + 裙底加深蓝安全裤椭球（ShoeFixedYuki.build），躺/跑任何角度都有遮挡 |
| 年糕左侧胡子扇形画反（最下面的往上翘） | P1 | ✅ | dula-assets/characters/Mochi.js：`fan*side` 符号错误，左侧应为 `π/2+fan`（修了共享资产，其它集同受益） |

### Round 6（裙摆 / 鞋袜 / 倒立三连修）
| 问题 | 级别 | 状态 | 修复 |
|---|---|---|---|
| 睡觉时裙子掀起来（走光风险） | P0 | ✅ | `_tuckSkirt(true)`：躺窗内裙摆顺腿旋转放下 + 放大盖住大腿（睡裙感），起床恢复 |
| 22s 跑步脚还是像断的 | P0 | ✅ | 鞋袜咬合加强：袜子下移扩半径、鞋变圆大面积重叠（Round 5 的修补重叠量不够，腿后摆时鞋尖外戳仍显分离） |
| 26s 人消失只剩一双鞋 | P0 | ✅ | 探针实锤：走位 lookAt + 矩阵姿势 rx 恢复叠加，欧拉角落到 rz=-π 翻转解（人倒立进地板）。加防翻护栏：非躺平时 rz 超阈值归零、rx 收限。**verify 是跳帧 scrub 抓不到这类连续累积 bug，必须渲染后抽帧** |

### Round 5（睡姿 + 脚部结构修复）
| 问题 | 级别 | 状态 | 修复 |
|---|---|---|---|
| 走路时鞋和脚踝分离像断掉 | P0 | ✅ | 原资产鞋(球)/袜(柱)/腿(胶囊)之间有缝隙，ShoeFixedYuki 把鞋上移放大、袜子下移互相咬合；另 Walk 也参数化降摆幅（条16） |
| 「别抢我的鸡腿」梦话站着说 | P0 | ✅ | 新增 LieSleep 睡姿：小雪躺床上（年糕趴床脚），条2 机位给床+闹钟全景，条3 睡颜特写；条6 闹钟攻击后弹起复位 |
| 平躺技术攻防 | — | ✅ | mesh.rx 被 JointLimits 硬夹 ±30°，且 SceneBase 帧末约束 pass 会兜底；最终方案：LieSleep 注册为空姿势矩阵动画（让 Yuki 提前拥有 _actionMatrix），ShoeFixedYuki.update 关掉她的关节硬限制+速度平滑，并在子 Mesh 的 onBeforeRender 里兜底重写 rx=-86°。场景配置条（条1）里的动画 cue 不会被调度，LieSleep 必须放在条2 |
| 躺窗结束后「躺着收拾书包」 | P0 | ✅ | 条6 起床时的 Position 瞬移触发 teleportBaselineToCurrent，把躺平的 rx=-86° 捕获进动画基线，之后所有 mesh.rx 姿势（Run 前倾）都叠在躺平值上。躺窗结束时修 `am._baselinePose.mesh.rx = 0` |
| 条16 咕噜挡在镜头和小雪之间 | P1 | ✅ | 条15「给我出去」时咕噜走位退场（顺手呼应台词） |
| 结尾尖叫镜头重复用条6 构图 | P2 | ✅ | 改为画外尖叫：镜头留在年糕冷面上，喜剧收尾更稳 |

### Round 4（自定义场景 + 跑姿修复）
| 问题 | 级别 | 状态 | 修复 |
|---|---|---|---|
| 用的是 RoomScene（大雄家），不是小雪家 | P0 | ✅ | 新建 episode 自定义场景 `scenes/YukiRoomScene.js`（少女卧室），bootstrap 注册描边变体，`@YukiRoomScene` |
| 跑步时腿像断了一样（Run 摆幅 0.72rad 对三头身太夸张，腿从裙摆甩出） | P0 | ✅ | `{Animation:Run|…|legLift=low|stride=0.42|armSwing=0.6|frequency=4.6|lean=0.10}` 小碎步快频摆臂，喜剧感反而更强 |

### Round 3（成片抽帧）
| 问题 | 级别 | 状态 | 备注 |
|---|---|---|---|
| 条18 尖叫时表情偏温和（FaceScared 幅度小 / FaceRelaxed 残留） | P2 | 🔄 已知 | 已补 `{FaceScared}` 并重渲，改善有限；尖叫声 + 惊跳 + comedy_shock 特效足够撑住笑点，后续可考虑夸张表情强化 |
| 条17 低机位宽镜左边缘可见咕噜侧身 | P2 | 🔄 接受 | 不遮挡主体，保留 |

## 音频
- 配音：seed-tts-2.0。Yuki=`zh_female_vv_uranus_bigtts`，Narrator=`zh_male_ruyayichen_uranus_bigtts`，Gulu=`zh_male_taocheng_uranus_bigtts`，Mochi=`ICL_uranus_zh_male_youmodaye_tob`（幽默大爷冷面嗓，全片核心笑点）。
- 年糕三句台词语速慢导致 OVERRUN，已通过加宽槽位（而非删减台词）解决，deadpan 节奏保留。
- BGM：Seed-Audio 1.0 两版候选，客观指标选版（v1 动态对比更大，-20.7dB vs -17.5dB），未人工听审。
- 环境音：morning_birds 晨鸟床（0-62s）；SFX：alarm_clock / record_scratch（Seed-Audio）+ takecopter_spin / dash_whoosh / whoosh_fast / impact_thud（复用既有资产）。

## 出片
`output/output.mp4` — 62.0s，1920×1080，h264+aac，混音 RMS -22.2dB。
