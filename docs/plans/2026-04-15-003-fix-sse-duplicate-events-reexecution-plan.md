---
title: "fix: SSE 事件重复显示、任务重复执行与中止任务功能"
type: fix
status: active
date: 2026-04-15
---

# fix: SSE 事件重复显示、任务重复执行与中止任务功能

## Overview

修复知识库构建/问题诊断任务在运行期间，每次查看或 SSE 重连导致的三个问题，并新增中止运行中任务的功能：
1. 后端对已运行的任务重复启动 Claude CLI 子进程
2. 历史事件在每次 SSE 连接时被重复推送并重复显示
3. 前端对 running 状态任务的双重事件加载
4. 新增：用户可中止正在运行的任务（终止 Claude CLI 子进程）

## Problem Frame

用户创建知识库构建任务后，进入详情页查看构建过程。任务运行期间，每次点击进入（或 SSE 断线重连）都会：
- 后端重新调用 `start_task()` 追加新的 `task_started` 事件，并重新调用 `run_with_timeout()` 启动新的 Claude CLI 子进程
- 前端同时通过 REST 和 SSE 两条路径加载历史事件，导致重复显示
- 最终表现为事件列表中出现多条 "开始分析" 记录，以及相同事件的多次重复

根本原因：SSE `/stream` 端点将"事件推送"和"任务执行触发"两个职责耦合在一起，没有区分任务的当前执行状态。

## Requirements Trace

- R1. 已运行的任务不应被重复执行（不重复启动 Claude CLI）
- R2. SSE 重连时只推送尚未推送过的新事件，不重复推送历史事件
- R3. 前端不通过 REST 和 SSE 双重加载同一批事件
- R4. 事件列表中每种状态变更事件只出现一次
- R5. 用户可在任务运行中点击"中止"按钮，终止 Claude CLI 子进程，任务状态变为 `cancelled`

## Scope Boundaries

- 不改变任务状态机（`created → running → succeeded|failed|timeout|cancelled`）
- 不引入数据库或 Redis（保持 JSON 文件存储架构）
- 不重构 SSE 端点为独立 worker 模式（保持 SSE 请求内直接执行的架构）
- 不处理 `max_concurrent_tasks` 的并发限制（留作后续改进）

## Context & Research

### Relevant Code and Patterns

- `app/api/task_api.py` — SSE 端点 `api_stream_task()`，需要区分首次执行和重连观察
- `app/manager/task_manager.py` — `start_task()` / `complete_task()` 等状态转换，追加生命周期事件
- `app/store/event_store.py` — `append_event()` / `read_events()`，追加式 JSONL 存储
- `app/agent/claude_executor.py` — `run_with_timeout()` 启动 Claude CLI 子进程
- `frontend/src/pages/TaskDetailPage.jsx` — 前端 SSE 消费者，事件显示逻辑

### Key Observation

`events.jsonl` 是追加式日志，`cli_output` 事件由 `run_with_timeout()` 内的 `append_event()` 写入。当第一个 SSE 连接正在执行任务时，后续 SSE 连接可以通过轮询 `events.jsonl` 来获取新事件，无需重新执行。

## Key Technical Decisions

- **Decision: 使用 last_event_index 参数控制事件重放起点。** 前端在 SSE 连接时通过 query param `?after=N` 告知后端已收到的事件数量，后端从第 N+1 条开始推送。这避免了重复推送，且无需改变后端存储结构。
- **Decision: 对 running 状态任务使用事件轮询模式。** 当 SSE 连接发现任务已在运行时，不重新执行，改为轮询 `events.jsonl` 等待新事件，直到任务进入终态。
- **Decision: 前端 running 任务只走 SSE 通道。** 移除 `loadExistingEvents()` 调用，由 SSE 的历史事件重放统一提供。避免 REST 和 SSE 双重加载。
- **Decision: 使用模块级 dict 跟踪运行中的 ClaudeExecutor 实例。** 在 `claude_executor.py` 中维护 `_running_executors: dict[str, ClaudeExecutor]`，`run_with_timeout()` 注册 executor，执行完成/异常/取消后注销。取消端点通过该 dict 找到并 kill 对应进程。无需引入 Redis 或外部状态存储。
- **Decision: 中止操作通过标准 REST 端点触发。** 新增 `POST /api/tasks/{task_id}/cancel`，不通过 SSE 通道。取消后由 SSE 的状态轮询自然检测到 `cancelled` 终态，发送 `done` 事件。

## Implementation Units

