---
title: "feat: Problem Locator V2 — Adaptive Diagnostic Pipeline"
type: feat
status: active
date: 2026-04-16
origin: docs/brainstorms/problem-locator-v2-requirements.md
---

# feat: Problem Locator V2 — Adaptive Diagnostic Pipeline

## Overview

重写 problem-locator skill，实现两阶段分级诊断（Triage → Deep Dive），集成知识库、文档仓和代码仓三级信息源，并修复后端结果解析机制。

## Problem Frame

HarmonyOS 开发者提交故障日志、错误码或异常描述后，当前 skill 采用线性流水线处理所有问题类型，导致简单问题浪费 token、复杂问题探索不足。官方文档仓（166 个错误码文档）未被利用，模块识别机制缺失，后端结果解析不可靠。（详见 origin: `docs/brainstorms/problem-locator-v2-requirements.md`）

## Requirements Trace

- R1. 两阶段分级策略（Triage → Deep Dive）
- R2. 三种问题类型覆盖（错误码驱动、崩溃/冻屏、API 异常）
- R3. 内置模块映射表（6 个子映射，按问题类型提供不同信号路径）
- R4. 日志解析（提取错误码、DOMAIN、调用栈含 .so 库名、API 名称、hilog domain_id）
- R5. 知识库查询（error_codes.json 精确匹配 → api_chain.json API 匹配 → common_issues.md 模式匹配）
- R6. 文档仓查询（映射表优先 + Grep 兜底）
- R7. 置信度评估与阶段路由（模块特定错误码 = 高置信度直接输出；通用错误码 = 低置信度进深潜）
- R8. API 链路追踪（仅对有知识库的模块有效）
- R9. 代码仓搜索（限定在识别的模块目录内）
- R10. 文档深度查询（开发指南 + FAQ）
- R11. 证据交叉验证（代码仓实际实现为准）
- R12. 结构化 JSON 输出 + 后端改为读取 final_result.json 文件
- R12a. 映射缺口可观测（未识别信号明确标注）
- R13. 证据来源标注

## Scope Boundaries

- 不修改前端代码（前端适配后续独立任务）
- 不实现知识库自动更新
- 不实现诊断流程实时干预
- 模块映射表手动维护
- API 链路追踪仅对有知识库的模块有效

## Context & Research

### Relevant Code and Patterns

- `.claude/skills/knowledge-builder/SKILL.md` — 多 Agent 编排模式参考（sub-agent dispatch、质量门控）
- `.claude/skills/problem-locator/references/log_patterns.md` — 现有日志格式参考，需增强
- `app/api/task_api.py:308-324` — `_parse_result()` 当前实现，需修复
- `app/store/result_store.py` — 已有 `read_result()` 可复用
- `data/knowledge/multimedia_av_session/` — 已有知识库模块，作为测试基准

### Key Architecture Constraint

Skill 以 markdown 指令形式运行在 `claude -p` 子进程中。Claude 按 SKILL.md 中的阶段指令顺序执行，可使用 Read/Grep/Glob/Agent 等工具。映射表和日志模式作为 reference 文件，Claude 按需 Read 加载。

## Key Technical Decisions

- **映射表格式使用 Markdown 而非 JSON**：Claude 可直接阅读 markdown 表格，无需额外解析。参考 knowledge-builder 的 mapping_patterns.md 模式
- **SKILL.md 中用条件指令实现两阶段分支**：通过 "如果置信度足够则直接跳到输出阶段" 的条件指令让 LLM 自行判断，而非程序化分支
- **后端 _parse_result 修改为文件优先读取**：优先读取 skill 通过 Write 工具写入的 `final_result.json`，stdout 解析作为 fallback
- **映射表初始数据覆盖 2 个已知模块**：av_session 和 player_framework 的完整子映射。其余模块的映射在后续知识库构建时逐步补充

## Open Questions

### Resolved During Planning

- 映射表格式：决定使用 Markdown 表格（Claude 原生可读）
- 后端读取策略：文件优先 + stdout fallback（R12 已明确）
- 新参数传递：无需新增参数，映射表作为 skill 内部 reference 文件

### Deferred to Implementation

- 映射表初始数据的具体内容：需扫描 code_repo_root 和 docs_repo_root 填充
- 根因候选的诊断置信度判定标准（高/中/低三档的具体规则）
- 代码仓搜索深度控制（单次最大文件数、Read 调用上限）

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Skill 执行流程

