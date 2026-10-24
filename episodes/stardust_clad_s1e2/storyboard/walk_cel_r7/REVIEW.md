# R7：独立头部朝向与有限体积投影

交付后用户反馈：“嗯，差不多了，后面整体再调整，做正片？”据此以R7进入整片
制作，余下整体观感后续结合正片调整。下文保留交付时的实际观察，不将这次认可
改写为此前已自主验证自然度，也不扩大为其他视角已经通过。

2026-10-24。用户在R6“基本可以了”之后指出颈部以上仍像折纸人偶、头部变化
缺少立体感，并描述整体波浪感。旧认可继续保留为当时所示步态的基本认可；
新增缺陷来源为user_reported，不改写成此前已经自主发现。

## 可见问题与修订

实际解码R6第一周期33帧，保存并观察`before_head_sequence.jpg`。原头像、耳朵和
后发几乎是同一张形状随胸身摆动；有上下起伏不能说明独立头颈表演成立。
查执行链发现头部仍走胸胯按行混合的曲面形变，运动转换只输出位置、未保留源头部
朝向。旧头部关键点两点距离变化仅约±2%，因此不是以“大幅橡皮拉伸”概括根因。

共享转换器新增可选世界旋转输出，生成`assets3d/walk_cel_r7/head_motion.json`。
头部从实际捕获sourceFrame 60.70—187.50插值，转到当前演员/相机坐标，作二谐波
周期拟合。新共享模块`rigid_cel_head.py`读取明确的头部蒙版、颈根锚点和深度点，
全部头部点共用一个三维刚性变换；胸胯场不再塑造头颅。深度表面保留已有五官、
耳与后发画法，原领口在前，隐藏颈部小范围延展在后。未重新生成图片。

第一轮完整源幅度在`head_trial.jpg`中点头偏大，属于本轮self_found；最终源轴
增益改为[0.55,1,0.8]，保留相位而收小俯仰。最终相机轴角度跨度约3.53°、2.43°、
4.44°。头没有锁屏，颈根继续跟随身体起伏。

## 实际观察与限制

最终三个MP4均4.4秒、30fps、132帧，1.1秒周期重复四次。左右对照均为左R6、
右R7。`decoded_head_sequence.jpg`覆盖完整首周期33帧；
`decoded_head_comparison.jpg`放大比较0、5、15、20、30帧；
`decoded_full_comparison.jpg`包含0、5、10、15、20、30帧完整人物。上述图片均已
实际查看。观察方式为解码有序帧和静态对照，没有声称正常速度播放或排除所有抖动。

这次能看到头部相对领口有独立的俯仰变化，面部比例没有新增明显跳形，耳根—后颈
在这些小角度下没有可见断开，领口仍遮住颈根。回到全身，腿形与原步态保留。
但面部前后关系的变化较细微；后发仍整体随刚性头部，没有独立发梢错时。不得据此
宣称已经彻底消除折纸感，也不能把单视角深度表面称为完整三维头模或任意转面能力。
本轮待用户观感判断，没有替换正片。原8格手臂、腿势、武器形状跳切仍存在。

## 执行验证

`projection_audit.json`：

- 旧转换器缺省输出与原walk.json的数据完全一致；新增旋转输出的原关节位置也一致。
- 旋转矩阵正交、行列式接近1；头部三维标记点距离误差约2.84e-14。
- 零旋转投影误差小于0.0001像素；跨顺序请求同一头帧的输出完全一致。
- 同姿态下与平面投影比较，标记点最大视差约1.05像素。这只证明深度参与，不能
  当作“立体感已充分”的评分。
- 全33帧y>=210渲染像素与R6差值为0；身体姿势、腿形与脚轨迹没有被局部修订修改。
- 最终render/report.json记录各帧逆映射残差和投影Jacobian，无投影折叠。

`encode_audit.json`保存成片/证据SHA256、帧数、四周期解码一致性，以及R27原正片
未变摘要。上述数值不是审美验收。正常速度整体波浪感、场景支撑、起停和转身仍需
各自证据，不能靠这次头部检查关闭。

## 补学与漏检纠正

阅读[头部体块和角度的文字笔记](https://www.proko.com/course-lesson/how-to-draw-the-head-from-any-angle/)
及[步行头肩错时的文字说明](https://www.animationmentor.com/blog/tutorial-animating-human-walk-cycle/)，
没有观看视频。将面部正侧面与颅骨关系用于深度安排，不把鼻子机械地设置为最靠近
摄影机的点；将头肩独立关系用于运动传递。之前注意力停在大腿体积与共同起伏，
漏查头颅、耳后和领口的相对关系。修订提示与可执行实现均写回共享skill。

## 复现

在本集目录，保留既有R5分层、R6基线帧和源动作后：

```powershell
python ../../../dula-skills/walk-director/scripts/convert_acclaim.py --asf assets3d/hybrid_routes_r1/mocap/07.asf --amc assets3d/hybrid_routes_r1/mocap/07_01.amc --fps 120 --scale 0.056444 --orientation-bones head upperneck thorax --output assets3d/walk_cel_r7/head_motion.json
python ../../../dula-skills/draw-over-animation/scripts/drive_cel_volumes.py --episode . --config config/walk_cel_r7_head.json
ffmpeg -y -framerate 30 -i storyboard/walk_cel_r7/render/frames/%04d.png -c:v libx264 -crf 18 -pix_fmt yuv420p storyboard/walk_cel_r7/compare_cycle.mp4
ffmpeg -y -stream_loop 3 -i storyboard/walk_cel_r7/compare_cycle.mp4 -c copy -movflags +faststart output/walk_cel_r7_compare.mp4
```

单独画面将frames替换为revised。头部对照是相同帧裁切放大，非新近景原画。
