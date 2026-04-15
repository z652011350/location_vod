---
title: "feat: HarmonyOS 开发者问题辅助定位系统"
type: feat
status: active
date: 2026-04-15
origin: docs/brainstorms/location-vod-requirements.md
---

# HarmonyOS 开发者问题辅助定位系统

## Overview

构建一个轻量验证平台，帮助鸿蒙开发者诊断问题。系统通过 Web 界面接收开发者的问题描述和故障日志，调用 Claude Code CLI + 自定义 Skill 进行自动分析，输出结构化的诊断结果。

采用渐进式验证策略：**第一步**先验证问题定位 Skill 的纯实时分析能力，**第二步**再引入知识库构建模式。

## Problem Frame

鸿蒙开发者在遇到报错、崩溃、冻屏等问题时，需手动在 100+ 个代码仓中查找原因。已有系统 api_dfx_2.0 做的是主动预防（合规审计），但无法帮助开发者诊断已遇到的具体问题。本系统定位为技术验证 Demo，核心假设是"Agent + Skill 能否有效辅助定位鸿蒙问题"。（see origin: docs/brainstorms/location-vod-requirements.md）

## Requirements Trace

- R1. Web 界面，支持问题描述、故障日志、代码片段输入
- R2. 支持问题定位任务和知识库构建任务两种类型
- R3. 混合前端：任务列表主页 + 对话式分析详情页
- R4. 所有任务数据落盘，支持复盘
- R5. 全局配置文件管理路径、Agent、并发等参数
- R6. 知识库构建 Skill：探索模块并生成结构化知识文件
- R7. 知识库构建支持单模块手动触发（批量/定时为后续优化）
- R8. 知识库支持覆盖式重建（增量追加为后续优化）
- R9. 问题定位优先查询知识库
- R10. 知识库不足时回退到实时代码探索
- R11. 输出结构化诊断结果（根因候选、证据链、修复建议）
- R12. 过程中持续输出中间步骤
- R13. 配置引用外部代码仓路径，不硬编码
- R14. 复用 api_dfx_2.0 已有知识资产

## Scope Boundaries

- 不构建生产级系统（无分布式、高可用、用户认证）
- 不引入向量数据库或搜索引擎
- 不替代 api_dfx_2.0 的审计能力
- 优先 Claude Code CLI，不广泛适配 Agent 工具
- 不实现自动化 CI/CD 或持续知识库更新流水线

### Deferred to Separate Tasks

- 更多故障日志样本收集（错误码类 + 崩溃类）— 持续进行，放入 `docs/example/`
- OpenCode Agent 适配 — Claude Code 验证通过后再扩展
- 知识库批量构建和定时调度 — 验证通过后的优化方向

## Context & Research

### Relevant Code and Patterns

- **api_dfx_2.0 Skill 格式**：`.claude/skills/<name>/SKILL.md`，YAML frontmatter（name, description）+ Markdown 正文（参数表格、分阶段执行指令）。Skill 目录下含 `scripts/`、`references/`、`config/` 子目录
- **Claude CLI 调用模式**：`claude -p "<prompt>" --allowedTools "Bash,Read,Edit,...,Agent"`，通过 `subprocess.Popen` 实时读取 stdout。参考 `api_dfx_2.0/scripts/kit-scan-test/claude_runner.py`
- **可复用知识资产**：`api_dfx_2.0/.claude/skills/kit-api-extract/reference/MAPPING_PATTERNS.md`（16 种 NAPI 映射模式）、`kit-api-extract` 产出的 `api.jsonl` / `impl_api.jsonl`
- **故障日志样本**：`docs/example/一次定位案例.md`（HiviewDFX appfreeze 日志，THREAD_BLOCK_6S）

### Institutional Learnings

- 无现有 docs/solutions/ 知识库

## Key Technical Decisions