- [ ] **Unit 1: 后端 — SSE 端点区分首次执行与重连观察**

**Goal:** SSE `/stream` 端点根据任务当前状态决定行为：`created` 时启动执行，`running` 时只观察事件流。

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Modify: `app/api/task_api.py`

**Approach:**

修改 `api_stream_task()` 的 `event_generator()` 函数，增加任务状态分支：

1. **Replay existing events**：先读取并推送所有已有事件（支持 `?after=N` 参数，从指定位置之后开始推送）
2. **Terminal state check**：如果任务已终态，发送 `done` 事件并返回
3. **If status == `created`**：保持现有行为 — 调用 `start_task()` + `run_with_timeout()` 启动执行，实时推送 CLI 输出
4. **If status == `running`**：**不调用 `start_task()` 和 `run_with_timeout()`**，改为轮询 `events.jsonl`：
   - 记录当前已推送的事件数量
   - 每秒检查 `events.jsonl` 是否有新事件
   - 有新事件则推送
   - 检测到任务进入终态后发送 `done` 事件并返回
   - 设置总超时（使用配置的 `task_timeout_seconds`）防止无限轮询

**Patterns to follow:**
- 现有的 `read_events()` 函数用于读取事件
- 现有的 `get_task()` 用于检查任务状态
- 使用 `asyncio.sleep()` 进行轮询间隔

**Test scenarios:**
- Happy path: `created` 任务首次连接，正常执行并流式推送事件
- Happy path: `running` 任务重连，仅推送新事件，不重复执行
- Edge case: 任务在轮询期间变为终态，正确发送 `done` 事件
- Error path: 轮询超时后正确退出
- Integration: 多个 SSE 连接同时观察同一个 `running` 任务

**Verification:**
- 创建任务后首次打开详情页，事件正常显示且只有一条 `task_started`
- 刷新页面或重新进入详情页，不出现新的 `task_started` 事件
- 任务执行期间新产生的事件能实时推送到重连的 SSE 连接

---

- [ ] **Unit 2: 后端 — `/stream` 端点支持 `after` 查询参数**

**Goal:** 新增 `?after=N` 参数，让 SSE 端点跳过前 N 条事件，只推送后续的新事件。减少重连时的数据传输。

**Requirements:** R2

**Dependencies:** Unit 1

**Files:**
- Modify: `app/api/task_api.py`

**Approach:**

在 `api_stream_task()` 函数签名中添加 `after: int = 0` 查询参数：
- 读取 `events.jsonl` 时，跳过前 `after` 条事件
- 后续轮询也基于 `after` 之后的偏移量继续推送新事件
- 该参数可选，默认为 0（推送全部事件），保持向后兼容

**Patterns to follow:**
- FastAPI query parameter 模式（函数参数 + 默认值）

**Test scenarios:**
- Happy path: `after=0` 推送全部事件
- Happy path: `after=5` 只推送第 6 条及之后的事件
- Edge case: `after` 大于事件总数时，无历史事件推送，直接进入轮询
- Edge case: 无效的 `after` 值（负数）被忽略或钳位为 0

**Verification:**
- 带不同 `after` 值的 SSE 连接正确跳过已推送事件

---

- [ ] **Unit 3: 前端 — 修复 running 任务的双重事件加载**

**Goal:** 消除前端对 running 状态任务同时调用 `loadExistingEvents()` 和 `startStreaming()` 的问题，改为只使用 SSE 通道。

**Requirements:** R3, R4

**Dependencies:** Unit 2

**Files:**
- Modify: `frontend/src/pages/TaskDetailPage.jsx`

**Approach:**

1. **移除 running 状态下的 `loadExistingEvents()` 调用**：当任务为 `running` 时，只调用 `startStreaming()`。因为 SSE 端点会先推送所有历史事件，不需要额外的 REST 请求。

2. **SSE 重连时携带 `after` 参数**：在 `startStreaming()` 中，用当前已有事件数量作为 `after` 参数传给 SSE 连接。这样重连时只获取新事件，不会重复加载已显示的事件。

3. **SSE 错误重连逻辑优化**：
   - 不再重新调用 `loadTask()`（这会重新判断状态并可能触发错误路径）
   - 改为直接重新打开 SSE 连接，携带当前事件数量作为 `after` 参数

4. **`setEvents([])` 清除逻辑调整**：只在 `created` 状态（首次连接）时清空事件数组。对于 `running` 状态的重连，保留已有事件，只追加新事件。

**Patterns to follow:**
- React useState/useRef 模式
- 现有的 `startStreaming()` 结构

