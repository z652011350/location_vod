---
title: "feat: 任务重试按钮与 Agent 进程 PID 显示"
type: feat
status: active
date: 2026-04-15
---

# 任务重试按钮与 Agent 进程 PID 显示

## Overview

为 Location VOD 平台新增两个功能：(1) 失败任务的重试按钮，允许因 Agent 工具出错而失败的任务重新执行；(2) 在任务运行时显示 Claude CLI 子进程的 PID，方便运维监控和问题排查。

## Problem Frame

当前系统在任务失败（failed/timeout/cancelled）后，用户只能创建新任务重新提交相同的问题，无法复用已有的任务上下文和输入数据。同时，当 Claude CLI 子进程运行时，用户和运维人员无法获知其进程号，无法在终端中进行进程级别的监控或干预。

## Requirements Trace

- R1. 失败/超时/取消状态的任务支持一键重试，重用原始输入数据重新执行
- R2. 重试时清除旧的分析过程数据（事件、日志、结果），避免混淆
- R3. 运行中的任务在前后端均暴露 Claude CLI 子进程的 PID
- R4. 前端在任务详情页和任务列表页直观展示重试按钮和 PID 信息

## Scope Boundaries

- 不修改任务 ID 生成逻辑（重试保留原 task_id）
- 不修改 SSE 流式传输的核心架构
- 不增加任务队列（保持单并发限制）
- 不做自动重试（仅用户手动触发）

## Context & Research

### Relevant Code and Patterns

- **取消任务流程** (`task_api.py:api_cancel_task` → `task_manager.cancel_task`)：重试 API 的参照模式，包括状态校验、子进程操作、事件追加
- **ClaudeExecutor 全局注册表** (`claude_executor.py:_running_executors`)：已跟踪运行中的 executor 实例，`executor.process.pid` 可直接获取 PID
- **SSE created→running 转换** (`task_api.py:api_stream_task`)：任务重置为 `created` 后，前端重新连接 SSE 即可触发执行
- **任务工作目录结构** (`data/tasks/{id}/process/`, `output/`)：重试需清理 `process/` 和 `output/` 下的文件

## Key Technical Decisions

- **重试 = 状态重置 + 数据清理**：将终态任务重置为 `created`，清除旧事件/日志/结果。SSE 端点对 `created` 状态已有完整的执行逻辑，无需修改执行流程。
- **PID 通过 SSE 事件传递 + REST API 查询**：在 CLI 子进程启动后立即通过 `cli_started` 事件推送 PID；同时在任务状态 API 中返回运行中任务的 PID（从全局注册表查询）。
- **PID 不持久化**：进程号仅在运行时有效，无需写入 `task.json`。重启后 PID 自然失效。

## Implementation Units

- [x] **Unit 1: 后端重试逻辑**

**Goal:** 实现 `retry_task()` 函数和 `POST /api/tasks/{task_id}/retry` 端点

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Modify: `app/manager/task_manager.py` — 新增 `retry_task()` 函数
- Modify: `app/api/task_api.py` — 新增 `POST /{task_id}/retry` 端点
- Modify: `app/store/task_store.py` — 新增 `reset_task_data()` 辅助函数

**Approach:**
- `retry_task()` 校验任务当前状态为终态（failed/timeout/cancelled），将状态重置为 `created`，清理 `process/events.jsonl`、`process/stdout.log`、`process/stderr.log`、`output/final_result.json`，追加 `task_retried` 事件
- `reset_task_data()` 在 `task_store.py` 中负责清理文件并更新状态，保持 `task_manager` 层不直接操作文件路径
- API 端点参照 `api_cancel_task` 的校验模式，非终态返回 409

**Patterns to follow:**
- `task_manager.cancel_task()` 的状态校验 + 操作 + 事件追加模式
- `task_store.update_status()` 的文件读写模式

**Test scenarios:**
- Happy path: failed 任务调用 retry → 状态变为 created，旧数据已清理
- Happy path: timeout 任务调用 retry → 状态变为 created
- Happy path: cancelled 任务调用 retry → 状态变为 created
- Error path: running 任务调用 retry → 返回 409
- Error path: succeeded 任务调用 retry → 返回 409
- Edge case: 不存在的 task_id → 返回 404

**Verification:**
- `POST /api/tasks/{task_id}/retry` 对终态任务返回成功，状态为 `created`
- 旧的 events.jsonl、stdout.log、stderr.log、final_result.json 已被删除
- 对非终态任务返回 409 错误

- [x] **Unit 2: 后端 PID 暴露**

**Goal:** 在 Claude CLI 启动时记录并暴露进程 PID

**Requirements:** R3

**Dependencies:** None

