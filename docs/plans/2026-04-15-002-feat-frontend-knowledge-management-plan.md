---
title: "feat: 前端现代化 + 知识库构建与管理"
type: feat
status: active
date: 2026-04-15
origin: docs/brainstorms/location-vod-requirements.md
---

# 前端现代化 + 知识库构建与管理

## Overview

对已完成的 Phase 1 平台进行三项增强：(1) 使用 Tailwind CSS CDN 重构前端为深色科技风格；(2) 实现知识库构建功能，使开发者能触发对指定模块的自动探索并生成知识文件；(3) 增加知识库管理页面，支持人工审核、确认和编辑知识条目，附带状态标签（AI原生/已确认/已编辑）。

## Problem Frame

Phase 1 已完成问题定位的基本平台，但存在三个不足：

1. **前端体验粗糙** — 当前使用手写 CSS，视觉上偏朴素，缺乏现代感和科技感
2. **知识库构建功能缺失** — Phase 2 的 knowledge-builder Skill 尚未实现，API 层也没有接入知识库构建的触发逻辑（`_build_prompt` 固定写死 problem-locator）
3. **知识库质量无法保障** — AI 生成的知识文件可能有错误，缺乏人工审核和编辑机制

## Requirements Trace

- R6. 支持对指定模块进行主动探索，生成结构化知识文件（JSON/Markdown）
- R7. 知识库构建支持单模块手动触发执行
- R8. 知识库内容支持覆盖式重建
- R14. 可复用 api_dfx_2.0 中已有的 NAPI 映射模式知识
- **新需求 R15.** 前端采用现代化深色主题风格，提升视觉体验
- **新需求 R16.** 知识库条目支持状态标签管理（AI原生/已确认/已编辑）
- **新需求 R17.** 知识库管理页面支持浏览、查看、确认、编辑知识条目

## Scope Boundaries

- 不实现知识库增量更新（仅覆盖式重建）
- 不实现知识库批量构建（仅单模块触发）
- 不实现用户认证或权限控制

### Deferred to Separate Tasks

- 知识库批量构建和定时调度 — 验证通过后的优化方向
- 问题定位 Skill 的知识库查询集成 — 待知识库有实际数据后再验证效果

## Context & Research

### Relevant Code and Patterns

- **当前前端文件**：`app/templates/index.html`、`app/templates/task_detail.html`、`app/static/css/app.css`、`app/static/js/index.js`、`app/static/js/task_detail.js`
- **当前 API 层**：`app/api/task_api.py`（7 个端点）、`app/api/page_api.py`（2 个页面路由）
- **知识库 Skill 目录**：`.claude/skills/knowledge-builder/`（已创建但 SKILL.md 缺失）
- **问题定位 Skill 格式参考**：`.claude/skills/problem-locator/SKILL.md`（YAML frontmatter + 分阶段执行）
- **知识库产出目录**：`data/knowledge/{module_name}/`（当前为空）
- **api_dfx_2.0 参考知识**：`api_dfx_2.0/.claude/skills/kit-api-extract/reference/MAPPING_PATTERNS.md`（16 种 NAPI 映射模式）
- **现有 store 层模式**：`app/store/task_store.py`、`app/store/event_store.py`、`app/store/result_store.py`（JSON/JSONL 文件读写）

### Institutional Learnings

- `task_api.py` 中 `_build_prompt()` 固定调用 problem-locator，需增加 task_type 判断逻辑
- `_parse_result()` 不检测 CLI 错误消息（如 429），总是标记 succeeded — 本次不修复，但标注为已知问题

## Key Technical Decisions

- **前端方案**：使用 React + Vite 重构前端，深色主题。理由：Tailwind CDN 在国内网络环境加载缓慢不可靠，React + Vite 本地构建无网络依赖，且组件化更适合多页面交互
- **知识库元数据格式**：每个模块目录下新增 `meta.json`，记录状态标签、最后构建时间、条目清单。理由：与现有 JSON 文件模式一致，无需额外存储层
- **知识条目状态标签**：`ai_native`（AI 原生）、`confirmed`（已确认）、`edited`（已编辑）。理由：覆盖知识库的完整生命周期
- **知识库构建触发方式**：复用现有任务系统（`task_type=knowledge_building`），通过 `_build_prompt` 分发到不同 Skill。理由：统一任务管理，复用 SSE 流式推送
- **知识编辑方式**：前端 textarea 编辑 Markdown 内容，后端直接覆写文件。理由：验证阶段最简方案，无需富文本编辑器
- **知识库编辑锁**：当有知识库构建 agent 运行时，禁止编辑所有知识库内容（仅允许更改状态标签进行确认）。理由：防止 agent 写入与人工编辑冲突
- **meta.json 权威写入者**：由后端 knowledge_store.py 统一管理 meta.json 的写入，Skill 不直接写 meta.json。理由：消除 Skill 和后端的写入冲突

