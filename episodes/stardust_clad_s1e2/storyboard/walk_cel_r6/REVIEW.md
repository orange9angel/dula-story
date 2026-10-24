# R6：保留姿势，修复大腿被挤细和拉弯

交付后的用户反馈（2026-10-24）：“基本可以了”。本固定朝向步态的姿势与形体
据此记录为基本认可，作为后续制作基线。下方保留原制作观察与范围限制，
不将用户认可倒填为此前已经自主发现全部问题，也不扩大为全片通过。

2026-10-24。用户说“这回姿势差不多了”，认可R5的姿态方向；随后指出大腿成为
面条腿并追问漏检。明确承认：上轮已有实际全身/腰胯帧证据，仍没有充分判断
大腿中段体积和髋—膝走向。此缺陷为user_reported，不是本轮自主发现。
保留历史R5记录及视频，不把后来知道的问题回填为原来已发现。

## 原因与选择

R5把双腿每行的左右边界映到同一62px区间，再在366—445行渐退到原图。
两腿分开时，它把本来应扩展的整体行宽当作形变压回，既缩掉大腿体积，也使
原本较直的髋—膝走向弯曲。此算法解决了部分接缝，却损坏认可的人体画形。

先比较了撤掉修型、将区间缩到382行和395行的候选。原画体积恢复，但过腿阶段
出现底图裤料悬空、接缝折角，故没有直接采用；`thigh_trials.jpg`保留该实验。
最终使用共享工具的`rootProfile:translate`：以腿根中心调整横向挂接，沿大腿
线性减到膝前0位移，保持每行宽度；没有逐行缩放。根部采样362行、膝前边界440行。
`bodySupportY:[358,364]`只让硬甲下方的底图裤料根据实际腿层收回，避开腰甲尖端。

姿态、曝光、胸/胯角度和身体起伏均沿用R5；生成调用为0。采用配置为
`config/walk_cel_r6_volumes.json`，共用代码在
`dula-skills/draw-over-animation/scripts/drive_cel_volumes.py`。
少量候选用`--frames`先检查，最终33帧完整渲染没有该参数。

## 实际证据与边界

`output/walk_cel_r6_compare.mp4`左R5右R6，另有`walk_cel_r6_solo.mp4`。
1.1秒周期重复四遍，4.4秒、30fps、132帧。最终MP4解码为
`decoded_comparison.jpg`、`decoded_thighs.jpg`、完整33帧`decoded_thigh_sequence.jpg`。
实际观察为有序连续帧和局部放大，未声称正常速度播放观察。

跨步时前后大腿中段重新保有原稿的厚度，过腿姿势的上段走向不再被强行拉成
长S弯；腰甲、上身和已认可的步态控制保留。膝甲与小腿衔接已复看。
本轮确认的是这项新增形体退步的修复，没有将既有手臂/腿势换格跳切、武器尺寸
变化或未验的真实场景承重改记为通过。

`shape_audit.json`是从实际腿层像素得到的辅助证据：

- R5两张跨步原画k0/k2的部分行有效覆盖宽度仅剩原稿约69.7%/70.7%，平均
  约80.7%/81.6%；它不是单腿直径或三维体积测量。
- R6八张原画的平均行覆盖宽度比例均接近1，单行约96.7%—102.4%，误差包含
  亚像素取样和轮廓阈值。该结果支持“未再挤宽度”，不证明造型自动合格。
- 全33帧控制记录与R5完全一致；渲染PNG的上身y<330及小腿下段y>=500像素差
  最大值均为0。局部大腿修型没有更改全身时序或脚的画面轨迹。

`encode_audit.json`保存视频/证据摘要、132帧和四个循环解码一致性。R27正片摘要
保持不变；本次仅导出步态修订试片，未覆盖正片。

## 针对形体退步的补学

阅读[腿部形体的一手教学](https://www.proko.com/course-lesson/how-to-draw-legs-the-adductors)
及[人体结构教学](https://www.proko.com/course-lesson/mannequinization-structure-of-the-human-body)
中的大腿主块、内侧附加体积与膝部收束关系；实际查看前者的封面结构示范图，
保存于`reference_learning/thigh_forms.jpg`，来源在同目录JSON。只查看文字与
该静态示范图，没有声称看过教学视频或完整逐步示范。
本次具体应用是保留原画已有的肌肉厚度与骨干方向，不凭接缝光滑判断人体成立。

## 复现

在本集目录，已有R5分层和捕获数据时：

```powershell
python ../../../dula-skills/draw-over-animation/scripts/drive_cel_volumes.py --episode . --config config/walk_cel_r6_volumes.json
ffmpeg -y -framerate 30 -i storyboard/walk_cel_r6/render/frames/%04d.png -c:v libx264 -crf 18 -pix_fmt yuv420p storyboard/walk_cel_r6/compare_cycle.mp4
ffmpeg -y -stream_loop 3 -i storyboard/walk_cel_r6/compare_cycle.mp4 -c copy -movflags +faststart output/walk_cel_r6_compare.mp4
ffmpeg -y -framerate 30 -i storyboard/walk_cel_r6/render/revised/%04d.png -c:v libx264 -crf 18 -pix_fmt yuv420p storyboard/walk_cel_r6/solo_cycle.mp4
ffmpeg -y -stream_loop 3 -i storyboard/walk_cel_r6/solo_cycle.mp4 -c copy -movflags +faststart output/walk_cel_r6_solo.mp4
```

首次检出需要先按R3、R5记录重建它们的渲染/分层，R6不会自动生成缺失的原画。
