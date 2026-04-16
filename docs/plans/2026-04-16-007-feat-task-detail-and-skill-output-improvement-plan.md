---
title: "feat: 任务详情页用户体验与 Skill 输出质量改进"
type: feat
status: active
date: 2026-04-16
---

# 任务详情页用户体验与 Skill 输出质量改进

## Overview

针对问题定位任务的三方面改进：(1) 任务详情页展示用户输入信息；(2) 诊断结果支持 Markdown 渲染；(3) Skill 输出路径修复及结果展示增强，增加参考文档、代码引用和底层实现逻辑等参考资料。

## Problem Frame

当前用户在首页任务列表中可以看到自己提交的问题描述（单行截断），但点击进入任务详情后，用户输入信息完全不可见，无法回顾自己的问题描述。同时，由于 Skill 的结构化 JSON 输出路径问题（写入 `skill_output/output/` 而非任务专属目录），导致前端拿到的 `final_result.json` 实际是 stdout 的 fallback 解析结果（`raw_output` 字段），其中包含丰富 Markdown 内容但被 `<pre>` 标签渲染为纯文本。此外，即使结构化结果能正确传递，当前 Skill 输出也缺乏参考文档链接、代码引用等开发者需要的深层参考资料。

## Requirements Trace

- R1. 任务详情页必须展示完整的用户输入信息（问题描述、日志内容、代码片段）
- R2. 诊断结果必须正确渲染 Markdown 格式内容（标题、表格、代码块、列表）
- R3. Skill 必须将结构化结果写入正确的任务目录，确保 `final_result.json` 能被正确读取
- R4. Skill 输出应包含可追踪的参考文档路径、代码文件路径和底层实现逻辑说明
- R5. 前端诊断结果面板应展示知识库匹配、文档参考、代码引用等结构化信息

## Scope Boundaries

- 不改变 Skill 的核心诊断逻辑（四阶段流水线保持不变）
- 不改变前端技术栈（React 19 + Tailwind CSS 4）
- 不新增 API 端点（复用现有 `GET /api/tasks/{task_id}` 返回的数据）
- 不改变 SSE 事件流协议

### Deferred to Separate Tasks

- Skill 诊断准确性优化（如对比官方论坛回复的正确性验证）：需要领域专家参与验证

## Context & Research

### Relevant Code and Patterns

- `frontend/src/pages/TaskDetailPage.jsx` — 任务详情页主组件，当前不展示用户输入，诊断结果用 `<pre>` 渲染
- `frontend/src/components/FileContentViewer.jsx` — 包含可复用的 `MarkdownRenderer` 组件（基于 `react-markdown` + `remark-gfm`），支持表格、代码块、Mermaid 图表
- `app/api/task_api.py:287-312` — `_build_prompt()` 构建 Skill 调用参数，未传递任务输出目录路径
- `app/api/task_api.py:238-256` — `_execute_and_finalize()` 先读文件再 fallback 到 stdout 解析
- `.claude/skills/problem-locator/SKILL.md:139-204` — 阶段 4 定义了输出写入 `output/final_result.json`（相对路径），但 Skill 不知道任务的实际目录

### Key Findings

1. **路径不匹配 Bug**: Skill SKILL.md 指示写入 `output/final_result.json`（相对路径），Claude Agent 解析为 `data/tasks/skill_output/output/final_result.json`，而 `_read_result_file()` 读取的是 `data/tasks/{task_id}/output/final_result.json`，导致 fallback 到 stdout 解析
2. **前端已有 Markdown 渲染器**: `FileContentViewer.jsx` 中的 `MarkdownRenderer` 可直接复用
3. **API 返回完整数据**: `GET /api/tasks/{task_id}` 返回完整 `task.json`（含 `input` 字段），前端只是没有渲染
4. **结构化结果实际已写好**: 查看正确路径 `data/tasks/skill_output/output/final_result.json` 中的结果是完整的高质量结构化 JSON，包含 `knowledge_matches`、`doc_references`、`root_cause_candidates`、`fix_suggestions` 等字段

## Key Technical Decisions

- **复用 MarkdownRenderer**: 将 `FileContentViewer.jsx` 中的 `MarkdownRenderer` 提取为独立组件或直接 import 复用，保持渲染一致性
- **路径修复方案**: 在 `_build_prompt()` 中增加 `output_dir` 参数传递给 Skill，Skill 内部使用绝对路径写入；同时修改 SKILL.md 的阶段 4 指令
- **暗色主题 Markdown**: `MarkdownRenderer` 当前样式为亮色（`bg-white`, `text-gray-800`），任务详情页为暗色主题（`bg-slate-900`），需要创建暗色变体或调整样式

