# She-Ra Episode — 闭环迭代工作流

> 本文档定义从 `dula-inspect-team` 检查到修复验证的完整闭环流程。

---

## 1. 迭代周期

每个迭代周期 = **检查 → 分析 → 修复 → 验证 → 提交**

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Check  │ → │ Analyze │ → │   Fix   │ → │ Verify  │ → │ Commit  │
│ (检查)   │    │ (分析)   │    │ (修复)   │    │ (验证)   │    │ (提交)   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

---

## 2. 检查阶段

### 2.1 自动化检查（每次修改后必做）

```bash
# 脚本级检查（12个维度）
npx dula-inspect-team ./episodes/she_ra

# 音频平衡检查（自定义）
python tools/audio_balance_check.py ./episodes/she_ra

# 视觉审核（关键帧收集）
python tools/visual-review/cli.py ./episodes/she_ra --collect-only
```

### 2.2 检查维度与修复映射

| 维度 | Inspector | 检查内容 | 修复文件 | 优先级 |
|------|-----------|---------|---------|--------|
| D1 | SceneInspector | 场景注册、过渡配置 | `bootstrap.js` | P0 |
| D2 | CharacterInspector | 角色注册、声线配置 | `config/voice_config.json` | P0 |
| D2 | VisualInspector | 角色可见性、位置重叠 | `script.story` (Position/Camera) | P0 |
| D3 | AnimationInspector | 动画注册、速度合理性 | `bootstrap.js` (patch) | P1 |
| D4 | CameraInspector | 运镜参数、后脑勺检测 | `script.story` (Camera) | P0 |
| D5 | EffectInspector | Shake 滥用、特效匹配 | `script.story` | P1 |
| D7 | AudioInspector | 音频存在性、抢拍检测 | `assets/audio/` | P0 |
| **D8** | **AudioBalanceInspector** | **TTS vs BGM 音量平衡** | **`voice_config.json` / `script.story`** | **P0** |
| D9 | LipSyncInspector | 台词长度-时间匹配 | `script.story` (时间戳) | P1 |
| D10 | CameraSubjectInspector | 说话角色与相机目标 | `script.story` (Camera) | P1 |
| D11 | TransitionInspector | 退场/入场动画 | `script.story` (Transition/Event) | P0 |
| D12 | MusicFitInspector | BGM 风格-场景匹配 | `script.story` (Music) | P1 |

### 2.3 P0 阻塞项（必须修复才能渲染）

- [ ] 角色不可见或重叠
- [ ] 音频文件缺失
- [ ] 相机拍到后脑勺
- [ ] 角色瞬移（无退场动画）
- [ ] TTS 与 BGM 音量失衡（TTS 被盖过）

---

## 3. 修复阶段

### 3.1 音频平衡修复流程

```bash
# Step 1: 检查当前状态
python tools/audio_balance_check.py ./episodes/she_ra

# Step 2: 根据报告调整
# - TTS 太轻 → 增加 voice_config.json 中 volume
# - BGM 太响 → 降低 script.story 中 baseVolume
# - BGM 间差异大 → 统一 baseVolume 或标准化 BGM 文件

# Step 3: 重新生成音频
npm run audio:she_ra

# Step 4: 再次检查
python tools/audio_balance_check.py ./episodes/she_ra
```

### 3.2 视觉修复流程

```bash
# Step 1: 生成截图
npm run verify:she_ra

# Step 2: 检查 storyboard
# - 角色可见性
# - 相机角度
# - 位置重叠

# Step 3: 调整 script.story 或 bootstrap.js

# Step 4: 重新验证
npm run verify:she_ra
```

### 3.3 角色/动画修复流程

```bash
# 修改 bootstrap.js 中的 patch
# 重新验证
npm run verify:she_ra
```

---

## 4. 验证阶段

### 4.1 验证清单

- [ ] `npm run verify:she_ra` 通过（无报错）
- [ ] `python tools/audio_balance_check.py ./episodes/she_ra` 通过
- [ ] storyboard 截图目视检查通过
- [ ] 视频渲染通过 `npm run render:she_ra`
- [ ] 最终视频播放检查（音频平衡、转场、动作）

### 4.2 音频平衡目标值

| 指标 | 目标 | 容差 |
|------|------|------|
| BGM 响度 | LUFS ~-16dB | ±3dB |
| TTS 响度 | LUFS ~-10dB | ±3dB |
| TTS vs BGM 差距 | +6~+12dB | — |
| 混合峰值 | < -1dB | — |
| 静音段 | < 0.5s | — |

---

## 5. 当前已知问题追踪

| 问题 | 维度 | 状态 | 修复方案 | 负责人 |
|------|------|------|---------|--------|
| 转场位置在场景开头 | D11 | 🔄 修复中 | 移到场景末尾几帧 | AI |
| 剑绑定像绑在手上 | D2 | 🔄 修复中 | 调整 swordGroup 偏移 | AI |
| TTS 比 BGM 轻 | D8 | 🔄 修复中 | 增加 volume / baseVolume | AI |
| BrightMoon 场景单调 | D2 | 🔄 修复中 | 添加地毯、壁灯、魔法粒子 | AI |
| 混合后峰值 0dB | D8 | 🔄 修复中 | 降低 BGM baseVolume | AI |
| FrightZone BGM 轻 2.6dB | D12 | 🔄 已知 | 标准化 BGM 响度 | 待处理 |

---

## 6. 工具链

| 工具 | 用途 | 命令 |
|------|------|------|
| `dula-inspect-team` | 12维度脚本检查 | `npx dula-inspect-team ./episodes/she_ra` |
| `audio_balance_check.py` | 音频响度分析 | `python tools/audio_balance_check.py ./episodes/she_ra` |
| `visual-review/cli.py` | AI 视觉审核 | `python tools/visual-review/cli.py ./episodes/she_ra` |
| `inspect_team_workflow.py` | 闭环工作流 | `python tools/inspect_team_workflow.py ./episodes/she_ra` |

---

**最后更新**: 2026-05-03
