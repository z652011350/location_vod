# Location VOD - HarmonyOS 开发者问题辅助诊断平台

Location VOD 是一个面向 HarmonyOS 开发者的问题辅助诊断平台。用户提交故障日志、错误码或异常描述后，系统调用 Claude Code CLI 进行自动化分析，实时流式返回诊断结果（根因候选、证据链、修复建议）。同时支持知识库构建模式，自动探索指定模块代码结构并生成结构化知识文件。

## 功能特性

- **故障诊断**：提交日志 / 错误码 / 异常描述，自动定位根因并给出修复建议
- **知识库构建**：探索指定 HarmonyOS 模块代码，生成结构化的概览、错误码、API 调用链、常见问题等知识文件
- **实时流式输出**：通过 SSE (Server-Sent Events) 实时推送分析进度和结果
- **知识库管理**：查看、编辑已构建的模块知识库，支持 Markdown 格式
- **任务管理**：创建、查看、重试、取消诊断任务，完整的状态追踪

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3.11+ / FastAPI / uvicorn / Pydantic |
| 前端 | React 19 / Vite 8 / Tailwind CSS 4 / React Router 7 |
| AI Agent | Claude Code CLI（自定义 Skill） |
| 数据存储 | 本地文件系统（JSON / JSONL / Markdown） |

## 项目结构

```
location_vod/
├── app/                          # 后端应用
│   ├── main.py                   # FastAPI 入口 + SPA 托管
│   ├── api/                      # API 路由层
│   │   ├── task_api.py           # 任务 API（创建、执行、SSE 流、取消）
│   │   ├── knowledge_api.py      # 知识库 API（查询、编辑）
│   │   └── page_api.py           # 遗留页面（已被 React 替代）
│   ├── agent/
│   │   └── claude_executor.py    # Claude CLI 子进程封装 + 超时控制
│   ├── manager/
│   │   ├── task_manager.py       # 任务生命周期管理
│   │   └── workspace_manager.py  # 任务工作目录创建
│   ├── store/                    # 数据持久化层
│   │   ├── task_store.py         # 任务元数据 (task.json)
│   │   ├── event_store.py        # 事件流 (events.jsonl)
│   │   ├── result_store.py       # 最终结果 (final_result.json)
│   │   └── knowledge_store.py    # 知识库文件 (带路径安全校验)
│   ├── core/
│   │   ├── config.py             # Pydantic Settings 配置加载
│   │   ├── paths.py              # 目录路径管理
│   │   └── enums.py              # 状态枚举
│   └── templates/                # 遗留 Jinja2 模板（已被 React 替代）
├── frontend/                     # React 前端
│   ├── src/pages/
│   │   ├── HomePage.jsx          # 首页（任务列表）
│   │   ├── TaskDetailPage.jsx    # 任务详情（SSE 实时输出）
│   │   └── KnowledgePage.jsx     # 知识库管理
│   └── package.json
├── config/
│   └── config.yaml               # 运行时配置
├── data/                         # 数据目录（运行时生成）
│   ├── tasks/{id}/               # 每个任务一个目录
│   │   ├── task.json
│   │   ├── process/events.jsonl
│   │   └── output/final_result.json
│   └── knowledge/{module}/       # 知识库模块
├── .claude/skills/               # Claude Code 自定义 Skill
│   ├── problem-locator/          # 故障诊断 Skill
│   └── knowledge-builder/        # 知识库构建 Skill
├── run.py                        # 启动入口
└── CLAUDE.md                     # Claude Code 开发指引
```

## 快速开始

### 前置要求

- Python 3.11+
- Node.js 18+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) 已安装并登录

### 1. 安装 Python 依赖

```bash
pip install fastapi uvicorn pydantic
```

### 2. 安装前端依赖

```bash
cd frontend
npm install
```

### 3. 构建前端（可选，开发模式可跳过）

```bash
cd frontend
npm run build
```

### 4. 修改配置

编辑 `config/config.yaml`，配置外部代码仓库路径：

```yaml
paths:
  code_repo_root: "/path/to/your/code/repo"
  docs_repo_root: "/path/to/your/docs/repo"
  sdk_repo_root: "/path/to/your/sdk/repo"
```

### 5. 启动服务

**生产模式**（后端托管前端构建产物）：

```bash
python run.py
```

**开发模式**（前后端分离启动）：

```bash
# 终端 1：启动后端（默认 127.0.0.1:19991）
python run.py

# 终端 2：启动前端开发服务器（端口 3000，API 代理到后端）
cd frontend && npm run dev
```

启动后访问 http://127.0.0.1:3000（开发模式）或 http://127.0.0.1:19991（生产模式）。

## 配置说明

`config/config.yaml` 完整配置项：

```yaml
app:
  host: "127.0.0.1"       # 监听地址
  port: 19991              # 监听端口

paths:
  data_root: "data"                    # 数据根目录
  tasks_root: "data/tasks"             # 任务数据目录
  knowledge_root: "data/knowledge"     # 知识库目录
  code_repo_root: ""                   # HarmonyOS 代码仓库路径
  docs_repo_root: ""                   # HarmonyOS 文档仓库路径
  sdk_repo_root: ""                    # HarmonyOS SDK 路径

agent:
  command: "claude"                    # Claude CLI 命令
  allowed_tools:                       # 允许使用的工具列表
    - "Bash"
    - "Read"
    - "Write"
    - "Edit"
    - "Grep"
    - "Glob"
    - "Agent"

runtime:
  max_concurrent_tasks: 1              # 最大并发任务数
  task_timeout_seconds: 3600           # 任务超时时间（秒）
```

## 任务状态机

```
created → running → succeeded
                 → failed
                 → timeout
                 → cancelled
```

- `created`：任务已创建，等待执行
- `running`：Claude CLI 正在执行分析
- `succeeded`：分析完成，结果已写入
- `failed`：执行失败
- `timeout`：执行超时
- `cancelled`：用户手动取消

所有终态（succeeded / failed / timeout / cancelled）的任务均可重试。

## 自定义 Skill

### problem-locator（故障定位）

分析故障日志的工作流程：
1. 解析日志格式（支持 HiviewDFX AppFreeze、CPP_CRASH、hilog）
2. 查询知识库匹配已知模式
3. 必要时探索代码仓库获取上下文
4. 输出根因候选、证据链和修复建议

### knowledge-builder（知识库构建）

探索模块代码并生成四个知识文件：
- `overview.md`：模块概览
- `error_codes.json`：错误码定义
- `api_chain.json`：API 调用链
- `common_issues.md`：常见问题

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/tasks` | 创建诊断任务 |
| GET | `/api/tasks` | 获取任务列表 |
| GET | `/api/tasks/{id}` | 获取任务详情 |
| POST | `/api/tasks/{id}/start` | 启动任务（SSE 流式返回） |
| POST | `/api/tasks/{id}/cancel` | 取消运行中的任务 |
| POST | `/api/tasks/{id}/retry` | 重试终态任务 |
| GET | `/api/knowledge` | 获取知识库模块列表 |
| GET | `/api/knowledge/{module}` | 获取模块知识文件内容 |
| PUT | `/api/knowledge/{module}/{file}` | 编辑知识文件 |

## 开发

```bash
# 前端 lint
cd frontend && npm run lint

# 前端开发服务器（热更新）
cd frontend && npm run dev
```

## 许可证

私有项目，未经授权不得使用。