## Open Questions

### Resolved During Planning

- **前端方向**：选择 Tailwind CSS CDN 深色主题
- **知识库元数据**：使用模块级 `meta.json` 文件
- **状态标签**：三级（ai_native / confirmed / edited）

### Deferred to Implementation

- **知识文件的具体结构**：取决于实际模块探索结果，Skill 定义中给出指导格式但不强制
- **Tailwind 具体配色方案**：实现时根据视觉效果调优
- **知识编辑的详细交互**：实现时根据页面布局确定

## Output Structure

新增/修改的文件（已有文件标注 Modify）：

```
location_vod/
  app/
    api/
      task_api.py                     # Modify: 增加 knowledge_builder prompt 分发
      page_api.py                     # Modify: 增加知识库管理页面路由
      knowledge_api.py                # Create: 知识库 CRUD API
    store/
      knowledge_store.py              # Create: 知识库元数据读写
    manager/
      task_manager.py                 # Modify: 知识库构建任务描述调整
    templates/
      index.html                      # Modify: Tailwind 重构 + 知识库构建表单
      task_detail.html                # Modify: Tailwind 重构
      knowledge.html                  # Create: 知识库管理页面
    static/
      css/app.css                     # Delete/Replace: 仅保留 Tailwind 无法覆盖的自定义样式
      js/
        index.js                      # Modify: 适配新 UI + 知识库构建交互
        task_detail.js                # Modify: 适配新 UI
        knowledge.js                  # Create: 知识库管理页面交互
  .claude/skills/
    knowledge-builder/
      SKILL.md                        # Create: 知识库构建 Skill 定义
      references/
        mapping_patterns.md           # Create: NAPI 映射模式参考（引用 api_dfx_2.0）
```

## Implementation Units

- [ ] **Unit 1: Tailwind CSS 前端重构**

**Goal:** 使用 Tailwind CSS CDN 重构所有页面为深色科技风格

**Requirements:** R15

**Dependencies:** None

**Files:**
- Modify: `app/templates/index.html`
- Modify: `app/templates/task_detail.html`
- Modify: `app/static/css/app.css`
- Modify: `app/static/js/index.js`
- Modify: `app/static/js/task_detail.js`

**Approach:**
- 在所有 HTML 的 `<head>` 中引入 Tailwind CSS CDN（`<script src="https://cdn.tailwindcss.com"></script>`）
- 使用 Tailwind 的 dark 模式作为默认主题，配色方案：深色背景（slate-900/950）、accent 色（cyan/teal 渐变）、卡片使用 slate-800 + 半透明边框
- 配置 `tailwind.config` 自定义主题色（通过 CDN 的 inline config）
- 删除 `app.css` 中大部分手写样式，仅保留 Tailwind 无法覆盖的特殊效果（如 SSE 消息动画、终端风格代码显示）
- `index.html`：顶部导航栏 + 左右分栏布局，左侧提交表单改为卡片折叠式，右侧任务列表增加状态指示灯和进度条动画
- `task_detail.html`：终端风格的分析过程展示（仿终端黑底绿字或深色配色），代码块语法高亮风格，结果面板使用渐变边框卡片
- JS 文件适配新的 class 名称和 DOM 结构

**Patterns to follow:**
- 当前 `app/static/css/app.css` 的功能布局逻辑（保留交互行为，替换视觉风格）

**Test scenarios:**
- Test expectation: none — 纯 UI 变更，通过浏览器视觉验证

**Verification:** 浏览器访问 `/app/` 和 `/app/tasks/{id}` 页面，确认深色主题正常显示，交互功能不受影响

---

- [ ] **Unit 2: 知识库构建 Skill 定义**

**Goal:** 编写 knowledge-builder 的 SKILL.md，定义模块探索和知识文件生成的执行流程

**Requirements:** R6, R8, R14

**Dependencies:** None

**Files:**
- Create: `.claude/skills/knowledge-builder/SKILL.md`
- Create: `.claude/skills/knowledge-builder/references/mapping_patterns.md`

**Approach:**
- SKILL.md 定义参数：`module_name`、`code_repo_root`、`docs_repo_root`、`sdk_repo_root`、`knowledge_root`
- 分阶段执行：
  1. 模块扫描 — 定位 `code_repo_root/{module_name}/` 目录，识别目录结构（NAPI 桥接层、Framework 层、实现层）
  2. 代码分析 — 提取错误码定义（搜索 OHOS 错误码宏）、API 声明与实现映射（参考 mapping_patterns.md）、关键函数入口
  3. 知识文件生成 — 产出以下文件到 `knowledge_root/{module_name}/`：
     - `overview.md` — 模块概览（目录结构、核心类/文件、模块职责）
     - `error_codes.json` — 错误码映射表（code → message → 源文件位置）
     - `api_chain.json` — API 实现链路（.d.ts 声明 → NAPI 桥接 → 实现函数）
     - `common_issues.md` — 常见问题模式摘要
  4. 元数据生成 — 写入 `meta.json`（状态标签、构建时间、文件清单）
