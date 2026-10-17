# 自然感隔离试片 · 头部比例复查 · 2026-10-17

用户在上一轮实际对白中再次指出男主像外星人，并给出女主斜侧面截图。上一轮正面下脸变圆没有解决侧面的整体关系；该版本不能视为形象已获认可。

- [13 秒候选](../../output/naturalness_candidate.mp4)
- [同步对比：左 BEFORE 上一轮，右 AFTER 本轮](../../output/naturalness_trial.mp4)
- [男女主斜侧面对照](face_comparison.jpg)
- [用户所指同框镜头的头像对照](../../tmp/head_proportion/shot_comparison.jpg)

本轮为局部改善候选，尚未达到整体自然度验收。正式资产、主剧本和 `output/current.mp4` 未替换。入口沿用原文件名；上一轮视频和说明在 [回退归档](../../output/archive/before_head_proportion.zip)。

## 发现与修改

用户指出的可见问题是侧面前伸、尖楔形的脸和偏大的后脑。对照原画后，眼睛到耳朵的横向距离相对于眼睛到下巴的高度偏长；上一轮缩短下脸使这一关系更突出。参考绘画未标定，不能据此计算精确人体比例。

本轮保留下脸长度及绘画素材，静态收回整头前后厚度，小幅降低眼睛以上的头部高度；脸、耳、发束使用同一空间变化，上颈平滑衔接。男主调整较明显，女主较克制。没有新增按角度开关的修型，没有修改对白、音乐或动作时间轴。

观察到前伸感减轻，男主后脑与脸的体量差缩小，女生眼颊到耳颈关系更紧凑。仍有侧脸皮肤偏平、男主后发壳感、耳后裸露面积偏大和颈领块状边界。不能将本轮写为外星人感彻底解决。额外眼面内收试样没有明确整体收益，未采用。

## 分解与整体验证

- [男主部位板](../../tmp/head_proportion/parts/lei/parts.jpg)：眼颊耳颈的前后跨度缩小；原有眉眼细节保留；鼻唇起伏也随深度收小，仍偏平；耳根未见新断口，耳内绘画未重做。
- [女主部位板](../../tmp/head_proportion/parts/aoi/parts.jpg)：两侧鼻口与颌缘向前伸出的面积缩小，45°的眼白和脸缘关系仍需整体审美判断。原画、上一轮、候选均保留相邻结构；小雪仅作比例参照。
- 整脸回查：[男主](../../tmp/head_proportion/parts/lei/whole.jpg)、[女主](../../tmp/head_proportion/parts/aoi/whole.jpg)；浅角度：[男主](../../tmp/head_proportion/parts/lei/shallow.jpg)、[女主](../../tmp/head_proportion/parts/aoi/shallow.jpg)。每角色 22 个平视状态。
- [俯仰总览](../../tmp/head_proportion/pitch_contact.jpg)，每角色实际采样 16 个状态，另含 ±135°和背面，源图在同目录 `pitch` 下。总览展示正侧面 10 个状态。
- [男主全周转台](../../tmp/head_proportion/lei_turn.mp4)、[女主全周转台](../../tmp/head_proportion/aoi_turn.mp4)：6 秒、144 帧，整身转动，覆盖后斜面和背面；没有用颈部转一整圈。
- [最终对白同步对比抽帧](../../tmp/head_proportion/delivered_comparison.jpg)：直接从交付 MP4 解码，确认实际镜头采用了本轮候选。

静态截图、俯仰、全周转台、真实对白的最终模块哈希一致。30 个头部/表情状态和 5 个实际场景时刻的最终运行正反序一致，无浏览器或 shader 错误；但较早运行在 16.2 秒有 1 个像素、最大通道差 3 的逆序差异，状态哈希相同。原失败图、报告和差分坐标仍保留，后续通过不证明该差异根因已解决。

面部有限性报告检查的是 GPU 变形前的位置缓冲，本轮静态比例调整位于 GPU 投影前，不能把该报告当成最终几何或美术保证。最终 MP4 完整解码无错误，1280×720、30fps、391 帧；候选与对比直接复制上一轮 AAC，编码数据哈希一致。具体记录见 [verification.json](verification.json)。本轮没有重新验收整集或全身动作。

## 复现与留档

[本轮输入归档](../../output/archive/head_proportion_sources.zip) 保存当前模块、配置、构建工具、用户截图及逆序差异证据。前序依赖另保留在 `round_face_sources.zip`、`naturalness_trial_sources.zip`。本轮使用 `balanced` 配置；`depth` 和 `orbit` 为未选试样。

在本 episode 目录，Python 使用仓库 `.venv/Scripts/python.exe`：

1. `node tools/prepare_head_proportion_trial.mjs`：从冻结的上一轮模块生成隔离候选。
2. 现有 `render_profile_feature_study.mjs` 用 `--module-overrides tmp/head_proportion/balanced.json` 渲染 `balanced/<actor>`；平视附加角度 `20,30,75,-20,-30,-35,-55,-75`。俯仰使用 `--pitch-study --pitch-angles 0,45,-45,90,-90,135,-135,180`，输出 `pitch/<actor>`。
3. `review_drawn_characters.mjs --mode direct` 输出 `tmp/head_proportion/scene_final`；`render_character_profile_turn.mjs --turn-mode body --full-turn` 输出两角色全周视频，均用同一模块覆盖。
4. `node render.mjs --range 15,24.3 --out ../tmp/head_proportion/render_1.mp4 --board tmp/head_proportion/render_1 --resource-overrides tmp/head_proportion/scene_trial.json --audio-from tmp/natural_look/dialogue/assets3d/mixed.wav`；第二段范围 `64.2,74.4`，输出 `render_2`。
5. `python tools/review_round_face_trial.py boards --study head-proportion`，随后用 `package --study head-proportion` 刷新本页视频入口。
