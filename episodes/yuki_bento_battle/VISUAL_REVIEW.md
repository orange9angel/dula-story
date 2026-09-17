# 《便当大作战》Visual Review — yuki_bento_battle

101s 群像搞笑片，小雪系列第二集。新角色：闪电（Flash，瘦黑猫老江湖）、
豆豆（Dodo，幼儿园精力球），均为本周期新建的官方资产（dula-assets）。
场景：小雪家（ep1 YukiRoomScene 复用 + 便当盒时间态道具）。
音频：全火山——seed-tts-2.0 六声线 + Seed-Audio BGM/SFX。

## 剧本工艺（story-writer 规范）
- 喜剧引擎： escalating repetition（抢便当三段升级）+ misdirection
  （观众和猫都以为是炸虾，揭底是减肥餐）+ reaction gap（年糕全程淡定）。
- 空拍：条18（65.5-67.8s）全员盯着地毯上的便当盒，紧随翻车揭底（转折）。
- 余味词：释然。结尾豆豆真诚爱吃胡萝卜，小雪自嘲「下次直接做兔子饭」。

## 审核记录

### Round 1（首轮 verify + story_tool validate）
| 问题 | 级别 | 状态 | 修复 |
|---|---|---|---|
| FaceScared/FaceRelaxed 未注册被静默跳过（validator 抓到） | P0 | ✅ | 换 FaceSurprised/FaceHappy；dula-story/AGENTS.md 表情标签清单改为以注册表为准；ep1 同修法重渲染 |
| 开场全景咕噜挡住书桌和便当（主角道具不可见） | P0 | ✅ | 咕噜初始位移出画，条10 走位入场 |
| 闪电破窗跳入不可见 | P0 | ✅ | Jump 动画被拉伸到整个条目（6.2s）且基线 y=4.4（窗台），全程悬在画框上沿外。摘掉 Jump，Event:Move 带 y 下沉即可见；镜头上抬接下落 |
| 双猫对峙时便当提前开盖 | P0 | ✅ | 场景道具换态时间写成了草稿值（39.8/55.6），改成对齐正式时间轴（55.2 碰落 / 68.1 开盖） |

### Round 2（成片抽帧）
| 问题 | 级别 | 状态 | 修复 |
|---|---|---|---|
| 结尾条26 两人背对镜头收尾 | P2 | ✅ | 加 {TurnToCamera}，小雪转身对镜头说收尾台词 |
| 条17 大爷口尾音拖进空拍 +0.46s | P2 | 🔄 接受 | 尾音淡入空拍，喜剧节奏可接受 |

## 音频
- 配音 seed-tts-2.0：Yuki=vv_uranus、Narrator=ruyayichen、Gulu=taocheng、
  Mochi=youmodaye（幽默大爷）、Flash=dayi_saturn（老江湖大爷，与年糕不同音色）、
  Dodo=xiaohe（小孩）。23/23 句全部 OK（3 句 ≤0.5s 溢出可接受）。
- BGM：Seed-Audio 两版选一（v1 动态对比更大），追逐曲分段对齐剧本结构。
- SFX：复用 ep1 资产 + 新增 bento_pop（开盖啵声）/ carrot_munch（啃胡萝卜）。

## 出片
`output/output.mp4` — 101s，1920×1080，h264+aac。
