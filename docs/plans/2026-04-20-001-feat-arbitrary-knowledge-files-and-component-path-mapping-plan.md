---
title: "feat: 任意知识文件管理与组件路径映射"
type: feat
status: active
date: 2026-04-20
---

# feat: 任意知识文件管理与组件路径映射

## Overview

扩展知识库系统以支持三类能力：(1) 用户可将任意命名的知识文件添加到部件知识库中，问题定位 Skill 能自动发现并使用这些文件；(2) 知识库前端页面支持上传/创建新文件并展示；(3) 通过 CSV 表格配置闭源代码仓的组件路径映射，使 `code_repo_root` 下的目录结构不再受限于顶级目录。

## Problem Frame

不同领域的知识库差异较大，标准 8 文件体系（overview / error_codes / api_chain / common_issues / architecture / call_chains / api_reference / troubleshooting）无法覆盖所有场景。用户需要将领域专家编写的参考资料、FAQ 文档、配置模板等直接放入知识库。同时，闭源代码仓的目录结构与开源版本不同，需要通过 CSV 表格明确映射 kit_name → component_name → component_path 的关系。

## Requirements Trace

- R1. 支持在知识库页面向指定部件添加任意命名的知识文件（纯文本创建 + 文件上传）
- R2. 新增文件在知识库页面 Tab 栏中正确显示，支持查看和编辑
- R3. 问题定位 Skill 能自动发现并读取知识库中的所有文件（不仅限于标准 3 文件）
- R4. 支持 CSV 格式的组件路径映射表（kit_name, component_name, component_path）
- R5. `/api/tasks/modules/list` 端点根据映射表返回正确的组件列表和路径
- R6. 问题定位 Skill 使用映射后的组件路径进行代码搜索

## Scope Boundaries

- 不修改 knowledge-builder Skill 的产出逻辑（仍产出标准 8 文件）
- 不修改知识库构建流程（原子重命名策略保持不变）
- 不支持子目录——所有知识文件平铺在 `data/knowledge/{module}/` 目录下
- CSV 映射表仅影响代码仓路径解析，不影响文档仓和 SDK 仓

### Deferred to Separate Tasks

- 批量文件上传（一次多文件）
- 知识文件的版本管理/历史回溯
- 映射表的 Web UI 管理（当前通过配置文件维护）

## Context & Research

### Relevant Code and Patterns

- `app/store/knowledge_store.py` — 存储层，已支持任意文件列出（`list_module_files` 排除 `meta.json` 后列出所有文件）
- `app/api/knowledge_api.py` — API 层，当前缺少文件创建/上传端点
- `app/api/task_api.py` — `/modules/list` 端点和 `_build_prompt()` 函数
- `frontend/src/pages/KnowledgePage.jsx` — 知识库前端页面
- `frontend/src/components/FileContentViewer.jsx` — 文件内容查看/编辑组件
- `.claude/skills/problem-locator/SKILL.md` — 问题定位 Skill 定义
- `.claude/skills/problem-locator/references/module_mapping.md` — 模块映射参考
- `app/core/config.py` — `PathsConfig` 配置模型
- `config/config.yaml` — 应用配置

### Institutional Learnings

- 路径安全：所有文件操作必须复用 `_resolve_module_path()` 和 `_resolve_file_path()` 的路径遍历防护
- `meta.json` 写入权限归后端，Skill 和前端不应直接操作
- 编辑锁机制：`is_agent_running()` 检查需应用到新增的文件操作端点

## Key Technical Decisions

- **CSV 映射表存放在 config 目录**：使用 `config/component_mapping.csv`，与 `config.yaml` 同级，便于部署时替换。在 `PathsConfig` 中增加 `component_mapping_file` 字段。
- **CSV 映射表作为 Skill 参考文件传入**：由于问题定位任务创建时模块名未知（模块在 Skill 运行时阶段 1 才被识别），后端 `_build_prompt()` 无法执行映射解析。因此将 CSV 文件作为 Skill 参考文件（`references/component_mapping.csv`），由 Skill 在阶段 1 识别到模块后自行查找映射路径并用于阶段 3.2 的代码搜索。这与现有 `references/module_mapping.md` 的模式一致。
- **新增文件不区分标准/自定义**：`list_module_files()` 已自动列出所有文件，无需在 `meta.json` 中增加分类标记。Tab 栏统一展示。
- **Skill 通过 Glob 自动发现**：problem-locator 阶段 2.1 增加 Glob 扫描 `knowledge_root/{module_name}/` 下所有文件，对非标准文件做全文搜索。
- **文件上传使用 multipart/form-data**：新建 `POST /api/knowledge/{module_name}/files` 端点，同时支持文本创建和文件上传。
- **CSV 加载策略**：`load_component_mapping()` 采用启动时加载 + 全局缓存策略（与 `get_settings()` 一致），修改 CSV 后需重启服务生效。
- **上传文件名处理**：上传端点对文件名进行 sanitize，移除路径前缀，仅保留文件名部分；若文件名不符合 `FILENAME_PATTERN` 则返回 422 并提示 ASCII 文件名要求。