```
输入 → [阶段 1: 日志解析 + 模块识别]
           ↓
     [阶段 2: 分诊查询]
     ├─ 知识库 (error_codes → api_chain → common_issues)
     ├─ 文档仓 (映射表定位 or Grep 搜索)
     └─ 置信度评估
           ↓
     ┌─ 高置信度 ──→ [阶段 4: 输出结果]
     └─ 低置信度 ──→ [阶段 3: 深潜分析]
                      ├─ API 链路追踪 (api_chain 反向查找)
                      ├─ 代码仓搜索 (限定模块目录)
                      ├─ 文档深度查询 (开发指南 + FAQ)
                      └─ 证据交叉验证
                            ↓
                      [阶段 4: 输出结果]
```

### 后端结果读取流程

```
CLI 执行完成
  → 尝试 Read final_result.json from disk
  → 文件存在且为有效 JSON? → 使用文件内容作为 result
  → 文件不存在或无效? → _parse_result(stdout_lines) 作为 fallback
  → complete_task(task_id, result)
```

## Implementation Units

- [ ] **Unit 1: Module Mapping Reference Data**

**Goal:** 创建模块映射表 reference 文件，包含 2 个已知模块的完整子映射数据

**Requirements:** R3, R12a

**Dependencies:** None

**Files:**
- Create: `.claude/skills/problem-locator/references/module_mapping.md`

**Approach:**
- 扫描 code_repo_root 目录结构获取模块目录名列表
- 扫描 docs_repo_root 的 errorcode 文件获取 kit → errorcode 文件映射
- 扫描开发指南目录获取 module → guide directory 映射
- 构建 6 个子映射表格：
  1. 错误码前缀 → 模块名（如 6600xxx → multimedia_av_session, 5400xxx → multimedia_player_framework）
  2. DOMAIN → 代码仓目录（如 AAFWK → ability_ability_runtime）
  3. .so 库名 → 模块名（如 libavsession.so → multimedia_av_session）
  4. API 前缀 → 模块名（如 avsession.create* → multimedia_av_session）
  5. hilog domain_id → 模块名（如 01201 → 对应模块）
  6. 模块名 → 文档仓路径（errorcode 文件路径 + 开发指南目录路径）
- 对 2 个已有知识库的模块（av_session, player_framework）填充完整映射
- 对其他高频模块（如 ability、window、network 等）尽可能填充 DOMAIN 和错误码前缀映射
- 包含"未识别信号处理指引"段落：当信号不匹配任何条目时，标注模块未识别并记录可用线索

**Patterns to follow:**
- `.claude/skills/knowledge-builder/references/mapping_patterns.md` — NAPI 映射参考文件格式

**Test scenarios:**
- Test expectation: none — 参考数据文件，无行为逻辑。验证方式为人工检查映射准确性和覆盖度

**Verification:**
- 文件存在且包含所有 6 个子映射表格
- av_session 和 player_framework 的映射完整（每个子映射至少有这两个模块的条目）
- 包含未识别信号的处理指引

---

- [ ] **Unit 2: Log Patterns Reference Enhancement**

**Goal:** 增强 log_patterns.md，补充 .so 库名提取规则、hilog domain_id 模式、以及崩溃日志模块识别示例

**Requirements:** R4

**Dependencies:** None

**Files:**
- Modify: `.claude/skills/problem-locator/references/log_patterns.md`

**Approach:**
- 在 AppFreeze 和 CPP_CRASH 部分增加 .so 库名提取规则（从调用栈 `#00 pc <addr> <lib_path>` 中提取 lib_path）
- 增加 .so 库名到模块的常见映射示例（如 libavsession.so → AVSession, libplayer.so → Player）
- 在 hilog 部分增加 domain_id 提取规则和常见 domain_id 值的含义
- 增加混合日志场景的解析示例（同一问题包含 hilog + crash log 的情况）
- 增加输入仅有 problem_description（无日志）时的线索提取策略

**Patterns to follow:**
- 现有 `log_patterns.md` 的表格格式

**Test scenarios:**
- Test expectation: none — 参考文档，验证方式为人工审查覆盖度

**Verification:**
- 包含 .so 库名提取规则和映射示例
- 包含 hilog domain_id 提取规则
- 包含无日志仅有问题描述时的线索提取策略

---

- [ ] **Unit 3: SKILL.md Complete Rewrite**

**Goal:** 重写 problem-locator skill，实现两阶段分级诊断流水线

**Requirements:** R1, R2, R4-R13

**Dependencies:** Unit 1 (module_mapping.md), Unit 2 (log_patterns.md enhancement)

**Files:**
- Modify: `.claude/skills/problem-locator/SKILL.md`

