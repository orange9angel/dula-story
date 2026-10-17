# 自然感隔离试片 · 2026-10-17

目标：保留当前接近生成绘画的男女主身份、发型、身体细节和场景，借鉴小雪成片的整体协调与对白自然感。

- [直接看候选：13 秒](../../output/naturalness_candidate.mp4)
- [前后对比：每段 A 当前、B 候选](../../output/naturalness_trial.mp4)
- [男女主脸型对照](face_comparison.jpg)

当前 `output/current.mp4`、正式角色模块和主剧本没有替换。候选仅覆盖罐子玩笑和放学邀请，尚未得到用户认可。
候选源码、配音原件与配置另冻结在 [输入归档](../../output/archive/naturalness_trial_sources.zip)，避免清理临时截图后丢失本次实际音频与模块。

## 本轮可见结果

- 保留五官绘画、发型与身体，调整现有下脸几何。男主正脸的针尖下巴变圆顺；女主下颊更连续，正常镜头中的收益较小。侧脸只小幅收回鼻口凸度，没有增加视角修型。
- 衣服阴影反差降低，但领口/脖子的碎色块、部分袖口和头颈连接仍不自然，不能当作已解决。身体姿态和动作沿用当前版本，没有重建身体。
- 女主两句改为“装叶子的呀。你这么大，哪儿放得下。”和“你又不是叶子。明天放学再过来吧。”；沿用当前音色，用火山 native 语境指令重新试读。男主语音不变。
- 接话间隔约 2.81→0.34 秒、3.00→1.10 秒。后一段保留拿稳罐子和抬眼的时间；没有压缩全片停顿。候选剪掉的是现有切镜前的空等，尚未写入正式剧本时间轴。
- 新语音按最终 PCM 重新生成口型，字幕使用候选剧本。配乐仍为当前已选的 Suno 音乐，短片内连续铺设并按新对白压低；没有生成替代配乐。

## 证据与检查范围

- 原画/基线/候选分解：[女主](../../tmp/natural_look/parts/aoi/parts.jpg)、[男主](../../tmp/natural_look/parts/lei/parts.jpg)。参考姿态未标定，只用于结构判断，不能当精确投影。
- 整体回查：[女主](../../tmp/natural_look/parts/aoi/whole.jpg)、[男主](../../tmp/natural_look/parts/lei/whole.jpg)。两侧 45°、90°、正面，头转身体固定。
- [女主六秒转面](../../tmp/natural_look/aoi_turn.mp4)、[男主六秒转面](../../tmp/natural_look/lei_turn.mp4)；实际编码视频抽帧已检查，不能据稀疏抽帧声称逐帧完全无变形。
- 30 个头部/表情状态及 5 个场景时刻正反序一致；同角度分解的实际头/身角匹配、顶点有限、浏览器无错误。转面输入在渲染期间未变动。
- 对比视频解码无错误；候选为 1280×720、30fps、391 帧。对最终短片抽帧复看对白与持罐过程。
- 音频模型转写了四段对白，未报告吞字或接缝；其评价混淆了 A/B 重复与剧情重复，**不作为自然度优劣结论，也不是人工试听**。

完整头发背面、全身动态和整集节奏本轮未重新验收。试片显示局部改进，还不能声称已达到小雪成片的整体自然度。

## 复现

在本 episode 目录执行，Python 使用仓库 `.venv/Scripts/python.exe`：

1. `node tools/prepare_natural_look_trial.mjs`：生成隔离角色模块和基线哈希。
2. `python tools/build_naturalness_trial.py prepare`：准备候选剧本、两句缓存配音、音频与口型；输出只在 `tmp/natural_look/dialogue`。
3. `node render.mjs --range 15,24.3 --out ../tmp/natural_look/render_1.mp4 --board tmp/natural_look/render_1 --resource-overrides tmp/natural_look/scene_trial.json --audio-from tmp/natural_look/dialogue/assets3d/mixed.wav`
4. 同命令用 `--range 64.2,74.4` 和 `render_2` 渲染第二段。
5. `python tools/build_naturalness_trial.py assemble`：生成上面的候选与 A/B 视频，检查基线未变。

分解板由 `build_naturalness_trial.py boards` 生成；所需角度截图在 `tmp/natural_look/before|shape/<actor>/baseline`，使用现有 `render_profile_feature_study.mjs` 的 baseline、10 个标准视角和 `shape.json` 模块覆盖制作。完整构建哈希与剪辑区间见 [review.json](../../tmp/natural_look/review.json)。
