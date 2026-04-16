---
name: {{SKILL_NAME}}
description: "{{一句话描述 Skill 的功能}}"
---

# {{Skill 标题}}

{{一段话描述 Skill 的核心能力和使用场景。}}

## 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `module_name` | 是 | 目标模块名 |
| `code_repo_root` | 是 | 代码仓库根目录 |
| `docs_repo_root` | 是 | 文档仓库根目录 |
| `sdk_repo_root` | 是 | API 声明仓库根目录 |
| `knowledge_root` | 是 | 知识库目录 |

## 执行阶段

### 阶段 1：信息收集

**输入**：用户提供的参数

**行为**：
1. 扫描目标模块的目录结构
2. 识别关键代码文件和配置
3. 提取模块核心信息

**产出**：扫描摘要（中间数据，不写入文件）

### 阶段 2：核心分析

**输入**：阶段 1 的扫描摘要

**行为**：
1. 深入分析模块代码
2. 提取关键数据（错误码、API 链路等）
3. 生成结构化数据文件

**产出**：结构化数据文件

### 阶段 3：文档生成

**输入**：阶段 1 摘要 + 阶段 2 结构化数据

**行为**：
1. 生成面向人类阅读的文档
2. 包含 Mermaid 图表
3. 标注源文件路径

**产出**：Wiki 文档

### 阶段 4：质量校验

**输入**：所有产出文件

**行为**：
1. 检查文件完整性（所有必须文件存在且非空）
2. 验证 JSON 结构（合法数组、必要字段）
3. 验证 Mermaid 图表存在

**校验通过**：确认产出可用
**校验失败**：报告具体问题，由主 Agent 决定是否重试

## 输出格式

最终输出到 `knowledge_root/{module_name}/`：

| 文件 | 类型 | 用途 |
|------|------|------|
| `overview.md` | 结构化数据 | 模块概览 |
| `error_codes.json` | 结构化数据 | 错误码映射表 |
| `api_chain.json` | 结构化数据 | API 实现链路 |
| `common_issues.md` | 结构化数据 | 常见问题模式 |
| `architecture.md` | Wiki 文档 | 架构总览（含 Mermaid flowchart） |
| `call_chains.md` | Wiki 文档 | 调用链路（含 Mermaid sequenceDiagram） |
| `api_reference.md` | Wiki 文档 | API 参考手册 |
| `troubleshooting.md` | Wiki 文档 | 故障排查指南 |

## 参考资源

{{领域相关知识}}见 `references/{{reference_file}}.md`。