**Approach:**
- 保持 YAML frontmatter 格式（name, description）
- 保持参数列表（与 `_build_prompt()` 传参对齐：problem_description, log_content, code_snippet, code_repo_root, docs_repo_root, sdk_repo_root, knowledge_root）
- 重写执行阶段为 4 个阶段：

**阶段 1：线索提取与模块识别**
- 解析输入（log_content / problem_description / code_snippet）
- 按 log_patterns.md 参考提取结构化线索
- 读取 module_mapping.md，用提取的线索匹配模块
- 若无法识别模块，标注"模块未识别"并保留所有线索

**阶段 2：分诊查询**
- 知识库查询：若模块已识别且有知识库 → error_codes.json → api_chain.json → common_issues.md
- 文档仓查询：若模块映射有 errorcode 路径 → 直接读取；否则 Grep 搜索错误码
- 置信度评估：
  - 模块特定错误码精确匹配 + 知识库/文档有充分信息 → 高置信度
  - 通用错误码(201/202/401)或信息不足 → 低置信度
  - 通用错误码 + 明确模块上下文 → 高置信度
- 高置信度 → 跳到阶段 4

**阶段 3：深潜分析（仅低置信度时执行）**
- API 链路追踪：若有知识库 → 按调用栈 C++ 函数名反向查 api_chain.json
- 代码仓搜索：在识别的模块目录内 Grep 调用栈函数名、Grep 错误处理逻辑
- 文档深度查询：映射表定位开发指南目录，搜索 API 使用指南；查 faqs/ 目录
- SDK 声明查询：在 sdk_repo_root 中搜索相关 .d.ts 文件，确认参数和权限要求
- 证据交叉验证：对比三个信息源的结果，矛盾时以代码仓为准

**阶段 4：结果输出**
- 构建结构化 JSON 结果
- 通过 Write 工具写入任务工作目录的 `output/final_result.json`
- 每个 root_cause_candidate 包含：rank, description, diagnostic_confidence (high/medium/low), evidence[], evidence_sources[]

**输出 JSON 格式定义：**
```
{
  "summary": "问题摘要",
  "diagnostic_depth": "triage" | "deep_dive",
  "module_identified": "模块名" | "未识别",
  "clues": {
    "error_codes": [], "event_names": [], "domains": [],
    "call_stack_highlights": [], "so_libraries": [], "modules": [],
    "api_names": [], "hilog_domain_ids": []
  },
  "knowledge_matches": [
    {"source": "error_codes.json|api_chain.json|common_issues.md", "content": "..."}
  ],
  "doc_references": [
    {"source": "errorcode文件|开发指南|FAQ", "path": "文件路径", "relevant_content": "..."}
  ],
  "root_cause_candidates": [
    {
      "rank": 1,
      "description": "根因描述",
      "diagnostic_confidence": "high|medium|low",
      "evidence": ["证据1", "证据2"],
      "evidence_sources": [
        {"type": "knowledge_base|documentation|code", "path": "文件路径"}
      ]
    }
  ],
  "fix_suggestions": [
    {"for_candidate": 1, "steps": ["步骤1"], "references": ["参考"]}
  ]
}
```

**关键指令设计原则：**
- 使用明确的条件指令："如果阶段 2 的置信度评估为高，直接跳到阶段 4 输出结果"
- 引用参考文件使用 backtick 路径：`references/module_mapping.md`, `references/log_patterns.md`
- 每个阶段结尾要求输出中间状态，便于调试
- 深潜阶段包含 token 预算控制："代码仓搜索限定在已识别的模块目录内，最多读取 10 个源文件"

**Patterns to follow:**
- `.claude/skills/knowledge-builder/SKILL.md` — 阶段划分、参考文件引用、输出格式定义

**Test scenarios:**
- Test expectation: none — Skill 是 markdown 指令文件。验证方式为用具体问题场景测试完整诊断流程（见 Unit 5）

**Verification:**
- SKILL.md 包含 4 个执行阶段
- 阶段 2 有明确的置信度评估逻辑和高/低置信度分支
- 输出格式包含 diagnostic_depth, module_identified, diagnostic_confidence 等新字段
- 正确引用 module_mapping.md 和 log_patterns.md

---

- [ ] **Unit 4: Backend _parse_result Fix**

**Goal:** 修改后端结果解析机制，优先读取 skill 写入的 `final_result.json` 文件

**Requirements:** R12

**Dependencies:** None (可与 Unit 3 并行)

**Files:**
- Modify: `app/api/task_api.py`

**Approach:**
- 在 `_execute_and_finalize()` 中，`run_with_timeout()` 返回后：
  1. 先尝试读取 `output/final_result.json`（使用 `result_store.read_result()` 或直接文件读取）
  2. 若文件存在且内容为有效 JSON dict → 直接用作 result
  3. 若文件不存在或内容无效 → 回退到 `_parse_result(lines)` 从 stdout 解析