- **后端框架**：FastAPI + Pydantic + asyncio — 轻量、异步友好、与 SSE 天然兼容
- **前端方案**：单页 HTML + 原生 CSS/JS，使用 fetch API + SSE 实现实时更新。不引入前端框架，保持验证阶段简单
- **实时更新方式**：SSE（Server-Sent Events）— FastAPI 原生支持 StreamingResponse，单向推送即可满足"展示分析过程"的需求，比 WebSocket 简单
- **Agent 调用方式**：`asyncio.create_subprocess_exec` 执行 `claude -p "..."` --allowedTools "..."` ，实时读取 stdout 并解析中间步骤
- **存储方案**：本地文件系统 + JSON/JSONL，按任务目录隔离。不引入 SQLite（验证阶段文件系统足够）
- **Skill 存放位置**：`.claude/skills/<skill-name>/SKILL.md`（遵循 Claude Code 标准发现路径）
- **api_dfx_2.0 复用策略**：Skill 的 `references/` 目录中引用 api_dfx_2.0 的已有知识文件路径（通过配置注入），而非代码级依赖

## Open Questions

### Resolved During Planning

- **前端实时更新方式**：选择 SSE，最简单且满足需求
- **api_dfx_2.0 复用策略**：通过配置路径引用已有产出物（MAPPING_PATTERNS.md、api.jsonl），Skill 中 Read/Grep 直接查询
- **置信度评分**：验证阶段简化为按相关性排序，不实现结构化置信度

### Deferred to Implementation

- **知识库文件结构**：需探索 2-3 个实际模块后确定字段设计
- **知识库查询策略**：取决于知识库结构，先实现简单关键词匹配
- **Skill 中间步骤输出格式**：取决于 Claude Code CLI 的实际输出行为，需实验确定解析策略
- **并发任务数**：先固定为 1（验证阶段），后续通过 Semaphore 扩展

## Output Structure

```
location_vod/
  app/
    main.py                          # FastAPI 入口
    core/
      config.py                      # 配置加载（YAML）
      enums.py                       # 状态、阶段枚举
    api/
      task_api.py                    # 任务 CRUD + SSE 接口
      page_api.py                    # HTML 页面路由
    agent/
      claude_executor.py             # Claude Code CLI 调用封装
    manager/
      task_manager.py                # 任务创建、状态管理
      workspace_manager.py           # 任务工作目录管理
    store/
      task_store.py                  # task.json 读写
      event_store.py                 # events.jsonl 追加/读取
      result_store.py                # final_result.json 读写
    templates/
      index.html                     # 主页：提交问题 + 任务列表
      task_detail.html               # 详情页：对话式分析过程
    static/
      css/app.css
      js/
        index.js                     # 主页交互
        task_detail.js               # SSE 实时更新 + 分析展示
  .claude/
    skills/
      problem-locator/
        SKILL.md                     # 问题定位 Skill
        references/
          log_patterns.md            # 常见故障日志模式
      knowledge-builder/
        SKILL.md                     # 知识库构建 Skill
  data/
    knowledge/                       # 知识库产出目录
      {module_name}/
        ...
    tasks/                           # 任务工作目录
      {task_id}/
        task.json
        input/
        process/
          events.jsonl
          stdout.log
        output/
          final_result.json
          final_report.md
  config/
    config.yaml                      # 全局配置
  run.py                             # 启动入口
```

## Implementation Units

### Phase 1: 平台基础 + 问题定位（核心验证）

- [ ] **Unit 1: 项目脚手架 + 配置系统**

**Goal:** 建立项目骨架，实现配置加载和目录初始化

**Requirements:** R5, R13

**Dependencies:** None

**Files:**
- Create: `app/main.py`
- Create: `app/core/config.py`
- Create: `app/core/enums.py`
- Create: `config/config.yaml`
- Create: `run.py`

**Approach:**
- config.yaml 包含：app 配置（host/port）、paths（data_root、tasks_root、knowledge_root、code_repo_root、docs_repo_root、sdk_repo_root）、agent 配置（command: claude, allowed_tools）、runtime 配置
- config.py 加载 YAML 并返回 Pydantic BaseModel
- enums.py 定义 TaskStatus（created/queued/running/succeeded/failed/cancelled/timeout）、TaskType（problem_locating/knowledge_building）

**Test scenarios:**
- Happy path: 加载有效 config.yaml，所有字段正确解析
- Edge case: 缺失路径字段时使用默认值
- Error path: config.yaml 不存在时给出明确错误

**Verification:** `python run.py` 启动 FastAPI 服务，`GET /` 返回 200

---

- [ ] **Unit 2: 任务管理 + 本地存储**

**Goal:** 实现任务的创建、状态管理、工作目录管理和事件记录

**Requirements:** R2, R4

**Dependencies:** Unit 1

**Files:**
- Create: `app/manager/workspace_manager.py`
- Create: `app/manager/task_manager.py`
- Create: `app/store/task_store.py`
- Create: `app/store/event_store.py`
- Create: `app/store/result_store.py`

**Approach:**
- workspace_manager: 创建任务目录结构（task.json、input/、process/、output/）
- task_store: 读写 task.json，更新状态字段
- event_store: 追加 JSONL 事件，读取事件流
- result_store: 写入/读取 final_result.json 和 final_report.md
- task_id 格式：`task_YYYYMMDD_HHMMSS_xxxx`

**Test scenarios:**
- Happy path: 创建任务 → 写入 task.json → 更新状态 → 追加事件 → 写入结果，全部文件正确落盘
- Edge case: 重复创建同一 task_id 不报错（幂等）
- Error path: 读取不存在的 task_id 返回 None

**Verification:** 可通过 TaskManager 创建任务，目录结构和文件内容符合预期

---

- [ ] **Unit 3: Claude Code CLI 执行器**

**Goal:** 封装 Claude Code CLI 的子进程调用，实时读取 stdout/stderr，支持超时控制

**Requirements:** R10, R12

**Dependencies:** Unit 1

**Files:**
- Create: `app/agent/claude_executor.py`

**Approach:**
- 使用 asyncio.create_subprocess_exec 执行 `claude -p "<prompt>"` --allowedTools "Bash,Read,Write,Edit,Grep,Glob,Agent"`
- 实时逐行读取 stdout，解析中间步骤（格式待实验确定）
- stderr 写入 process/stderr.log
- 支持超时终止（asyncio.wait_for + process.kill）
- prompt 由 Skill 的输入参数 + 模板构建，包含配置中的代码仓路径

