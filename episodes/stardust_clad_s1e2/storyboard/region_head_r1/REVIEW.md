# 原3D行走与局部曲面作画试片

2026-10-24，窗口20.2–22.2秒，1280×720、30fps、60帧。源为R27，摘要见
`delivery.json`；本次采用单独固定诊断机位，两侧共享该机位与绘画背景。
输出`output/region_head_r1_compare.mp4`为原版/作画对照，`region_head_r1.mp4`
为完整画幅修画版本，`region_head_r1_base.mp4`为同机位原3D。

## 实际改变

一张生成头部原画，返回1254×1254，复用60帧。提示词和输入参考存
`assets3d/region_head_r1/generation.json`。没有按帧生成，没有拆腿或替换身体cel。
参考姿势下将图画投影坐标绑定到原脸发网格，按脸部控制点对齐原画；头发单独保留
投影，避免脸部配准带歪发束。原网格深度、父子变换和阴影继续工作。相邻原颈部仅
更换为匹配的肤色，不改变几何。场景与真实粒子保留。

## 主代理实际复看

看过原/修画512像素头部图、6个固定身份颜色的换脚诊断帧、成片解码8帧顺序图。
没有以正常速度实时播放或重新听音；帧列不能冒称实时动态验收。

- 整体与身份：蓝黑发、青色眼睛、紫黑盔甲保持；眼线、虹膜和发束明暗比原3D
  细致，主体仍沿用原模型比例。头部绘画不能把胸甲的高光一起变为二维。
- 结构与连接：初版出现发束上的肤色白片与暖脸/冷白颈接缝。分部件投影、有限
  色板排除和颈色连接后，已看起点/终点与中间帧。发际尚有极细的浅线，远侧鼻眼
  没有脱离原几何限制，不能据此宣称最终特写质量通过。
- 时间与动作：诊断颜色固定左珊瑚、右青；20.4/20.7左脚在前，21.0右脚在前，
  21.6左脚在前，21.9右脚在前。原3D确实换腿，不再依赖未换脚的16格原画。
  这不证明走路自然：身体后仰、肩胯和手臂摆动不足仍明显，本轮没有重做原步态。
- 表演：原画复用固定眼神/闭嘴，当前绘画覆盖区没有新增眨眼或口型变化。未验证
  大转面、新露出后侧及其他人物/镜头。不能直接推广全片。
- 整镜效果：身体、脚、武器和背景无局部修画引入的跳变，火焰仍来自粒子。
  A/B主体按相同头部位置裁切以方便看脚，诊断头像不是额外插入的正式近景。

## 数值证据与已修失败

`final_review/audit.json`对60帧逐帧比较：真实可见头颈蒙版加2像素边缘以外，
改变像素数0，最大通道差0；两路动作探针完全一致。该门禁只证明范围与状态。
两路正式导出各10次顺序/跳转检查通过，见`paint/determinism.json`和`base/`。

首次边界检查曾失败：20.9333秒有两个像素差13/14，其实际蒙版值都是64，属于
头发细尖的部分抗锯齿覆盖。旧检查仅将蒙版>127视为覆盖，漏掉细尖。原报告保留
在`review/initial_boundary_audit.json`；共享检查器改为非零覆盖后，全部60帧重跑。
没有放宽差分阈值。

颜色筛选也有失败：全脸排除蓝色会擦浅青色虹膜。最终将修补限制到远侧鼻颊小区，
避开眼睛；它只适用于本镜头色板，不是通用语义分割。真正的大转面需要新画和
可见性处理，不能继续堆颜色过滤。

三个交付视频都是60帧/2秒，AAC流2.008秒，为原码流边界；提取后的AAC包摘要均
等于原片按20.2–22.2秒截取。A/B首次编码少了一包音频，已从单独试片重新无损
封装完整音轨；最终摘要见`delivery.json`。原R27文件摘要未变。

图像调用1次，返回尺寸与复用帧数有记录；没有实际token/计费数据，不报告节省比例。
接入与返修花费了额外代码和检查工作，当前只能确认原画在有限动作窗口复用。

## 复现

共享工具均在`dula-skills/draw-over-animation`，本集只放绑定、机位、素材与配置。
在本集目录执行：

```powershell
node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config config/region_head_r1_pipeline.json --step render --render
node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config config/region_head_r1_base.json --step render --render
node ../../../dula-skills/draw-over-animation/scripts/review_region_paint.mjs --episode . --config config/region_head_r1_review.json
ffmpeg -y -framerate 30 -i storyboard/region_head_r1/final_review/frames/%04d.png -c:v libx264 -crf 17 -pix_fmt yuv420p output/region_head_r1_compare_silent.mp4
ffmpeg -y -i output/region_head_r1_compare_silent.mp4 -i output/region_head_r1.mp4 -map 0:v:0 -map 1:a:0 -c copy -movflags +faststart output/region_head_r1_compare.mp4
```

原画参考可由`capture_references.mjs --episode . --config config/region_head_reference.json`
重新采集；执行前启动本集4250服务。生成原画需另行调用当前图像工具，不隐含重收费。
