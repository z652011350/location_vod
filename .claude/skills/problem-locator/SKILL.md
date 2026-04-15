---
name: problem-locator
description: "定位鸿蒙开发者问题。当开发者提交故障日志、错误码或异常描述时使用。"
---

# 问题定位 Skill

帮助鸿蒙开发者诊断问题的 Agent Skill。接收问题描述和故障日志，通过分阶段分析输出结构化诊断结果。

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

## 执行阶段

按顺序执行以下阶段，每个阶段输出中间产物。

### 阶段 1：日志解析

从故障日志中提取关键线索：

1. **错误码**：如 201（权限拒绝）、401（参数错误）等
2. **系统事件名**：如 THREAD_BLOCK_6S、CPP_CRASH 等
3. **DOMAIN 标识**：如 AAFWK、AAFWK、WINDOW_MANAGER 等
4. **调用栈信息**：提取关键函数名、库名、文件路径
5. **模块标签**：从日志 tag 中识别涉及的模块（如 XCollie、AppDfr、Recovery 等）
6. **进程信息**：PID、UID、包名、进程名

输出：将提取的线索以结构化 JSON 格式记录。

### 阶段 2：知识库查询

在 `knowledge_root` 目录下搜索与线索匹配的知识文件。

**知识库文件用途和查询优先级**：

- **`error_codes.json`** — 错误码映射表（**诊断优先查询**）。按错误码精确匹配，获取错误含义和源文件位置
- **`api_chain.json`** — API 实现链路（**诊断优先查询**）。按 API 名匹配，追踪 NAPI 桥接到实现的完整链路
- **`overview.md`** — 模块概览（精简参考）。了解模块职责和核心文件
- **`common_issues.md`** — 常见问题模式（精简参考）。快速匹配已知问题模式
- **`architecture.md`** — 架构总览（人类阅读文档）。需要深入理解模块架构时参考
- **`call_chains.md`** — API 调用链流程（人类阅读文档）。需要理解 API 完整调用流程时参考
- **`api_reference.md`** — API 参考手册（人类阅读文档）。需要查看接口参数、权限、错误码详情时参考
- **`troubleshooting.md`** — 故障排查指南（人类阅读文档）。需要详细排查步骤和典型修复方案时参考

**查询策略**：诊断时优先查询 `error_codes.json` 和 `api_chain.json`（结构化数据，精确匹配），其次查询 `overview.md` 和 `common_issues.md`（精简参考）。Wiki 文档（architecture.md、call_chains.md、api_reference.md、troubleshooting.md）作为补充参考，不作为主要诊断数据源。

**搜索方式**：
1. 按错误码搜索（优先查 `error_codes.json`）
2. 按 API 名搜索（优先查 `api_chain.json`）
3. 按模块名搜索
4. 按错误事件名搜索

若知识库中找到相关信息，记录匹配结果。

### 阶段 3：代码探索（条件执行）

**仅在知识库信息不足以给出诊断时执行。**

根据阶段 1 提取的线索，在 `code_repo_root` 中搜索相关实现：

1. 根据 DOMAIN 标识定位子系统目录（如 AAFWK → ability_ability_runtime 或 ability_ability_base）
2. 根据调用栈中的库名/函数名搜索源文件
3. 根据错误码搜索错误处理逻辑
4. 搜索相关 .d.ts API 声明文件（在 `sdk_repo_root` 中）

### 阶段 4：根因分析

综合以上阶段收集的证据，输出根因候选列表：

1. 列出每个可能的根因
2. 附上支持证据（知识库条目或代码位置）
3. 按相关性排序

### 阶段 5：修复建议

针对每个根因候选给出具体修复步骤：

1. 需要修改的代码位置（文件路径 + 函数/行号）
2. 修改建议
3. 相关文档参考

## 输出格式

最终输出一个 JSON 结构到任务工作目录的 `output/final_result.json`：

```json
{
  "summary": "问题摘要（一句话）",
  "clues": {
    "error_codes": [],
    "event_names": [],
    "domains": [],
    "call_stack_highlights": [],
    "modules": []
  },
  "knowledge_matches": [],
  "root_cause_candidates": [
    {
      "rank": 1,
      "description": "根因描述",
      "evidence": ["证据1", "证据2"],
      "evidence_sources": [
        {"type": "knowledge_base", "path": "..."},
        {"type": "code", "path": "..."}
      ]
    }
  ],
  "fix_suggestions": [
    {
      "for_candidate": 1,
      "steps": ["步骤1", "步骤2"],
      "references": ["参考链接或文件"]
    }
  ]
}
```

## 故障日志模式参考

常见故障日志格式见 `references/log_patterns.md`。
