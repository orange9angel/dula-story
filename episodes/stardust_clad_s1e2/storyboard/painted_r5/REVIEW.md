# 绘画正片 R5：部件、表演与退场连续性

本轮由用户指出R4遗漏触发：护臂裂损跨镜恢复、盾放下后重新手持缺过程、质问近景
平静而全身龇牙、人物像气浪起伏、退场忽大忽小且像游戏。R4视频及当时判断原样
保留；这些问题记作用户发现，不能因为后来建立检查器而改写来源。

## 实际修改

- 191—198秒原人物镜头倍率1.1→1.75→1.1，背景只跟随小部分推近。R5统一退场
  摄影倍率1.1，固定每格画布与绘制尺度，按胯部水平位置注册原画，不按摆腿包围盒
  重算身高。起身补半起原画，侧身→背面→侧背后短停，再护胸向右前进。
- 退场原画换成带伤收敛姿态。候选远腿经过相重复了近腿，只采用新上身，下面保留
  R4实际审过的远腿经过相；配准时出现旧手臂残片，清除后复看。8格步态仍有顿感，
  不将倍率固定和转向正确写成“电影级自然度通过”。R7已认可的20—27秒入场未更换。
- 固定视角脸和硬护甲用刚性整格放置，取消高斯发摆、呼吸、头部位移对整张图的
  渐变拉扯。嘴形与眨眼保留，近景按台词意图做很小的整体收势；未宣称新增长角度
  三维头部表演，也未用全身冻结冒充步态修复。
- 护臂作为独立战损部件，从SCAR继承裂损，HERO_CHARGE后加深。裂损纹理来自
  原特写的同一处伤口，通过显式表面坐标投到格挡与跪姿。站姿/后仰时持盾腕被盾遮住，
  不把另一条露出的手臂误画成受伤。盾面原有持久裂纹保留。
- 103.4秒以后盾压地与自由手持分开；新增正本SHIELD_RELIFT/SHIELD_RELIFT_END，
  135.4—138秒由跪姿、撑起、半站提盾三格显示离地。第四格生成图换了持盾手，未采用。
  原152秒卡槽、172.9秒拔盾、173.8秒脱槽过程继续保留。
- “为了那条街，连圣衣都不要了？”统一为带伤、难以置信而不求饶。近景眉眼和嘴窗
  用新供体锁回原脸，其余像素不变；全身只换脸部区域，护胸姿势与此情绪接续。

## 证据与范围

基线画面见`baseline/prop_sequence.jpg`、`baseline/lower_lift_sequence.jpg`；
候选实际渲染见`full/t*.png`。20秒样片为
`output/stardust_clad_s1e2_painted_r5_pilot.mp4`（178—198秒，600帧），15次顺序/跳转
取帧一致。主代理实际查看`pilot_decoded/expression.jpg`与`exit.jpg`，共24帧；没有
声称实时播放或听音。候选单图另检查了80、165.7秒的持盾护臂与194.6秒完整身体。

运行探针覆盖91个镜头、1220项分维轨迹检查与原有事件契约。实际脸部网格点间距
变化最大约0.000087像素，口型控制仍改变像素；护臂伤痕开关分别改变2070、2113、
2145个源图像素。负向夹具确认损伤倒退、镜头倍率突跳和字段缺失会失败。这些是
技术证据，不能认证伤痕位置、情绪意图或自然步态；对应位置仍由实际图像复看。

最终整片为213秒、1280×720、30fps、6390帧、63.42MiB，SHA256为
`07c84b8811cdbbd0b00d5ead2d6e9bb275c0f8c6079675be5d5b0ef3df9e2a64`。
83次顺序/跳转取帧一致，165个制作来源摘要匹配，原音频包与解码PCM均相同。
技术报告为[full/full_delivery.json](full/full_delivery.json)。

主代理实际查看最终MP4解码的`decoded/portrait/armor/support/expression/exit/overview.jpg`
六组帧列，共68个不同时间帧，帧号和摘要见`decoded/manifest.json`。可见护臂伤口
在格挡/跪姿继续出现，135.4—137.6秒盾逐步离地，173.767秒反击后的盾端离槽，
下一镜再手持；178—183.5秒的眉眼与护胸情绪相容，194.2/196.2秒镜头交界没有
原来的明显放大缩小。17—18秒头像和护甲结构稳定，嘴形仍变化。槽火和已认可
入场在样本中保留。以上为静帧/有序帧列判断，非实时播放或听音。

仍保留的限制：起身到转身、半站到下一动作的体态过渡偏硬，有限步相不足以认证
电影级自然度，生成原画间的细微形体差异也未被摄影倍率检查穷尽。角色巡检记录
有效，两个声画维度待证，退场自然度与主角中间画列为后续精修；详见
`../character_attention/painted_full_r5.json`，未将技术通过扩大为整片艺术全部通过。

## 成本与复用

本轮调用内置imagegen三次，每次输出1254×1254透明多格原画。提示词、采用和
拒绝范围见`config/continuity_r5_generation.json`。工具未返回用量与金额，记为未知。
没有生成视频、重配音或换音乐。背景及动态粒子实现继续沿用本集认可方案。

技能库提交`a841c28`及`8c162a8`：部件/事件/镜头尺度矩阵、刚性整格模式、表面裂损
复用、轨迹检查、裁格注册、按帧号解码工具、注意力提问和漏检记录。通用执行入口
均在skill的scripts/assets；本集只保存美术、坐标、时序和证据。

## 复现

在工作区根目录，使用现有4250端口的Dula服务：

```powershell
python dula-skills/draw-over-animation/scripts/prepare_cel_crops.py --episode dula-story/episodes/stardust_clad_s1e2 --config config/continuity_r5_crops.json
python dula-skills/draw-over-animation/scripts/prepare_portrait_atlas.py --episode dula-story/episodes/stardust_clad_s1e2 --config config/portrait_r5_prepare.json
python dula-skills/draw-over-animation/scripts/compose_cel_regions.py --episode dula-story/episodes/stardust_clad_s1e2 --config config/continuity_r5_regions.json
node dula-skills/draw-over-animation/scripts/pipeline.mjs --episode dula-story/episodes/stardust_clad_s1e2 --config config/art_pass_full_r5_pipeline.json --step probe
node dula-skills/draw-over-animation/scripts/pipeline.mjs --episode dula-story/episodes/stardust_clad_s1e2 --config config/art_pass_full_r5_pipeline.json --step render --render
python dula-skills/draw-over-animation/scripts/verify_full_episode.py --episode dula-story/episodes/stardust_clad_s1e2 --config config/art_pass_full_r5_pipeline.json
python dula-skills/character-attention-review/scripts/extract_review_frames.py --source dula-story/episodes/stardust_clad_s1e2/output/stardust_clad_s1e2_painted_r5.mp4 --config dula-story/episodes/stardust_clad_s1e2/config/painted_r5_full_review.json --output dula-story/episodes/stardust_clad_s1e2/storyboard/painted_r5/decoded
```
