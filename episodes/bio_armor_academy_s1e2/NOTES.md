# 《9章》S1E2《碎岩》— craft3d 工艺（程序化三维，零视频生成费）

横屏 1280×720，viewer 端口 4214，输出 `output/craft3d_full.mp4`。
工艺链路与 `yuki_airport_t2` 同构（自包含 viewer 链）；只读引用 /craft/（craft_trial 积木）
与 S1E1 音频资产（拷贝入本集 assets3d/）。**不改**其他 episode / dula-engine / dula-assets。

## 入口命令（都在 dula-story 下跑）

```bash
node episodes/bio_armor_academy_s1e2/render.mjs --check   # 检查帧 → storyboard/shot_NN.jpg + seek 校验
node episodes/bio_armor_academy_s1e2/render.mjs           # 全片 → output/craft3d_full.mp4
node episodes/bio_armor_academy_s1e2/render.mjs --serve   # 交互 viewer，端口 4214
.venv/Scripts/python.exe episodes/bio_armor_academy_s1e2/tools/make_story.py    # 估算时间轴
.venv/Scripts/python.exe episodes/bio_armor_academy_s1e2/tools/synth_lines.py   # TTS（跳过已存在）
.venv/Scripts/python.exe episodes/bio_armor_academy_s1e2/tools/build_audio.py   # 对齐+排时+视素+混音
```

## Phase 1 状态（视觉骨架，无声，已目检两轮）

- 场景 `scenes/RuinsDuskScene.js`：黄昏废工地——金橙渐变天+日轮+无文字城市剪影、
  左侧钢筋骨架烂尾楼（风动篷布 update 驱动）、右侧塔吊剪影、混凝土管群
  （`pipeJump` = 轰刚起跳管）、沙堆、积水倒映夕阳（半透明渐变片）、3 只盘旋乌鸦。
- 角色 `characters.js`：
  - **LeiXiaoCraft**：瘦高少年（~1.75m），非 Q 版；呆毛×2、卷袖（袖口+卷边两段
    LimbSurface）、斜挎书包、眼下淡阴影。**殖装锁死右臂**：rightRig 对齐肘→腕
    （前臂仅 ~0.18m，分段甲必须落在 0~.17——第一版排到 .2 溢出到拳外）。
    三态：壳疹六边形（青绿 emissive 微光）/ 鞘翅骨板盾（shieldT 弹开）/
    黑亮全甲（Phong 高光 + 青绿接缝环 + 爪尖，armorT 从肘向腕分段蔓延）。
    左臂 leftEtch 蚀纹组（青绿裂光，first_mark 才可见）。
  - **HongGangCraft**：高壮（~1.95m）寸头浓眉方颚、敞开校服外套（前襟两片+背片+短袖）、
    缠手绷带（前臂白缠带）、右拳「碎岩」岩灰几丁质拳甲 + 独角仙叉角（gauntletT 生长）。
  - ObserverCraft：极简暗色剪影（宽檐帽长衣），hook 段才上镜。
- `performance.js`：beats = card_open/establish/walk_in/hong_drop/hong_declare/lei_panic/
  hong_armor/clash1(抱头+骨板格挡)/lei_shocked/clash2(闭眼+闪回卡)/will_up(意志全甲+反击)/
  hong_laugh(坐地)/first_mark(左臂蚀纹)/hook(观察者+结束卡)。风林火山：静拍全收、
  动作拍配速度线/白闪/拟声词大字（「轰！」「铛——！」「碎！」）。
- 机位 camFor：establish(缓推)/walk/hong_drop/hong/lei/wide/block/shout(雷晓正面3/4)/
  counter/laugh/mark/hook。
- 42 检查帧 + seek 一致。**翻车记录（本轮实测）**：
  - **脸贴片翻车三连**：①脸贴片 phi 只盖 ±36°，而角色 yaw 面向 +x、机位在 +z 方向——
    看到的全是侧后脑，误以为贴图没渲染（probe 三连才定位）；②SphereGeometry 段坐标里
    脸贴半径要比颅骨大一圈才不露馅；③逆光场景脸贴必须 MeshBasicMaterial（Toon 正面全黑）。
    教训：talking 机位要放在角色面朝的 ±60° 内；侧面机位别把「看不到脸」当「脸没画」。
  - 角色 yaw 朝向决定脸贴可读范围：脸贴加宽到 ±65°（phiLength .72π）。
  - characters.js 曾混入一个不可见坏字符导致 V8 报 Invalid shorthand property initializer
    （node --check 也栽在同处，重写该行即恢复）。
- 已知 P1（不阻塞）：中远景脸部细节弱（大眼距卡通脸）；篷布为静态构图像一块板
  （动态在 update 里，检查帧看不出）。

## Phase 2/3 状态（2026-10-07）：成片完成 `output/craft3d_full.mp4`（66.17s）

- 轰刚选声：4 候选试听（目录筛选→signature 句合成→librosa F0/RMS）——
  豪爽少年 254.9Hz / 热血少年 182.2Hz / 憨厚敦实 128.4Hz / **咆哮小哥 134.2Hz 选定**
  （低频+高能量，侵略性贴合力量型直性子，与白岚 79Hz/雷晓孱弱少年错开声区），
  记入 `config/voice_config.json`。
- TTS 8 句 QC **8/8 全绿**（首轮 2 条 ❌ 纯估算窗口问题，实测窗重建后全绿；
  内容拼音级 100%）。雷晓 atempo 1.05（S1E1 基准 rate），轰刚原速。
- build_audio.py：DTW 对齐（atempo 后音频）→ 实测重排（66.18s，目标 65-80 内）→
  双角色 V17 视素轨（生成后断言 t 单调递增）→ final_voice_features → 混音：
  inkblaze 全片铺底 + furyu 打斗段（hong_armor→will_up 末）+ SFX 事件总线
  （S1E1 音效库 16 支拷贝 assets3d/sfx/：落地 ground_crater/格挡 chitin_impact+
  shockwave_ring/变身 cicada_wing_buzz/反击 bio_impact_metal+floor_crack/
  蚀纹 heartbeat_core/收场 steps_fading）+ 晚风暮蝉环境床 + gate 包络 ducking。
  实测：对白段 ≈ −21.5dBFS，打斗段 −25.5，心跳段 −26.4，峰值 −1.01dBFS（卡边，安全）。
- 字卡：`dula-skills/title-card` 三张——开场「9章·残卷其二」（白光切出）、
  闪回「让我看看，你会羽化成什么。」（clash2 后半叠加）、收尾「残卷·其二·终」（淡黑）；
  底图用本集检查帧；帧序列在 cards/，清单 config/cards.json（viewer 缺卡时有兜底黑底墨字）。
- 伏笔台账 `config/foreshadow_ledger.md`：F04 蚀 advance（视觉化第一道蚀纹）、
  F07 轰刚复赛 planted、F08 蚀纹 planted；F03 观察者属冷却期免费露出（登记在案，
  下次必须换形式）；S1E3 必须 texture 集（不许连续三集推进）。
- 成片：h264 1280×720 + aac，66.167s，8.7MB。42 检查帧 + seek 一致 + 成片抽帧复查。
- **git 未提交**（等监制看成片后再说）。

## Phase 2/3 待办

（全部完成，见上。）