## Open Questions

### Resolved During Planning

- 文件命名约束：沿用 `FILENAME_PATTERN = ^[a-zA-Z0-9_.-]+$`，允许中文文件名的需求可通过扩展正则实现，但初始版本保持 ASCII 安全
- 映射表格式：CSV 三列（kit_name, component_name, component_path），首行为表头，路径以 `/` 开头表示相对于 `code_repo_root`

### Deferred to Implementation

- 是否需要限制单模块知识文件总数或总大小——初始版本不做限制，后续根据实际使用评估

## Implementation Units

- [ ] **Unit 1: 后端 — 知识文件创建/上传 API**

**Goal:** 新增文件创建和上传端点，支持向指定模块添加任意知识文件。

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Modify: `app/store/knowledge_store.py`
- Modify: `app/api/knowledge_api.py`

**Approach:**
- 在 `knowledge_store.py` 中新增 `create_knowledge_file(module_name, filename, content)` 函数，验证模块存在后创建文件，刷新 `meta.json` 文件列表（best-effort，与现有写入操作一致的非原子特性）
- 在 `knowledge_api.py` 中新增两个端点：
  - `POST /api/knowledge/{module_name}/files` — multipart/form-data 上传文件（字段名 `file`），保存到模块目录。上传时对文件名 sanitize（仅取 basename），不符合 `FILENAME_PATTERN` 返回 422
  - `POST /api/knowledge/{module_name}/files/text` — JSON body `{filename, content}` 纯文本创建
- 两个端点均需检查是否有任何任务正在运行（扩展现有 `is_agent_running()` 或新增 `is_any_task_running()` 检查所有 running 状态任务），防止问题定位任务运行期间知识文件被修改
- 文件名安全校验复用 `FILENAME_PATTERN`
- 创建后调用 `init_module_meta()` 刷新 `meta.json` 的文件列表

**Patterns to follow:**
- `knowledge_api.py` 现有端点的 Pydantic BaseModel 请求模式
- `knowledge_store.py` 的 `_resolve_module_path()` / `_resolve_file_path()` 安全校验
- `write_knowledge_file()` 的文件写入模式

**Test scenarios:**
- Happy path: 上传 .md 文件到已有模块 → 文件出现在列表中 → meta.json 更新
- Happy path: 通过文本创建接口创建 .txt 文件 → 文件内容正确
- Error path: 文件名含路径分隔符 → 422 拒绝
- Error path: 模块不存在 → 404
- Error path: agent 运行期间 → 409 锁定
- Edge case: 文件名已存在 → 覆盖（与编辑行为一致）

**Verification:**
- `curl -X POST -F "file=@test.md" http://localhost:19991/api/knowledge/multimedia_av_session/files` 返回成功
- `GET /api/knowledge/multimedia_av_session` 返回的 files 列表包含新文件
- `meta.json` 文件列表已更新

- [ ] **Unit 2: 后端 — 组件路径映射配置加载**

**Goal:** 支持通过 CSV 文件配置组件路径映射，替代直接列出 code_repo_root 顶级目录。

**Requirements:** R4, R5

**Dependencies:** None

**Files:**
- Create: `config/component_mapping.csv`（示例文件 + 说明注释）
- Modify: `app/core/config.py`
- Modify: `app/api/task_api.py`