## Open Questions

### Resolved During Planning

- 输出路径问题根因已确认：Skill 不知道任务的实际输出目录路径

### Deferred to Implementation

- MarkdownRenderer 暗色主题具体样式调整：实现时根据实际效果微调

## Implementation Units

- [ ] **Unit 1: 任务详情页展示用户输入信息**

**Goal:** 在任务详情页顶部展示用户提交的完整问题信息（问题描述、日志内容、代码片段）

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `frontend/src/pages/TaskDetailPage.jsx`

**Approach:**
- 在任务信息栏下方、分析过程面板上方，新增「问题信息」折叠/展开面板
- 展示 `task.input.problem_description`、`task.input.log_content`、`task.input.code_snippet`
- 仅在对应字段有内容时显示该部分
- 问题描述默认展开，日志和代码片段默认折叠（可展开），避免长内容占据过多空间
- 使用暗色主题样式，与现有页面风格一致

**Patterns to follow:**
- 现有 `TaskDetailPage.jsx` 中的折叠/展开交互模式（类似分析过程面板）
- 使用 Tailwind 暗色主题类（`bg-slate-900`, `border-slate-800` 等）

**Test scenarios:**
- Happy path: problem_locating 任务有完整问题描述 → 正确展示所有非空字段
- Edge case: 任务只有 problem_description 无 log_content/code_snippet → 仅展示问题描述
- Edge case: knowledge_building 任务 → 展示 module_name 而非问题描述

**Verification:**
- 打开一个已完成的 problem_locating 任务详情页，可见用户输入信息
- 长日志内容可折叠/展开

---

- [ ] **Unit 2: 诊断结果支持 Markdown 渲染**

**Goal:** 将诊断结果中的 `raw_output`（以及知识库匹配、文档参考等文本内容）从纯文本 `<pre>` 渲染改为 Markdown 渲染

**Requirements:** R2

**Dependencies:** None

**Files:**
- Modify: `frontend/src/pages/TaskDetailPage.jsx`
- Possibly extract: `frontend/src/components/MarkdownRenderer.jsx`（从 FileContentViewer.jsx 中提取）

**Approach:**
- 从 `FileContentViewer.jsx` 中提取 `MarkdownRenderer` 为独立组件（或直接 import）
- 为暗色主题创建样式适配：`MarkdownRenderer` 当前为亮色主题，需覆盖样式类为暗色系
- 在 TaskDetailPage 中替换 `raw_output` 的 `<pre>` 渲染为 `<MarkdownRenderer>`
- 同时将 `result.summary`、`root_cause_candidates[].description`、`fix_suggestions[].steps` 等文本也改为支持 Markdown 渲染
- 如果结构化字段（`root_cause_candidates`、`fix_suggestions`）存在且非空，优先展示结构化卡片视图；否则 fallback 到 Markdown 渲染 `raw_output`

**Patterns to follow:**
- `FileContentViewer.jsx` 中的 `MarkdownRenderer` 组件结构和插件配置（`remark-gfm`）
- 现有 `TaskDetailPage.jsx` 的暗色主题风格

**Test scenarios:**
- Happy path: `raw_output` 包含 Markdown（标题、表格、代码块、加粗）→ 正确渲染为格式化内容
- Happy path: 结构化结果存在 → 展示卡片视图 + Markdown 文本
- Edge case: 纯文本无 Markdown 格式 → 也能正常显示
- Integration: 代码块正确高亮，表格正确渲染

**Verification:**
- 打开 `task_20260416_202531_8844` 任务详情页，诊断结果中的 Markdown 表格和代码块正确渲染

---

- [ ] **Unit 3: 修复 Skill 输出路径并传递任务输出目录**

**Goal:** 让 Skill 将结构化结果写入正确的任务专属目录，而非 `skill_output/`

**Requirements:** R3

**Dependencies:** None

**Files:**
- Modify: `app/api/task_api.py`（`_build_prompt` 函数增加 `output_dir` 参数）
- Modify: `.claude/skills/problem-locator/SKILL.md`（阶段 4 使用 `output_dir` 参数构建绝对路径）

