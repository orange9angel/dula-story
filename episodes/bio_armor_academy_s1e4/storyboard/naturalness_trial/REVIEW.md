# 自然感隔离试片 · 圆润脸型修订 · 2026-10-17

目标：保留上一轮改善后的角色细节、对白和节奏，优先解决男主眼睛以下过长、急收成三角形的脸型。小雪仅作为整体比例和自然感的参照，不照搬五官、年龄或简化程度。

- [直接看本轮候选：13 秒](../../output/naturalness_candidate.mp4)
- [同步对比：左 BEFORE 上一轮，右 AFTER 本轮](../../output/naturalness_trial.mp4)
- [男女主正面对照](face_comparison.jpg)

本轮仍是待用户复看的隔离候选。正式角色模块、主剧本和 `output/current.mp4` 未替换；上一轮公开试片及说明已冻结在 [回退归档](../../output/archive/before_round_face.zip)。入口沿用同一组文件名。

## 可见变化与保留范围

- 男主：缩短眼睛以下的整段下脸，放缓下颊向下巴的收束，并小幅收回鼻口凸度。正面和浅斜面的长三角形减轻。更强的一档试样出现过宽、偏幼态的下脸，因此选用较克制的一档。
- 女主：较小幅度缩短和充实下脸；正面、45°的下颊更连贯，实际中景的变化比男主小。
- 绘画细节：原有眼形、虹膜、发束和衣物沿用上一轮。几何改变时同步映射鼻口与绘画坐标，没有新增随转角开关的修型。
- 头颈：下脸缩短后露颈变长，整体头部略向下落位，耳发一起跟随。复查了正侧面及上下俯仰；领口碎色块和颈部块状阴影仍然存在。
- 头发：正面发束细节保留，侧后发仍有壳感；本轮没有重新设计后脑发束，也没有完整背面证据。
- 声音：两段对白、间隔、配乐和音量均沿用上一轮。候选和同步对比直接复制上一轮 AAC 音轨，编码数据哈希一致。

## 分解观察与视频证据

- [男主部位板](../../tmp/round_face/parts/lei/parts.jpg)：完整眼颊下巴关系比上一轮短而饱满；眉眼细节保留；侧面鼻口起伏更克制，下颌仍保留少年的转折；耳根继续贴合头部，耳内绘画未重做。
- [女主部位板](../../tmp/round_face/parts/aoi/parts.jpg)：45°眼下到下巴的收束减缓，两侧纯侧面缩短幅度较小。原画姿态未标定，作为结构参考，不用于逐像素拟合。
- 返回整脸：[男主](../../tmp/round_face/parts/lei/whole.jpg)、[女主](../../tmp/round_face/parts/aoi/whole.jpg)。重点浅角度：[男主](../../tmp/round_face/parts/lei/shallow.jpg)、[女主](../../tmp/round_face/parts/aoi/shallow.jpg)。前后机位、表情和头身转角一致；头部落位有小幅调整。
- [俯仰总览](../../tmp/round_face/pitch_contact.jpg)：每角色在 0°、±45°、±90°转头下分别抬头、低头 15°，查看下颌到颈、耳发与领口。
- [男主六秒转头](../../tmp/round_face/lei_turn.mp4)、[女主六秒转头](../../tmp/round_face/aoi_turn.mp4)：各 144 帧，查看了实际 MP4 的抽帧总览。浅角度序列暂未见新增脸颊突变；稀疏抽帧不等于逐帧美术验收。
- [真实对白同步对比抽帧](../../tmp/round_face/delivered_comparison.jpg)：覆盖两组交流和持罐动作，检查最终合成实际采用了本轮脸型。

两角色各 22 个平视状态、10 个俯仰状态，以及 30 个头部/表情状态和 5 个实际场景时刻完成检查；报告没有浏览器错误，所采样的反向 seek 一致。部位、转面和实际对白渲染的源码哈希均与本轮候选匹配。最终候选为 1280×720、30fps、391 帧，视频解码无错误。构建和音轨核验见 [verification.json](verification.json)。这些检查不代表用户已认可自然度，也不能证明全身动作或完整剧集已完成验收。

## 复现与回退

本轮源码、配置和构建工具在 [本轮输入归档](../../output/archive/round_face_sources.zip)。上一轮独立模块、两句女主配音原件和配置在 [上一轮输入归档](../../output/archive/naturalness_trial_sources.zip)。`before_round_face.zip` 保留了修改前实际交付视频。

在本 episode 目录：

1. `node tools/prepare_round_face_trial.mjs` 从冻结的上一轮模块生成隔离版本，保留首次基线哈希。
2. 用 `render_profile_feature_study.mjs` 的 `baseline`、`--additional-angles 20,30,75,-20,-30,-35,-55,-75` 和 `--pitch-study` 分别生成两角色平视及俯仰证据；当前模块覆盖为 `tmp/round_face/balanced.json`。
3. 用 `review_drawn_characters.mjs --mode direct` 生成 `tmp/round_face/scene`；用 `render_character_profile_turn.mjs` 生成两角色转头视频，均使用同一覆盖配置。
4. `node render.mjs --range 15,24.3 --out ../tmp/round_face/render_1.mp4 --board tmp/round_face/render_1 --resource-overrides tmp/round_face/scene_trial.json --audio-from tmp/natural_look/dialogue/assets3d/mixed.wav`；第二段使用 `64.2,74.4` 和 `render_2`。
5. `python tools/review_round_face_trial.py boards` 生成局部与整体对照；`python tools/review_round_face_trial.py package` 核对来源、拼接原剪辑区间并刷新本页入口。Python 使用仓库 `.venv/Scripts/python.exe`。

没有重新合成配音或更换 Suno 配乐，没有将候选写入正式角色资产。
