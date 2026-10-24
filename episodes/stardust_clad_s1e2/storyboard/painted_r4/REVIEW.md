# 完整绘画正片 R4：剧情连续性修订

本轮由用户指出R3的五项问题：说话嘴边黑块、火路没有火、盾卡槽后又恢复自由、
龇牙后无因恢复正常、结尾倒着退出而非转身离开。全部记为 `user_reported`。
R3的原报告和输出保留；旧报告把后退当作有限复用，并没有发现转身意图被丢失。

## 原因与混合分工

这些问题不能全部归因于生图。半开嘴的重采样跨出脸部，把头发/衣领带入嘴边；
其余还包含镜头编排、状态继承和合成缺失。静态插图里烤入了卡住的盾，但远景
又选自由持盾原画；近景口型保留身份，却没有沿用受伤眉眼。旧3D在191.8—193秒
本来转身，新作画层改成了反向步态，改变了剧情动作。

- `script.story`新增试探后脱槽、反击后抬盾/脱槽、转身起止cue，重新编译派生配置。
  原对白、音乐、声音母版不改。
- `config/continuity_r4.json`统一盾的持有/卡槽/拔出、锁链、火路、双方痛感及退出
  阶段。所有镜头读取同一绝对时间状态；163—174秒反击纳入同一绘画入口，不再用
  独立iframe重置状态。镜表91段、全片0—213秒。
- 盾、前臂从已有插图分离，后方用同机位干净底图；画出插入、保持、拔出的过程。
  152—173.8秒可见全身保持跪姿压槽；断链后先抬盾，之后才恢复持盾。槽沿盖住
  盾端，近远景使用相应接触位置。战损继续沿用原时间状态。
- 火路、链火、壁灯和招式均使用粒子。槽内粒子随堵塞、返流、开启状态变化；
  新增槽体是静态实体，不是几何火焰。初轮火焰像等距蜡烛，复看后改为不规则
  时相、不同高度及横向重叠的粒子团，保留原绘画场景主体。
- `halfPolygon`同时限制嘴的目标窗和供体采样区。新增痛感眉眼/口型供体，只锁回
  指定区域；全身站立、格挡、跪姿也局部补相同痛感，未重新生成整个人物。
- 191.8—193秒使用四个转面，193秒以后采用右后侧朝向的向前步态。图格重复近腿
  经过相的候选被否决，只采用修对的远腿经过画，保护已有上身和手臂。

## 素材与费用记录

共5次内置imagegen调用，完整提示词与采用/否决范围在
[生成记录](../../config/continuity_r4_generation.json)。工具未返回usage或费用，
不据格数推测实际扣费。原图保存在`assets3d/continuity_r4`，表情派生图保存在
`assets3d/portraits_r4`。输出尺寸以实际文件为准，不将请求2048写成已获得2048。

注册配置为`portrait_r4_prepare.json`、`portrait_r4_pain_prepare.json`、
`continuity_r4_regions.json`、`exit_passing_r4.json`；生成图只提供原画，剧情状态
与时间、画面落点、局部保护及粒子由程序控制。没有逐帧生成视频。

## 已有观察与检查

`baseline/logic.jpg`、`baseline/expression.jpg`、`baseline/mouth_sources.jpg`保留
原问题证据；`baseline/turn_3d_reference.jpg`用于核对原3D的退场意图。R4预览实际
查看了嘴部全尺寸、卡槽/反击/拔盾/下一镜序列、受伤表情跨镜、转背与向前换脚。
观察方式为静帧和有序帧列，不是正常速度播放或听音。

`full/performance_check.json`通过91段镜表覆盖、现有动作/口型/损伤探针以及60项
剧情状态断言。断言仅证明字段和调用链，不能证明画面可读或自然度；最终MP4
解码与声音一致性验证见下节。

本轮仍是有限原画动画：转身只有四个视角，接触/经过相切换及起身过渡不等于
逐帧精修；后续整体表演仍可提升。没有把用户认可R7扩写成已认可R4。

