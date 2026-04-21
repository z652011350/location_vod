# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Location VOD 是一个 HarmonyOS 开发者问题辅助诊断平台。用户提交故障日志、错误码或异常描述后，系统调用 Claude Code CLI（通过自定义 Skill）进行自动化分析，实时流式返回诊断结果（根因候选、证据链、修复建议）。同时支持知识库构建模式，自动探索指定模块代码结构并生成双轨知识文件（4 个结构化数据文件 + 4 个 Wiki 文档）。

## Commands

```bash
# 后端启动（默认 127.0.0.1:19991）
python run.py

# 前端开发（端口 3000，/api 代理到后端 19991）
cd frontend && npm run dev

# 前端构建（产物在 frontend/dist/，后端会自动托管）
cd frontend && npm run build

# 前端 lint
cd frontend && npm run lint
```

项目没有 requirements.txt 或 pyproject.toml，Python 依赖需手动安装（FastAPI, uvicorn, pydantic）。

## Architecture

```
后端 (FastAPI + async)             前端 (React 19 + Vite 8)
┌─────────────────────┐            ┌──────────────────────┐
│  app/api/           │            │  frontend/src/pages/ │
│    task_api.py      │◄──SSE────►│    HomePage.jsx      │
│    knowledge_api.py │            │    TaskDetailPage.jsx│
│    page_api.py      │            │    KnowledgePage.jsx │
├─────────────────────┤            └──────────────────────┘
│  app/manager/       │
│    task_manager.py  │  ← 业务逻辑编排
│    workspace_manager│  ← 任务目录创建
├─────────────────────┤
│  app/store/         │  ← JSON 文件持久化（无数据库）
│    task_store.py    │     data/tasks/{id}/task.json
│    event_store.py   │     data/tasks/{id}/process/events.jsonl
│    result_store.py  │     data/tasks/{id}/output/final_result.json
│    knowledge_store  │     data/knowledge/{module}/meta.json
├─────────────────────┤
│  app/agent/         │
│    claude_executor  │  ← 以子进程运行 claude CLI
├─────────────────────┤
│  app/core/          │
│    config.py        │  ← Pydantic Settings 配置加载
│    component_mapping│  ← CSV 组件路径映射加载
│    paths.py         │  ← 目录路径管理
│    enums.py         │  ← 状态枚举
└─────────────────────┘
```

**数据流**: 用户请求 → API 层 → Manager 层协调 Store 持久化 + Agent 执行 Claude CLI → SSE 实时流式返回结果。

**任务状态机**: `created → running → succeeded | failed | timeout | cancelled`

**关键约束**:
- 单并发任务（`max_concurrent_tasks: 1`），无任务队列
- Claude CLI 在 SSE 请求处理中直接运行（无后台 worker）
- 所有数据以 JSON/JSONL/Markdown 文件存储在本地文件系统
- SSE 解耦设计：CLI 执行作为独立 asyncio Task 运行，不依赖 SSE 连接存活

## Configuration

`config/config.yaml` 包含四个配置块：

- `app`: host/port
- `paths`: 数据目录 + 三个外部代码仓库路径 + CSV 映射文件路径
  - `code_repo_root`: HarmonyOS 代码仓库根目录（模块源码）
  - `docs_repo_root`: HarmonyOS 文档仓库根目录（开发指南、错误码文档）
  - `sdk_repo_root`: API 声明仓库根目录（.d.ts 文件）
  - `component_mapping_file`: 组件路径映射 CSV 文件（默认 `config/component_mapping.csv`）
- `agent`: Claude CLI 命令和允许的工具列表
- `runtime`: 并发数和超时时间

配置通过 `app/core/config.py` 的 Pydantic Settings 模型加载。

### 组件路径映射（CSV）

`app/core/component_mapping.py` 从 `component_mapping_file` 加载 CSV 映射表，用于闭源代码仓目录结构与开源版本不一致的场景。

- `load_component_mapping()`: 加载并缓存映射表（CSV 格式：kit_name, component_name, component_path）
- `get_component_list()`: 扫描 code_repo_root 目录 + CSV 映射覆盖，返回模块列表
- `resolve_component_path()`: 按组件名查实际路径

## Custom Skills

两个自定义 Skill 定义在 `.claude/skills/`：

- **problem-locator** (`/problem-locator`): 分析故障日志，查询知识库，必要时探索代码，输出根因分析和修复建议。参考文件 `.claude/skills/problem-locator/references/` 包含：
  - `log_patterns.md` — 日志格式解析模式（AppFreeze、CPP_CRASH、hilog）
  - `module_mapping.md` — 6 种模块映射表（错误码前缀、DOMAIN、.so 库名、API 前缀、hilog domain_id、文档仓路径）
  - `component_mapping.md` — CSV 映射使用说明

- **knowledge-builder** (`/knowledge-builder`): 探索指定模块代码结构，生成双轨知识文件（8 个文件）。参考文件 `.claude/skills/knowledge-builder/references/mapping_patterns.md` 记录了 NAPI 映射模式。

  **双轨产出**：
  - 结构化数据（机器消费）：`overview.md`、`error_codes.json`、`api_chain.json`、`common_issues.md`
  - Wiki 文档（人类阅读）：`architecture.md`、`call_chains.md`、`api_reference.md`、`troubleshooting.md`

  **执行阶段**：模块扫描 → 结构化数据生成 → 质量检查 → Wiki 文档生成 → 校验发布（临时目录 + 原子重命名）

## Frontend Notes

- React 19 + Vite 8 + Tailwind CSS 4 + React Router 7
- 深色科技风 UI，中文界面
- `app/api/page_api.py` 和 `app/templates/` 是遗留的 Jinja2 模板页面，已被 React 前端替代
- 后端 `app/main.py` 在 SPA fallback 中托管 `frontend/dist/`

## Knowledge Store Security

`app/store/knowledge_store.py` 对模块名和文件名使用正则校验防止路径遍历攻击。知识文件编辑端点在 agent 运行期间返回 409 锁定。
