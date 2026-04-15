---
name: knowledge-builder
description: "构建鸿蒙模块知识库。当需要探索指定模块的代码结构并生成双轨知识文件（4个结构化文件 + 4个Wiki文档）时使用。"
---

# 知识库构建 Skill

探索鸿蒙指定模块的代码结构，生成双轨知识文件：4 个结构化文件供 problem-locator Agent 查询，4 个 Wiki 文档供人类开发者阅读。

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `module_name` | 是 | 目标模块名（如 base_location、ability_ability_runtime） |
| `code_repo_root` | 是 | 鸿蒙代码仓根目录 |
| `docs_repo_root` | 是 | 文档仓根目录 |
| `sdk_repo_root` | 是 | API 声明仓根目录 |
| `knowledge_root` | 是 | 知识库输出根目录 |

## 产出文件

产出 8 个文件，全部写入 `knowledge_root/{module_name}/`：

**结构化数据文件（机器消费）**：
1. `overview.md` — 模块概览（精简）
2. `error_codes.json` — 错误码映射表
3. `api_chain.json` — API 实现链路
4. `common_issues.md` — 常见问题模式（精简）

**Wiki 文档（人类阅读）**：
5. `architecture.md` — 架构总览（含 Mermaid flowchart）
6. `call_chains.md` — API 调用链流程（含 Mermaid sequence diagram）
7. `api_reference.md` — API 参考手册
8. `troubleshooting.md` — 故障排查指南

**注意**：不生成 `meta.json`，该文件由后端系统统一管理。

## 执行阶段

### Phase 1：主 Agent 模块扫描

定位并扫描 `code_repo_root/{module_name}/` 目录：

1. 列出目录结构，识别关键层级：
   - **NAPI 桥接层**：搜索包含 `napi_`、`NAPI_` 的文件
   - **Framework 层**：搜索 `frameworks/` 或 `framework/` 目录
   - **实现层**：核心 C/C++ 源文件（`.cpp`、`.c`、`.h`）
2. 在 `sdk_repo_root` 中搜索该模块的 `.d.ts` API 声明文件
3. 识别模块的主要功能和职责（通过 README、BUILD.gn、bundle.json 等）
4. 记录目录树结构（限制深度为 3 层）
5. 生成扫描摘要（不写入文件，仅作为内部中间数据传递给子 Agent）

扫描完成后，按顺序调度以下子 Agent 执行。所有子 Agent 产出写入临时目录 `knowledge_root/{module_name}.tmp/`。

### Phase 2：数据子 Agent（结构化数据文件）

**输入**：主 Agent 的扫描摘要 + 模块路径参数

**行为**：深入分析模块代码，与原三阶段 Skill 的分析+生成逻辑一致

1. **错误码提取**
   - 搜索错误码定义：`ERR_`、`ERROR_`、错误码枚举、`.d.ts` 中的错误码
   - 记录格式：`{code, message, source_file, description}`

2. **API 实现链路**
   - 参考 `references/mapping_patterns.md` 中的 NAPI 映射模式
   - 追踪 API 声明 → NAPI 桥接函数 → 实现函数的调用链
   - 记录格式：`{api_name, d_ts_file, napi_func, impl_func, impl_file}`

3. **关键函数入口**
   - 识别模块的公开接口和核心内部函数
   - 特别关注错误处理、权限校验、参数校验相关代码

**产出**（写入临时目录）：

- **`overview.md`** — 模块概览
  ```markdown
  # {module_name}

  ## 模块职责
  {一段话描述}

  ## 目录结构
  {简化的目录树}

  ## 核心文件
  - `path/to/key_file` — {用途}
  ```

- **`error_codes.json`** — 错误码映射表
  ```json
  [
    {
      "code": "201",
      "message": "Permission denied",
      "source_file": "xxx/error_code.h",
      "description": "调用方缺少所需权限"
    }
  ]
  ```

- **`api_chain.json`** — API 实现链路
  ```json
  [
    {
      "api_name": "geoLocationManager.getCurrentLocation",
      "d_ts_file": "interface_sdk-js/api/@ohos.geoLocationManager.d.ts",
      "napi_func": "GeoLocationManagerGetCurrentLocation",
      "impl_file": "frameworks/location_gnss/gnss/src/geo_location_manager.cpp"
    }
  ]
  ```

- **`common_issues.md`** — 常见问题模式
  ```markdown
  # 常见问题

  ## 权限问题
  - 错误码 201：需要在 module.json5 中声明 ohos.permission.LOCATION 权限

  ## 参数问题
  - 错误码 401：...
  ```

### Phase 2.5：数据质量检查子 Agent

**输入**：临时目录中 Phase 2 产出的 `error_codes.json` 和 `api_chain.json`

**行为**：验证结构化数据质量

1. 读取 `error_codes.json`，验证：
   - 文件内容为非空 JSON 数组
   - 每条记录含必要字段：`code`、`message`、`source_file`
   - `code` 字段非空字符串
