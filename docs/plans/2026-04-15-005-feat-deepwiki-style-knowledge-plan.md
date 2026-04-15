---
title: DeepWiki 风格知识库文档体系
type: feat
status: active
date: 2026-04-15
origin: docs/brainstorms/deepwiki-style-knowledge-requirements.md
---

# DeepWiki 风格知识库文档体系

## Overview

增强 knowledge-builder Skill 的产出能力，从 4 个机器消费文件扩展为双轨 8 文件产出（4 个原有精简文件 + 4 个 Wiki 风格详尽文档）。引入子 Agent 协作架构规避上下文窗口限制。前端增加 Markdown 渲染和 Mermaid 图表支持，融入现有知识库详情页。

## Problem Frame

现有 knowledge-builder Skill 产出偏向机器消费，Markdown 文档信息密度低、缺少可视化。人类开发者难以通过阅读理解模块架构和排查问题。需求详见 origin 文档。

## Requirements Trace

- R1. 保留现有 4 个文件，不做破坏性变更
- R2. 新增 4 个 Wiki 风格文档（architecture.md、call_chains.md、api_reference.md、troubleshooting.md）
- R3. 源文件路径必需，行号 best-effort
- R4. 子 Agent 协作架构（主 Agent + 数据子 Agent + Wiki 子 Agent + 校验子 Agent）
- R5. 覆盖式重建，完全成功后一次性写入
- R6. Mermaid 语法由 Skill 生成，前端渲染
- R7. Markdown 文件渲染展示，JSON 文件保持原始格式
- R8. 引入 react-markdown 和 mermaid.js
- R9. Mermaid 渲染失败时显示错误提示
- R10. 复用现有 API 端点
- R11. 编辑锁定复用现有逻辑

## Scope Boundaries

- 不构建独立的 Wiki 浏览器
- 不生成 toc.json
- 不实现 Wiki 页面在线编辑、版本历史
- 不实现多模块交叉引用
- Mermaid 仅限 flowchart 和 sequence diagram
- 验证阶段，不优化执行时间体验

## Context & Research

### Relevant Code and Patterns

- **Skill 定义**: `.claude/skills/knowledge-builder/SKILL.md` — 当前三阶段（扫描 → 分析 → 生成），生成 4 个文件
- **NAPI 映射参考**: `.claude/skills/knowledge-builder/references/mapping_patterns.md` — 5 种映射模式
- **执行器**: `app/agent/claude_executor.py` — ClaudeExecutor 包装 claude CLI 子进程，`run_with_timeout()` 使用 `asyncio.timeout`
- **任务管理**: `app/manager/task_manager.py` — 纯业务逻辑，`_build_prompt()` 构建 skill 调用 prompt
- **知识库存储**: `app/store/knowledge_store.py` — 文件系统存储，路径遍历防护，`init_module_meta()` 由后端调用
- **API 端点**: `app/api/knowledge_api.py` — GET 读取文件、PUT 编辑文件（agent 运行时 409）
- **前端页面**: `frontend/src/pages/KnowledgePage.jsx` — `<pre>` 标签原样展示，无 Markdown 渲染
- **配置**: `config/config.yaml` — `task_timeout_seconds: 900`，`allowed_tools` 已包含 `Agent`

### Existing Plans

- Plan 002 已实现 knowledge_store.py 和 knowledge_api.py 的完整设计
- Plan 003 修复了 SSE 事件重复和任务中止问题

## Key Technical Decisions

