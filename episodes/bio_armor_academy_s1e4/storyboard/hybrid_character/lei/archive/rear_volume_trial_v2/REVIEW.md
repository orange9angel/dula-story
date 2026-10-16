# 后脑蓬松度与问题发现复盘

当前认可版未替换。用户指出“原画后脑蓬松，模型包起来”后，本次独立试验确实改变了
后脑轮廓，但未达到整体更好的条件。最后候选有重复亮根、发束像贴在帽壳上、末端
悬浮的问题；静态已否决，没有继续导出交付视频或声称旋转/俯仰美术验收通过。

先看[原画 / 保留版 / 候选的分区对照](parts.jpg)，再看
[双侧](both_profiles.jpg)、[两后侧及背面](posterior.jpg)、[正面与两斜面](front_oblique.jpg)。
候选的变化不再是上一轮微小位移，但变化明显本身不代表改善。

## 主要问题与责任

1. 后脑大形与原画相差最大：原画以大小不同的束和外翻梢撑出体积，当前后帽外缘是
   连续圆弧。此优先级由用户指出，不能记成代理主动解决。
2. 耳前发在深侧面仍有朝眼下伸出的大块与细竖边，不能只看正面精细程度。
3. 侧面顶部前后发衔接有细长条纹，后续需结合分层与俯仰检查。

原检查表偏重眉眼、鼻口、耳根及正面刘海；整图工具的默认组也没有后侧或背面。
已有规则中虽提过后脑，主代理仍未落实覆盖，也未把已知圆帽问题排为主要差距。
此次修正重点是问题发现与排序，不是再增加一句“多看后脑”。

`character-modeler`现在要求先按轮廓/体积、比例/身份、连接/遮挡、绘画/材质、
跨角度/运动、镜头/可见性发现问题，再走空间区域、记录可见性并排序，之后才选择
拆图和实现。工具对声明完整头像的配置检查区域、后侧/背面与问题台账；它只防证据
缺项，不自动判美。故意删掉背面区域及后侧视图的两项检查均已拒绝；完整配置生成
四张对照板通过，且已经实际查看。

## 保存与复现

素材、来源和原始提示词见 [GENERATION.md](GENERATION.md)。生成图已实际进入候选
渲染，未安装到正式角色。`candidate/`是最后渲染的冻结模块，`overrides.json`可供
现有渲染工具按请求覆盖。原始参考和已认可贴图不变。

从本集目录执行现有 `tools/render_profile_feature_study.mjs`，使用 `--actor lei
--variants baseline --turn-mode body --additional-angles 135,-135,180 --only-frames
front,turn_45,turn_minus45,turn_90,turn_minus90,turn_135,turn_minus135,turn_180 --reverse-all`。
无覆盖时输出到 `tmp/lei_rear_volume_v2/accepted`，指定本归档的覆盖清单时输出到
`tmp/lei_rear_volume_v2/final`。两者仍需与 `../accepted_v1/manifest.json`记录的基准
对应，不能在未来角色已改变后将新结果冒称本次旧版。再运行
`tools/build_oblique_feature_review.py --comparison config/lei_rear_volume_comparison.json`。

`decision.json`记录采用状态和有限检查，`reports/`是历史机器报告。试验原始截图、
中间代码和未采用的临时目录已清理，仅保存这里的必要证据；`current/`仍是原认可版。
