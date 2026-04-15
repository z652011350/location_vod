# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Location VOD 是一个 HarmonyOS 开发者问题辅助诊断平台。用户提交故障日志、错误码或异常描述后，系统调用 Claude Code CLI（通过自定义 Skill）进行自动化分析，实时流式返回诊断结果（根因候选、证据链、修复建议）。同时支持知识库构建模式，自动探索指定模块代码结构并生成结构化知识文件。

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
└─────────────────────┘
```

**数据流**: 用户请求 → API 层 → Manager 层协调 Store 持久化 + Agent 执行 Claude CLI → SSE 实时流式返回结果。

**任务状态机**: `created → running → succeeded | failed | timeout | cancelled`

**关键约束**:
- 单并发任务（`max_concurrent_tasks: 1`），无任务队列
- Claude CLI 在 SSE 请求处理中直接运行（无后台 worker）
- 所有数据以 JSON/JSONL/Markdown 文件存储在本地文件系统

## Configuration

`config/config.yaml` 包含：
- `app`: host/port
- `paths`: 数据目录 + 三个外部代码仓库根路径（`code_repo_root`, `docs_repo_root`, `sdk_repo_root`）
- `agent`: Claude CLI 命令和允许的工具列表
- `runtime`: 并发数和超时时间

配置通过 `app/core/config.py` 的 Pydantic Settings 模型加载。

## Custom Skills

两个自定义 Skill 定义在 `.claude/skills/`：

- **problem-locator** (`/problem-locator`): 分析故障日志，查询知识库，必要时探索代码，输出根因分析和修复建议。参考文件 `.claude/skills/problem-locator/references/log_patterns.md` 记录了 HiviewDFX AppFreeze、CPP_CRASH、hilog 三种日志格式。
- **knowledge-builder** (`/knowledge-builder`): 探索指定模块代码结构，生成 `overview.md`、`error_codes.json`、`api_chain.json`、`common_issues.md`。参考文件 `.claude/skills/knowledge-builder/references/mapping_patterns.md` 记录了 NAPI 映射模式。

## Frontend Notes

- React 19 + Vite 8 + Tailwind CSS 4 + React Router 7
- 深色科技风 UI，中文界面
- `app/api/page_api.py` 和 `app/templates/` 是遗留的 Jinja2 模板页面，已被 React 前端替代
- 后端 `app/main.py` 在 SPA fallback 中托管 `frontend/dist/`

## Knowledge Store Security

`app/store/knowledge_store.py` 对模块名和文件名使用正则校验防止路径遍历攻击。知识文件编辑端点在 agent 运行期间返回 409 锁定。
