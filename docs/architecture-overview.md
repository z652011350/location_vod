# Location VOD 项目架构总览

> HarmonyOS 开发者问题辅助诊断平台

## 1. 系统全景架构

```mermaid
graph TB
    subgraph USER["👤 用户层"]
        Browser["浏览器<br/>Chrome / Edge"]
    end

    subgraph FRONTEND["🖥️ 前端 (React 19 + Vite 8)"]
        HomePage["首页<br/>问题提交表单"]
        TaskDetail["任务详情<br/>SSE 实时流 + 诊断结果"]
        KnowledgePage["知识库管理<br/>模块列表 + 文件编辑"]
        MermaidBlock["Mermaid 渲染器"]
        FileViewer["文件查看/编辑器"]
    end

    subgraph API["🔌 API 层 (FastAPI)"]
        TaskAPI["/api/tasks/*<br/>任务 CRUD + SSE 流"]
        KnowledgeAPI["/api/knowledge/*<br/>知识库读取/编辑"]
    end

    subgraph MANAGER["⚙️ Manager 层"]
        TaskMgr["TaskManager<br/>任务生命周期编排"]
        WorkspaceMgr["WorkspaceManager<br/>任务目录创建"]
    end

    subgraph STORE["💾 Store 层 (JSON 文件持久化)"]
        TaskStore["TaskStore<br/>task.json"]
        EventStore["EventStore<br/>events.jsonl"]
        ResultStore["ResultStore<br/>final_result.json"]
        KnowledgeStore["KnowledgeStore<br/>meta.json + 知识文件"]
    end

    subgraph AGENT["🤖 Agent 层"]
        ClaudeExecutor["ClaudeExecutor<br/>CLI 子进程封装"]
        SkillPL["Skill: problem-locator<br/>问题定位"]
        SkillKB["Skill: knowledge-builder<br/>知识库构建"]
    end

    subgraph EXTERNAL["📁 外部仓库"]
        CodeRepo["鸿蒙代码仓<br/>code_repo_root"]
        DocsRepo["文档仓<br/>docs_repo_root"]
        SDKRepo["API 声明仓<br/>sdk_repo_root"]
    end

    Browser -->|"HTTP / SSE"| HomePage & TaskDetail & KnowledgePage
    HomePage & TaskDetail & KnowledgePage -->|"fetch / EventSource"| API
    API --> MANAGER
    MANAGER --> STORE
    MANAGER --> AGENT
    ClaudeExecutor -->|"claude -p prompt"| SkillPL & SkillKB
    SkillPL -->|"读取知识"| STORE
    SkillPL -->|"搜索代码"| EXTERNAL
    SkillKB -->|"生成文件"| STORE
    SkillKB -->|"探索代码"| EXTERNAL
```

## 2. 数据流架构

```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端(React)
    participant API as API层(FastAPI)
    participant M as Manager层
    participant S as Store层
    participant E as ClaudeExecutor

    U->>F: 提交问题/选择模块
    F->>API: POST /api/tasks
    API->>M: create_task()
    M->>S: 写入 task.json
    M-->>API: 返回 task_id
    API-->>F: 201 {task_id}
    F->>F: 跳转到 /tasks/{id}

    F->>API: GET /api/tasks/{id}/stream (SSE)
    API->>M: start_task()
    M->>S: 更新 status=running
    M->>E: run_with_timeout()

    loop Claude CLI 逐行输出
        E-->>S: append_event(cli_output)
        S-->>API: 新事件就绪
        API-->>F: SSE: event data
        F->>F: 实时追加到终端视图
    end

    E-->>M: CLI 完成
    M->>S: 写入 final_result.json
    M->>S: 更新 status=succeeded
    API-->>F: SSE: event done
    F->>API: GET /api/tasks/{id}/result
    API-->>F: 结构化诊断结果
    F->>F: 渲染根因候选 + 修复建议
```

## 3. 任务状态机

```mermaid
stateDiagram-v2
    [*] --> created: 创建任务
    created --> running: start_task()
    running --> succeeded: CLI 正常完成
    running --> failed: CLI 异常退出
    running --> timeout: 超过 3600s
    running --> cancelled: 用户中止

    failed --> created: retry_task()
    timeout --> created: retry_task()
    cancelled --> created: retry_task()
    succeeded --> [*]
    failed --> [*]
    timeout --> [*]
    cancelled --> [*]
```

## 4. Skill 设计规范

### 4.1 Skill 架构模式

```mermaid
graph LR
    subgraph "Skill 定义结构"
        SKILL_MD["SKILL.md<br/>━━━━━━━━━━━━<br/>frontmatter: name + description<br/>参数表<br/>执行阶段<br/>输出格式<br/>参考资源"]
        REFS["references/<br/>━━━━━━━━━━━━<br/>领域知识参考文件<br/>(log_patterns.md<br/>mapping_patterns.md)"]
    end

    subgraph "Skill 执行生命周期"
        P1["构建 Prompt<br/>参数注入"]
        P2["Claude CLI 执行<br/>claude -p {prompt}<br/>--allowedTools ..."]
        P3["逐行输出解析<br/>stdout → events"]
        P4["结果提取<br/>_parse_result()"]
    end

    SKILL_MD --> P1
    REFS --> P1
    P1 --> P2 --> P3 --> P4
```