**Patterns to follow:**
- api_dfx_2.0/scripts/kit-scan-test/claude_runner.py 的 Popen + 实时读取模式

**Test scenarios:**
- Happy path: 执行简单 prompt（如 `claude -p "echo hello"`），捕获 stdout
- Error path: CLI 命令不存在时返回非零退出码和明确错误
- Error path: 超时后进程被终止

**Verification:** 可执行一条 Claude CLI 命令并获取 stdout 输出

---

- [ ] **Unit 4: 问题定位 Skill 定义**

**Goal:** 编写 problem-locator Skill 的 SKILL.md，定义分析阶段和输出规范

**Requirements:** R9, R10, R11, R12

**Dependencies:** Unit 3

**Files:**
- Create: `.claude/skills/problem-locator/SKILL.md`
- Create: `.claude/skills/problem-locator/references/log_patterns.md`

**Approach:**
- SKILL.md 定义参数：problem_description、log_content、code_snippet、code_repo_root、docs_repo_root、knowledge_root
- 分阶段执行：
  1. 日志解析 — 从故障日志中提取关键线索（错误码、系统事件名如 THREAD_BLOCK_6S、DOMAIN、调用栈、模块标签）
  2. 知识库查询 — 搜索 knowledge_root 下匹配的知识文件
  3. 代码探索（条件） — 若知识库不足，根据线索在 code_repo_root 中搜索相关实现
  4. 根因分析 — 综合证据，输出根因候选列表
  5. 修复建议 — 针对每个根因候选给出具体修复步骤
- 每个阶段输出一个 JSON 文件到任务工作目录的 artifacts/ 下
- 最终输出 final_result.json
- log_patterns.md 记录已知故障日志格式（HiviewDFX appfreeze、hilog 等）

**Patterns to follow:**
- api_dfx_2.0/.claude/skills/kit-api-extract/SKILL.md 的 YAML frontmatter + 分阶段格式

**Test scenarios:**
- Test expectation: none — Skill 是 Markdown 定义文件，通过实际执行验证效果

**Verification:** 用 `claude -p "/problem-locator\nproblem_description=..."` 手动执行，确认能产出结构化输出

---

- [ ] **Unit 5: 后端 API 接口**

**Goal:** 实现 REST API 和 SSE 接口

**Requirements:** R1, R3, R4

**Dependencies:** Unit 2, Unit 3

**Files:**
- Create: `app/api/task_api.py`
- Create: `app/api/page_api.py`

**Approach:**
- `POST /api/tasks` — 创建任务（接收 problem_description、log_content、code_snippet、task_type）
- `GET /api/tasks` — 任务列表
- `GET /api/tasks/{task_id}/status` — 当前状态
- `GET /api/tasks/{task_id}/events` — 事件流（支持 SSE）
- `GET /api/tasks/{task_id}/result` — 最终结果
- `GET /api/tasks/{task_id}/stream` — SSE 端点，实时推送分析过程
- `page_api.py` 渲染 Jinja2 模板返回 HTML 页面

**Test scenarios:**
- Happy path: 创建问题定位任务 → 轮询状态 → 获取结果，完整链路
- Edge case: 任务不存在时返回 404
- Error path: 输入为空时返回 422

**Verification:** 可通过 curl 创建任务并获取结果

---

- [ ] **Unit 6: 前端页面**

**Goal:** 实现主页（提交问题 + 任务列表）和详情页（对话式分析过程展示）

**Requirements:** R1, R3

**Dependencies:** Unit 5

**Files:**
- Create: `app/templates/index.html`
- Create: `app/templates/task_detail.html`
- Create: `app/static/css/app.css`
- Create: `app/static/js/index.js`
- Create: `app/static/js/task_detail.js`