- 在事件日志中记录结果来源（"file" 或 "stdout"），便于调试
- 保留 `_parse_result()` 函数作为 fallback，不做删除

**Patterns to follow:**
- `app/store/result_store.py` 的 `read_result()` 函数 — 已有文件读取实现
- 现有错误处理模式 — try/except + 事件记录

**Test scenarios:**
- **Happy path**: skill 成功写入 final_result.json → 后端直接读取，result 与文件内容一致
- **Happy path**: 诊断任务完成 → 调用 `GET /api/tasks/{id}/result` 返回正确的 JSON 结构
- **Fallback**: skill 未写入 final_result.json（如 CLI 崩溃）→ 后端回退到 stdout 解析，不抛异常
- **Fallback**: final_result.json 存在但不是有效 JSON → 后端回退到 stdout 解析
- **Edge case**: 知识库构建任务 → 同样受益于文件优先读取

**Verification:**
- 用已有任务数据测试：创建诊断任务，确认后端能正确读取结果
- 手动删除 final_result.json 测试 fallback 路径

---

- [ ] **Unit 5: End-to-End Verification**

**Goal:** 用真实场景验证完整的诊断流程

**Requirements:** 全部 (R1-R13)

**Dependencies:** Unit 1, 2, 3, 4 全部完成

**Files:**
- No new files — verification activity

**Approach:**
- 场景 1（Triage 高置信度）：提交 av_session 错误码 6600101，验证知识库直接匹配、不进入深潜
- 场景 2（Deep Dive）：提交一个不在知识库中的模块的崩溃日志，验证文档仓搜索和代码仓搜索被触发
- 场景 3（模块未识别）：提交仅有模糊问题描述的输入，验证输出中标注"模块未识别"
- 检查后端 `final_result.json` 正确生成，`GET /api/tasks/{id}/result` 返回新格式

**Test scenarios:**
- Test expectation: none — 端到端集成验证，不属于单元测试

**Verification:**
- 场景 1：结果中 `diagnostic_depth` = "triage"，`module_identified` = "multimedia_av_session"
- 场景 2：结果中 `diagnostic_depth` = "deep_dive"，包含 `doc_references` 和/或代码仓证据
- 场景 3：结果中 `module_identified` = "未识别"，仍给出排查方向

## System-Wide Impact

- **Interaction graph:** `_build_prompt()` 构造的参数格式不变（与前端 POST body 兼容）。`_parse_result()` 的修改对 SSE 流无影响（事件推送独立于结果解析）
- **Error propagation:** CLI 崩溃或超时时，`final_result.json` 不存在 → 回退到 stdout fallback → 仍可能得到 raw_output 结果
- **State lifecycle risks:** Skill 写入 `final_result.json` 后，后端 `complete_task()` 的 `write_result()` 会覆盖同一文件。但由于后端先读取再写入，内容应一致。若读取和写入之间文件被修改（极不可能），以后端写入的内容为准
- **API surface parity:** `GET /api/tasks/{id}/result` 返回的 JSON 结构从简单格式变为新的多字段格式。前端如果硬编码了旧格式字段名，可能需要适配
- **Unchanged invariants:** 知识库构建任务的流程不变。`_build_prompt()` 的参数传递不变。SSE 事件推送机制不变

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 映射表初始数据不完整，导致模块识别失败率过高 | R12a 要求未识别信号可观测；Grep 兜底机制确保即使无映射也能通过搜索定位文档 |
| Claude 不严格遵循 SKILL.md 中的条件分支指令（始终进入深潜） | 指令中用粗体和明确措辞标记条件；在输出格式中增加 `diagnostic_depth` 字段可事后审计 |
| 根因候选的诊断置信度判定标准未定义，Claude 自行判断不一致 | 定义高/中/低三档的指导性标准（高=有代码位置+错误处理逻辑，中=有文档参考，低=仅推测），实现阶段细化 |
| 新 JSON 输出格式与前端不兼容 | 前端适配作为后续独立任务；后端 `raw_output` fallback 保留 |

## Sources & References

- **Origin document:** `docs/brainstorms/problem-locator-v2-requirements.md`
- Current skill: `.claude/skills/problem-locator/SKILL.md`
- Knowledge-builder pattern: `.claude/skills/knowledge-builder/SKILL.md`
- Backend result handling: `app/api/task_api.py`
- Result store: `app/store/result_store.py`
- Config: `config/config.yaml`