- **主 Agent + 3 个子 Agent 协作**: 主 Agent（扫描 + 协调）→ 数据子 Agent（4 个原有文件）→ Wiki 子 Agent（4 个新文档）→ 校验子 Agent（一致性检查）。共 4 个角色（1 主 + 3 子）。理由是平衡上下文隔离和协调复杂度
- **超时从 15 分钟放宽到 60 分钟**: `config/config.yaml` 的 `task_timeout_seconds` 从 900 改为 3600。子 Agent 协作流程需要更多时间
- **前端渲染策略**: `.md` 文件用 react-markdown 渲染（集成 Mermaid），`.json` 文件保持 `<pre>` 格式化展示。通过文件扩展名自动切换
- **Mermaid 集成方式**: 使用 mermaid.js 的 `mermaid.run()` API 在 `useEffect` 中渲染，配合 ErrorBoundary 捕获渲染失败
- **校验子 Agent 职责**: 检查 8 个文件全部存在、非空、格式基本正确（JSON 可解析、Markdown 非空白），Mermaid 语法基本完整（含 ```mermaid 代码块）

## Open Questions

### Resolved During Planning

- **子 Agent 拆分策略**: 采用主 Agent + 3 个子 Agent 方案（数据 + Wiki + 校验），由用户确认
- **toc.json 是否需要**: 不需要，文件按 meta.json 扁平列表展示，由用户确认
- **前端集成方式**: 融入现有 KnowledgePage.jsx，不构建独立 Wiki 浏览器，由用户确认

### Deferred to Implementation

- **Wiki 文档内容模板**: 各文档页的详细章节结构需在实现时根据实际模块（如 base_location）的代码结构确定
- **校验 Agent 的具体校验规则**: 基本框架在此定义，具体规则在实现时细化
- **Mermaid 渲染库选型**: react-markdown 和 mermaid.js 已确定，具体插件（如 remark-gfm）在实现时按需引入

## Implementation Units

- [ ] **Unit 1: 更新后端超时配置**

**Goal:** 将知识库构建任务的超时时间从 15 分钟放宽到 60 分钟，支持子 Agent 协作流程

**Requirements:** R4（子 Agent 协作需要更多时间）

**Dependencies:** None

**Files:**
- Modify: `config/config.yaml`

**Approach:**
- 将 `runtime.task_timeout_seconds` 从 `900` 改为 `3600`

**Patterns to follow:**
- 现有 YAML 配置格式

**Test scenarios:**
- Test expectation: none — 纯配置值变更，无行为逻辑

**Verification:**
- 配置文件中 `task_timeout_seconds` 值为 3600

---

- [ ] **Unit 2: 前端添加 Markdown 渲染和 Mermaid 支持**

**Goal:** 在知识库详情页中，将 `.md` 文件从 `<pre>` 原样展示升级为 Markdown 渲染（含 Mermaid 图表），`.json` 文件保持原始格式展示

**Requirements:** R7, R8, R9

**Dependencies:** None（与 Unit 1 并行）

**Files:**
- Modify: `frontend/package.json`（添加依赖）
- Create: `frontend/src/components/FileContentViewer.jsx`（文件内容渲染组件）
- Create: `frontend/src/components/MermaidBlock.jsx`（Mermaid 图表渲染组件）
- Modify: `frontend/src/pages/KnowledgePage.jsx`（替换 `<pre>` 为 FileContentViewer）

**Approach:**
- 安装 `react-markdown` 和 `mermaid` 作为前端依赖
- 创建 `FileContentViewer` 组件：根据文件扩展名（`.md` / `.json`）选择渲染方式
  - `.md` 文件：使用 `react-markdown` 渲染，自定义 code block renderer 检测 `mermaid` 语言标记并渲染 Mermaid 图表
  - `.json` 文件：保持 `<pre>` 格式化展示
  - 其他文件：保持 `<pre>` 展示
- 创建 `MermaidBlock` 组件：使用 `useEffect` 调用 `mermaid.run()` 渲染图表，包含错误边界捕获渲染失败并显示错误提示
- 修改 `KnowledgePage.jsx`：将文件查看区域的 `<pre>` 替换为 `<FileContentViewer>`

**Patterns to follow:**
- 现有 `KnowledgePage.jsx` 的深色科技风 UI 样式
- 现有的 fetch + state 管理模式

**Test scenarios:**
- Happy path: 选择 .md 文件时，内容被 Markdown 渲染为 HTML 格式（标题、列表、代码块等正确显示）
- Happy path: .md 文件中包含 ```mermaid 代码块时，Mermaid 图表正确渲染为 SVG
- Happy path: 选择 .json 文件时，内容保持原始 JSON 格式展示
- Edge case: .md 文件中包含无效 Mermaid 语法时，图表区域显示错误提示（如"图表渲染失败"），不影响其他 Markdown 内容
- Edge case: 文件内容为空时，FileContentViewer 显示居中的空状态提示（文案"该文件暂无内容"），与现有 KnowledgePage 的空状态模式一致
- Error path: 文件读取失败时（如网络错误），显示错误提示

**Verification:**
- `npm run build` 成功，无编译错误
- 在知识库详情页中选择 .md 文件能看到渲染后的内容（含 Mermaid 图表）
- 选择 .json 文件仍看到原始格式

---

- [ ] **Unit 3: 重写 knowledge-builder Skill 定义**

**Goal:** 将现有三阶段 Skill 重写为子 Agent 协作架构，产出 8 个文件（4 原有 + 4 Wiki）

**Requirements:** R1, R2, R3, R4, R5, R6

**Dependencies:** Unit 1（超时配置需先更新）

**Files:**
- Modify: `.claude/skills/knowledge-builder/SKILL.md`