### 4.2 Skill 规范标准

```mermaid
graph TD
    subgraph "📐 Skill 设计标准"
        direction TB

        S1["1️⃣ SKILL.md 定义"]
        S2["2️⃣ 参数声明"]
        S3["3️⃣ 分阶段执行"]
        S4["4️⃣ 结构化输出"]
        S5["5️⃣ 参考资源"]

        S1 --> S2 --> S3 --> S4 --> S5
    end

    subgraph "S1: SKILL.md 结构"
        FM["frontmatter<br/>name: skill-name<br/>description: 一行描述"]
        PARAMS["## 参数<br/>参数名 | 必填 | 说明"]
        PHASES["## 执行阶段<br/>阶段 1 → 2 → 3..."]
        OUTPUT["## 输出格式<br/>JSON Schema"]
        REFS_SEC["## 参考资源<br/>references/*.md"]
    end

    subgraph "S3: 阶段设计原则"
        R1["✅ 每阶段有明确输入/输出"]
        R2["✅ 条件执行（信息不足时才深入）"]
        R3["✅ 子 Agent 调度（大规模任务拆分）"]
        R4["✅ 质量校验（结构化数据验证）"]
        R5["✅ 原子操作（临时目录 + 重命名）"]
    end

    S1 --> FM & PARAMS & PHASES & OUTPUT & REFS_SEC
    S3 --> R1 & R2 & R3 & R4 & R5
```

### 4.3 现有 Skill 对照

| 维度 | problem-locator | knowledge-builder |
|------|----------------|-------------------|
| **触发方式** | `/problem-locator` | `/knowledge-builder` |
| **消费者** | Agent（自动查询） | 人类 + Agent |
| **阶段数** | 5（日志解析→知识查询→代码探索→根因分析→修复建议） | 4 + 2.5（扫描→数据生成→质量检查→Wiki生成→校验） |
| **子 Agent** | 无（单 Agent 完成） | 4 个子 Agent 协作 |
| **输出** | 1 个 JSON 文件 | 8 个文件（4 结构化 + 4 Wiki） |
| **安全策略** | 只读（搜索代码和知识库） | 临时目录 + 原子重命名 |
| **参考文件** | log_patterns.md | mapping_patterns.md |

## 5. 知识库构建规范（供各领域开发者使用）

### 5.1 知识库构建 Pipeline

```mermaid
graph TD
    subgraph "Phase 1: 模块扫描"
        SCAN["扫描 code_repo_root/{module}/<br/>识别 NAPI / Framework / 实现层"]
        DTS["搜索 sdk_repo_root/<br/>.d.ts API 声明"]
        SUMMARY["生成扫描摘要"]
        SCAN --> DTS --> SUMMARY
    end

    subgraph "Phase 2: 结构化数据生成"
        P2A["overview.md<br/>模块概览"]
        P2B["error_codes.json<br/>错误码映射表"]
        P2C["api_chain.json<br/>API 实现链路"]
        P2D["common_issues.md<br/>常见问题模式"]
    end

    subgraph "Phase 2.5: 质量检查"
        QC["验证 JSON 结构<br/>必要字段完整性"]
    end

    subgraph "Phase 3: Wiki 文档生成"
        P3A["architecture.md<br/>架构总览 + Mermaid flowchart"]
        P3B["call_chains.md<br/>API 调用链 + Mermaid sequence"]
        P3C["api_reference.md<br/>API 参考手册"]
        P3D["troubleshooting.md<br/>故障排查指南"]
    end

    subgraph "Phase 4: 校验与发布"
        V["8 文件完整性校验"]
        RENAME["原子重命名<br/>.tmp → 正式目录"]
        BAK["旧目录 → .bak"]
    end

    SUMMARY --> P2A & P2B & P2C & P2D
    P2A & P2B & P2C & P2D --> QC
    QC -->|"通过"| P3A & P3B & P3C & P3D
    QC -->|"失败 → 重试 Phase 2"| P2A
    P3A & P3B & P3C & P3D --> V
    V -->|"通过"| RENAME
    RENAME --> BAK
    V -->|"失败"| FAIL["保留旧目录<br/>报告失败原因"]
```

### 5.2 知识文件规范（双轨制）