**Files:**
- Modify: `app/agent/claude_executor.py` — 新增 `get_running_pid()` 函数，在 `execute()` 中追加 `cli_started` 事件携带 PID
- Modify: `app/api/task_api.py` — 在 `api_get_status()` 和 `api_get_task()` 中返回 PID

**Approach:**
- 在 `claude_executor.py` 中新增 `get_running_pid(task_id) -> Optional[int]`，从 `_running_executors` 获取 executor 并返回 `executor.process.pid`（进程未启动时返回 None）
- 在 `execute()` 中 `self.process` 创建后、开始读取 stdout 前，调用 `append_event(task_id, "cli_started", {"pid": self.process.pid})` 记录 PID
- `api_get_status()` 返回值增加 `pid` 字段（从 `get_running_pid()` 获取，无则为 null）
- `api_get_task()` 同理增加 `pid` 字段

**Patterns to follow:**
- `get_running_executor()` 的注册表查询模式
- `append_event()` 的事件追加模式

**Test scenarios:**
- Happy path: 运行中任务的 status API 返回有效 PID（正整数）
- Happy path: 非运行任务的 status API 返回 pid: null
- Integration: SSE 事件流中出现 `cli_started` 事件包含 pid 字段

**Verification:**
- `GET /api/tasks/{id}/status` 对运行中任务返回 `{"pid": <int>}`，对其他任务返回 `{"pid": null}`
- SSE 事件流中 `cli_started` 事件包含 `{"pid": <number>}`

- [x] **Unit 3: 前端重试按钮与 PID 显示**

**Goal:** 在任务详情页和列表页展示重试按钮和 PID 信息

**Requirements:** R1, R3, R4

**Dependencies:** Unit 1, Unit 2

**Files:**
- Modify: `frontend/src/pages/TaskDetailPage.jsx` — 添加重试按钮和 PID 显示
- Modify: `frontend/src/pages/HomePage.jsx` — 任务列表卡片添加重试快捷操作和 PID

**Approach:**

**TaskDetailPage:**
- 在任务信息栏（状态标签旁），当状态为 failed/timeout/cancelled 时显示"重试"按钮，样式参照"中止任务"按钮（使用橙/蓝色调而非红色）
- 点击重试调用 `POST /api/tasks/{taskId}/retry`，成功后重新加载任务（状态回到 created），清空事件和结果，重新开启 SSE 连接
- 在状态为 running 时，在任务信息栏显示 PID 标签（如 `PID: 12345`），通过轮询 status API 或从 SSE `cli_started` 事件中获取

**HomePage:**
- 在任务列表卡片中，对 failed/timeout/cancelled 状态的任务显示一个小的重试图标按钮（在状态标签旁）
- 重试成功后刷新列表
- 运行中的任务卡片显示 PID（小字体，如 `PID 12345`）

**Patterns to follow:**
- 现有 `cancelTask()` 函数的 API 调用 + 状态更新模式
- `statusConfig` 的状态映射模式
- Tailwind CSS 按钮样式：参照"中止任务"按钮的类名结构

**Test scenarios:**
- Happy path: failed 任务点击重试 → 页面清空事件，重新进入分析流程
- Happy path: running 任务显示 PID 数字
- Edge case: 重试 API 返回 409 → 显示错误提示
- UI: 重试按钮仅在 failed/timeout/cancelled 状态出现

**Verification:**
- 任务详情页：终态任务显示重试按钮，点击后任务重新开始执行
- 任务详情页：running 状态显示 PID
- 任务列表页：终态任务卡片有重试入口，running 任务卡片显示 PID

## System-Wide Impact

- **Interaction graph:** 重试操作触发 `task_manager.retry_task()` → 清理文件 → 重置状态 → 前端重连 SSE → SSE 端点识别 `created` 状态 → 启动新的 Claude CLI 子进程
- **Error propagation:** 重试失败（非终态任务）通过 HTTP 409 传播到前端，展示错误 toast
- **State lifecycle risks:** 重试清理文件时需确保无并发读写（单并发限制 + SSE 观察模式检查可规避）
- **API surface parity:** `GET /api/tasks/{id}/status` 和 `GET /api/tasks/{id}` 均需返回 PID
- **Unchanged invariants:** 任务 ID、输入数据、task_type 在重试过程中保持不变

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 重试清理文件与 SSE 轮询并发冲突 | 单并发限制确保同一任务不会同时被多个 SSE 连接观察；清理在状态重置前完成 |
| PID 在进程退出后失效 | 仅在 running 状态展示 PID，进程退出后自然消失；不持久化 PID |
| 重试时旧 executor 仍在全局注册表 | 仅终态任务可重试，终态任务的 executor 已在 finally 中注销 |

## Documentation / Operational Notes

- 重试保留原始输入，不修改 task.json 中的 input 字段
- `task_retried` 事件记录重试时间，可用于审计追踪
