---
name: team-sprint
description: Form a virtual闭环开发团队 with PM, Tech Lead, Dev, QA, and Design roles to collaboratively build, review, and iterate on complex software or content projects. Use when the user needs multi-dimensional quality assurance, cross-functional review, or autonomous team-based development for non-trivial tasks involving architecture, UX, testing, or multiple stakeholder perspectives.
---

# Team Sprint — 闭环开发团队协作

## 何时触发

以下场景自动组建团队：
1. 用户明确要求"组建团队"、"多人评审"、"闭环开发"
2. 任务涉及>3个文件或需要跨领域决策（技术+设计+产品）
3. 需要质量保证但用户未指定具体测试方案
4. 代码/内容需要多轮迭代才能达到可交付状态

## 团队角色定义

| 角色 | 职责 | 核心输出 |
|------|------|---------|
| **PM (产品经理)** | 需求澄清、验收标准、优先级判断、用户价值评估 | PRD要点、验收清单、迭代决策 |
| **Tech Lead (技术经理)** | 架构设计、技术选型、代码审查、债务评估 | 技术方案、代码评审意见、重构建议 |
| **Dev (开发工程师)** | 编码实现、单元测试、技术文档 | 可运行代码、测试用例、API文档 |
| **QA (质量工程师)** | 测试策略、bug分析、边界条件、回归测试 | 测试报告、bug清单、质量评级 |
| **Design (设计师)** | 视觉评审、交互流程、用户体验、一致性检查 | 设计意见、视觉问题清单、改进建议 |
| **PO (项目协调)** | 进度跟踪、风险同步、阻塞解决、最终汇总 | Sprint总结、下一步计划、风险告警 |

## 协作流程 (Sprint Loop)

```
[启动] → PM明确需求与验收标准
    ↓
[设计] → Tech Lead出方案 + Design出视觉/交互建议
    ↓
[开发] → Dev编码实现（遵守方案）
    ↓
[评审] → 并行：QA测试 + Tech Lead代码审 + Design视觉审
    ↓
[迭代] → PO汇总问题 → PM排优先级 → Dev修复
    ↓
[验收] → QA回归测试 → PM验收 → 通过/返回迭代
```

## 关键规则

1. **每个角色用独立subagent实现**，并行运行评审
2. **评审必须基于事实**：QA必须运行测试，Design必须查看截图/产物，Tech Lead必须阅读代码
3. **阻塞升级**：如果Dev无法修复，升级给Tech Lead做技术决策；如果需求矛盾，PM仲裁
4. **验收标准先行**：PM在启动阶段就定义"什么算完成"，避免无限迭代
5. **每轮迭代产出可追溯**：每个问题要有issue编号、严重级别、负责人

## 快速启动模板

当用户说"组建团队做X"时，按以下顺序启动：

1. **启动PM agent**：明确需求、验收标准、时间盒
2. **启动Tech Lead + Design agent**（并行）：基于PM输出做技术方案+设计建议
3. **Dev执行**：根据方案编码
4. **启动QA + Tech Lead + Design review**（并行）：基于实际产物评审
5. **PO汇总**：整理所有问题，决定本轮是否验收通过

## 严重级别定义

| 级别 | 定义 | 处理策略 |
|------|------|---------|
| P0 | 阻塞性，无法运行/核心功能缺失 | 必须修复才能进入下一轮 |
| P1 | 严重影响体验/质量 | 本轮尽量修复，否则下轮首个处理 |
| P2 | 体验瑕疵/代码异味 | 可 deferred 到后续sprint |
| P3 | 建议/优化点 | 记录待办，不阻塞当前sprint |

## 输出规范

每轮sprint结束，PO必须输出：
- Sprint总结（做了什么、解决了什么）
- 剩余问题清单（按P0/P1/P2分级）
- 下一轮计划（如果还有）
- 风险与阻塞项
