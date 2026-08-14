# 《初雪狐》— 102 秒雪夜神社治愈短片（yukie 雪景新版画风格）

除夕初雪夜，小紬提着烤红薯走进山间神社，发现供台边冻得发抖的小狐狸，
分了半个红薯给它。远处除夕钟声响起，她和小狐约定：明年第一场雪，再来。

与 cat_leads（晴日 sunprint）、rainy_rooftop_cat（雨夜写实 anime）、
basketball（夕暮球馆）均不同：本片是**夜景雪景 + 新版画平涂**（深靛蓝夜空、
朱红鸟居、雪白平涂、灯笼琥珀色块），角色为原创的小紬（女孩）与小狐（狐狸崽）。

## 制作要点

- **零连续换脚**：走路全部用静帧 + 运镜（02 上台阶用 drift_right；16 离场用
  近/远两张静帧硬切 + walk_away/pull_out 拉远），遵循 walk-director
  「选型」节——cel 对做不到像素级锁定时不做 A/B。
- **口型**：4 块说话板（frame_05/09/12/14）局部编辑 half/open 变体，
  `auto_lock_variants.py` 羽化贴回（14/14 框外零泄漏），
  `calibrate_rigs.py` 从 diff bbox 自动标定 rect；12fps 能量门控中文音节
  viseme（`build_lipsync.py`，含剧集专用拼音表）。frame_12 两句钟声台词
  共用一板（mouthRig entry 支持数组）。
- **眨眼**：小紬 4 帧 + 小狐 2 帧 closed 变体，场景内确定性眨眼调度
  （0.16s 眨 + 0.05s 扫掠半程睑）。
- **程序化 yukie 层**（全部源图空间平涂形状、确定性）：双层视差落雪
  snowfall、呼气白雾 breathFog、红薯蒸汽 steam、灯笼火光呼吸
  lanternFlicker、冻狐高频微抖 shiver（移植自 rainy）。
- **音频**：edge-tts（zh-CN-XiaoyiNeural）6 句独白；SFX 与 BGM 全部
  程序化合成（`tools/build_sfx.py`：风雪底噪/踏雪/布料/狐鸣/远寺钟；
  `tools/build_bgm.py`：D 大调 3/4 八音盒《snow_lullaby》102s）。
  全部确定性 seeded，重跑逐字节一致。

## 复现流程（从 dula-story 根目录）

```bash
# 生图（需要 codex CLI；全量约 50 分钟）
bash episodes/snow_fox_shrine/tools/gen_refs.sh
bash episodes/snow_fox_shrine/tools/gen_keyframes.sh
bash episodes/snow_fox_shrine/tools/gen_variants.sh

# 音频
.venv/Scripts/python.exe episodes/snow_fox_shrine/tools/build_sfx.py
.venv/Scripts/python.exe episodes/snow_fox_shrine/tools/build_bgm.py
npx dula-audio ./episodes/snow_fox_shrine --provider=edge --force
.venv/Scripts/python.exe episodes/snow_fox_shrine/tools/build_lipsync.py

# 变体锁区 + rig 标定 + 校验
.venv/Scripts/python.exe episodes/snow_fox_shrine/tools/auto_lock_variants.py
.venv/Scripts/python.exe episodes/snow_fox_shrine/tools/calibrate_rigs.py
.venv/Scripts/python.exe episodes/snow_fox_shrine/tools/check_lipsync.py

# 出片
npx dula-render ./episodes/snow_fox_shrine
```

产物：`output/output.mp4`（1920×1080@30fps，102.0s）。