**Approach:**
- 完全重写 SKILL.md，新结构：

  **Phase 1 — 主 Agent 模块扫描**
  - 定位模块目录结构
  - 识别 NAPI 桥接层、Framework 层、核心实现文件
  - 生成扫描摘要（不写入文件，仅作为内部中间数据）

  **Phase 2 — 数据子 Agent（结构化数据文件）**
  - 输入：主 Agent 的扫描摘要 + 模块路径
  - 产出：`error_codes.json`、`api_chain.json`、`overview.md`、`common_issues.md`
  - 行为：与现有三阶段 Skill 的分析+生成逻辑一致，保持精简面向机器

  **Phase 3 — Wiki 子 Agent（人类阅读文档）**
  - 输入：主 Agent 的扫描摘要 + Phase 2 产出的结构化数据（`api_chain.json`、`error_codes.json`）
  - 产出：`architecture.md`（含 Mermaid flowchart）、`call_chains.md`（含 Mermaid sequence diagram）、`api_reference.md`、`troubleshooting.md`
  - 源码溯源：源文件路径为必需（纯文本），行号 best-effort

  **Phase 4 — 校验子 Agent**
  - 检查 8 个文件全部存在且非空
  - JSON 文件格式可解析
  - Markdown 文件非空白
  - Mermaid 图表代码块存在（`architecture.md` 应含 flowchart，`call_chains.md` 应含 sequence diagram）
  - 输出校验报告

- 保持 `references/mapping_patterns.md` 不变
- Skill 参数不变（module_name, code_repo_root, docs_repo_root, sdk_repo_root, knowledge_root）
- 覆盖式重建：先清空目标目录，然后子 Agent 写入文件

**Patterns to follow:**
- 现有 `.claude/skills/knowledge-builder/SKILL.md` 的 YAML frontmatter 格式
- 现有 `.claude/skills/problem-locator/SKILL.md` 的 Skill 定义风格（如有）
- Claude Code Agent 工具的使用模式

**Test scenarios:**
- Happy path: 对 base_location 模块执行知识库构建，成功生成 8 个文件（4 原有 + 4 Wiki）
- Happy path: architecture.md 中包含 Mermaid flowchart 代码块
- Happy path: call_chains.md 中包含 Mermaid sequence diagram 代码块
- Edge case: 模块目录不存在或为空时，Skill 报告错误而非崩溃
- Integration: 生成后 problem-locator Skill 仍能正常读取 error_codes.json 和 api_chain.json

**Verification:**
- 对 base_location 模块执行知识库构建，检查 data/knowledge/base_location/ 下有 8 个文件
- 前端能正确渲染所有 .md 文件（含 Mermaid 图表）
- problem-locator 能正常消费 JSON 文件

## System-Wide Impact

- **Interaction graph:** knowledge-builder Skill 产出文件 → knowledge_store.py init_module_meta() 扫描目录生成 meta.json → KnowledgePage.jsx 读取并展示 → problem-locator Skill 查询知识库。所有现有交互链路保持不变
- **Error propagation:** 子 Agent 失败时，主 Agent 捕获错误并终止流程，不产生残留文件
- **State lifecycle risks:** 覆盖式重建（先清空后写入）消除了部分写入风险；超时由 claude_executor.kill() 处理
- **API surface parity:** 现有 API 端点不变，Wiki 文档文件名通过现有 FILENAME_PATTERN 校验
- **Unchanged invariants:** problem-locator Skill 的知识库查询行为不受影响；knowledge_store.py 的安全机制继续适用

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 子 Agent 上下文仍可能不足以处理大型模块（如 multimedia_player_framework） | Phase 3 Wiki 子 Agent 可进一步拆分为两次调用（Mermaid 文档 + 非 Mermaid 文档），但验证阶段先用单次调用测试 |
| Mermaid 语法由 LLM 生成，可能有格式错误 | 前端 ErrorBoundary 捕获渲染失败，显示错误提示；不阻塞其他内容 |
| 覆盖式重建会清空所有旧文件（包括人工编辑的内容） | 现有行为一致（SKILL.md 已声明完整覆盖），不引入新风险 |
| 校验子 Agent 可能误判文件质量 | 校验规则保持简单（存在性 + 非空 + 基本格式），不做深度内容验证 |

## Sources & References

- **Origin document:** [docs/brainstorms/deepwiki-style-knowledge-requirements.md](docs/brainstorms/deepwiki-style-knowledge-requirements.md)
- Related code: `.claude/skills/knowledge-builder/SKILL.md`
- Related code: `frontend/src/pages/KnowledgePage.jsx`
- Related code: `app/agent/claude_executor.py`
- Related code: `config/config.yaml`
