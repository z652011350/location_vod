---
date: 2026-04-15
topic: deepwiki-style-knowledge-docs
---

# DeepWiki 风格知识库文档体系

## Problem Frame

现有 knowledge-builder Skill 为每个鸿蒙模块生成 4 个文件（`overview.md`、`error_codes.json`、`api_chain.json`、`common_issues.md`），产出偏向机器消费——结构化 JSON 供 problem-locator 查询，但 markdown 文档信息密度低、缺少可视化，人类开发者难以通过阅读来理解一个模块的架构和排查问题。

目标是让知识库同时服务两个受众：**problem-locator Agent**（继续消费结构化 JSON）和**人类开发者**（通过渲染后的 Markdown 文档快速理解模块架构、API 用法、调用链路和故障排查方法）。不追求复刻 DeepWiki 的 Wiki 浏览器形式，而是借用其思想——丰富的文档产出 + Mermaid 可视化 + 源码溯源，融入现有的知识库页面中。

## Requirements

**文档产出 — 双轨并存**

- R1. 保留现有全部 4 个文件（`overview.md`、`error_codes.json`、`api_chain.json`、`common_issues.md`）供 problem-locator Skill 查询，不做破坏性变更。现有文件保持精简风格面向机器消费
- R2. 新增 4 个 Wiki 风格 Markdown 文档，面向人类开发者阅读：
  - **架构总览**（`architecture.md`）— 模块职责、组件层次、依赖关系，内嵌 Mermaid 组件关系图（flowchart）
  - **API 调用链流程**（`call_chains.md`）— 从 JS API 声明到 NAPI 桥接到 C++ 实现的完整调用路径，使用 Mermaid sequence diagram 可视化
  - **API 参考手册**（`api_reference.md`）— 模块暴露的所有公开接口，含参数说明、返回值类型、权限要求
  - **故障排查指南**（`troubleshooting.md`）— 模块常见错误场景、错误码含义、排查思路、典型修复方案
- R3. Wiki 文档中的技术断言需标注源文件路径（纯文本形式）。行号标注为 best-effort（尽力而为），不作为硬性要求

**Skill 执行 — 子 Agent 协作架构**

- R4. knowledge-builder Skill 采用主 Agent 协调 + 子 Agent 分工的架构：
  - 主 Agent 负责模块扫描、任务拆分和协调
  - 子 Agent 负责生成具体的文档页和结构化数据文件
  - 校验 Agent 负责对最终输出进行一致性校验
- R5. Skill 完全成功后一次性写入所有文件（覆盖式重建），中途失败不产生残留文件
- R6. Mermaid 图表由 Skill 在 Markdown 中直接生成语法，前端负责渲染

**前端 — 增强现有文件查看器**

- R7. 在现有知识库详情页中，将文件内容展示从 `<pre>` 原样展示升级为：Markdown 文件使用 Markdown 渲染器展示（含 Mermaid 图表渲染），JSON 文件保持原始格式展示便于核查
- R8. 引入 react-markdown 和 mermaid.js 作为前端依赖
- R9. Mermaid 图表渲染失败时显示错误提示，不阻塞页面其他内容

**后端**

- R10. 复用现有 `GET /api/knowledge/{module_name}/files/{filename}` 端点读取 Wiki 文档页内容，不新增端点
- R11. Wiki 文档页的编辑锁定机制复用现有逻辑（agent 运行期间返回 409）

## Success Criteria

- 对一个示例模块（如 base_location）执行知识库构建，生成完整的双轨产出：4 个原有文件 + 4 个 Wiki 文档
- 前端能正确渲染 Markdown 文档（含 Mermaid 图表），JSON 文件保持原始格式展示
- problem-locator Skill 在问题诊断中仍能完整执行全流程（覆盖所有被引用的知识库文件类型，无回归）
- Wiki 文档中的源文件路径引用可验证（行号为 best-effort）

## Scope Boundaries

- 不构建独立的 Wiki 浏览器（融入现有知识库详情页的文件查看功能）
- 不生成 `toc.json`（文件按 meta.json 中的扁平列表展示）
- 不实现 Wiki 页面的在线编辑功能（当前阶段 Wiki 文档由 Skill 全量覆盖生成，人工编辑仍走现有的文件编辑端点）
- 不实现 Wiki 页面的版本历史
- 不实现多模块交叉引用（每个模块的文档独立）
- 不引入向量数据库或搜索引擎
- Mermaid 图表类型限定在 flowchart 和 sequence diagram
- 当前为验证阶段，不优化执行时间对用户体验的影响

## Key Decisions

- **双轨并存，定位不同**：保留现有 4 个文件（精简、面向机器消费）+ 新增 4 个 Wiki 文档（详尽、面向人类消费）。理由是避免内容重复的同时保持 problem-locator 的兼容性
- **子 Agent 协作而非单 Agent 长流程**：主 Agent 协调 + 子 Agent 分工 + 校验 Agent 验证。理由是规避单次 Claude CLI 调用的上下文窗口限制，每个子 Agent 只需关注具体任务
- **融入现有页面而非新建 Wiki 浏览器**：在知识库详情页中增强文件内容渲染（Markdown 渲染 + Mermaid），不构建独立的左右分栏 Wiki 浏览器。理由是系统目标是辅助问题定位而非文档展示，保持简单
- **超时放宽至 60 分钟**：双轨生成的子 Agent 协作流程需要更多执行时间。验证阶段可接受较长等待
- **行号 best-effort**：源文件路径为必需，行号为尽力而为。理由是 LLM 生成的行号存在幻觉风险，且代码仓库更新后行号会失效
- **Mermaid 渲染失败时优雅降级**：显示错误提示而非阻塞页面。理由是 LLM 生成的 Mermaid 语法可能有细微错误

## Dependencies / Assumptions

- 假设 mermaid.js 能在当前前端技术栈（React 19 + Vite 8）中正常集成
- 依赖现有 knowledge_store.py 的文件读写基础设施，路径校验和安全机制继续适用
- 子 Agent 协作架构依赖 Claude CLI 的 Agent 工具能力（支持在 Skill 内调用子 Agent）

## Outstanding Questions

### Resolve Before Planning

（无阻塞问题）

### Deferred to Planning

- [Affects R2][Technical] Wiki 文档的详细内容模板 — 每种文档页的具体章节结构、Mermaid 图表的粒度，需要在规划时根据实际模块（如 base_location）的代码结构来确定
- [Affects R4][Technical] 子 Agent 的具体拆分策略 — 每个子 Agent 负责哪些文件、输入输出如何传递、校验 Agent 的校验规则
- [Affects R7][Technical] 前端文件类型检测和渲染策略 — 如何区分 Markdown 和 JSON 文件并选择渲染方式

## Next Steps

-> `/ce:plan` 用于结构化实施规划