**Approach:**
1. 在 `_build_prompt()` 中计算任务输出目录的绝对路径：`data/tasks/{task_id}/output/`
2. 将该路径作为 `output_dir` 参数传递给 Skill
3. 修改 SKILL.md 阶段 4 的输出指令，使用 `output_dir` 参数构建 `final_result.json` 的完整路径
4. 确保路径传递的格式一致（正斜杠，无尾部斜杠）

**Technical design:**
```
# _build_prompt 新增参数
output_dir={abs_path_to_task_output_dir}

# SKILL.md 阶段 4 修改
通过 Write 工具将 JSON 写入 {output_dir}/final_result.json
```

**Patterns to follow:**
- 现有 `_build_prompt()` 中其他路径参数的传递方式（如 `code_repo_root`）

**Test scenarios:**
- Happy path: 新任务执行后 `final_result.json` 写入正确路径 → `_read_result_file()` 能读取到
- Happy path: 结构化 JSON 有效 → 前端展示结构化结果（非 fallback）
- Edge case: Skill 仍写入错误路径 → fallback 机制仍然兜底

**Verification:**
- 创建新任务执行，检查 `data/tasks/{task_id}/output/final_result.json` 是否为有效结构化 JSON
- 前端诊断结果展示结构化卡片（`root_cause_candidates`、`fix_suggestions`）

---

- [ ] **Unit 4: 增强诊断结果面板展示结构化参考信息**

**Goal:** 在诊断结果面板中展示 `knowledge_matches`、`doc_references`、`evidence_sources` 等参考信息，让开发者能追踪到参考文档和代码位置

**Requirements:** R4, R5

**Dependencies:** Unit 2, Unit 3

**Files:**
- Modify: `frontend/src/pages/TaskDetailPage.jsx`

**Approach:**
- 在现有诊断结果面板中新增以下区域（当对应数据存在时展示）：
  1. **知识库匹配** (`knowledge_matches`): 展示匹配到的知识条目及其来源
  2. **文档参考** (`doc_references`): 展示官方文档引用，包含文档路径和相关内容摘要
  3. **证据来源** (每个 `root_cause_candidate` 的 `evidence_sources`): 在根因候选卡片中增加可折叠的证据来源列表，标注来源类型（knowledge_base / documentation / code）
- 每个参考信息使用折叠面板，避免信息过载
- 文件路径以代码样式展示，方便开发者定位
- 来源类型用不同颜色标签区分（知识库=teal、文档=cyan、代码=amber）

**Patterns to follow:**
- 现有 `TaskDetailPage.jsx` 中根因候选卡片的展示模式
- 状态标签的颜色方案（`statusConfig` 中的颜色体系）

**Test scenarios:**
- Happy path: 结构化结果包含 `knowledge_matches` 和 `doc_references` → 正确展示参考信息面板
- Happy path: 根因候选有 `evidence_sources` → 卡片中展示证据来源
- Edge case: 无参考信息（`knowledge_matches` 为空）→ 不展示该区域
- Edge case: 仅 `raw_output` 无结构化数据 → 仅渲染 Markdown

**Verification:**
- 打开 `task_20260416_202531_8844` 任务（路径修复后重试），诊断结果面板展示知识库匹配、文档参考、证据来源等完整信息

## System-Wide Impact

- **Interaction graph:** `_build_prompt()` 新增参数会影响所有通过 Skill 执行的任务类型（problem_locating 和 knowledge_building），knowledge_building 任务的 prompt 构建也需同步修改
- **Error propagation:** 路径修复后 `_read_result_file()` 优先读取文件，减少 fallback 到 stdout 解析的概率
- **Unchanged invariants:** SSE 事件流协议、任务状态机、API 端点接口均不变

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| MarkdownRenderer 暗色样式适配不完整 | 参考现有暗色主题组件样式，渐进调整 |
| Skill 写入路径修改后旧任务不兼容 | 旧任务已有 fallback 结果不受影响，`_read_result_file` 机制不变 |
| `knowledge_matches`/`doc_references` 数据可能为空 | 条件渲染，无数据时不展示对应面板 |

## Sources & References

- 示例任务: `data/tasks/task_20260416_202531_8844/`
- Skill 定义: `.claude/skills/problem-locator/SKILL.md`
- 正确路径的结构化结果: `data/tasks/skill_output/output/final_result.json`
