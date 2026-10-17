# 星屑战壳 OP（stardust_clad_op）NOTES

原创平行宇宙铠甲搞笑番 OP。49.2s / 152BPM / 1280×720 / 30fps，自包含 viewer 链。

## 入口命令（dula-story 根）

```bash
node tools/build_timeline.mjs                # 在 episodes/stardust_clad_op 下：beatgrid 吸附重建 timeline.json（断言边界偏差 <20ms）
node episodes/stardust_clad_op/render.mjs --check          # 检查帧 + seek 像素容差校验
node episodes/stardust_clad_op/render.mjs --out craft3d_full.mp4  # 全片（自动 mux assets3d/mixed.wav）
.venv/Scripts/python.exe episodes/stardust_clad_op/tools/build_audio.py   # 混音总线 → assets3d/mixed.wav
.venv/Scripts/python.exe ../dula-skills/direct-animation-craft/scripts/episode_gate.py ./episodes/stardust_clad_op  # 总门禁
node --import ./tools/register_loader.mjs tools/scan_reach.mjs   # 离线 twoBone 可达性扫描（120Hz 全时间轴）
```

## 歌曲溯源

- `assets/audio/music/suno/op_song_suno.wav`：49.200s、152.0BPM、48kHz 双声道，溯源 `op_song_suno.source.json`（定版，勿动）。
- `config/beatgrid.json`：beats[122] / downbeats[31] / whisper_lines（主歌一 0-14s、主歌二 14-30.4s、尾段 30.4-44.2s、器乐尾 44.2-49.2s）。

## 谱面结构（21 段，边界全部吸附 beats[]）

| 段 | 时间 | 内容 |
|---|---|---|
| intro | 0.07–3.32 | 黑场淡入 establish 全景 + 标题字卡；2.113（第 2 downbeat）镜头缓推 |
| verse1 | 3.32–14.211 | 阿鏊→小凿→大釜依次登场：走入+换脚转身+setCladState 生长（起点压 downbeat 5.317/8.568/13.305，配 energy_charge）；小凿特写对漏勺打孔阵护腕 |
| verse1' | 14.211–30.256 | 阿鏊 vs 大釜切磋蒙太奇（小凿场边冷看）：15.023 冲刺 → **16.625 锅盖盾格挡** → 18.4 小凿反应 → **19.83 拳甲相撞** → 21.432 追击 → **23.034 反震击飞落地**（裂缝+碎石常驻）→ 24 大釜憨笑 → 走位归位。接触帧全压 downbeat |
| verse2 | 30.256–44.234 | 低机位仰拍三人冲锋（31.045 冲出）→ 颠勺合体 gag：大釜把阿鏊连人带盾抛起、小凿漏勺护腕接星屑光点，**33.855 唱句入点拍全员定格**（FREEZE=34.35 起漫画静帧+微浮/接缝行波保活） |
| outro | 44.234–49.2 | 定格+标题再现小卡 → **45.0 赫斯提亚画外音**「打完记得把锅刷了。」→ **47.02 锅盖「当——」**（三人齐眨眼+锅上冲击环）→ 48.228 起淡黑 |

## 混音（tools/build_audio.py → assets3d/mixed.wav + mix_report.json）

- 歌曲为底；SFX 事件总线 12 个摆点（时刻=performance.js `T` 表）；台词 45.0s 摆点、歌曲 duck −8dB（150ms 余弦平滑）、台词增益 ×1.4（QC 峰值 0.25 偏低补偿）。
- 收尾「当——」：`block_impact` 低通 1200Hz（金属高频压住读作锅盖；`impact_thud` 太闷像落地，已在 23.034 用它垫底）。
- 峰值上限 −1.8dBFS（超限整体归一，本轮触发：peak 0.8128）；AAC 解码复验峰值 0.7751 无削波。
- 赫斯提亚音色：`zh_female_ganmaodianyin_uranus_bigtts`（沙哑慵懒御姐，演绎型缺慵懒档的折中；speech_rate 15 + 首尾静默裁切），QC 拼音重合率 100% ✅（`tmp/voice_audition/qc_final.md`；戏感待监制耳朵终裁）。

## 验证证据

- `storyboard/gate/gate_report.json`：render_check / seek_determinism(72) / contact_probe / review_shots 全 PASS。
- 接触探针：格挡拳-盾 min 0.156m；对拳锚点 0.064~0.093m；手-躯干 XZ 全程 0.13~0.58m（域 .08~.78）。
- 步态：三角色 bout 速度/重心起伏/步频全过（最大 3.49m/s）。
- 成片 `output/craft3d_full.mp4`：49.200s、h264 1280×720@30 + aac 48kHz 双声道。
- 抽帧复查：`storyboard/final_check/`（18 镜：接触帧/定格/画外音/淡黑全覆盘）。

## 翻车记录

