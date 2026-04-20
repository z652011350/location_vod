---
name: problem-locator
description: "定位鸿蒙开发者问题。当开发者提交故障日志、错误码或异常描述时使用。"
---

# 问题定位 Skill

帮助鸿蒙开发者诊断问题的 Agent Skill。接收问题描述和故障日志，通过两阶段分级诊断（分诊 → 深潜）输出结构化诊断结果。

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `problem_description` | 是 | 开发者对问题的文字描述 |
| `log_content` | 否 | 故障日志原文（hilog、HiviewDFX crash/freeze 等） |
| `code_snippet` | 否 | 相关代码片段 |
| `code_repo_root` | 是 | 鸿蒙代码仓根目录 |
| `docs_repo_root` | 是 | 文档仓根目录 |
| `sdk_repo_root` | 是 | API 声明仓根目录 |
| `knowledge_root` | 是 | 知识库目录 |

## 参考文件

- 日志解析模式参考：`references/log_patterns.md`
- 模块映射表参考：`references/module_mapping.md`
- 组件路径映射表：`references/component_mapping.md`（闭源代码仓路径映射，CSV 格式，可选。实际映射数据在项目根目录 `config/component_mapping.csv` 中维护，部署时按需更新）

## 执行阶段

按顺序执行以下阶段。**阶段 3 仅在阶段 2 置信度不足时执行。**

### 阶段 1：线索提取与模块识别

**目标：** 从输入中提取所有可用线索，识别涉及的模块。

1. **解析输入**：根据输入类型采用不同解析策略：
   - 若有 `log_content`：按 `references/log_patterns.md` 中定义的格式解析，提取错误码、事件名、DOMAIN、调用栈（含 .so 库名）、hilog domain_id
   - 若仅有 `problem_description`：提取错误码数字、API 名称、功能关键词、错误现象描述
   - 若有 `code_snippet`：提取涉及的 API 调用和错误处理逻辑

2. **模块识别**：读取 `references/module_mapping.md`，用提取的线索匹配模块：
   - 按错误码前缀匹配（如 6600xxx → multimedia_av_session）
   - 按 DOMAIN 标识匹配（如 AAFWK → ability 相关）
   - 按 .so 库名匹配（如 libavsession.so → multimedia_av_session）
   - 按 API 名称前缀匹配（如 avsession.create* → multimedia_av_session）
   - 按 hilog domain_id 匹配

3. **线索汇总**：将所有提取的线索以结构化格式记录：
   ```
   clues = {
     error_codes: [],       // 提取到的错误码
     event_names: [],       // 系统事件名
     domains: [],           // DOMAIN 标识
     call_stack_highlights: [], // 关键调用栈帧
     so_libraries: [],      // .so 库名
     modules: [],           // 识别到的模块名
     api_names: [],         // API 名称
     hilog_domain_ids: [],  // hilog domain_id
   }
   ```

4. **模块识别失败处理**：若所有线索均无法匹配到已知模块，标注 `module_identified = "未识别"`，保留所有线索用于后续阶段。

### 阶段 2：分诊查询

**目标：** 快速查询知识库和文档仓，评估是否可以直接给出诊断。

#### 2.1 知识库查询

若阶段 1 识别到了模块，检查 `knowledge_root/{module_name}/` 是否存在：

1. **错误码精确匹配**：读取 `error_codes.json`，按提取到的错误码查找匹配项
2. **API 调用链匹配**：读取 `api_chain.json`，按提取到的 API 名称查找调用链
3. **常见问题匹配**：读取 `common_issues.md`，搜索与问题现象匹配的模式
4. **额外知识文件搜索**：使用 Glob 列出 `knowledge_root/{module_name}/` 下所有文件（排除 `meta.json`），对非标准文件（非 `error_codes.json`、`api_chain.json`、`common_issues.md`、`overview.md`、`architecture.md`、`call_chains.md`、`api_reference.md`、`troubleshooting.md`）执行全文关键词搜索，匹配问题中的关键术语

若知识库中找到匹配，记录匹配内容和来源文件。

#### 2.2 文档仓查询

查询官方文档获取错误码说明和排查指南：

1. **映射表定位**：若 `references/module_mapping.md` 中有该模块的 errorcode 文件路径映射，直接读取该文件
2. **Grep 搜索兜底**：若无映射或映射未命中，在 `docs_repo_root/zh-cn/application-dev/reference/` 下 Grep 搜索提取到的错误码数字，定位对应的 errorcode 文档
3. **开发指南查询**：若映射表中有开发指南目录路径，读取相关 API 使用指南

#### 2.3 置信度评估

根据查询结果评估诊断置信度：

**高置信度（直接跳到阶段 4 输出结果）：**
- 找到了模块特定的错误码精确匹配（如 6600101 对应 av_session），**且** 知识库或文档提供了充分的排查信息和处理步骤
- 通用错误码（201/202/401）+ 明确的模块上下文 + 知识库/文档有充分信息

