# VisualReview 工程化设计方案

## 1. 目标

将 AI 视觉/美学审核固化为可复用的工程组件，作为 `dula-inspect-team` 的扩展模块运行。

## 2. 审核维度

| 维度 | 检查内容 | 实现方式 |
|------|----------|----------|
| D16 CharacterDetailReview | 角色外观细节（服装纹理、配饰完整性、材质表现） | 截图 + AI Vision |
| D17 SceneDetailReview | 场景丰富度（背景层次、道具分布、环境细节） | 截图 + AI Vision |
| D18 CinematographyReview | 运镜质量（构图平衡、视线引导、景别变化） | 截图序列 + AI Vision |
| D19 LightingReview | 光效氛围（明暗对比、色温一致性、光源合理性） | 截图 + AI Vision |
| D20 DialogueReview | 台词文学性（情感表达、节奏感、角色匹配度） | 文本分析 |

## 3. 技术架构

```
VisualReviewEngine
├── ScreenshotCollector    # 从渲染帧提取关键帧
├── AIVisionClient         # GPT-4V / Claude 3 调用封装
├── PromptTemplate         # 各维度审核 Prompt 模板
├── ResultAggregator       # 结果聚合与评分
└── ReportGenerator        # 生成可视化报告
```

## 4. 集成方式

### 方案A：独立 CLI 工具（推荐）
```bash
npx dula-visual-review ./episodes/she_ra
```

### 方案B：集成到 dula-inspect-team
```bash
npx dula-inspect-team ./episodes/she_ra --visual
```

## 5. 实现路径

### Phase 1: 基础框架（MVP）
- [x] ScreenshotCollector：从 storyboard/frames 提取关键帧
- [x] PromptTemplate：定义基础审核 Prompt
- [x] AIVisionClient：封装 OpenAI/Anthropic API 调用
- [x] ResultAggregator：简单评分（1-10分制）

### Phase 2: 规则引擎回退
- [ ] 传统 CV 检测（边缘检测、色彩分析）
- [ ] 与 AI Vision 结果融合
- [ ] 降低 API 调用成本

### Phase 1.5: 集成到 Story 仓库（已完成）
- [x] `tools/visual-review/` 目录结构
- [x] `screenshot_collector.py` — 关键帧提取（场景切换/对白中间/运镜变化）
- [x] `ai_vision_client.py` — OpenAI/Anthropic API 封装
- [x] `visual_review_engine.py` — 审核引擎与报告生成
- [x] `cli.py` — 命令行入口
- [x] `package.json` scripts 集成

### Phase 3: 深度集成
- [ ] 与 dula-inspect-team 统一报告格式
- [ ] 历史对比（版本间质量变化追踪）
- [ ] 自动修复建议生成

## 6. 关键帧提取策略

| 场景类型 | 提取规则 |
|----------|----------|
| 场景切换 | 首帧 + 尾帧 |
| 角色特写 | 每句台词中间帧 |
| 动作序列 | 关键姿势帧（起始/峰值/结束）|
| 运镜变化 | 运镜开始和结束帧 |

## 7. Prompt 设计原则

1. **结构化输出**：要求 JSON 格式返回
2. **评分标准**：1-10 分，附具体理由
3. **对比参照**：提供同类型优秀/劣质示例
4. **可执行建议**：每个问题附修复方案

## 8. 成本估算

| 方案 | 每Episode成本 | 延迟 |
|------|--------------|------|
| GPT-4V 全量 | ~$0.5-1.0 | 30-60s |
| 规则引擎 | $0 | 5-10s |
| 混合模式（推荐）| ~$0.2-0.5 | 15-30s |