- mapping_patterns.md 引用 api_dfx_2.0 的 NAPI 映射知识，供 Skill 探索时参考
- 覆盖式重建：重新探索时完整覆盖已有知识文件

**Patterns to follow:**
- `.claude/skills/problem-locator/SKILL.md` 的 YAML frontmatter + 分阶段格式
- `api_dfx_2.0/.claude/skills/kit-api-extract/SKILL.md` 的模块探索模式

**Test scenarios:**
- Test expectation: none — Skill 是 Markdown 定义文件，通过实际执行验证效果

**Verification:** 用 `claude -p "/knowledge-builder\nmodule_name=base_location\n..."` 手动执行，确认能产出知识文件

---

- [ ] **Unit 3: 知识库构建集成**

**Goal:** 在 API 层增加知识库构建的 prompt 分发逻辑，在主页增加触发入口

**Requirements:** R7, R8

**Dependencies:** Unit 2, Unit 4

**Files:**
- Modify: `app/api/task_api.py`
- Modify: `app/manager/task_manager.py`
- Modify: `app/manager/workspace_manager.py`
- Modify: `app/templates/index.html`
- Modify: `app/static/js/index.js`

**Approach:**
- `task_api.py` 的 `_build_prompt()` 增加 task_type 判断：`knowledge_building` 时构建 knowledge-builder 的 prompt（包含 module_name、代码仓路径、知识库输出路径）
- `task_api.py` 的 `api_create_task()` 修改输入校验：`knowledge_building` 类型时要求 `module_name` 非空，而非要求 `problem_description/log_content/code_snippet`
- `task_manager.py` 的 `create_task()` 调整：知识库构建任务的 description 为模块名，将 `module_name` 写入 task.json 的 input 字段
- `workspace_manager.py` 的 `create_task_workspace()` 增加 `module_name` 参数，写入 task.json 的 input 字段
- 主页增加知识库构建入口：新增一个 Tab 或独立表单区域，包含模块选择下拉框（从 `code_repo_root` 扫描目录列表生成）+ 触发构建按钮
- 后端增加 `GET /api/modules` 端点，返回 `code_repo_root` 下的目录列表供前端选择。仅返回一级子目录（过滤文件和隐藏目录），支持搜索过滤参数
- 构建任务完成后，结果写入知识库目录并更新 `meta.json`
- 任务完成后主动扫描 `data/knowledge/{module}/` 目录，验证预期的知识文件是否存在；若 Skill 未产出文件，在结果中标注产出缺失

**Patterns to follow:**
- `task_api.py` 中 problem_locating 的现有 prompt 构建模式

**Test scenarios:**
- Happy path: 选择模块 → 触发构建 → SSE 推送过程 → 完成后 data/knowledge/{module}/ 下产出知识文件
- Edge case: 模块目录不存在时返回明确错误
- Edge case: 重复构建同一模块时覆盖已有文件

**Verification:** 通过 Web 界面触发 base_location 模块的知识构建，确认产出文件落盘

---

- [ ] **Unit 4: 知识库存储层 + API**

**Goal:** 实现知识库的元数据管理和 CRUD API，支持状态标签操作

**Requirements:** R16

**Dependencies:** None（可与 Unit 1-2 并行开发）

**Files:**
- Create: `app/store/knowledge_store.py`
- Create: `app/api/knowledge_api.py`
- Modify: `app/main.py`

**Approach:**

**knowledge_store.py:**
- 每个模块的知识目录结构：
  ```
  data/knowledge/{module_name}/
    meta.json        # {status, built_at, files: [...], module_name}
    overview.md
    error_codes.json
    api_chain.json
    common_issues.md
  ```
- `meta.json` 的 `status` 字段：`ai_native` | `confirmed` | `edited`
- 提供：`list_modules()`、`get_module_meta()`、`update_module_status()`、`read_knowledge_file()`、`write_knowledge_file()`、`init_module_meta()`、`list_module_files()`
- **安全要求**：所有文件路径操作必须使用 `pathlib.Path.resolve()` 解析后验证路径以 `knowledge_root` 为前缀，拒绝任何包含 `..` 或绝对路径组件的 filename。module_name 必须通过正则校验（`^[a-zA-Z0-9_-]+$`）后才可用于文件系统操作

