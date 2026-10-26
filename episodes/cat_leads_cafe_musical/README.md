# 《半拍晴天》咖啡厅音乐剧

《猫带我去的地方》的未编号特别篇。**当前方向：hybrid/ 混合制作路线**（2026-10-25 起）——
3D 只做动作/接触底稿，人物画面全部由已审生成原画承担。两窗口试片（对白 4–13s、
完整转身 36.9–43.4s）已到 r16：8 相位逐拍真画+整拍冻结、同图表情变体、单角色单尺度
常量、渲染实测断言全绿；**已知保留项：相位间硬切的定格感（无过渡画）**，是下一步主项。
试片 `output/hybrid_pilot_{dialogue_a,turn_full}.mp4`，工艺/轮次记录见
[hybrid/PIPELINE_NOTES.md](hybrid/PIPELINE_NOTES.md)，巡检记录在
`storyboard/character_attention/`（含 M1–M11 漏检册）。V5 及更早工艺保留如下。

---

（历史）当前是 **V5 修正候选**：小蓝长蓝发、两人白衬衫、
日式晴天咖啡厅；聊天、唱跳和收尾使用同两个三维角色。原对白、歌曲、130 个拍点和
两次完整转身保留。用户只以最终融合效果判断，不限定制作手段。

首轮 V5 头发重建被用户否定颜值，已经撤回。当前恢复原脸型、五官和前发，用共同深度
映射收后脑；另修眨眼黑条、腰缝和双臂长期举起。**侧发接缝、折片和强侧面拉伸仍在，
没有宣称用户美术验收通过。** 制作与失败记录见 [V5 修订](craft3d/INTEGRATION_V5.md)。

## 本地输出

| 文件 | 时长 | 内容 |
|---|---:|---|
| `output/half_beat_sunshine_craft3d_v5.mp4` | 107.5 秒 | 完整聊天、歌舞、收尾，1080p30 |
| `output/cafe_3d_dialogue_v5.mp4` | 23 秒 | 从最终完整片派生的开场 |
| `output/cafe_wardrobe_v5.mp4` | 27.5 秒 | 原片 15.5–43 秒，起身、摆臂和第一圈转身 |

V4 成片、SHA256 和报告保留；中断的失败 V5 文件不是交付。完整解码、音频同步、
源码/输出哈希与有限检查以 [V5 媒体验证](config/unified_delivery_qc_v5.json) 为准。
近景比较和美术限制见 [V5 复看记录](config/integration_review_v5.json)。
静帧与数值检查不代表完成正常速度声画观看，后者本轮没有声称完成。

## 复现

同级放置 `dula-engine`、`dula-assets`、`dula-story`；本轮共享资产 `c9c4e4f`，
引擎 `d973335`，工艺教训 `dula-skills@76e7eee`。需要 Node.js、engine 锁定依赖、
Puppeteer、FFmpeg/ffprobe；媒体验证需要 Python、NumPy、SciPy。PNG/GLB 沿用 Git LFS。

在本集目录运行：

```powershell
node tools/render.mjs --serve
# http://127.0.0.1:4235/craft3d/viewer.html?full=1
node tools/render.mjs --full --wardrobe
node tools/render.mjs --full
python tools/derive_dialogue_v5.py
python tools/verify_unified_v5.py
python tools/finalize_v5.py
```

派生预览继承完整片的几何证据，不充当第二次独立碰撞检查。若完整渲染的 seek 检查
失败，先调查并保留初次结果，不能跳过断言更新交付状态。

原混音 `assets/audio/final/mixed.wav` 的 SHA256 必须是
`51d99f65cd5def2f6880e1ff94697a10a972bbc2a76b7e077d05686f1c65ce04`。
生成音频与 `output/` 按仓库规则仅留本地；仅克隆仓库不能直接恢复有声成片。
音源见 `config/audio_sources.json` 与 `config/suno_receipt.json`，不得擅自换歌/重配音。

## 验证入口

- `tools/audit_runtime_v5.mjs`：演员实例、有限头面/头发值、耳数、裙面代理。
- `tools/audit_dance_v5.mjs`：新旧脚步/根运动逐样本一致，腕点高低分布；不判断舞姿美感。
- `tools/review-turns.mjs integration_v5r5`：固定正侧背视图。
- `tools/review_blink_v5.mjs`：两人睁眼/半闭/闭眼与实际眨眼时间窗。
- `tools/compare_integration_v5.mjs`：原画、V4、当前的头部与腰部比较。

实际入口是 `craft3d/viewer.js` 和 `craft3d/bootstrap.js`；对白谱 `dialogue-v4.js`、
舞蹈谱 `dance-v5.js`、拍点 `config/dance_beats_v3.json`。共享角色接口见
[sunprint README](../../../dula-assets/characters/sunprint/README.md)。

## 历史

[V4](craft3d/UNIFIED_V4.md) 保留其首次 seek 异常、复查、静态场景的 9 个警告及
通用 story-tool 的兼容性错误/时长警告；本轮没有改写这些历史结果。
[V3](craft3d/REFINEMENT_V3.md)、[V2](craft3d/NOTES.md)、[最初制作](NOTES.md) 供追溯。
历史迁移脚本和 illustrated viewer 不是当前交付入口，不能用旧命令推断当前输出版本。
