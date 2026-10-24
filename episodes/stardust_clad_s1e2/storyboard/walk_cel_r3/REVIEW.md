# R3：胸身稳定与整体步态

2026-10-24。用户指出R2胸部持续抖动，且从未要求头部完全静止；同时追问为何已有
多维度注意力分析，仍须用户发现明显问题。两项缺陷均为user_reported，不能改记
成agent首轮自查发现。

## 上轮为何没拦住

上一轮复查偏向膝向、头区像素一致和位置范围。没有把胸甲宽度、领口、肩腰连接与
头身运动作为整体关系判断；还把消除画形漂移错误地实现成屏幕里的头区冻结。
原记录虽承认步相/武器跳变，仍漏掉用户此次指出的主要问题。检查清单存在和
局部数值正确都不能替代实际审查。R2不再作为整体步态通过版本。

## 本轮制作

- 仅编辑生成一张干净胸身底图。保留认可的脸、发和腿部原画；胸甲在角色自身
  坐标中使用同一套画形，头部不再锁定屏幕位置。
- 从实际3D捕获数据投影髋与肩，验证投影能复现已捕获腿点；周期低频拟合让循环
  边界闭合，保留源步态的身体起伏和倾斜。头、颈、胸、肩、胯共用该运动场，
  向鞋底逐渐减弱；没有给头另加无关摆动，也没有改成拆腿关节旋转。
- 手臂/持物与胸身按实际遮挡合成。腰部只作有限配准，手臂和武器不参与腰部横向
  修型。共用脚本为`draw-over-animation/scripts/drive_cel_body.py`，本集仅保存配置。
- 自查初版出现前臂裁断、腰部半透明残边、武器重影和接缝缺口。保留
  `assembled_order.jpg`（失败初版）及`rejected_waist_fringe.png`；修改蒙版、限制
  修型区域、匹配重叠区轮廓并用原有像素补窄缝后重渲。它们是本轮self_found副作用，
  不属于最初用户报告的发现来源。

## 实际证据

交付`output/walk_cel_r3_compare.mp4`（左R2、右R3）及`walk_cel_r3_solo.mp4`。
1.1秒周期重复四遍，4.4秒、30fps、132帧，无声。最终实际MP4已解码，
`decoded_comparison.jpg`含所有八个原画阶段，`chest_sequence.jpg`为完整33帧胸部序列。
观察方式是完整人物、连续有序帧、局部连续序列，未声称正常速度播放观察。

本镜头胸前轮廓探针（角色坐标y=238）原相邻帧最大跳变11px，扣除本轮有意身体
运动后约1.05px；此单行探针只辅助定位胸廓跳变，不是整个角色的审美评分。
实际脸部中心横向范围约4.09px、纵向约8.69px，配合身体起伏，已不再屏幕冻结。
控制曲线纵向范围约6.58px；实际脸部测量受倾斜、采样和色块边界影响，不要求等值。
八张合成画各只有一个面积大于8px的连通主体；连通性也不能证明接缝美观。

顺序帧中胸甲轮廓与领口比R2稳定，头、颈、胸没有独立锁屏，前后腿过渡沿用R2。
修过的腰部窄缝、前臂和武器连接已复看。原画的摆臂跳切、腰甲细节与武器长度变化
仍在；头发随头整体运动，尚无细致次级跟随。没有把整体自然度判成通过。
世界接触、转身、起停、全片近景表情和场景合成均未在该灰底窗口验证。
R27摘要保持不变，既有场景、音频和粒子工艺未改。

## 复现

在本集目录：

```powershell
python ../../../dula-skills/draw-over-animation/scripts/drive_cel_body.py --episode . --config config/walk_cel_r3_body.json
ffmpeg -y -framerate 30 -i storyboard/walk_cel_r3/render/frames/%04d.png -c:v libx264 -crf 18 -pix_fmt yuv420p output/walk_cel_r3_cycle.mp4
ffmpeg -y -stream_loop 3 -i output/walk_cel_r3_cycle.mp4 -c copy -movflags +faststart output/walk_cel_r3_compare.mp4
ffmpeg -y -framerate 30 -i storyboard/walk_cel_r3/render/revised/%04d.png -c:v libx264 -crf 18 -pix_fmt yuv420p output/walk_cel_r3_solo_cycle.mp4
ffmpeg -y -stream_loop 3 -i output/walk_cel_r3_solo_cycle.mp4 -c copy -movflags +faststart output/walk_cel_r3_solo.mp4
```

原始底图和完整提示词在`assets3d/walk_cel_r3/generation.json`，本轮一次内置图片编辑。
真正新增的是限定镜头的胸身重用与姿态驱动，不宣称有通用自动人体分层或全自动修型。
