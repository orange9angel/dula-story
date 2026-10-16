# 雷晓后脑 · 独立侧发试验 · 2026-10-17

**未替换 current。** 两侧90°的圆帽轮廓有所改善，但后侧发流、背面大形和后颈收束
仍没有整体超过认可版。正式模型、贴图和 current 的19个基准文件逐项SHA核对无变化。

直接看 [六秒全周对比](comparison.mp4)：左保留版，右未采用候选。
另有 [逐部位原画对照](parts.jpg)、[两侧整头](both_profiles.jpg)、[后侧与背面](posterior.jpg)、
[正面和斜面](front_oblique.jpg)、[俯仰对比](pitch_comparison.jpg)。

## 本轮判断

先按新skill检查完整头像及六个维度，优先级仍是：后脑圆帽大形；耳前发束走向；
顶部前后发衔接。用户此前点名了后脑问题，不能把它改写为本轮独立发现。
九宫格相机未标定，只比较可靠结构关系；生成侧发图是制作输入，不替代认可原画。

这次实际做了8轮隔离试验。较有效的是从九宫格的朝右侧脸生成完整透明侧发层，
使用固定在头部的曲面，保留原正面绘画。侧面的外翻发梢和耳后层次更接近原画，
中性正面整图逐像素不变。但投影接到背面后仍显圆，存在纹理交接、后颈缺口；
两侧共用同一幅侧发图也没有恢复原画左右各自的发流和高光，因此没有晋升正式资产。

少量长图集发束、扩大后UV、增加曲面深度、逐行轮廓约束截面、独立闭合长束均尝试；
分别出现亮根接缝、头皮空缺、扩大圆帽、整圈台阶/折纹、重复根部亮环和分离发尖。
逐轮结论在 `review.json`，只保留最后一份候选源码和一套对照，不保存每轮截图集。

## 验证范围与失败

- 八个整头角度与16个俯仰状态逆序一致；候选转入归档URL后，24张首次渲染逐像素一致。
- 候选73方向、每5°一次的加密检查：72方向逆序一致，35°有1像素差，最大通道差36。
  位置(509,651)，正序RGB(151,115,100)、逆序(175,149,136)。根因未确认；
  同轮保留版73方向均一致。原失败PNG及报告保留，不以重跑结果覆盖。
- 两版视频各144帧，源码与额外PNG在构建前后哈希一致；并排视频1200×640、24fps、6秒，
  144帧完整解码。`video_contact.jpg`来自这份MP4的12个抽帧，实际已查看。
  这是抽帧和角度序列复核，不宣称每一视频帧都经过视觉判断，更不是对白/全身验收。
- `finite_face_vertices`仅检查面部位置缓冲区，不代表所有头发网格或美术质量。
- 女主和正式共享资产未修改；本轮没有额外重渲染整集。

## 重建

在单集目录、4215服务运行时，原版无覆盖，候选使用本目录 `overrides.json`。
先用 `tools/render_profile_feature_study.mjs --actor lei --variants baseline --turn-mode body`
采样正面、±45°、±90°、±135°和180°，分别写入
`tmp/lei_rear_volume_v3/accepted` 与 `tmp/lei_rear_volume_v3/frozen`。
然后执行 `tools/build_oblique_feature_review.py --comparison config/lei_posterior_profile_comparison.json`。

全周视频用 `tools/render_character_profile_turn.mjs --actor lei --revision v3 --turn-mode body --full-turn`；
候选另加 `--module-overrides storyboard/hybrid_character/lei/archive/rear_volume_trial_v3/overrides.json`
及 `--extra-input storyboard/hybrid_character/lei/archive/rear_volume_trial_v3/profile-hair.png`，
并显式设置临时 `--out`、`--board`，不要覆盖 current。
俯仰用 `tools/render_profile_feature_study.mjs --pitch-study --pitch-angles 0,45,-45,90,-90,135,-135,180`。

新增图片通过内置imagegen生成，项目文件为`profile-hair.png`，完整prompt见[GENERATION.md](GENERATION.md)。
下一次仍应先解决冠部—后脑—后颈的主束空间关系及不同图表的对应，再加细节；
本试验没有证明一张侧发图或两张轮廓能自动恢复可用三维发型。

已实际清理本轮314个临时文件、35个目录，共97,662,873字节；单集`tmp`残留0项。
清单见`cleanup.json`。保留的是一套最终对照、候选源码/输入及必要失败证据。