**Test scenarios:**
- Happy path: `created` 任务进入详情页，事件正常从零开始累积
- Happy path: `running` 任务进入详情页，历史事件通过 SSE 一次性加载，然后实时追加新事件
- Happy path: SSE 断线重连，只接收断线期间的新事件
- Edge case: 快速多次进入/离开详情页，不产生重复事件
- Integration: 端到端验证从任务创建到完成，事件列表中每个状态变更只出现一次

**Verification:**
- 运行中任务的事件列表中，"开始分析"只出现一次
- 刷新页面后事件不重复
- SSE 断线重连后不产生重复的 "开始分析" 记录

---

- [ ] **Unit 4: 后端 — 运行中任务的全局进程注册与中止**

**Goal:** 支持从外部请求终止正在运行的 Claude CLI 子进程。通过模块级注册表跟踪运行中的 executor，提供 `cancel` 端点。

**Requirements:** R5

**Dependencies:** Unit 1（需要 SSE 端点区分 running/created 的逻辑先就位，确保取消后 SSE 轮询能正确检测终态）

**Files:**
- Modify: `app/agent/claude_executor.py`
- Modify: `app/manager/task_manager.py`
- Modify: `app/api/task_api.py`

**Approach:**

1. **`claude_executor.py` — 全局进程注册表：**
   - 添加模块级 dict：`_running_executors: dict[str, ClaudeExecutor]`
   - 添加 `register_executor(task_id, executor)` 和 `unregister_executor(task_id)` 辅助函数
   - 添加 `get_running_executor(task_id) -> Optional[ClaudeExecutor]` 查询函数
   - 在 `run_with_timeout()` 中：创建 executor 后调用 `register_executor()`，在 finally 块中调用 `unregister_executor()`

2. **`task_manager.py` — `cancel_task()` 函数：**
   - 检查任务状态是否为 `running`，非 running 则返回错误
   - 调用 `get_running_executor(task_id)` 获取 executor
   - 如果 executor 存在，调用 `executor.kill()` 终止子进程
   - 调用 `update_status(task_id, TaskStatus.CANCELLED)` 更新状态
   - 调用 `append_event(task_id, "task_cancelled", {"message": "任务已被用户中止"})`

3. **`task_api.py` — `POST /api/tasks/{task_id}/cancel` 端点：**
   - 调用 `cancel_task(task_id)`
   - 返回 `{"task_id": ..., "status": "cancelled"}`
   - 如果任务不存在或不在 `running` 状态，返回适当的 HTTP 错误码（404 / 409）
   - 导入 `cancel_task`

**Patterns to follow:**
- `ClaudeExecutor.kill()` 已有实现（终止子进程 + 等待退出）
- `task_manager.py` 中其他状态转换函数（`complete_task`、`fail_task` 等）的模式

**Test scenarios:**
- Happy path: `running` 任务调用 cancel → 子进程终止、状态变为 `cancelled`、事件追加 `task_cancelled`
- Happy path: cancel 后 SSE 轮询连接检测到 `cancelled` 终态，发送 `done` 事件
- Edge case: `created` 状态任务调用 cancel → 返回 409（任务尚未开始运行）
- Edge case: `succeeded` 状态任务调用 cancel → 返回 409（任务已结束）
- Edge case: executor 不在注册表中（进程已自行结束但状态还未更新） → 仍应更新状态为 `cancelled`
- Error path: kill 失败（进程已退出）→ 状态仍应正确更新为 `cancelled`

**Verification:**
- 调用 cancel 端点后，`ps aux | grep claude` 确认子进程已消失
- 任务状态文件 `task.json` 中 status 为 `cancelled`
- 事件日志中有 `task_cancelled` 事件
- SSE 连接在 cancel 后正确结束

---

- [ ] **Unit 5: 前端 — 中止任务按钮**

**Goal:** 在任务详情页为运行中的任务显示"中止任务"按钮，点击后调用 cancel API 并更新 UI 状态。

**Requirements:** R5

**Dependencies:** Unit 4

**Files:**
- Modify: `frontend/src/pages/TaskDetailPage.jsx`

**Approach:**

1. **添加 cancel 状态和函数：**
   - 新增 `cancelling` state 用于显示中止中的 loading 状态
   - 添加 `cancelTask()` 函数：调用 `POST /api/tasks/{task_id}/cancel`，成功后更新 status 为 `cancelled`，关闭 EventSource