**knowledge_api.py:**
- `GET /api/knowledge` — 列出所有知识模块（含状态标签）
- `GET /api/knowledge/{module_name}` — 获取模块元数据和文件列表
- `GET /api/knowledge/{module_name}/files/{filename}` — 获取知识文件内容
- `PUT /api/knowledge/{module_name}/status` — 更新状态标签（body: `{status: "confirmed" | "edited"}`）
- `PUT /api/knowledge/{module_name}/files/{filename}` — 更新知识文件内容（用于人工编辑）

**main.py：**
- 注册 `knowledge_api.py` 的路由

**Patterns to follow:**
- `app/store/task_store.py` 的 JSON 读写模式
- `app/store/result_store.py` 的文件读写模式

**Test scenarios:**
- Happy path: 创建 meta → 读取 → 更新状态 → 编辑文件 → 确认状态变更持久化
- Edge case: 模块目录不存在时返回 404
- Edge case: 更新为无效状态值时返回 422
- Edge case: 文件名包含路径遍历（如 `../etc/passwd`）时拒绝访问

**Verification:** 通过 curl 完成 list → get → update status → edit file 完整链路

---

- [ ] **Unit 5: 知识库管理页面**

**Goal:** 实现知识库浏览、查看、确认、编辑的前端页面

**Requirements:** R17

**Dependencies:** Unit 4, Unit 1

**Files:**
- Create: `app/templates/knowledge.html`
- Create: `app/static/js/knowledge.js`
- Modify: `app/api/page_api.py`
- Modify: `app/templates/index.html`（增加导航链接）

**Approach:**
- 导航栏增加「知识库」链接，指向 `/app/knowledge`
- 页面布局：
  - 左侧：模块列表（卡片式），每个卡片显示模块名、状态标签（彩色 badge）、构建时间
  - 右侧：选中模块后显示详情面板
    - 顶部：模块名 + 状态标签 + 操作按钮（确认 ✓ / 重新构建 ↻）
    - 主体：Tab 式文件浏览器，每个知识文件一个 Tab（overview / error_codes / api_chain / common_issues）
    - 编辑模式：Markdown 文件使用 textarea 编辑，JSON 文件使用格式化 textarea
    - 保存时调用 `PUT /api/knowledge/{module}/files/{filename}`，自动将状态更新为 `edited`
- 状态标签样式：
  - `ai_native`：蓝色 badge + 脉冲动画（提示需审核）
  - `confirmed`：绿色 badge + ✓ 图标
  - `edited`：黄色 badge + 编辑图标
- 点击「确认」按钮时，调用 `PUT /api/knowledge/{module}/status` 将状态更新为 `confirmed`

**Patterns to follow:**
- Unit 1 中确定的 Tailwind 深色主题风格
- `task_detail.js` 的 SSE 和 fetch API 调用模式

**Test scenarios:**
- Happy path: 浏览模块列表 → 选择模块 → 查看文件 → 编辑 Markdown → 保存 → 状态自动变为 edited → 点击确认 → 状态变为 confirmed
- Edge case: 知识库为空时显示空状态提示
- Edge case: 并发编辑同一文件时后写入覆盖前一次（验证阶段可接受）

**Verification:** 在浏览器中完成 知识库浏览 → 编辑 → 确认 的完整流程

## System-Wide Impact

- **路由变更**：新增 `/app/knowledge` 页面路由、`/api/knowledge/*` 系列端点、`/api/modules` 端点。需注册到 `main.py`
- **任务系统扩展**：`_build_prompt()` 从单一 problem-locator 扩展为根据 task_type 分发到不同 Skill
- **数据目录**：`data/knowledge/` 下将新增模块子目录和文件，`meta.json` 作为新的持久化结构
- **前端依赖**：所有页面引入 Tailwind CSS CDN，`app.css` 大幅缩减为辅助样式
- **不变量**：已有 API 端点的签名和返回格式不变；任务管理流程不变

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Tailwind CDN 需要网络访问，离线环境无法使用 | 验证阶段可接受，后续可考虑本地化 |
| 知识库文件编辑无版本控制，误操作无法回滚 | 提供覆盖式重建能力作为回退方案 |
| AI 生成知识文件的格式可能与预期不符 | Skill 中给出明确的 JSON schema 示例，实际执行后再调优 |
| 模块目录数量多（100+），列表加载可能慢 | 后端仅返回目录名列表，不递归读取内容 |

## Sources & References

- **Origin document:** [docs/brainstorms/location-vod-requirements.md](docs/brainstorms/location-vod-requirements.md)
- **现有计划:** [docs/plans/2026-04-15-001-feat-harmonyos-problem-diagnosis-plan.md](docs/plans/2026-04-15-001-feat-harmonyos-problem-diagnosis-plan.md)
- **问题定位 Skill 格式参考:** `.claude/skills/problem-locator/SKILL.md`
- **NAPI 映射知识:** api_dfx_2.0 的 MAPPING_PATTERNS.md
