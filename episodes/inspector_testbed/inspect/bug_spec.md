# Inspector Testbed — 故意埋入的 Bug 规格

> 本文件记录 `inspector_testbed` episode 中故意埋入的 10 个 bug，用于验证多维度质检系统的能力。
> **注意**：这些 bug 是设计意图，不是真实缺陷。质检团队应能全部发现。
>
> 本 episode 同时作为 `dula-inspect` 和 `dula-verify` 的**回归测试基准**。

---

## Bug 清单

### [BUG-1] Entry 1 无 `[Character]` 标签但有对白文本 — D6 台词匹配
- **位置**: Entry 1 (00:00:00,000 --> 00:00:03,000)
- **问题**: 该条目包含对白文本"质检系统启动中……"，但没有 `[Character]` 标签
- **预期行为**: 有对白的条目必须标注说话角色
- **质检预期**: D6 Inspector 应标记"Entry 1 有对白但无 [Character] 标签"
- **严重级别**: P2

### [BUG-2] `@NonExistentScene` — 场景未注册 — D1 场景一致性
- **位置**: Entry 2 (00:00:03,000 --> 00:00:08,000)
- **问题**: 场景名 `NonExistentScene` 不存在于 SceneRegistry
- **预期行为**: 应使用已注册场景（如 `RoomScene`、`ParkScene`）
- **质检预期**: D1 Inspector 应标记"NonExistentScene 未在 SceneRegistry 中注册"
- **严重级别**: P0

### [BUG-3] `{Animation:FlyLikeSuperman}` — 动画未注册 — D3 动作语义
- **位置**: Entry 3 (00:00:08,000 --> 00:00:13,000)
- **问题**: `FlyLikeSuperman` 未在 AnimationRegistry 中注册
- **预期行为**: 应使用已注册动画（如 `FlyPose`、`Jump`）
- **质检预期**: D3 Inspector 应标记"FlyLikeSuperman 动画未注册，将回退到 Idle"
- **严重级别**: P1

### [BUG-4] `{Camera:CloseUp|distance=0.5}` — 距离过近导致穿模 — D4 运镜 + D2 角色可见度
- **位置**: Entry 3 (00:00:08,000 --> 00:00:13,000)
- **问题**: CloseUp 的 distance=0.5 过近，相机会进入角色几何体内部
- **预期行为**: CloseUp 安全距离应 ≥1.5m
- **质检预期**: D4 Inspector 应标记"CloseUp 距离过近，建议 ≥1.5m"；D2 Inspector 应标记"角色可能被相机几何体遮挡"
- **严重级别**: P1

### [BUG-5] `{Camera:Orbit|endAngle=1.57}` — 环绕不完整 — D4 运镜
- **位置**: Entry 4 (00:00:13,000 --> 00:00:18,000)
- **问题**: `endAngle=1.57` (≈π/2) 仅环绕 90°，展示不完整
- **预期行为**: 展示性环绕通常需要 360°（endAngle=6.283）
- **质检预期**: D4 Inspector 应标记"Orbit 运镜不完整，仅 90°，建议 360°"
- **严重级别**: P2

### [BUG-6] `{Position:Nobita|face=Nobita}` — 角色面向自己 — D1 站位 + D2 角色
- **位置**: Entry 6 (00:00:23,000 --> 00:00:28,000)
- **问题**: `face=Nobita` 表示角色面向自己，逻辑错误
- **预期行为**: 应面向其他角色（如 `face=Doraemon`）或 `face=center`
- **质检预期**: D1/D2 Inspector 应标记"face 参数不应指向角色自身"
- **严重级别**: P2

### [BUG-7] `{SFX:Play|name=nonexistent_sound}` — SFX 素材缺失 — D7 音频
- **位置**: Entry 7 (00:00:28,000 --> 00:00:33,000)
- **问题**: `nonexistent_sound` 不存在于 `materials/sfx/` 且不在音频注册表中
- **预期行为**: 应使用已注册 SFX 名称（如 `impact_thud`、`whoosh_fast`）
- **质检预期**: D7 Inspector 应标记"nonexistent_sound SFX 素材缺失，将使用 procedural 回退或静音"
- **严重级别**: P2

### [BUG-8] BGM `endTime=25.0` 短于总时长 — D7 音频
- **位置**: Entry 1 (00:00:00,000 --> 00:00:03,000)
- **问题**: BGM endTime=25.0s，但剧本总时长约 48s，最后 23s 无 BGM
- **预期行为**: BGM endTime 应 ≥ 剧本总时长
- **质检预期**: D7 Inspector 应标记"BGM endTime(25.0) < 剧本总时长(48.0)，末尾将出现静音"
- **严重级别**: P1

### [BUG-9] `{Camera:LowAngle|targetPos=999,999,999}` — 目标指向虚空 — D4 运镜 + D2 角色可见度
- **位置**: Entry 9 (00:00:38,000 --> 00:00:43,000)
- **问题**: targetPos=(999,999,999) 远离所有角色实际位置
- **预期行为**: targetPos 应指向角色实际位置或使用 `targetCharacter` 参数
- **质检预期**: D4 Inspector 应标记"LowAngle 目标指向虚空"；D2 Inspector 应标记"角色不可见"
- **严重级别**: P1

### [BUG-10] `transitions.json` 缺少 ParkScene 入口 — D1 场景一致性
- **位置**: `config/transitions.json`
- **问题**: 剧本中 RoomScene → ParkScene 有场景切换，但 transitions.json 缺少 ParkScene 的 entrance 配置
- **预期行为**: 每个被切换到的场景都应有 entrance 配置
- **质检预期**: D1 Inspector 应标记"ParkScene 缺少 entrance 配置"
- **严重级别**: P2

---

## 质检验证矩阵

| Bug | D1 | D2 | D3 | D4 | D5 | D6 | D7 | 预期发现者 |
|-----|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:---------|
| BUG-1 | | | | | | ✅ | | D6 |
| BUG-2 | ✅ | | | | | | | D1 |
| BUG-3 | | | ✅ | | | | | D3 |
| BUG-4 | | ✅ | | ✅ | | | | D2+D4 |
| BUG-5 | | | | ✅ | | | | D4 |
| BUG-6 | ✅ | ✅ | | | | | | D1+D2 |
| BUG-7 | | | | | | | ✅ | D7 |
| BUG-8 | | | | | | | ✅ | D7 |
| BUG-9 | | ✅ | | ✅ | | | | D2+D4 |
| BUG-10| ✅ | | | | | | | D1 |

---

## 验收标准

质检系统需要：
1. **全部 10 个 bug 都被至少一个 Inspector 发现**
2. **跨维度 bug（BUG-4, BUG-6, BUG-9）被多个 Inspector 交叉验证**
3. **每个 bug 都有正确的严重级别判定**
4. **修复建议具有可操作性**
5. **dula-verify 能成功渲染全部 10 个条目的截图（不崩溃）**

如果质检团队漏掉 >2 个 bug，或渲染崩溃，说明质检体系需要加强。

---

## 回归测试用法

```bash
# 静态检查（应在 5 秒内完成）
npx dula-inspect ./episodes/inspector_testbed

# 视觉验证（截图检查，不生成完整视频）
npx dula-verify ./episodes/inspector_testbed

# 完整构建（可选，用于验证渲染管线不崩溃）
npm run build:inspect
```
