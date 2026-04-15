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
- R3. Wiki 文档中的技术断言需标注源文件路径（纯文本，行号 best-effort）。此要求仅适用于 4 个新增 Wiki 文档，不适用于原有结构化数据文件
- R4. 子 Agent 协作架构（主 Agent + 数据子 Agent + 数据质量检查子 Agent + Wiki 子 Agent + 校验子 Agent）
- R5. 覆盖式重建采用临时目录策略：子 Agent 写入临时子目录，校验通过后原子重命名为正式目录。失败时旧文件不受影响
- R6. Mermaid 语法由 Skill 生成，前端渲染
- R7. Markdown 文件提供渲染模式（Markdown 渲染 + Mermaid）和编辑模式（原始文本 textarea）两种展示方式，可切换。JSON 文件保持原始格式展示
- R8. 引入 react-markdown 和 mermaid.js
- R9. Mermaid 渲染失败时显示错误提示
- R10. 复用现有 API 端点
- R11. 编辑锁定复用现有逻辑
- R12. problem-locator Skill 需了解每个知识库文件的作用，避免新增 Wiki 文档干扰诊断查询

## Scope Boundaries

- 不构建独立的 Wiki 浏览器
- 不生成 toc.json
- 不实现 Wiki 页面在线编辑、版本历史（编辑模式通过现有 textarea 实现）
- 不实现多模块交叉引用
- Mermaid 仅限 flowchart 和 sequence diagram
- 验证阶段，不优化执行时间和构建产物性能

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

- **主 Agent + 4 个子 Agent 协作**: 主 Agent（扫描 + 协调）→ 数据子 Agent（4 个原有文件）→ 数据质量检查子 Agent（验证结构化数据质量）→ Wiki 子 Agent（4 个新文档）→ 校验子 Agent（最终一致性检查）。共 5 个角色（1 主 + 4 子）。质量检查子 Agent 防止 Phase 2 数据质量问题级联到 Wiki 文档
- **超时全局统一为 60 分钟**: `config/config.yaml` 的 `task_timeout_seconds` 从 900 改为 3600。全局统一，不按任务类型拆分
- **前端渲染策略**: `.md` 文件提供两种模式 — 渲染模式（react-markdown + Mermaid，亮色主题）和编辑模式（原始文本 textarea）。`.json` 文件保持 `<pre>` 格式化展示。通过文件扩展名自动切换渲染方式
- **亮色主题**: Markdown 渲染区域采用亮色主题（白色背景 + 深色文字），与整体深色 UI 形成对比突出内容可读性
- **临时目录 + 原子重命名**: 子 Agent 写入临时子目录（如 `knowledge_root/{module_name}.tmp/`），校验通过后将临时目录重命名为正式目录，旧目录重命名为 `.bak`。失败时旧文件不受影响，下次重建时清理 `.bak`
- **Mermaid 集成方式**: 使用 mermaid.js 的 `mermaid.run()` API，通过 `useEffect` + 唯一 ID 渲染指定 DOM 元素，配合 try/catch 捕获渲染失败。文件切换时清理旧 Mermaid 实例
- **校验子 Agent 职责**: 检查 8 个文件全部存在且非空、JSON 文件内容结构正确（非空数组、含必要字段）、Markdown 非空白、Mermaid 代码块存在
- **8 文件 Tab 栏**: 不分组，添加横向滚动条，确保每个文件名可正常显示
- **重建期间前端状态**: agent 运行期间知识库详情页显示"知识库正在重建"提示，禁用文件查看

## Open Questions

### Resolved During Planning

- **子 Agent 拆分策略**: 主 Agent + 4 个子 Agent（数据 + 质量检查 + Wiki + 校验），由用户确认
- **toc.json 是否需要**: 不需要，文件按 meta.json 扁平列表展示
- **前端集成方式**: 融入现有 KnowledgePage.jsx，不构建独立 Wiki 浏览器
- **覆盖式重建策略**: 临时目录 + 原子重命名，保证失败时旧数据不丢失
- **超时配置**: 全局统一 3600s
- **Markdown 主题**: 亮色主题
- **R3 适用范围**: 仅 Wiki 文档（4 个新增文件）