**低置信度（进入阶段 3 深潜分析）：**
- 仅有通用错误码（201/202/401），无模块特定信息
- 知识库和文档均未提供足够的排查信息
- 模块未识别，无法精准定位
- 仅有模糊的问题描述，无明确的错误码或调用栈

**如果置信度为高，直接跳到阶段 4 输出结果。**

### 阶段 3：深潜分析（仅低置信度时执行）

**目标：** 深入分析代码实现、文档指南，构建完整的证据链。

#### 3.1 API 链路追踪（条件执行）

**仅当模块有知识库时执行。** 读取 `api_chain.json`，按调用栈中的 C++ 函数名反向追踪：
- 从调用栈提取 C++ 函数名/符号名
- 在 api_chain.json 中查找包含该函数的调用链条
- 追踪 JS API → NAPI 桥接函数 → C++ 实现函数的完整路径

**无知识库的模块跳过此步骤，直接进入 3.2。**

#### 3.2 代码仓搜索

在 `code_repo_root` 中搜索相关实现代码：

1. **范围限定**：
   - 若模块已识别，先检查 `references/component_mapping.csv` 是否存在
   - 若 CSV 存在且包含该模块名（`component_name` 列），搜索范围为 `{code_repo_root}/{component_path}`（去掉前导 `/`）
   - 若 CSV 不存在或模块不在映射表中，回退到 `{code_repo_root}/{module_dir}/` 下搜索
   - 若未识别模块，根据 DOMAIN 和 .so 库名推测可能的目录
2. **搜索策略**（最多读取 10 个源文件）：
   - Grep 提取到的错误码数字，定位错误处理逻辑
   - Grep 调用栈中的函数名，定位实际实现
   - 搜索错误头文件（`*_errors.h`、`*_error_code.h`）获取错误码定义
3. **SDK 声明查询**：在 `sdk_repo_root` 中搜索相关 `.d.ts` 文件，确认 API 参数、返回值、权限要求

#### 3.3 文档深度查询

1. **开发指南**：通过 `references/module_mapping.md` 定位开发指南目录，搜索 API 使用指南和最佳实践
2. **FAQ 查询**：搜索 `docs_repo_root/zh-cn/application-dev/faqs/` 下的常见问题文档
3. **变更日志**：若有版本相关线索，搜索 release-notes

#### 3.4 证据交叉验证

综合以上所有信息源的结果：
1. 对比知识库匹配、文档参考、代码分析的结果
2. **当不同来源的信息矛盾时，以代码仓实际实现为准**
3. 为每个根因候选构建证据链，标注证据来源
4. 按证据充分程度排序根因候选

### 阶段 4：结果输出

**目标：** 构建结构化 JSON 结果并写入文件。

通过 Write 工具将以下 JSON 写入任务工作目录的 `output/final_result.json`：

```json
{
  "summary": "一句话问题摘要",
  "diagnostic_depth": "triage 或 deep_dive",
  "module_identified": "模块名或'未识别'",
  "clues": {
    "error_codes": [],
    "event_names": [],
    "domains": [],
    "call_stack_highlights": [],
    "so_libraries": [],
    "modules": [],
    "api_names": [],
    "hilog_domain_ids": []
  },
  "knowledge_matches": [
    {
      "source": "error_codes.json 或 api_chain.json 或 common_issues.md",
      "content": "匹配到的内容摘要"
    }
  ],
  "doc_references": [
    {
      "source": "errorcode文件 或 开发指南 或 FAQ",
      "path": "文件路径",
      "relevant_content": "相关内容摘要"
    }
  ],
  "root_cause_candidates": [
    {
      "rank": 1,
      "description": "根因描述",
      "diagnostic_confidence": "high 或 medium 或 low",
      "evidence": ["证据1", "证据2"],
      "evidence_sources": [
        {"type": "knowledge_base 或 documentation 或 code", "path": "文件路径"}
      ]
    }
  ],
  "fix_suggestions": [
    {
      "for_candidate": 1,
      "steps": ["具体修复步骤1", "具体修复步骤2"],
      "references": ["参考文档或代码文件路径"]
    }
  ]
}
```

**诊断置信度标准：**
- **high**：有明确的代码位置 + 错误处理逻辑 + 知识库/文档确认
- **medium**：有文档参考或知识库匹配，但缺少代码级确认
- **low**：仅基于推测或间接证据

**关键要求：**
- `diagnostic_depth` 必须准确反映实际执行路径（"triage" 或 "deep_dive"）
- `module_identified` 若阶段 1 未能识别模块，必须为 "未识别"
- 每个根因候选的 `evidence_sources` 必须标注来源类型
- 修复建议必须具体、可操作（给出文件路径和代码修改方向）
- JSON 必须是有效的单文件（不要输出多行 JSON 外的其他文本混合）