2. **渲染中止按钮：**
   - 在任务信息栏（现有状态 badge 旁边）添加按钮
   - 仅在 `status === 'running'` 时显示
   - 按钮样式：红色警示风格（`bg-red-500/10 text-red-400 border-red-500/20`），与现有深色科技风 UI 一致
   - 使用 `XCircle` 图标（已有 lucide-react 导入）
   - 点击中显示 loading spinner，禁用重复点击
   - 点击后弹出确认弹窗："确认中止任务？此操作不可撤销。"，确认后才调用 cancel API
   - 确认弹窗使用简单的 `window.confirm()` 或自定义 modal（与现有 UI 风格一致的自定义 modal 更佳）

3. **中止后的 UI 反馈：**
   - 状态 badge 切换为 `cancelled`（已有配置：`text-slate-400 bg-slate-500/10`）
   - 事件列表中追加一条 `task_cancelled` 事件（来自后端）
   - SSE 连接收到 `done` 事件后自动关闭

**Patterns to follow:**
- 现有的按钮样式模式（如"前往知识库确认"按钮）
- 现有的 `statusConfig` 中 `cancelled` 状态配置
- 现有的 `fetch` 调用模式

**Test scenarios:**
- Happy path: running 任务页面显示"中止任务"按钮，点击后任务取消成功
- Happy path: 取消后按钮消失，状态变为"已取消"
- Edge case: 快速连续点击中止按钮 → 第二次请求返回 409 但 UI 已更新
- Edge case: 取消请求失败 → 显示错误提示，按钮恢复可用
- Integration: 取消后刷新页面，事件列表显示 `task_cancelled` 记录，状态为 `cancelled`

**Verification:**
- 运行中任务页面可见红色中止按钮
- 点击后 Claude CLI 进程终止，UI 状态更新为"已取消"

## System-Wide Impact

- **Interaction graph:** SSE `/stream` 端点是任务详情页的主要数据入口。新增 `POST /cancel` 端点与 SSE 独立。取消操作通过状态文件传播：cancel 端点更新 `task.json` → SSE 轮询检测到终态 → 前端更新 UI
- **Error propagation:** 轮询模式下的事件延迟（~1s）不影响用户体验。中止操作是即时的（kill 子进程 + 更新状态），SSE 轮询在下一轮（~1s 内）检测到变化
- **State lifecycle risks:** 需确保：轮询模式在任务终态时正确退出；取消操作在 executor 已自行结束时仍安全（kill 幂等）；`_running_executors` 注册表无内存泄漏（finally 中清理）
- **API surface parity:** `GET /api/tasks/{id}/events` REST 端点保持不变。新增 `POST /api/tasks/{id}/cancel` 遵循现有端点风格
- **Unchanged invariants:** 任务状态机不变（`cancelled` 已是定义的状态之一）。事件存储格式不变。CLI 执行逻辑不变（仅增加注册/注销包装）

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 轮询模式引入 ~1s 延迟 | 对于观察者（非首次执行者）可接受；首次执行仍走实时推送 |
| `events.jsonl` 在高并发写入时可能出现读取不完整 | 当前系统限制 `max_concurrent_tasks: 1`，实际不会出现并发写入 |
| 前端 `after` 参数与后端事件数量不一致 | 默认 `after=0` 保证向后兼容，不传参数时行为不变 |
| 任务状态在轮询期间从 `running` 变为终态的边界 | 每轮轮询都检查任务状态，终态时读取剩余事件后退出 |
| `_running_executors` 内存泄漏 | `run_with_timeout()` 在 finally 块中注销，确保异常路径也清理 |
| kill 子进程后 `run_with_timeout()` 的异常处理 | kill 后 subprocess stdout 读取会自然结束，触发 CancelledError 或正常退出，SSE event_generator 捕获异常后检查状态为 `cancelled` 走正常终止路径 |
| 用户误点中止按钮 | 前端添加确认弹窗（"确认中止任务？此操作不可撤销。"），确认后才执行 |

## Sources & References

- Related code: `app/api/task_api.py` (SSE 端点 + cancel 端点)
- Related code: `frontend/src/pages/TaskDetailPage.jsx` (前端 SSE 消费者 + 中止按钮)
- Related code: `app/store/event_store.py` (事件存储)
- Related code: `app/manager/task_manager.py` (任务状态管理 + cancel_task)
- Related code: `app/agent/claude_executor.py` (CLI 执行器 + kill + 进程注册表)
- Related code: `app/core/enums.py` (TaskStatus.CANCELLED 已定义)
