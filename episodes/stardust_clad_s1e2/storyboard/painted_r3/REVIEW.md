# 完整绘画正片 R3

用户认可R7“差不多了”，要求进入正片，整体细节后续再调整。本轮以此为制作
授权，保留R7姿势/头颈、既有绘画场景、对白配乐和粒子要求，导出完整213秒。
正片目标：`output/stardust_clad_s1e2_painted_r3.mp4`。技术与最终解码检查见文末。

## 实际接入

- `art_pass_full_r3.html/js`连续渲染0—213秒、79段既有镜表；镜表仍引用原剧情
  时序。R27仅提供完整声音，画面均由绘画管线产生。163—174秒嵌套入口升级为
  `art_pass_counter_r5.html/js`，近景不会回到旧五官模板。
- R7经共享工具导出33张透明帧；`walk_bake/accepted_regression.json`验证其灰底
  合成结果与已认可R7逐像素一致。共享`baked-cel-clip.js`按场景路径距离换帧，
  加入环境光色、脚下影、持物锚点与前景柱遮挡，不再次给头颈叠同一形变。
- 20—27秒采用R7。入场分两段接近，在护腕插入镜头间暂停；最终步相到收脚画，
  保持至切镜，解决初轮26.2秒突然换回旧站姿、体型变宽的问题。191.7秒以后站立/
  后退也采用R7；192.85秒起朝右后退仍看向对手，最后由原前景柱遮挡。
  后退是有限反向步相复用，没有冒称新背面视角或新退行动捕。
- 两次内置imagegen调用：一张四格脸部/口型原画、一张闭眼供体。均1254×1254，
  指定尺寸并未保证返回2048。每角色有效单格627×627；原始atlas、参考、完整
  提示词及锁区配置分别保存于`assets3d/portraits_r3`和`config/portrait_r3_*`。
  工具没有返回usage或费用，因此不填写推测扣费。
- `prepare_portrait_atlas.py`配准嘴部，只合成明确嘴窗，生成闭口/半开/开口。
  闭眼供体只合成眼部窗。其他五官、头发、脸型、衣甲不随口型切换。注册报告
  验证锁区外差值0；两格相接时带入的邻角色彩色碎边也在明确边缘区域清除。
- 口型继续取最终对白包络。共享`raster-face.js`保留原画，不再用旧通用眼形重绘；
  近景、极近景和反击中的近景均接同一套原画。镜头保留头姿、身体姿势和发梢变化；
  情绪词不会自动生成新的眉眼表情，不能宣称全部复杂演技已经升级。
- 气焰、链火、命中、烟尘、壁灯、炉火和结尾火盆继续走现有粒子执行链。盾在
  60秒起裂、103秒后加深，嵌套反击与后段沿用同一状态。

## 本轮主动发现并处理

`full/initial_overview.jpg`保留初轮问题证据：程序闭眼遮罩漏掉下缘，蓝发角色
闭眼时出现旧眼白/双线。否决该眼睑方案，实际使用闭眼原画供体。后续查看9.01秒
和31.16秒可见干净闭合眼睑，未把“参数会动”当作艺术通过。

`review/settle.jpg`保留初轮25.9—26.4秒停步时体型突然变化的证据；
`review/settle_revised.jpg`确认收脚后保持相同R7画形，并比较护腕切镜、后退起点与
退场遮挡。`review/arrival.jpg`观察了实际入场16帧。观察方式都是静帧和有序帧列，
不是正常速度播放。

初轮控制检查在9.3/29.2/35.5秒采到闭口，禁用三态口型没有像素变化。最终改为
从对白包络寻找双方真实开口，7.333秒的半开口与27.467秒的开口实际改变像素，
恢复控制后原像素复现。阴影分量数量可变，旧检查假定总有两脚导致异常；检查
不再把分量索引冒充左右脚身份。其位置差分不是足底无滑移证明。

## 范围和待整体调整项

