# Location VOD - HarmonyOS 开发者问题辅助诊断平台

Location VOD 是一个面向 HarmonyOS 开发者的问题辅助诊断平台。用户提交故障日志、错误码或异常描述后，系统调用 Claude Code CLI 进行自动化分析，实时流式返回诊断结果（根因候选、证据链、修复建议）。同时支持知识库构建模式，自动探索指定模块代码结构并生成结构化知识文件。

## 功能特性

- **故障诊断**：提交日志 / 错误码 / 异常描述，自动定位根因并给出修复建议
- **知识库构建**：探索指定 HarmonyOS 模块代码，生成双轨知识文件（4 个结构化数据文件 + 4 个 Wiki 文档）
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
│   │   ├── component_mapping.py  # CSV 组件路径映射加载
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
│   ├── config.yaml               # 运行时配置
│   └── component_mapping.csv     # 组件路径映射表
├── data/                         # 数据目录（运行时生成）
│   ├── tasks/{id}/               # 每个任务一个目录
│   │   ├── task.json
│   │   ├── process/events.jsonl
│   │   └── output/final_result.json
│   └── knowledge/{module}/       # 知识库模块（8 个文件 + meta.json）
├── .claude/skills/               # Claude Code 自定义 Skill
│   ├── problem-locator/          # 故障诊断 Skill
│   └── knowledge-builder/        # 知识库构建 Skill
├── docs/                         # 文档
│   ├── architecture-overview.md  # 架构总览（含 Mermaid 图）
│   ├── templates/                # Skill 模板 + 知识库贡献指南
│   ├── plans/                    # 功能设计文档
│   └── example/                  # 使用案例
├── run.py                        # 启动入口
├── CLAUDE.md                     # Claude Code 开发指引
└── README.md                     # 本文件
```

---

## 新人快速上手

### 1. 安装依赖

```bash
# Python 依赖
pip install fastapi uvicorn pydantic python-mutipart

# 前端依赖
cd frontend && npm install
```

### 2. 准备外部代码仓库

本项目需要三个外部代码仓库来提供代码搜索和知识库构建的能力。你需要将这些仓库克隆到本地：

| 仓库 | 配置项 | 用途 |
|------|--------|------|
| HarmonyOS 代码仓 | `code_repo_root` | 模块源码，用于代码探索和知识库构建 |
| HarmonyOS 文档仓 | `docs_repo_root` | 开发指南、错误码文档 |
| HarmonyOS SDK/API 仓 | `sdk_repo_root` | `.d.ts` API 声明文件 |

**目录结构要求**：

```
your_code_root/                   ← code_repo_root 指向这里
├── multimedia_av_codec/          # 各模块目录（模块名 = 目录名）
│   ├── frameworks/
│   ├── interfaces/
│   └── ...
├── multimedia_av_session/
├── base_location/
└── ...

your_docs_root/                   ← docs_repo_root 指向这里
└── zh-cn/                        # 或其他语言目录
    └── application-dev/          # 开发文档

your_sdk_root/                    ← sdk_repo_root 指向这里
└── api/                          # .d.ts 声明文件
    └── @ohos.xxx.d.ts
```

**关键说明**：
- `code_repo_root` 下的**一级子目录名**即为模块名，系统会自动扫描并列出所有可用模块
- 如果你的代码仓是特殊版本，目录结构与开源版本不一致，需要配置 CSV 映射表（见下文）
- 如果暂时没有外部仓库，系统仍可运行，但知识库构建和代码搜索功能不可用

### 3. 配置系统

编辑 `config/config.yaml`：

```yaml
app:
  host: "127.0.0.1"
  port: 19991

paths:
  data_root: "data"
  tasks_root: "data/tasks"
  knowledge_root: "data/knowledge"
  code_repo_root: "/path/to/your/code/repo"        # 改为你的代码仓路径
  docs_repo_root: "/path/to/your/docs/repo"        # 改为你的文档仓路径
  sdk_repo_root: "/path/to/your/sdk/repo"          # 改为你的 SDK 路径
  component_mapping_file: "config/component_mapping.csv"  # CSV 映射表路径

agent:
  command: "claude"
  allowed_tools:
    - "Bash"
    - "Read"
    - "Write"
    - "Edit"
    - "Grep"
    - "Glob"
    - "Agent"

runtime:
  max_concurrent_tasks: 1
  task_timeout_seconds: 3600