```mermaid
graph LR
    subgraph "🤖 机器消费（结构化数据）"
        O["overview.md<br/>━━━━━━━━<br/>模块职责<br/>目录结构<br/>核心文件"]
        EC["error_codes.json<br/>━━━━━━━━<br/>code<br/>message<br/>source_file<br/>description"]
        AC["api_chain.json<br/>━━━━━━━━<br/>api_name<br/>d_ts_file<br/>napi_func<br/>impl_file"]
        CI["common_issues.md<br/>━━━━━━━━<br/>权限问题<br/>参数问题<br/>已知模式"]
    end

    subgraph "👤 人类阅读（Wiki 文档）"
        ARCH["architecture.md<br/>━━━━━━━━<br/>组件层次<br/>依赖关系<br/>Mermaid flowchart"]
        CC["call_chains.md<br/>━━━━━━━━<br/>完整调用路径<br/>参数传递<br/>Mermaid sequence"]
        AR["api_reference.md<br/>━━━━━━━━<br/>接口参数<br/>权限要求<br/>错误码详情"]
        TS["troubleshooting.md<br/>━━━━━━━━<br/>错误场景<br/>排查思路<br/>修复方案"]
    end

    O -->|"problem-locator<br/>优先查询"| DIAG["🔍 诊断引擎"]
    EC -->|"精确匹配"| DIAG
    AC -->|"精确匹配"| DIAG
    CI -->|"模式匹配"| DIAG

    ARCH -->|"深入理解"| DEV["👨‍💻 开发者"]
    CC -->|"调用流程"| DEV
    AR -->|"接口文档"| DEV
    TS -->|"排查指南"| DEV
```

### 5.3 跨领域知识库构建指南

各开发领域的贡献者需按照以下规范编写知识库文件：

#### 目录结构

```
data/knowledge/{module_name}/
├── meta.json              ← 系统管理，不要手动创建
├── overview.md            ← 模块概览（必须）
├── error_codes.json       ← 错误码映射（必须）
├── api_chain.json         ← API 实现链路（必须）
├── common_issues.md       ← 常见问题（必须）
├── architecture.md        ← 架构总览（必须，含 Mermaid）
├── call_chains.md         ← 调用链路（必须，含 Mermaid）
├── api_reference.md       ← API 参考（必须）
└── troubleshooting.md     ← 排查指南（必须）
```

#### JSON 文件 Schema

**error_codes.json**
```json
[
  {
    "code": "string (必填)",
    "message": "string (必填)",
    "source_file": "string (必填，源文件路径)",
    "description": "string (必填，错误含义说明)"
  }
]
```

**api_chain.json**
```json
[
  {
    "api_name": "string (必填，完整 API 路径)",
    "d_ts_file": "string (.d.ts 声明文件路径)",
    "napi_func": "string (NAPI 桥接函数名)",
    "impl_file": "string (必填，实现文件路径)"
  }
]
```

#### Markdown 文件规范

**overview.md**
```markdown
# {module_name}

## 模块职责
{一段话描述模块核心功能}

## 目录结构
{简化的目录树，限 3 层深度}

## 核心文件
- `path/to/key_file` — {用途说明}
```

**architecture.md** — 必须包含 `flowchart` Mermaid 图表

**call_chains.md** — 必须包含 `sequenceDiagram` Mermaid 图表

#### 状态流转

```mermaid
stateDiagram-v2
    [*] --> ai_native: AI 自动生成
    ai_native --> edited: 开发者手动编辑
    ai_native --> confirmed: 开发者审核确认
    edited --> confirmed: 审核确认
    confirmed --> edited: 再次编辑
```

## 6. Skill 模板与贡献指南

### 6.1 模板文件结构

```
docs/templates/
├── skill-template.md                ← SKILL.md 编写模板
├── knowledge-contribution-guide.md  ← 知识库贡献指南（面向开发者）
└── skill-skeleton/                  ← 可直接复制的 Skill 目录骨架
    ├── SKILL.md                     ← Skill 定义文件模板
    └── references/
        └── domain-patterns.md       ← 领域知识参考文件模板
```

### 6.2 创建新 Skill 的流程

```mermaid
graph LR
    A["复制 skill-skeleton/<br/>到 .claude/skills/{name}/"] --> B["编辑 SKILL.md<br/>填充参数和阶段"]
    B --> C["编写 references/<br/>领域知识参考"]
    C --> D["在 config.yaml 中<br/>注册（如需要）"]
    D --> E["测试验证<br/>通过 /{name} 触发"]
```

### 6.3 贡献知识库的流程

```mermaid
graph LR
    A["选择方式"] --> B["AI 自动构建"]
    A --> C["手动编写"]
    B --> D["选择模块<br/>运行 knowledge-builder"]
    C --> E["阅读 contribution-guide.md<br/>创建 8 个文件"]
    D --> F["审核 AI 产出<br/>标记 confirmed"]
    E --> G["通过知识库页面<br/>查看和编辑"]
```

## 7. 系统约束

```mermaid
graph TD
    C1["⛔ 单并发任务<br/>max_concurrent_tasks: 1"]
    C2["📁 无数据库<br/>JSON/JSONL/Markdown 文件存储"]
    C3["🔗 SSE 解耦<br/>执行逻辑不依赖 SSE 连接"]
    C4["🔒 编辑锁<br/>agent 运行时禁止编辑知识文件"]
    C5["🛡️ 路径安全<br/>正则校验防止路径遍历"]
    C6["⏱️ 超时保护<br/>task_timeout: 3600s"]
```
