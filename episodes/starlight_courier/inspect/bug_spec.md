# Starlight Courier — 故意埋入的 Bug 规格

> 本文件记录新剧情中故意埋入的 8 个 bug，用于验证闭环质检团队的发现能力。
> **注意**：这些 bug 是设计意图，不是真实缺陷。质检团队应能全部发现。

---

## Bug 清单

### [BUG-1] Entry 1 缺少角色对白标签 — D6 台词匹配
- **位置**: Entry 1 (00:00:00,000 --> 00:00:03,000)
- **问题**: Entry 1 只有场景切换和站位配置，没有 `[Character]` 对白标签
- **预期行为**: 开场应有角色引入或环境描述
- **质检预期**: D6 Inspector 应标记"Entry 1 无对白，是否为设计意图？"
- **严重级别**: P2（建议级）

### [BUG-2] `{Camera:Orbit|endAngle=3.14}` 非完整环绕 — D4 运镜
- **位置**: Entry 8 (00:00:30,000 --> 00:00:35,000)
- **问题**: `endAngle=3.14` (≈π) 只环绕 180°，不是完整的 360°
- **预期行为**: 飞行戏份通常需要完整 360° 展示（endAngle=6.283）
- **质检预期**: D4 Inspector 应标记"Orbit 运镜不完整，仅 180°"
- **严重级别**: P1

### [BUG-3] `{Camera:LowAngle|targetPos=0,5,-10}` 目标位置无角色 — D4 运镜 + D2 角色
- **位置**: Entry 10 (00:00:40,000 --> 00:00:45,000)
- **问题**: LowAngle 的 targetPos 指向 (0,5,-10)，但角色在 (±1, 3, 0)
- **预期行为**: targetPos 应指向角色实际位置
- **质检预期**: D4 Inspector 应标记"LowAngle 目标指向虚空"，D2 应标记"角色不可见"
- **严重级别**: P1

### [BUG-4] `{Animation:Float}` 未在资产库注册 — D3 动作
- **位置**: Entry 8, 9, 10
- **问题**: `Float` 动画未在 dula-assets 的 Xiaoyue/Xingzai 动画列表中
- **预期行为**: 应使用已注册的动画（如 `FlyPose`）
- **质检预期**: D3 Inspector 应标记"Float 动画未注册，将回退到 Idle"
- **严重级别**: P1

### [BUG-5] `{Camera:ZoomIn|target=Xiaoyue}` 参数错误 — D4 运镜
- **位置**: Entry 11 (00:00:45,000 --> 00:00:50,000)
- **问题**: `target=Xiaoyue` 应为 `characterName=Xiaoyue`（ZoomIn 的参数名不一致）
- **预期行为**: 相机应正确识别目标角色
- **质检预期**: D4 Inspector 应标记"ZoomIn 参数名错误，target 应为 characterName"
- **严重级别**: P1

### [BUG-6] `wind_strong` SFX 素材缺失 — D7 音频
- **位置**: Entry 10
- **问题**: `{SFX:Play|name=wind_strong|offset=0.0}` 但 materials/sfx/ 目录无此文件
- **预期行为**: 风暴层应有风声
- **质检预期**: D7 Inspector 应标记"wind_strong SFX 素材缺失，将使用 procedural 回退"
- **严重级别**: P2

### [BUG-7] Entry 8/9/10 双角色同镜头但相机只跟踪一人 — D4 运镜
- **位置**: Entry 8, 9, 10
- **问题**: 两个角色同时在场（Xiaoyue + Xingzai），但相机只跟踪 Xingzai 或 Xiaoyue 之一
- **预期行为**: 双人飞行戏份应使用 TwoShot 或交替跟踪
- **质检预期**: D4 Inspector 应标记"双人场景中相机只跟踪单人，另一角色可能出画"
- **严重级别**: P2

### [BUG-8] `{SFX:Play|name=flash}` 在 Entry 4 和 Entry 11 重复触发 — D7 音频
- **位置**: Entry 4 (offset=0.2) 和 Entry 11 (offset=0.5)
- **问题**: 同一 SFX 在不同剧情节点重复触发，缺乏变化
- **预期行为**: 不同场景应使用不同 SFX（如 Entry 4 用 flash，Entry 11 用 sparkle/chime）
- **质检预期**: D7 Inspector 应标记"SFX 重复使用，建议区分"
- **严重级别**: P3

---

## 质检验证矩阵

| Bug | D1 | D2 | D3 | D4 | D5 | D6 | D7 | 预期发现者 |
|-----|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:---------|
| BUG-1 | | | | | | ✅ | | D6 |
| BUG-2 | | | | ✅ | | | | D4 |
| BUG-3 | | ✅ | | ✅ | | | | D2+D4 |
| BUG-4 | | | ✅ | | | | | D3 |
| BUG-5 | | | | ✅ | | | | D4 |
| BUG-6 | | | | | | | ✅ | D7 |
| BUG-7 | | ✅ | | ✅ | | | | D2+D4 |
| BUG-8 | | | | | | | ✅ | D7 |

---

## 验收标准

质检团队需要：
1. **全部 8 个 bug 都被至少一个 Inspector 发现**
2. **跨维度 bug（BUG-3, BUG-7）被多个 Inspector 交叉验证**
3. **每个 bug 都有正确的严重级别判定**
4. **修复建议具有可操作性**

如果质检团队漏掉 >2 个 bug，说明质检体系需要加强。