**Approach:**
- 主页分两个区域：左侧任务提交表单（问题描述文本框、故障日志文本框、代码片段文本框），右侧任务列表（卡片式，显示任务ID、类型、状态、创建时间）
- 点击任务卡片跳转详情页
- 详情页：
  - 顶部：任务基本信息和当前状态
  - 主体：对话式分析过程展示（类似聊天界面），每个分析步骤以卡片形式展示，包含步骤名称、摘要、详细信息
  - SSE 实时更新：`task_detail.js` 通过 EventSource 连接 SSE 端点，收到新事件时追加到页面
  - 底部：最终诊断结果区域（根因候选、证据链、修复建议）
- CSS 风格简洁现代，不引入外部 CSS 框架

**Test scenarios:**
- Happy path: 提交问题 → 页面跳转到详情 → 实时看到分析步骤 → 最终显示诊断结果
- Edge case: 任务失败时详情页显示错误信息
- Edge case: SSE 连接断开后自动重连

**Verification:** 在浏览器中完成完整的问题提交 → 分析过程查看 → 结果阅读流程

### Phase 2: 知识库构建（验证第二步）

- [ ] **Unit 7: 知识库构建 Skill + 集成**

**Goal:** 编写 knowledge-builder Skill，实现知识文件的生成和存储

**Requirements:** R6, R7, R8, R9, R14

**Dependencies:** Unit 4, Unit 6（Phase 1 验证通过后）

**Files:**
- Create: `.claude/skills/knowledge-builder/SKILL.md`
- Create: `.claude/skills/knowledge-builder/references/mapping_patterns.md`（引用 api_dfx_2.0 的 MAPPING_PATTERNS.md）

**Approach:**
- SKILL.md 定义参数：module_name、code_repo_root、docs_repo_root、knowledge_output_dir、existing_knowledge_dir
- 探索阶段：
  1. 扫描指定模块目录，识别关键代码结构（NAPI 桥接层、Framework 层、实现层）
  2. 提取错误码定义、错误信息、API 声明与实现映射
  3. 识别常见问题模式（权限校验、参数校验、生命周期、线程安全等）
  4. 生成结构化知识文件到 knowledge_output_dir/{module_name}/
- 支持覆盖式重建：重新探索时完整覆盖已有知识文件
- 知识文件格式：JSON（错误码映射表、API 实现链路表）+ Markdown（模块概览、常见问题摘要）
- references/mapping_patterns.md 引用 api_dfx_2.0 的 NAPI 映射知识，供 Skill 探索时参考
- 修改 problem-locator Skill 的 SKILL.md，增加知识库查询阶段（在日志解析后、代码探索前）

**Patterns to follow:**
- api_dfx_2.0/.claude/skills/kit-api-extract/SKILL.md 的分阶段探索 + subagent 并行模式

**Test scenarios:**
- Happy path: 对 base_location 模块执行知识构建 → 产出 JSON/MD 知识文件 → 用问题定位 Skill 查询知识库 → 验证有/无知识库时诊断效果差异
- Edge case: 已有知识文件的模块重新构建时正确覆盖
- Error path: 模块目录不存在时给出明确提示

**Verification:** 对 base_location 完成知识构建，并用错误码 201 问题验证知识库查询效果

## System-Wide Impact

- **Agent 调用链**：FastAPI → claude_executor → `claude -p "..."` subprocess → Skill 执行 → 文件系统写入 → SSE 推送前端
- **状态生命周期**：created → queued → running → succeeded/failed/timeout。所有状态变更写入 task.json 和 events.jsonl
- **错误传播**：CLI 非零退出码 → 任务 failed，stderr 保存到 process/stderr.log。超时 → process.kill → 任务 timeout
- **不变量**：task.json 的状态始终与 events.jsonl 最后一条事件一致

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Claude Code CLI 输出格式不确定，中间步骤解析困难 | 先用纯文本 stdout 模式，逐行解析；若无法结构化解析，退化为全文展示 |
| 故障日志格式多样，日志解析 Skill 可能覆盖不全 | 先支持 HiviewDFX appfreeze + hilog 两种格式，后续按需扩展 |
| 单次 Skill 执行可能超时（大模块探索） | 配置化超时时间，默认 900s；超时后保留已生成的中间产物供复盘 |
| 知识库关键词匹配效果可能不佳 | 先实现最简版本，通过实际使用反馈迭代查询策略 |

## Sources & References

- **Origin document:** [docs/brainstorms/location-vod-requirements.md](docs/brainstorms/location-vod-requirements.md)
- **故障日志样本:** docs/example/一次定位案例.md
- **Claude CLI 调用模式参考:** api_dfx_2.0/scripts/kit-scan-test/claude_runner.py
- **Skill 格式参考:** api_dfx_2.0/.claude/skills/kit-api-extract/SKILL.md
- **NAPI 映射知识:** api_dfx_2.0/.claude/skills/kit-api-extract/reference/MAPPING_PATTERNS.md