**Approach:**
- 在 `PathsConfig` 中新增可选字段 `component_mapping_file: str = ""`
- 在 `config.yaml` 中添加 `component_mapping_file: "config/component_mapping.csv"` 配置项
- 新建 `app/core/component_mapping.py` 模块：
  - `load_component_mapping()` — 读取 CSV 文件，返回 `list[dict]`（每行含 kit_name, component_name, component_path）。采用启动时加载 + 全局缓存策略（与 `get_settings()` 一致），修改 CSV 后需重启服务生效
  - `get_component_list(code_repo_root)` — 返回组件列表，优先使用映射表；若映射表不存在或为空，回退到现有的顶级目录扫描逻辑
  - `resolve_component_path(component_name, code_repo_root)` — 根据映射表解析组件的实际路径 `{code_repo_root}/{component_path}`
- 修改 `task_api.py` 的 `/api/tasks/modules/list` 端点：调用 `get_component_list()` 替代直接扫描目录
- 不修改 `_build_prompt()`——由于问题定位任务创建时模块名未知，映射逻辑在 Skill 侧处理（见 Unit 4）

**CSV 格式：**
```csv
kit_name,component_name,component_path
Multimedia AV Session,multimedia_av_session,/multimedia_av_session
xxx kit,xxxxx_xxxx,/xxx/path/to/xxxxx
```

**Patterns to follow:**
- `config.py` 的 Pydantic Settings 模式
- `task_api.py` 的现有端点模式

**Test scenarios:**
- Happy path: CSV 存在且有效 → `/modules/list` 返回映射表中的组件
- Edge case: CSV 不存在 → 回退到顶级目录扫描
- Edge case: CSV 为空（仅表头）→ 回退到顶级目录扫描
- Happy path: `resolve_component_path("multimedia_av_session", code_root)` 返回正确的完整路径
- Edge case: component_name 不在映射表中 → 返回 None 或回退

**Verification:**
- 配置有效的 CSV 后，`GET /api/tasks/modules/list` 返回映射表中的组件
- 删除 CSV 后，端点回退到目录扫描

- [ ] **Unit 3: 前端 — 知识库页面文件上传/创建 UI**

**Goal:** 在知识库页面添加文件上传和创建功能，支持任意文件添加到选中模块。

**Requirements:** R1, R2

**Dependencies:** Unit 1

**Files:**
- Modify: `frontend/src/pages/KnowledgePage.jsx`

**Approach:**
- 在文件 Tab 栏右侧添加 "+" 按钮，点击弹出操作选择：
  - **上传文件**：触发 `<input type="file">` 选择文件，通过 `POST /api/knowledge/{module}/files` multipart 上传
  - **新建文本文件**：弹出输入框输入文件名，通过 `POST /api/knowledge/{module}/files/text` 创建空文件
- 上传/创建成功后自动刷新模块数据（调用 `selectModule()`），新文件出现在 Tab 栏
- Tab 栏为每个非标准知识文件添加小图标或标记（如 Paperclip 图标），区分自定义文件和标准知识文件
- 操作期间显示 loading 状态，错误时复用现有的 `errorMsg` 机制
- agent 运行期间禁用添加按钮：需修复当前 `isAgentRunning` 判断（当前逻辑 `moduleData?.status === 'ai_native' && moduleData?.is_building` 始终为 false，因为 API 不返回 `is_building` 字段）。修改为：调用后端新增的状态端点或从 `/api/knowledge/{module}` 响应中读取 `is_running` 字段，或直接在模块元数据中增加 `is_running` 标识

**Patterns to follow:**
- 现有 `saveFile()` / `confirmModule()` 的 async 操作模式
- `lucide-react` 图标 + 深色主题 UI 风格
- 现有 `errorMsg` 状态管理

**Test scenarios:**
- Happy path: 点击 "+" → 选择上传 → 文件出现在 Tab 栏 → 可正常查看内容
- Happy path: 点击 "+" → 输入文件名创建 → 空文件出现在 Tab 栏 → 可编辑
- Error path: agent 运行期间 → "+" 按钮禁用
- Error path: 上传失败 → 显示错误消息

**Verification:**
- 上传一个 .txt 文件后，Tab 栏出现新文件标签
- 点击新标签可查看文件内容
- 新建文本文件后自动进入编辑模式

- [ ] **Unit 4: Skill — problem-locator 支持任意知识文件和组件路径映射**

**Goal:** problem-locator Skill 能自动发现知识库中的所有文件并搜索相关内容，同时使用映射表解析组件代码仓路径。