2. 读取 `api_chain.json`，验证：
   - 文件内容为非空 JSON 数组
   - 每条记录含必要字段：`api_name`、`impl_file`
   - `api_name` 字段非空字符串
3. 验证失败时，报告具体问题（哪些记录缺少哪些字段），由主 Agent 决定是否重试

**产出**：验证通过/失败报告（不写入文件，返回给主 Agent）

### Phase 3：Wiki 子 Agent（人类阅读文档）

**输入**：主 Agent 的扫描摘要 + Phase 2 产出的 `api_chain.json` 和 `error_codes.json`

**行为**：生成面向人类开发者的详尽文档

**源码溯源要求**：Wiki 文档中的技术断言需标注源文件路径（纯文本）。行号标注为 best-effort（尽力而为）。仅 Wiki 文档需要此要求，结构化数据文件不适用。

**产出**（写入同一临时目录）：

- **`architecture.md`** — 架构总览
  - 模块职责和边界
  - 组件层次和模块划分
  - 依赖关系（内部依赖和外部依赖）
  - **必须包含 Mermaid flowchart** 组件关系图
  - 示例结构：
    ```markdown
    # {module_name} 架构总览

    ## 模块职责
    {详尽描述}

    ## 组件层次
    {各组件说明，含源文件路径引用}

    ## 依赖关系
    ```mermaid
    flowchart TD
        A[JS API Layer] --> B[NAPI Bridge]
        B --> C[Framework Layer]
        C --> D[Core Implementation]
    ```
    ```

- **`call_chains.md`** — API 调用链流程
  - 从 JS API 声明到 NAPI 桥接到 C++ 实现的完整调用路径
  - 每个 API 一节，描述参数传递和返回值处理
  - **必须包含 Mermaid sequence diagram**
  - 示例结构：
    ```markdown
    # API 调用链流程

    ## geoLocationManager.getCurrentLocation

    ### 调用链路
    ```mermaid
    sequenceDiagram
        participant App as Application
        participant NAPI as NAPI Bridge
        participant FW as Framework
        participant Core as Core

        App->>NAPI: getCurrentLocation(request)
        NAPI->>FW: ProcessLocationRequest(request)
        FW->>Core: ExecuteLocationQuery(request)
        Core-->>FW: LocationResult
        FW-->>NAPI: LocationResult
        NAPI-->>App: Promise<Location>
    ```
    ```

- **`api_reference.md`** — API 参考手册
  - 模块暴露的所有公开接口
  - 每个接口含：参数说明、返回值类型、权限要求、错误码
  - 含源文件路径引用

- **`troubleshooting.md`** — 故障排查指南
  - 模块常见错误场景
  - 错误码含义和排查思路
  - 典型修复方案
  - 含源文件路径引用

### Phase 4：校验子 Agent

**输入**：临时目录中所有 8 个文件

**行为**：最终一致性校验

1. 检查 8 个文件全部存在且非空
2. JSON 文件内容结构验证（非空数组、含必要字段）
3. Markdown 文件非空白
4. Mermaid 图表代码块存在（`architecture.md` 应含 `flowchart`，`call_chains.md` 应含 `sequenceDiagram`）

**校验通过后**：
1. 若正式目录 `knowledge_root/{module_name}/` 存在，将其重命名为 `knowledge_root/{module_name}.bak/`（若 `.bak` 已存在则先删除旧的 `.bak`）
2. 将临时目录 `knowledge_root/{module_name}.tmp/` 重命名为正式目录 `knowledge_root/{module_name}/`

**校验失败**：
- 保留旧正式目录不变
- 报告具体失败原因

## 覆盖式重建策略

重新探索同一模块时，采用临时目录 + 原子重命名策略：

1. 所有子 Agent 写入临时子目录 `knowledge_root/{module_name}.tmp/`
2. 校验子 Agent 验证通过后执行原子重命名
3. 旧正式目录重命名为 `.bak` 保留
4. 下次重建时自动清理 `.bak` 目录
5. 失败时旧文件不受影响

## 子 Agent 调度说明

使用 Agent 工具调度子 Agent，每个子 Agent 接收明确的输入描述和输出要求：

1. **Phase 2 数据子 Agent** — 传入扫描摘要和模块路径，要求产出 4 个结构化文件
2. **Phase 2.5 质量检查子 Agent** — 传入临时目录路径，要求验证 JSON 结构质量
3. **Phase 3 Wiki 子 Agent** — 传入扫描摘要和 Phase 2 产出路径，要求产出 4 个 Wiki 文档
4. **Phase 4 校验子 Agent** — 传入临时目录路径，要求验证 8 个文件并执行重命名

若质量检查（Phase 2.5）发现严重问题，主 Agent 可决定重试 Phase 2（最多重试一次）。

## 参考资源

NAPI 映射模式见 `references/mapping_patterns.md`。