## 最终交付与实际成片复看

完整视频`output/stardust_clad_s1e2_painted_r4.mp4`：213秒、1280×720、30fps、
6390帧、75.90 MiB；SHA256为
`048480ed10677c49954aa0211fa7e034803ce448a54baf7eef89f26bf2a6f253`。
`full/full_delivery.json`全部技术项通过：原母版不变、完整时轴/规格、原音频包与
解码PCM一致、83次顺序/seek精确一致、执行探针及119个制作源指纹有效。对白、
时间线和剪辑配置只有正本摘要更新，内容字段不变。

最终MP4按帧号解码，查看了`decoded/overview/mouth/opening_shield/trap_release/
exit/fire/pain.jpg`七组有序帧列。共76个不同时间帧；具体帧号、真实采样时间及
摘要在[解码记录](decoded/manifest.json)。此外全尺寸查看双方半开嘴第220/823帧、
对手开口第824帧、开场拔盾最后可见第503帧、反击脱槽第5214帧。
`baseline/mouth_ab.jpg`把R3/R4同一第220/823帧并排，原下颌黑块已消失。

开场16.767秒盾端已离槽，16.8秒切到脸；原请求16.79秒四舍五入会落在切镜后，
因此另补第503帧，未拿不可见的盾作为目测通过。反击中153.7—172.8秒保持压槽，
173.3秒抬起，173.8秒盾端离槽且链有断口，174.1秒才恢复手持。近景强火在175.8秒
可见，204秒远景仍有；200秒是脸部特写，只能检查状态，不能声称在该帧看见槽火。
60.5/65.5/107/158.5秒主角痛感、178.4秒对手痛感在说话状态延续。

退出序列191.9—192.767秒可见侧背、背面及右后侧，193秒后向右前进。193.6和
194.6秒的经过相有不同腿遮挡；没有把八格周期或程序方向字段等同于无滑步证明。
主代理观察限于静帧与有序帧列，没有实时观看或听音。角色巡检记录有效，两项
声画维度仍标待证，两人的有限动作过渡列为后续整体精修；不把技术通过写成艺术
全部通过。记录见`../character_attention/painted_full_r4.json`。

## 共用能力

技能库提交 `593df79`：持久剧情状态、跨镜契约检查、半开嘴源域保护、受伤表情
供体、局部原画合成与注册、粒子团横向展开、因果连续性方法及本次漏检记录。
可执行工具位于`draw-over-animation/scripts`和`assets`，本集只保留内容配置与
场景适配；后续剧集可复用共享执行代码，仍需自己的接触落点和原画验收。

## 复现

在工作区根目录执行（本集4250端口的Dula服务器需已启动）：

```powershell
python dula-skills/draw-over-animation/scripts/prepare_portrait_atlas.py --episode dula-story/episodes/stardust_clad_s1e2 --config config/portrait_r4_prepare.json
python dula-skills/draw-over-animation/scripts/prepare_portrait_atlas.py --episode dula-story/episodes/stardust_clad_s1e2 --config config/portrait_r4_pain_prepare.json
python dula-skills/draw-over-animation/scripts/compose_cel_regions.py --episode dula-story/episodes/stardust_clad_s1e2 --config config/continuity_r4_regions.json
python dula-skills/draw-over-animation/scripts/register_cel_region.py --episode dula-story/episodes/stardust_clad_s1e2 --config config/exit_passing_r4.json
node dula-skills/draw-over-animation/scripts/pipeline.mjs --episode dula-story/episodes/stardust_clad_s1e2 --config config/art_pass_full_r4_pipeline.json --step probe
node dula-skills/draw-over-animation/scripts/pipeline.mjs --episode dula-story/episodes/stardust_clad_s1e2 --config config/art_pass_full_r4_pipeline.json --step render --render
python dula-skills/draw-over-animation/scripts/verify_full_episode.py --episode dula-story/episodes/stardust_clad_s1e2 --config config/art_pass_full_r4_pipeline.json
```
