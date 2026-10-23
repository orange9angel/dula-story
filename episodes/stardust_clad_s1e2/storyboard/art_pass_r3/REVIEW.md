# R3：恢复粒子火焰并轻调场景接合

用户已认可 R2 人物、背景和整体画风，要求恢复原粒子火焰，并减轻人物的纸片感。
本轮保留全部人物/背景原画、动作关键画和镜头；改动限定在蓄力效果、轻微光色和地面影。

## 交付

- [11 秒本段新版](../../output/art_pass_counter_r3.mp4)，1280×720、30fps、330 帧。
- [接回整集的 R28](../../output/stardust_clad_s1e2_palace_r28.mp4)，213 秒、6390 帧。
  仅更新源片 163–174 秒；前后窗口来自 R27，整集画面重新编码。
- [与 R27 对照](../../output/art_pass_counter_comparison_r3.mp4)。
- [本段解码帧列](decoded_overview.jpg)、[入口衔接](full_entry.jpg)、[出口衔接](full_exit.jpg)。

## 实际制作

直接复用 `dula-assets/lib/craft3d/combustion-particles.js` 的 `combustionAura`：
56 个火焰、30 个烟、60 个火星实例。按原画空间重设位置和比例，保留原粒子的寿命、
流动噪声、色彩及固定种子。粒子在人物前后分层；前层减弱，火焰与火星用加亮叠加，
烟单独按普通透明合成。初次合成光较灰，分开混合后白热发光更清楚。

人物采用小幅冷环境底色、左侧炉火暖色及蓄力光色。着色限制在原人物 alpha 内，
保留线稿轮廓。接触影改为柔边，增加朝离开炉火方向的低强度投影。地面影仍为
绘制近似；它改善脚底与地面的联系，不代表已增加真实三维体积或解决所有纸片感。

`art_pass_r3.html` 通过 `fx=particles&integrate=1` 启用；共用原作画执行代码，
`art_pass_r2.html` 默认仍为原模式。新增的 `particle-stage.js`、`cel-integration.js`、
完整窗口替换工具均在 `dula-skills/draw-over-animation/` 维护，episode 运行模块是
由共享入口准备的副本。配置为 `config/art_pass_r3_pipeline.json`。

## 检查与实际查看

- `artwork_preservation.json`：9 张原有 PNG 的 SHA256 全部未变。
- `legacy_compatibility.json`：未启用新模式时，14 张代表帧与 R2 完全一致。
- `determinism.json`：23 次反向取帧及 5 次重复取帧哈希一致。
- `motion_bridge_check.json`：三维位移与二维修正都实际影响像素，恢复数据后一致，
  抽查原画固定点漂移为 0；不当作物理接触证明。
- `delivery.json`：本段音轨解码相关 0.999411，时偏 0 ms。
- `full_episode.json`：完整音频压缩包与解码 PCM 哈希都等于 R27；总帧数 6390。
  边界及中点六个图像检查的 RGB 平均绝对误差为 0.0008–1.510，包含再次编码损失。

主代理查看了原粒子效果 167.2 秒、R3 的 165.9/167.2/173.8 秒整图和最终解码帧列。
蓄力全身可见明亮上升粒子，脸部主要线条仍可读；收势同框的脚底柔影更贴近地面，
人物原剪影与场景布局保留。165.9 秒是盾与下身插入镜头，头部原本就被构图裁切。
查看方式为静帧与有序帧列，未声称正常速度声画观看。

`full_entry.jpg` 从源片 162.6 秒开始、每 0.1 秒一帧；`full_exit.jpg` 从 173.6 秒开始。
前者在 163 秒切入眼部，后者在 174 秒切回原片。时序没有空帧或重叠；本段与整集
其余部分仍有明显画风差别，R28 是局部替换的正片版本，不是整集二维重制。

## 复现

启动本集既有静态服务到端口 4250，在 episode 目录使用共享入口：

```powershell
node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config config/art_pass_r3_pipeline.json --step render --render
node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config config/art_pass_r3_pipeline.json --step package
node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config config/art_pass_r3_pipeline.json --step probe
node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config config/art_pass_r3_pipeline.json --step integrate
```
