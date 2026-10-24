# 人物混合路线探索 R1

2026-10-24。目标：调查文生图怎样贡献五官、人体形体和连续动作，解决机器人步态、
大腿前侧凸块及切片效果。**当前是探索证据，未达到正片动画质量。**

## 交付

- `output/hybrid_routes_r1_compare.mp4`：1536×842、30fps、132帧、静音。20.84–21.94秒
  的1.1秒诊断循环重复4次，供观察；不是4.4秒独立动作或正片改版。
- `output/hybrid_routes_r1_cycle.mp4`：单周期33帧。
- `whole_cels/ordered_cels.jpg`：八张完整人物画的连续关系。
- `keypaint/sequence_r1.jpg`、`output/hybrid_routes_keypaint_r1.mp4`：首版失败传播。
- `output/hybrid_routes_surface_r3.mp4`、`keypaint_r3/`：修复取图副作用后的33帧复跑，
  对应参考覆盖最低98.7%，仍有重影/破洞，维持否决；实际看过第6/18帧。
- `decoded_comparison.jpg`：最终对照MP4实际解码的6个顺序样本。
- `assets3d/hybrid_routes_r1/generation.json`：原画提示词与参考。内置image_gen调用2次，
  每次1024×1536、2×2、真实alpha；`keys_opaque.png`虽名含opaque，实际有透明通道。

三路为原程序步态、人体动作重定向至原模型、依同动作参考生成完整人物画。
统一跟随诊断机位、灰底；C没有阴影/场景合成，不据此评价场景融合。A/B沿用旧
头部投影绘画，此机位面部空白也暴露了有限视角投影不适用于任意侧视。
R27原片、已认可场景与音轨均未覆盖。

## 主代理观察

查看过动作多时点图、两张生成整图、八张原画顺序表、传播破损帧列、最终MP4
解码的6帧顺序表。没有正常速度实时观看；试片静音，没有审听。

- **身份**：保持蓝黑束发、紫黑衣甲和钩镰大类；发束、身体比例、甲片切线和
  武器角度仍不完全连续。没有验证全片近/远景身份匹配。
- **形体**：完整原画的鼻颌、腰胯、大腿前缘比旧模型自然。动作参考驱动后，
  原模型的髋下凸块、肌肉轮廓及塑料胸甲仍在，表面纹理不能解决这些轮廓。
- **动作**：新底稿的摆臂、抬膝、肩线变化更可读；较夸张的屈膝和脚底接触仍
  需修正。完整cel避免了撕裂，但步相、比例及循环接缝跳变；b0/b2腿遮挡过于
  相似，最终画面的左右承重交换尚无可靠证据。不能判走路自然。
- **传播**：只有高度/头中心配准的原画，与代理的身体轮廓和遮挡不符，出现
  双腿、断臂及透明洞。首版还漏掉手部蒙皮，临时geometry共用原BufferAttribute
  后dispose影响了后续渲染。已修复制缓冲区；GPU部件明确标无参考，默认拒绝
  未烘焙的GPU输入，本集显式allowIncomplete。`map_restoration.json`验证取图前后
  同时刻画面逐像素相等。工具错误不应被归咎于路线本身。
  R3另外5次取图后的反序seek均像素一致；技术副作用已修，艺术配准失败仍在。
- **表情/特写**：当前原画固定神态，未做多角度整头表情库，未验证连续口型或
  转面。静态鼻颌改善不等于用户要求的特写五官已解决。

## 数值与来源

`audit.json`记录三段视频完整解码；A/B各5次反序seek像素一致；腿长误差<2e-15。
鞋底最低-0.008米是实验偏置，不是零穿地通过。左踝低位可疑窗口水平速度最高
约2.89米/秒，需要追踪真实鞋底接触点；踝点包含脚掌滚动，不直接称为滑步速度。

CMU 07/01动作120Hz、316帧。来源、归属、条款、摘要在
`assets3d/hybrid_routes_r1/mocap/source.json`。适配仅20.2–22.6秒直线路径，无起停
融合/持械语义，不能晋升为全片默认步态。

## 路线判断与下一道验证

1. 原网格+生成纹理：只适合小范围画味，不能解决坏形体/步态。
2. 稀疏完整原画+本次表面传播：失败，不能靠羽化扩到全片。
3. 完整原画直接曝光：有单帧美术收益，连续性未通过；格数不能单独解决。
4. 可靠3D动作+固定人物原画+草图约束的生成中间画：优先验证候选，**尚未运行
   时序模型**。3D控制接触/摄影/装备状态，生成层负责最终轮廓及新露出面。
   近景需要同人物的多角度整头与表情关键画，不继续独立拼眼鼻嘴。

一手资料显示ToonComposer的彩色关键画+草图更贴合此缺口，官方480p/61帧约需
57GB显存；官方Space当时调度错误。本机为Intel Arc，无NVIDIA执行环境。
ToonCrafter/Wan-Animate-2也仅查资料，未部署、未上传、未调用。
出处和通用边界在skill的`draw-over-animation/references/hybrid-character-routes.md`。

## 复现

本集目录下、4250服务运行时：

```powershell
node ../../../dula-skills/draw-over-animation/scripts/capture_guided_paint.mjs --episode . --config config/hybrid_routes_r1_baseline.json
node ../../../dula-skills/draw-over-animation/scripts/capture_guided_paint.mjs --episode . --config config/hybrid_routes_r1_motion.json
python ../../../dula-skills/draw-over-animation/scripts/compare_whole_cels.py --episode . --config config/hybrid_routes_r1_compare.json
ffmpeg -y -framerate 30 -i storyboard/hybrid_routes_r1/whole_cels/frames/%04d.png -c:v libx264 -crf 17 -pix_fmt yuv420p -movflags +faststart output/hybrid_routes_r1_cycle.mp4
ffmpeg -y -stream_loop 3 -i output/hybrid_routes_r1_cycle.mp4 -c copy -movflags +faststart output/hybrid_routes_r1_compare.mp4
node ../../../dula-skills/draw-over-animation/scripts/capture_guided_paint.mjs --episode . --config config/hybrid_routes_r1_surface_r3.json
python ../../../dula-skills/draw-over-animation/scripts/propagate_keypaint.py --capture storyboard/hybrid_routes_r1/propagation_r3 --atlas assets3d/hybrid_routes_r1/keys_opaque.png --output storyboard/hybrid_routes_r1/keypaint_r3
```

这些命令不重新生成原画。共享代码正本在skills，本集仅保存内容配置、绑定、素材
与生成的运行副本。已保留失败输入和结果，不能把实验工具数量当作质量收益。