**Requirements:** R3, R6

**Dependencies:** Unit 2

**Files:**
- Modify: `.claude/skills/problem-locator/SKILL.md`
- Modify: `.claude/skills/problem-locator/references/module_mapping.md`
- Create: `.claude/skills/problem-locator/references/component_mapping.csv`（从 config 目录复制/软链接）

**Approach:**
- **关键设计决策**：由于问题定位任务创建时模块名未知（模块在 Skill 运行时阶段 1 才被识别），后端 `_build_prompt()` 无法执行映射解析。因此将 CSV 映射表作为 Skill 参考文件传入，由 Skill 在阶段 1 识别到模块后自行查找映射路径。这与现有 `references/module_mapping.md` 的模式一致。
- **Skill 修改（SKILL.md）**：
  - 阶段 2.1 知识库查询增加步骤：使用 Glob 列出 `knowledge_root/{module_name}/` 下所有文件（排除 `meta.json`），对非标准文件（非 error_codes.json / api_chain.json / common_issues.md）执行全文关键词搜索
  - 阶段 3.2 代码仓搜索增加映射解析步骤：
    1. 读取 `references/component_mapping.csv`
    2. 按识别到的模块名（`component_name` 列）查找对应的 `component_path`
    3. 若命中，搜索范围为 `{code_repo_root}/{component_path}`
    4. 若未命中，回退到 `{code_repo_root}/{module_dir}/`（现有逻辑）
    5. 搜索策略：仅搜索映射后的路径，不双重搜索
- **module_mapping.md 更新**：
  - 在第 6 个表格中增加 `component_path` 列，与 CSV 映射表对齐
- **_build_prompt 不做修改**：继续传递 `code_repo_root` 参数给 Skill，映射在 Skill 侧完成

**Patterns to follow:**
- 现有 Skill 的参考文件模式（`references/` 目录）
- Skill 阶段 1 识别模块后利用参考文件的模式

**Test scenarios:**
- Happy path: 模块有额外 .md 文件 → Skill 阶段 2.1 能发现并搜索
- Happy path: CSV 映射表中命中模块 → Skill 阶段 3.2 使用映射路径搜索代码
- Edge case: 模块不在 CSV 映射表中 → 回退到 `code_repo_root/{module_dir}/`
- Edge case: 额外文件为空 → 不影响诊断结果
- Edge case: CSV 映射文件不存在 → 回退到现有目录拼接逻辑

**Verification:**
- 在模块目录下放置一个额外的 .md 文件后运行问题定位，结果中引用该文件内容
- 配置映射表后，Skill 搜索代码时使用正确的映射路径

## System-Wide Impact

- **Interaction graph:** 文件上传端点 → knowledge_store（写入）→ meta.json 刷新；问题定位 Skill → knowledge_store（读取所有文件）
- **Error propagation:** 文件上传失败返回 422/409/404，与现有编辑端点一致
- **State lifecycle risks:** 文件创建后 meta.json 需刷新，使用 `init_module_meta()` best-effort 刷新（与现有写入操作一致的非原子特性）。单并发任务约束下竞态窗口较小
- **API surface parity:** 文件上传端点需与现有文件编辑端点的安全策略（编辑锁、路径校验）保持一致
- **Unchanged invariants:** knowledge-builder Skill 的 8 文件产出不变；问题定位 Skill 的阶段结构不变；前端深色主题和布局不变

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 任意文件可能导致知识库目录膨胀 | 初始版本不做限制，后续可加配额；文件名正则校验防止注入 |
| CSV 映射表路径错误导致代码搜索失败 | `resolve_component_path()` 做路径存在性检查，不存在时回退 |
| Skill 搜索所有文件增加 token 消耗 | 仅对非标准文件做关键词匹配搜索，标准文件保持精确查询逻辑 |
| 大文件上传可能阻塞服务 | 初始版本不做限制，后续可加文件大小上限 |

## Documentation / Operational Notes

- `config/component_mapping.csv` 需在部署文档中说明格式要求（三列 CSV，首行表头，component_path 以 `/` 开头表示相对于 code_repo_root）
- 修改 CSV 后需重启服务生效（与 config.yaml 行为一致）
- 问题定位 Skill 的参考文件目录中增加 `component_mapping.csv`，说明映射表的使用方式