- **大釜 hipIdle 过伸**：.99 髋高 + 腿长 .92，gag 颠勺挺身 bob +.04 时腿距 .93>twoBone 上限当场抛错。教训：DIMS 髋高必须 ≤ legA+legB+footY−.06（正 bob 余量）。现有 `tools/scan_reach.mjs` 离线 120Hz 扫全时间轴（Node loader 映射浏览器 import map——dula-assets exports 只开 '.'，裸子路径 Node 不解析）。
- **格挡接触差 0.42m**（bite 探针抓获）：拳头停在盾前空气。修法不是挪阈值——大釜上步压进拳程（1.05→.78）+ 阿鏊迎盾小上步 + 盾面前移到腕侧（z .10→.15），最终 0.156m。
- **小凿侧面特写方向算反**：打孔阵盘在左前臂外侧（局部 −x），角色 yaw +0.8 时盘面背向机位。改正面机位+前臂横抬胸前（前臂轴→+x 时盘面法线翻向 +z 镜头）。
- **seed-tts speech_rate 与时长非单调**：rate 12→2.02s、rate 15→2.14s；别靠 rate 卡窗，首尾静默裁切（-45dB）后直接 QC 实际时长。
- viewer.js 火焰 sprite 渐变把 `gr.addColorStop` 误写 `g.addColorStop`（页面静默卡 ready 超时——puppeteer 超时先查 pageerror）。

## R-hybrid（P3.5 混合质感升级：文生图皮肤 × 程序化 3D）

几何/动画/绑定/光影/谱面零改动，只换皮肤；纹理缺失静默回退程序化（404 路径 P1 已验证）。

### 资产清单（assets3d/tex/，逐文件 source.json 溯源 sha256）

| 文件 | 尺寸 | prompt 要点 | 用途 |
|---|---|---|---|
| floor.png (+_normal) | 1024² | 暗夜神庙石板正俯视、均匀散射光、四方连续 | 地面圆盘+远景盘（世界顶视投影 UV ×.13，法线强度 2.0） |
| stone.png (+_normal) | 1024² | 风化石砖正视、均匀光 | 祭坛石基/石灶/12 石龛柱楣背板食台（圆柱件 clone repeat 6×1，箱件 1:1，法线 1.6） |
| backdrop.png | 2048×768 | 深夜蓝星空+炊烟状星云带横贯+远处圣殿剪影、地平线下 1/3、无日无月无文字 | ContinuousBackdrop 连续天空（圆柱 r60 h30 repeat 2 offset .5，zenith #131a30） |

- 生成：`tools/gen_textures.py`（Seedream 5.0 Pro，.env.ark；b64 截断重试 3 次已带；skip-if-exists）；法线：`tools/derive_maps.py`（亮度 Sobel、wrap padding、NoColorSpace 加载）。
- 背景板原图过暗：canvas `brightness(1.55)` 预处理（皮肤侧，不动灯光）；`scene.background`=采样背景板实际像素行的竖直渐变兜底；雾 Fog(26,85) 糊地面尽头接缝。
- canvas 星野穹顶保留作高层细节：星云带移交背景板，穹顶只留三层星+近地平线 alpha 渐出（destination-out 径向带），色阶衔接 #1a2440。
- 星座刻纹/暖晕改为独立加色覆盖层（floorOverlayTexture），程序化/hybrid 两模式共用，AI 石板不吞刻纹。
- `ContinuousBackdrop.js` 晋升 `dula-assets/lib/craft3d/continuous-backdrop.js`（含 fract UV 接缝 textureGrad 周期解缠），README 导出表已更新；s1e2 原文件未动。

### 验证证据

- 多机位探针：`storyboard/hybrid_sky/cam1..4`（低仰角/仰拍天顶/侧向/反向，各 6s×30fps 无 pageerror；侧向无竖直亮缝、天顶无板缘）。
- `--check` 72 帧全绿；seek 72/72（max bad=1 像素，容差内——新纹理高频细节下 JPEG 块噪声）。
- gate 重跑 ALL GREEN（contact_probe 不受皮肤改动影响）。
- 成片重渲 `output/craft3d_full.mp4`：49.200s h264+aac（音轨 assets3d/mixed.wav 重 mux）。
- 改前改后对比：`storyboard/final_check/`（改前） vs `storyboard/hybrid_check/`（改后），同镜表同名文件。

### 翻车记录（R-hybrid）

- **AI 地板纹理直接换 map 吞掉星座刻纹**：刻纹/暖晕必须从地面基色拆成独立 overlay 层，否则 hybrid 一换皮就丢设定件。
- **深夜背景板原图太暗**：prompt 钉了"无日无月"后整幅明度贴地——canvas brightness 预处理比在场景里加灯合规（光影归灯光纪律只约束场景侧，贴图明度是皮肤参数）。
- **祭坛圆柱侧壁整图一圈拉成巨砖**：同一纹理不同件要 clone 后按周长设 repeat（圆柱 6×1、箱件 1:1）；clone 后 wrap 模式不继承需重设 MirroredRepeat。
