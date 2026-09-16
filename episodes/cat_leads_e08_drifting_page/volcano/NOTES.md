# E08《漂走的那张画》制作笔记

> **归档说明（2026-09-16 目录重组）**：本目录 `volcano/` 是 V1 火山生成版的
> 自包含归档，从 episode 根目录整体迁入。其中 `script.story`、`config/
> voice_config.json`、`config/audio_mix.json`、`config/lipsync_cues.json`
> 是**归档副本**——权威版本在 episode 根目录，勿在此编辑副本。
> 重建 V1：在 Story 仓库根目录执行
> `npx dula-render ./episodes/cat_leads_e08_drifting_page/volcano`
> （渲染前需 `cp -r ../assets/audio assets/` 补回声音链，audio 不入 git）。

> 质感集（系列圣经 3.2：E08–E10 窗口首集）：F01 首埋 + 720p 生成分辨率档
> 首次全量执行 + 视频占比提至 ~67%（I2V 27% + omni 40%）。

## 剧情

午后河边，阿澈速写，小蓝来看，小橘打盹。一阵风把画完的活页吹进河里。
小蓝要追，阿澈拦住——「别追。让它替我顺流去看看。」他凭记忆重画一张，
送给小蓝。结尾速写本特写：页面右下角一枚他没画过的齿轮状花纹（F01）。
情感伤口：转学生怕留不住普通的日子 → 选择放手与给予。余韵：怅然而暖。

## V1 验收记录（output.mp4，60.000s 1920×1080）

- **F01 首埋**：frame_16 速写本特写 3.0s 无运镜，齿轮状霜花/电路纹符号
  在页面右下角清晰可读、无人提及（向往语法：好看的奇异）。一次命中设计锁。
- **720p 统一档**：四个 still↔I2V 剪辑点（0/3.5、15.8/16.2、34.3/34.7、
  54.3/54.7）两侧帧风格与锐度一致，无跳变——E07 的"动起来变模糊"缺陷
  类别消除。
- **视频占比 ~67%**：I2V 5 段 16s（空镜/风/掀页/漂页/收尾，全合法区）+
  omni 8 镜 17.5s（口型运动 8/8 抽帧确认）。
- **留白拍**：page_drift 4.5s 画页漂远（10.9fps 摊铺，运动极慢无感）。
- **配音**：8 句全部一次入窗（最长 2.46s ≤ 4.0s 槽）。无 Cat 台词、无 OldMan。

## 成本报告（火山账户基线 ¥96）

| 项 | 实际 |
|---|---|
| I2V（Seedance 2.0 FULL 720p，5 段 × 4s，436500 tokens） | **¥20.079（实测）** |
| TTS（seed-tts-2.0 ×8 句，≈17.9s） | ≈¥2 |
| Seed-Audio（wind_gust ×2 + paper_flutter + BGM 三版，189s 计费） | ≈¥5 |
| OmniHuman 1.5（8 镜，17.461s，720p fast） | 刊例待核（CV 接口不返回用量），估 ¥10–25 |
| 关键帧 + omni 底图（codex imagegen ×21） | 订阅内，¥0 |
| **合计** | **≈¥40–55，低于 ¥60–70 预算** |

零重跑浪费：I2V 5/5、omni 8/8 一次通过（无 write timeout、无 50430）。
唯一报废：wind_gust v1（-47.8dB 几乎无声，重生成 -21dB 采用）。
注：制作期间导演充值，余额 ¥96 → ¥275.95，余额差法不可用于核算，
以本日志实测/估算为准。

## 翻车与新发现

1. **伏笔泄露风险（新纪律）**：frame_page_lift 首 roll 引用 frame_16 作参考，
   F01 符号被复制到飘走的画页上（伏笔提前泄露）。修法：含伏笔元素的帧
   **禁止用作其他镜头的参考图**；prompt 显式声明"页面只有素铅笔速写、
   无任何符号"。已写回 dula-skills/build-continuous-story-images。
2. **引擎 dula-audio 不认识 seedtts provider**（E05–E08 一贯）：实际配音
   走剧集内 tools/generate_audio_cosyvoice.py（VOLC_SPEECH_API_KEY，在
   `.env.speech`）。`npm run audio:e08` 名义注册但产出靠该脚本。
   引擎侧支持待办（非本集范围）。
3. **I2V gen 时长上限 4s**：page_drift 设计 4.5s，源片 4.04s，cels 摊铺
   10.9fps——慢动镜头可接受；需满帧率时用 5s 档重生成（约 ¥5）。
4. **OmniHuman 刊例价无法从 API 确认**（CV 任务接口不返回用量），
   成本只能按预算区间估。volc-balance 余额差法是唯一精确口径，
   但会被充值打断——大额付费段前后各查一次余额是更稳的习惯。
5. **BGM 三版选一**：v1 基于电平/动态指标入选，未人工试听；候选留存
   tmp/bgm_candidates/ 可替换。

## 伏笔登记（已同步 docs/cat_leads_series_bible.md）

- F01 速写本角落符号：本集 frame_16 埋设 ✅（状态：已埋，冷却至 E10）
- F02/F03：冷却中（本集全静默 ✅——无后山、无光、无老周）
