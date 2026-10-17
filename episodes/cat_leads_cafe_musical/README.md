# 《半拍晴天》咖啡厅音乐剧

《猫带我去的地方》的未编号特别篇。当前交付是 **V4 裙摆修订候选**：小蓝保持长蓝发，
两人穿白衬衫，日式晴天咖啡厅；聊天、唱跳和收尾共用同两个三维角色。保留原对白、
歌曲、130 个舞蹈拍点和两次完整转圈。用户只以最终融合效果判断，不限定制作手段。
当前版本仍待用户复看；V2 的认可不自动覆盖后来新增的侧后方、脸部和裙摆。

## 当前交付

| 本地文件 | 时长 | 内容 |
|---|---:|---|
| `output/half_beat_sunshine_craft3d_v4.mp4` | 107.5 秒 | 完整聊天、歌舞与收尾，1080p30 / 3225 帧 |
| `output/cafe_3d_dialogue_v4.mp4` | 23 秒 | 从最终完整片裁切重编码的开场预览 |
| `output/cafe_wardrobe_v4.mp4` | 27.5 秒 | 原片 15.5–43 秒，起身及第一圈转身 |

详细制作与限制见 [V4 修订记录](craft3d/UNIFIED_V4.md)，文件 SHA256、原混音哈希、
源码哈希和检查结果见 [交付记录](config/unified_delivery_qc_v4.json)。
抽帧、整文件解码和有限数值检查已完成，正常速度视听验收尚未完成。
女主侧发折纹、耳侧收边、袖口和旧衣褶仍有差距，不记为最终美术验收通过。

## 入口与复现

使用同级的 `dula-engine`、`dula-assets`、`dula-story` 三个仓库。
本次渲染的代码基线为 `dula-engine@d973335`、`dula-assets@f3c9242`；
角色与裙摆复盘已在 `dula-skills@3ab1ee4`。当前文档提交没有改动表演或渲染源码。
资源接口见 [共享角色说明](../../../dula-assets/characters/sunprint/README.md)。

需要 Node.js、engine 的锁定依赖（在 `dula-engine` 内执行 `npm ci`）、Puppeteer 浏览器、
FFmpeg/ffprobe；交付校验还需要 Python、NumPy 和 SciPy。PNG、GLB 使用仓库现有 Git LFS，
新检出内容仓后先执行 `git lfs pull`。下列命令在本集目录运行：

```powershell
node tools/render.mjs --serve
# 打开 http://127.0.0.1:4235/craft3d/viewer.html?full=1

node tools/render.mjs --full --check
node tools/render.mjs --full
node tools/render.mjs --full --wardrobe
python tools/derive_dialogue_v4.py
python tools/verify_unified_v4.py
```

渲染前须恢复已选定的 `assets/audio/final/mixed.wav`，SHA256 应为
`51d99f65cd5def2f6880e1ff94697a10a972bbc2a76b7e077d05686f1c65ce04`。
按内容仓规则，生成音频和 `output/` 不进 Git，当前都保留在本地；**仅克隆仓库无法直接
还原有声成片**。来源元数据见 [音频来源](config/audio_sources.json) 和
[歌曲回执](config/suno_receipt.json)，不要为复现擅自换歌或重新生成配音。

`craft3d/bootstrap.js` 注册本集 viewer 的角色和场景，`craft3d/viewer.js` 是当前执行入口；
`script.story` 决定对白和歌曲时段，`craft3d/dialogue-v4.js` 驱动桌边表演，
`craft3d/dance-v3.js` 使用 `config/dance_beats_v3.json`。模型已复制到本集，
来源见 [身体来源](config/craft3d_body_sources.json)，运行时不跨集挂载。

## 检查证据的范围

- [完整渲染记录](storyboard/craft3d_full_v4/render.json)：130 个拍点；8810 个相邻支撑样本，
  最大位移约 1.70mm。每脚只采样 48 个蒙皮鞋底顶点。
- 裙面检查在 48 个时刻对已求解腿部胶囊至少留 7mm，不证明实际全网格、桌椅或每一帧零穿模。
- 首次反向 seek 在 42.433 秒出现一次哈希差异，原记录保留。
  [独立复查](config/seek_exception_v4.json) 的像素、姿态和关节一致；新浏览器完整 48 点
  反向复查均与原顺序帧一致，见 `render.json` 的 `seek.recheck`。
  若复现出现差异，应调查后记录，不能直接覆盖首次失败为通过。
- [统一实例检查](config/unified_runtime_audit_v4.json) 记录聊天与唱跳的实际角色实例和头面数据。
  开场预览明确继承完整片对应的运行时证据，不算第二次独立碰撞检查。
- 静态场景检查保留 9 个 viewer 站位/机位警告；通用 story-tool 仍有 1 个
  `registerAll` 兼容性错误和 6 个旧时长警告，详见 V4 记录。

Git 保存最终 V4 抽帧、头像分区对照、V2/V3 转面基线和检查 JSON。
可重建的旧版全片抽帧及中间调参转面仍留在本地，由本集 `.gitignore` 排除；没有删除历史素材。

## 历史记录

[NOTES.md](NOTES.md) 保留从整图动画到三维的过程；
[V2](craft3d/NOTES.md)、[V3](craft3d/REFINEMENT_V3.md) 是历史交付说明，
其中命令在当前源码下会输出 V4，不能据此重建旧版。旧根目录 illustrated viewer 和 pilot
只作历史入口；`tools/production_records.py`、`tools/upgrade_renderer_v4.py`、
`tools/setup_v4_contract.py` 是当时迁移/生成记录，可能覆盖当前配置，不是常规复现步骤。