### Deferred to Implementation

- **Wiki 文档内容模板**: 各文档页的详细章节结构需在实现时根据实际模块（如 base_location）的代码结构确定
- **Mermaid 渲染时序细节**: useEffect 依赖数组、清理函数、重入行为的具体实现在编码时确定
- **problem-locator 文件作用说明**: 在 problem-locator Skill 中补充各文件用途描述的具体措辞

## Implementation Units

- [ ] **Unit 1: 更新后端超时和 SSE 轮询配置**

**Goal:** 将超时时间放宽到 60 分钟，SSE 轮询间隔从 1 秒改为 15 秒

**Requirements:** R4

**Dependencies:** None

**Files:**
- Modify: `config/config.yaml`
- Modify: `app/api/task_api.py`（SSE 轮询间隔）

**Approach:**
- 将 `runtime.task_timeout_seconds` 从 `900` 改为 `3600`
- 将 SSE 端点的轮询间隔从 1 秒改为 15 秒（减少长连接下的请求频率）

**Patterns to follow:**
- 现有 YAML 配置格式
- 现有 SSE 轮询循环结构

**Test scenarios:**
- Test expectation: none — 纯配置值变更，无行为逻辑

**Verification:**
- 配置文件中 `task_timeout_seconds` 值为 3600
- SSE 轮询间隔为 15 秒

---

- [ ] **Unit 2: 前端添加 Markdown 渲染和 Mermaid 支持**

**Goal:** 在知识库详情页中，将 `.md` 文件从 `<pre>` 原样展示升级为双模式（渲染/编辑），JSON 保持原始格式。支持 Mermaid 图表、亮色主题、横向滚动 Tab 栏、loading 状态、重建中状态

**Requirements:** R7, R8, R9

**Dependencies:** None（与 Unit 1 并行）

**Files:**
- Modify: `frontend/package.json`（添加 react-markdown、mermaid 依赖）
- Create: `frontend/src/components/FileContentViewer.jsx`（文件内容渲染组件，含渲染/编辑双模式）
- Create: `frontend/src/components/MermaidBlock.jsx`（Mermaid 图表渲染组件）
- Modify: `frontend/src/pages/KnowledgePage.jsx`（替换 `<pre>` 为 FileContentViewer，Tab 栏加横向滚动，加 loading 状态和重建中提示）

**Approach:**
- 安装 `react-markdown` 和 `mermaid` 作为前端依赖
- 创建 `FileContentViewer` 组件：
  - `.md` 文件：默认渲染模式（react-markdown 渲染 + Mermaid 图表，亮色主题白底），提供切换到编辑模式的按钮
  - `.md` 文件编辑模式：原始文本 textarea，保存后切回渲染模式
  - `.json` 文件：保持 `<pre>` 格式化展示
  - 其他文件：保持 `<pre>` 展示
  - 空文件：居中显示"该文件暂无内容"
- 创建 `MermaidBlock` 组件：
  - 接收 Mermaid 源码和唯一 ID
  - `useEffect` 中使用 `mermaid.render(id, code)` 渲染到指定元素
  - 依赖数组绑定 Mermaid 源码，源码变化时重新渲染
  - try/catch 捕获渲染失败，显示"图表渲染失败"错误提示
  - 组件卸载时清理生成的 SVG
- 修改 `KnowledgePage.jsx`：
  - 文件查看区域的 `<pre>` 替换为 `<FileContentViewer>`
  - Tab 栏添加 `overflow-x-auto` 和横向滚动条样式
  - 文件加载期间显示 loading spinner
  - agent 运行期间（通过 is_agent_running 或模块状态判断）显示"知识库正在重建"提示
- Markdown 渲染区域使用亮色主题（白色背景 bg-white + 深色文字 text-gray-900）

**Patterns to follow:**
- 现有 KnowledgePage.jsx 的 state 管理和 fetch 模式
- 现有的 editing/editContent 状态管理模式

