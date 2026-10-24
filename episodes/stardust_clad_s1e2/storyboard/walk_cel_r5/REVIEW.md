# R5：腰胯连续性局部实验，整体未通过

2026-10-24。用户反馈“胯部还是抖，而且有纸片人的感觉”，随后追问“这是漏检吗”。
答案是验收失误：上轮已有腰甲跳变记录，却没有充分判断它与大腿根、全身重量感的
关系，交付时仍推荐R3。纸片感也没有充分检查。两项来源为user_reported；不能因为
写过“有局限”就把后来反馈改成早已自主发现。原R3记录保留，推荐地位撤回。

## 原因与实施

R3的胸廓已经复用稳定画形，但腰胯仍切换八张原画，腰线高度、侧缘和腿根随之变。
动作底稿另外丢掉了源骨盆轴方向：胸部转动，左右腿根却一直在水平轴上。
这两项分别属于画形连续性与动作信息丢失，单独调接触影无法解决。

- 共用动作适配器增加显式`pelvisMotion:true`，按源左右髋轴给腿根XYZ偏移，重新
  计算髋高可达范围并解两骨IK。捕获导出胸/胯角度；未自动重绑整个3D骨盆网格。
  试片URL用`pelvis=source`启用，旧入口默认行为保留。
- 复用已有干净胸身底图直至腰甲/胯部，使用同一腰甲画形；头颈仍随胸身移动。
  将原画像素映到有限浅曲面，由不同胸/胯角度驱动，腰腹连续过渡。该方法为固定
  朝向的小幅2.5D变形，不是完整3D人物重建，也不产生转面后缺失的画面。
- 腿势仍沿用八张原画，仅在大腿根作逐行轮廓配准，向原膝腿渐退。腿层、手臂、
  武器分别处理，不把武器算成腿宽。没有新增生图调用。
- 分层运动暴露了旧武器蒙版遗漏的暗边、断杆和裤料缺口。修正三个阶段的完整
  武器轮廓，裤料只补同一腿行取样的暗色底色。单行根部配准又产生过腿尖角，
  `hip_join_probe.jpg`保留该失败；改成逐行轮廓后复看。同一问题仍可能随新角度
  暴露，当前不声称自动分层和自动补画完成。

共用代码：`draw-over-animation/scripts/drive_cel_volumes.py`，前置分层复用
`drive_cel_body.py`；动作方向修订在`walk-director/assets/mocap-pose-study.js`。
episode只保留素材、蒙版/像素配置和实际证据。浏览器使用的runtime为共享模块副本。

## 实际复看

输出`output/walk_cel_r5_compare.mp4`（每组左R3、右R5）及`walk_cel_r5_solo.mp4`。
1.1秒周期重复四遍，4.4秒、30fps、132帧，无声。实际编码视频解码为
`decoded_comparison.jpg`、`decoded_hips.jpg`及三页完整33帧序列。
实际查看方式是有序连续帧和局部放大；**没有正常速度播放观察证据**。

可见收益：腰甲尖端/亮边不再随八格换成不同设计；过腿时腰到大腿根的外轮廓接合
比失败初版连续。保留头、胸与胯的小幅共同运动，未靠冻结头部取得稳定结果。
完整人物仍有明显限制：

- 腿和手臂在原画切换处仍跃迁，特别是接触姿势到抬腿、摆臂前后交换时。
- 武器虽补回断杆/暗边，八张原画的长度、钩形和手臂投影仍不完全一致。
- 头发跟随整头，缺少独立滞后；有限曲面并未让全身成为可自由转面的角色。
- 灰底诊断窗口没有场景根位移、地面接触影和前景；世界承重及场景融合尚未验。

因此只能确认局部画形连续性改善，**纸片感、自然整体步态未通过**。不把R5接入
正片或作为已经解决问题的最终方案。后续首要缺口是关节/遮挡约束下的腿臂过渡和
统一刚性武器，再在实际场景检验承重；不是继续给同一缺口增加随机整人物图片。

## 技术证据的边界

`pose_audit.json`：旧腿根髋轴yaw/roll范围均为0；启用后约13.4105°/14.1016°。
骨长最大误差约1.67e-16，反向膝0，5个seek像素一致。仅证明底稿几何与确定性，
不证明世界接触、最终原画膝向或动作自然。两谐波拟合后用于作画的yaw范围不同于
源轴范围，完整控制曲线在`volumes/report.json`。

作画逆映射最大残差小于0.05px，仅检验采样器收敛。`encode_audit.json`保存最终
视频和证据摘要、帧数及四次循环的实际解码一致性。正片R27摘要仍为
`1a97fe47a3e61bbac717de929de7cbe8f6bc7fc1e56cc68086ae8fcebe0905ab`。
场景、音轨与粒子规则均沿用既有状态。

## 针对此次失败的补学

阅读了[一手步态教学](https://www.animationmentor.com/blog/tutorial-animating-human-walk-cycle/)
中髋部移重与胸部对向变化的说明，以及
[动作阶段教学](https://rustyanimator.com/animation-walk-cycle/)的接触、过腿和上身关系。
实际下载并查看其contact-pose、passing-pose、upper-body三张步骤图，保存在
`reference_learning/`。只读文字和静态步骤图，未声称观看示范视频。

这次从中检验的是“骨盆必须传递重心/方向，胸部与骨盆需要各自解释承重”；
并非据教程给试片盖章。参考图与本角色的持械意图、比例不同，不能照搬步幅。
当前实现只修了方向保留与限定画形，过腿画面和真实接触仍需完成。

## 复现

在本集目录，保持本集预览服务4250可用：

```powershell
node ../../../dula-skills/draw-over-animation/scripts/capture_guided_paint.mjs --episode . --config config/walk_cel_r5_reference.json
python ../../../dula-skills/draw-over-animation/scripts/drive_cel_body.py --episode . --config config/walk_cel_r5_prepare.json
python ../../../dula-skills/draw-over-animation/scripts/drive_cel_volumes.py --episode . --config config/walk_cel_r5_volumes.json
ffmpeg -y -framerate 30 -i storyboard/walk_cel_r5/volumes/frames/%04d.png -c:v libx264 -crf 18 -pix_fmt yuv420p storyboard/walk_cel_r5/compare_cycle.mp4
ffmpeg -y -stream_loop 3 -i storyboard/walk_cel_r5/compare_cycle.mp4 -c copy -movflags +faststart output/walk_cel_r5_compare.mp4
ffmpeg -y -framerate 30 -i storyboard/walk_cel_r5/volumes/revised/%04d.png -c:v libx264 -crf 18 -pix_fmt yuv420p storyboard/walk_cel_r5/solo_cycle.mp4
ffmpeg -y -stream_loop 3 -i storyboard/walk_cel_r5/solo_cycle.mp4 -c copy -movflags +faststart output/walk_cel_r5_solo.mp4
```

`beforeFrames`引用先前R3的渲染序列；新检出仓库如无该序列，先按R3记录重建。
原画、底图来自已存的R2/R3资产，本轮新增图像生成次数为0。