```

### 4. 配置组件路径映射（可选）

如果你的代码仓是**特殊版本**，内部目录结构与开源版本不同，需要通过 CSV 映射表告诉系统每个模块的实际路径。

编辑 `config/component_mapping.csv`：

```csv
kit_name,component_name,component_path
AVCodec Kit,multimedia_av_codec,multimedia_av_codec
```

**CSV 格式说明**：

| 列名 | 必填 | 说明 |
|------|------|------|
| `kit_name` | 否 | Kit 名称，用于前端展示 |
| `component_name` | 是 | 模块名，必须与 `code_repo_root` 下的目录名一致 |
| `component_path` | 是 | 模块在 `code_repo_root` 下的实际相对路径 |

**什么时候需要编辑 CSV**：

- 开源版本：`component_path` 与 `component_name` 相同，甚至可以不配置 CSV
- 特殊版本：`component_path` 是模块在特殊代码仓中的实际路径，与目录名不同

**示例**：特殊代码仓中 `multimedia_av_codec` 模块的实际路径是 `internal/media/av_codec`：

```csv
kit_name,component_name,component_path
AVCodec Kit,multimedia_av_codec,internal/media/av_codec
```

**工作原理**：
1. 系统启动时扫描 `code_repo_root` 下所有一级子目录，生成基础模块列表
2. 若 CSV 中定义了某模块的映射路径，用映射路径覆盖默认路径
3. 知识库构建和故障诊断时通过映射后的路径定位模块代码

### 5. 启动服务

**生产模式**（后端托管前端构建产物）：

```bash
# 先构建前端
cd frontend && npm run build && cd ..

# 启动
python run.py
```

访问 http://127.0.0.1:19991

**开发模式**（前后端分离，支持热更新）：

```bash
# 终端 1：启动后端（默认 127.0.0.1:19991）
python run.py

# 终端 2：启动前端开发服务器（端口 3000，API 代理到后端）
cd frontend && npm run dev
```

访问 http://127.0.0.1:3000

### 6. 开始使用

启动后有两种使用方式：

**方式一：故障诊断**
1. 在首页选择"问题诊断"
2. 输入问题描述、粘贴日志、选择相关模块
3. 点击提交，系统自动调用 Claude 分析
4. 实时查看分析过程和诊断结果

**方式二：构建知识库**
1. 在首页选择"知识库构建"
2. 从下拉列表中选择目标模块（列表来自 `code_repo_root` 目录扫描 + CSV 映射）
3. 点击提交，系统自动探索代码并生成知识文件
4. 构建完成后可在"知识库"页面查看和编辑

---

## 知识库管理

### 知识库文件结构

每个模块的知识库包含 8 个文件 + 1 个系统管理文件：

```
data/knowledge/{module_name}/
├── meta.json              ← 系统管理文件（不要手动创建）
├── overview.md            ← 模块概览
├── error_codes.json       ← 错误码映射表
├── api_chain.json         ← API 实现链路
├── common_issues.md       ← 常见问题模式
├── architecture.md        ← 架构总览（含 Mermaid 图）
├── call_chains.md         ← API 调用链流程（含 Mermaid 时序图）
├── api_reference.md       ← API 参考手册
└── troubleshooting.md     ← 故障排查指南
```

**双轨制**：前 4 个文件是结构化数据，供 problem-locator Agent 自动查询；后 4 个是 Wiki 文档，供人类开发者阅读。

### 新增知识库

有两种方式：

#### 方式一：AI 自动构建（推荐）

前提：模块在 `code_repo_root` 下有完整源码。

1. 在首页选择"知识库构建"
2. 选择目标模块
3. 系统自动探索代码，分 4 个阶段生成 8 个文件
4. 构建完成后状态为 `ai_native`（AI 生成，未审核）
5. 建议在知识库页面审核内容，确认后标记为 `confirmed`

#### 方式二：手动编写

前提：模块源码不全，或需要补充领域经验。

1. 在 `data/knowledge/` 下创建以模块名命名的目录（仅支持字母、数字、下划线、短横线）
2. 创建 8 个必须文件（参考 `docs/templates/knowledge-contribution-guide.md` 获取详细模板）
3. 通过知识库页面查看效果
4. 状态标记为 `edited`，审核无误后标记为 `confirmed`
5. 或直接通过前端知识库页面上传md文档

**注意事项**：
- 不要创建 `meta.json`，该文件由系统自动管理
- `error_codes.json` 和 `api_chain.json` 必须是合法 JSON 数组
- `architecture.md` 必须包含 Mermaid `flowchart` 图
- `call_chains.md` 必须包含 Mermaid `sequenceDiagram` 图
- agent 运行期间知识文件会被锁定，无法编辑

### 知识库状态流转

```
ai_native（AI 生成） → edited（手动编辑） → confirmed（审核确认）
```

| 状态 | 含义 |
|------|------|
| `ai_native` | 通过 AI 自动构建的原始文件，未经人工审核 |
| `edited` | 开发者手动编辑或修改过的文件 |
| `confirmed` | 开发者审核确认内容准确 |

---

## 自定义 Skill

### problem-locator（故障定位）

分析故障日志的工作流程：
1. 解析日志格式（支持 HiviewDFX AppFreeze、CPP_CRASH、hilog）
2. 查询知识库匹配已知模式（优先查询 `error_codes.json` 和 `api_chain.json`）
3. 必要时探索代码仓库获取上下文
4. 输出根因候选、证据链和修复建议

参考文件：`.claude/skills/problem-locator/references/`
- `log_patterns.md` — 日志格式解析模式
- `module_mapping.md` — 模块映射表（错误码前缀、域名、库名等 6 种映射）
- `component_mapping.md` — CSV 映射使用说明

### knowledge-builder（知识库构建）

探索模块代码并分 4 个阶段生成 8 个知识文件：

| 阶段 | 执行者 | 产出 |
|------|--------|------|
| Phase 1：模块扫描 | 主 Agent | 扫描摘要（不写入文件） |
| Phase 2：结构化数据 | 数据子 Agent | `overview.md`、`error_codes.json`、`api_chain.json`、`common_issues.md` |
| Phase 2.5：质量检查 | 质量检查子 Agent | 验证 JSON 结构（不写入文件） |
| Phase 3：Wiki 文档 | Wiki 子 Agent | `architecture.md`、`call_chains.md`、`api_reference.md`、`troubleshooting.md` |
| Phase 4：校验发布 | 校验子 Agent | 原子重命名（`.tmp/` → 正式目录） |

参考文件：`.claude/skills/knowledge-builder/references/mapping_patterns.md`

---

## 任务状态机

```
created → running → succeeded
                 → failed
                 → timeout
                 → cancelled