本轮落实完整正片与已认可走路路线。战斗仍采用有限原画，部分手臂、武器轮廓和
站起过渡有换格感；独立发梢惯性、更多转面和细腻眉眼演技可在整片基础上继续调整。
灰底认可不自动等于场景接触完全通过；场景中的细微滑步与所有帧间问题未凭数值
检查宣称排除。声音本轮不重新生成，按原音轨包/PCM一致性继承已有认可。

## 复现

先按R7记录生成分层及动作参考，再在本集目录运行：

```powershell
python ../../../dula-skills/draw-over-animation/scripts/drive_cel_volumes.py --episode . --config config/walk_cel_r7_production.json
python ../../../dula-skills/draw-over-animation/scripts/prepare_portrait_atlas.py --episode . --config config/portrait_r3_prepare.json
node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config config/art_pass_full_r3_pipeline.json --step render --render
node ../../../dula-skills/draw-over-animation/scripts/pipeline.mjs --episode . --config config/art_pass_full_r3_pipeline.json --step probe
python ../../../dula-skills/draw-over-animation/scripts/verify_full_episode.py --episode . --config config/art_pass_full_r3_pipeline.json
```

静态服务仍为既有4250端口，完整导出不需要调用付费视频生成。

## 最终导出检查

最终文件：`output/stardust_clad_s1e2_painted_r3.mp4`，213秒，1280×720，30fps，
6390帧，约65.34MiB。SHA256：
`a8a746cd2cf5ddf526d0e25101daf775c93b74f4877691e0429f4edab2053360`。
`full/full_delivery.json`通过全部技术项：原R27不变、全时轴、输出规格、音频包与
解码PCM完全一致、执行探针与99个制作源指纹匹配。

83次顺序/跳转检查有82次精确一致。174秒切镜处保留`equal:false`，另存原始
`full/determinism_exact.json`。独立重取PNG仅47个像素、最大通道差1，满足既有
1级/64像素容差；没有放宽门槛。`full/determinism.json`明确保留该差异及独立
重取证据的局限。复现这一步使用`config/art_pass_r3_boundary_capture.json`和
`config/art_pass_full_r3_seek_review.json`，再运行最终验证。

实际最终MP4经OpenCV按帧号解码。已查看`decoded/overview.jpg`的22个剧情样本，
以及`arrival/settle/retreat/faces/counter/damage.jpg`的有序帧列；摘要与具体时间在
[解码记录](decoded/manifest.json)。入场有交替抬脚；25.9秒收脚后维持相同轮廓至
27秒切特写，未再出现26.2秒换旧体型。退场保持朝向对手。两人嘴部切换时其余
脸部原画保持，9秒与31.167秒可见闭眼、没有初轮双线眼白。额外放大查看实际
`decoded/face_935.png`，确认小缩略图不易读的闭眼状态。

反击帧列可读到闭眼蓄意、睁眼、起身、返击与对手后仰，粒子流沿链路推进；
起身至蹬地仍是有限原画切换，部分鞋底承重与过渡不够细。裂纹在64.2、103.5、
167、169.5秒的可见盾面保留；185秒是人物特写，盾不在画面，不能以该帧声称
目测盾损，185秒仅有状态探针。该轮观察为静帧/有序帧列，不是实时播放或听音。

共享工具及本轮翻车教训已提交到技能库`40b6b28`。待后续整体调整：更多眉眼
演技和转面、发梢惯性、战斗过渡与接触、有限步相的细微滑移。当前交付为完整
正片评看片，不将技术通过或用户认可R7扩写为全片艺术验收。

生图原稿：[脸部与口型](../../assets3d/portraits_r3/atlas_raw.png)、
[闭眼供体](../../assets3d/portraits_r3/atlas_blink_raw.png)。完整提示词与参考：
[第一轮](../../config/portrait_r3_generation.json)、
[闭眼轮](../../config/portrait_r3_blink_generation.json)；
[调用记录](../../assets3d/portraits_r3/generation_receipt.json)。