**Test scenarios:**
- Happy path: 选择 .md 文件时，渲染模式显示 Markdown 渲染后的内容（亮色主题，标题/列表/代码块正确显示）
- Happy path: .md 文件中包含 ```mermaid 代码块时，Mermaid 图表正确渲染为 SVG
- Happy path: 点击编辑按钮切换到 textarea 原始文本编辑，保存后切回渲染模式
- Happy path: 选择 .json 文件时，内容保持原始 JSON 格式展示，无编辑/渲染切换
- Edge case: 无效 Mermaid 语法时，图表区域显示"图表渲染失败"，不影响其他 Markdown 内容
- Edge case: 文件内容为空时，显示居中空状态提示"该文件暂无内容"
- Edge case: 快速切换文件时，Mermaid 渲染不出现错位（旧渲染被正确清理）
- Error path: 文件读取失败时显示错误提示
- State: 文件加载期间显示 loading spinner
- State: agent 运行期间显示"知识库正在重建"提示

**Verification:**
- `npm run build` 成功，无编译错误
- .md 文件渲染正确（亮色主题，含 Mermaid 图表）
- .json 文件保持原始格式
- 编辑/渲染模式可正常切换
- Tab 栏可横向滚动，8 个文件名均可正常显示

---

- [ ] **Unit 3: 重写 knowledge-builder Skill 定义**

**Goal:** 将现有三阶段 Skill 重写为主 Agent + 4 个子 Agent 协作架构，产出 8 个文件（4 原有 + 4 Wiki），采用临时目录 + 原子重命名策略

**Requirements:** R1, R2, R3, R4, R5, R6

**Dependencies:** Unit 1（超时配置需先更新）

**Files:**
- Modify: `.claude/skills/knowledge-builder/SKILL.md`
- Modify: `.claude/skills/problem-locator/SKILL.md`（补充各文件用途说明，R12）

**Approach:**
- 完全重写 SKILL.md，新结构：

  **Phase 1 — 主 Agent 模块扫描**
  - 定位模块目录结构
  - 识别 NAPI 桥接层、Framework 层、核心实现文件
  - 生成扫描摘要（不写入文件，仅作为内部中间数据）

  **Phase 2 — 数据子 Agent（结构化数据文件）**
  - 输入：主 Agent 的扫描摘要 + 模块路径
  - 写入临时子目录（`knowledge_root/{module_name}.tmp/`）
  - 产出：`error_codes.json`、`api_chain.json`、`overview.md`、`common_issues.md`
  - 行为：与现有三阶段 Skill 的分析+生成逻辑一致，保持精简面向机器

  **Phase 2.5 — 数据质量检查子 Agent**
  - 读取 Phase 2 产出的 `error_codes.json` 和 `api_chain.json`
  - 验证 JSON 内容结构：非空数组、含必要字段（如 api_name、impl_file 等）
  - 验证失败时报告具体问题，主 Agent 决定是否重试或跳过

  **Phase 3 — Wiki 子 Agent（人类阅读文档）**
  - 输入：主 Agent 的扫描摘要 + Phase 2 产出的结构化数据（`api_chain.json`、`error_codes.json`）
  - 写入同一临时子目录
  - 产出：`architecture.md`（含 Mermaid flowchart）、`call_chains.md`（含 Mermaid sequence diagram）、`api_reference.md`、`troubleshooting.md`
  - 源码溯源：源文件路径为必需（纯文本），行号 best-effort。仅 Wiki 文档需要标注

  **Phase 4 — 校验子 Agent**
  - 检查临时目录中 8 个文件全部存在且非空
  - JSON 文件内容结构验证（非空数组、含必要字段）
  - Markdown 文件非空白
  - Mermaid 图表代码块存在（`architecture.md` 应含 flowchart，`call_chains.md` 应含 sequence diagram）
  - 校验通过后：将旧正式目录重命名为 `.bak`，将临时目录重命名为正式目录
  - 校验失败：保留旧正式目录不变，清理临时目录

- 保持 `references/mapping_patterns.md` 不变
- Skill 参数不变（module_name, code_repo_root, docs_repo_root, sdk_repo_root, knowledge_root）
- problem-locator SKILL.md 中补充各文件用途说明：`error_codes.json` 和 `api_chain.json` 为诊断数据源；`overview.md` 和 `common_issues.md` 为精简参考；`architecture.md`、`call_chains.md`、`api_reference.md`、`troubleshooting.md` 为人类阅读文档，诊断时优先查询前 4 个文件

**Patterns to follow:**
- 现有 `.claude/skills/knowledge-builder/SKILL.md` 的 YAML frontmatter 格式
- 现有 `.claude/skills/problem-locator/SKILL.md` 的 Skill 定义风格
- Claude Code Agent 工具的使用模式

**Test scenarios:**
- Happy path: 对 base_location 模块执行知识库构建，成功生成 8 个文件（4 原有 + 4 Wiki）
- Happy path: architecture.md 中包含 Mermaid flowchart 代码块
- Happy path: call_chains.md 中包含 Mermaid sequence diagram 代码块
- Happy path: 重建时旧数据在 `.bak` 目录中保留
- Edge case: 模块目录不存在或为空时，Skill 报告错误而非崩溃
- Edge case: Phase 2 数据质量问题被质量检查子 Agent 检测到
- Edge case: 校验失败时旧文件不受影响
- Integration: 生成后 problem-locator Skill 仍能正常读取 error_codes.json 和 api_chain.json（优先查 JSON）
- Integration: problem-locator 不会将 Wiki 文档作为主要诊断数据源

**Verification:**
- 对 base_location 模块执行知识库构建，检查 data/knowledge/base_location/ 下有 8 个文件
- 前端能正确渲染所有 .md 文件（含 Mermaid 图表）
- problem-locator 能正常消费 JSON 文件
- 重建时旧数据在 .bak 中保留

## System-Wide Impact

- **Interaction graph:** knowledge-builder Skill 产出文件 → knowledge_store.py init_module_meta() 扫描目录生成 meta.json → KnowledgePage.jsx 读取并展示 → problem-locator Skill 查询知识库。所有现有交互链路保持不变
- **Error propagation:** 子 Agent 失败时，主 Agent 捕获错误并终止流程，临时目录被清理，旧正式目录不受影响
- **State lifecycle risks:** 临时目录 + 原子重命名策略保证失败时旧数据不丢失；`.bak` 目录在下次重建时清理；超时由 claude_executor.kill() 处理，kill 后临时目录残留不影响正式数据
- **API surface parity:** 现有 API 端点不变，Wiki 文档文件名通过现有 FILENAME_PATTERN 校验
- **Unchanged invariants:** knowledge_store.py 的安全机制继续适用；SSE 轮询间隔改为 15 秒减少长连接开销

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 子 Agent 上下文仍可能不足以处理大型模块 | 验证阶段先用 base_location 测试，大型模块后续优化 |
| Mermaid 语法由 LLM 生成，可能有格式错误 | 前端 try/catch 捕获渲染失败，显示错误提示 |
| 覆盖式重建的 .bak 目录占用磁盘 | 下次重建时自动清理，验证阶段模块少不影响 |
| 校验子 Agent 可能误判文件质量 | 校验规则保持实用（JSON 结构 + 非空 + Mermaid 存在） |
| 临时目录残留（kill 后未清理） | 不影响正式数据，下次重建时一并清理 |
| problem-locator 搜索命中 Wiki 文档冗余信息 | problem-locator SKILL.md 中明确各文件用途和查询优先级 |

## Sources & References

- **Origin document:** [docs/brainstorms/deepwiki-style-knowledge-requirements.md](docs/brainstorms/deepwiki-style-knowledge-requirements.md)
- Related code: `.claude/skills/knowledge-builder/SKILL.md`
- Related code: `.claude/skills/problem-locator/SKILL.md`
- Related code: `frontend/src/pages/KnowledgePage.jsx`
- Related code: `app/agent/claude_executor.py`
- Related code: `config/config.yaml`