```

| 状态 | 说明 |
|------|------|
| `created` | 任务已创建，等待执行 |
| `running` | Claude CLI 正在执行分析 |
| `succeeded` | 分析完成，结果已写入 |
| `failed` | 执行失败 |
| `timeout` | 执行超时（默认 3600 秒） |
| `cancelled` | 用户手动取消 |

所有终态任务均可重试。系统同时只能运行一个任务（`max_concurrent_tasks: 1`）。

---

## API 概览

### 任务 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/tasks` | 创建任务 |
| GET | `/api/tasks` | 获取任务列表 |
| GET | `/api/tasks/{id}` | 获取任务详情 |
| POST | `/api/tasks/{id}/start` | 启动任务（SSE 流式返回） |
| POST | `/api/tasks/{id}/cancel` | 取消运行中的任务 |
| POST | `/api/tasks/{id}/retry` | 重试终态任务 |
| GET | `/api/tasks/modules/list` | 获取可用模块列表 |

### 知识库 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/knowledge` | 获取知识库模块列表 |
| GET | `/api/knowledge/{module}` | 获取模块详情（元数据 + 文件列表） |
| GET | `/api/knowledge/{module}/files/{filename}` | 读取文件内容 |
| PUT | `/api/knowledge/{module}/files/{filename}` | 编辑文件（agent 运行时返回 409） |
| PUT | `/api/knowledge/{module}/status` | 更新状态标签 |
| POST | `/api/knowledge/{module}/files` | 上传文件 |
| POST | `/api/knowledge/{module}/files/text` | 创建文本文件 |

---

## 开发

```bash
# 前端开发服务器（热更新）
cd frontend && npm run dev

# 前端构建
cd frontend && npm run build

# 前端 lint
cd frontend && npm run lint
```

### 前置要求

- Python 3.11+
- Node.js 18+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) 已安装并登录

### 项目没有 requirements.txt

Python 依赖需手动安装：`pip install fastapi uvicorn pydantic python-mutipart`

---

## 许可证

私有项目，未经授权不得使用。
