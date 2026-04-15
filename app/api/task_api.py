import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agent.claude_executor import run_with_timeout, get_running_pid
from app.core.enums import TaskStatus, TaskType
from app.manager.task_manager import (
    create_task,
    get_task,
    list_all_tasks,
    start_task,
    complete_task,
    fail_task,
    timeout_task,
    cancel_task,
    retry_task,
    get_task_result,
    RETRYABLE_STATES,
)
from app.store.event_store import read_events
from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

TERMINAL_STATES = {
    TaskStatus.SUCCEEDED.value,
    TaskStatus.FAILED.value,
    TaskStatus.TIMEOUT.value,
    TaskStatus.CANCELLED.value,
}


# --- Modules Endpoint ---

@router.get("/modules/list")
async def api_list_modules():
    """列出 code_repo_root 下可用的模块目录，供知识库构建选择。"""
    from pathlib import Path

    settings = get_settings()
    code_root = Path(settings.paths.code_repo_root)
    if not code_root.exists():
        return []
    modules = []
    for d in sorted(code_root.iterdir()):
        if d.is_dir() and not d.name.startswith("."):
            modules.append({"name": d.name, "path": str(d)})
    return modules


# --- Request/Response Models ---

class CreateTaskRequest(BaseModel):
    problem_description: str = ""
    log_content: str = ""
    code_snippet: str = ""
    task_type: str = "problem_locating"
    module_name: str = ""  # 仅知识库构建任务使用


class TaskResponse(BaseModel):
    task_id: str
    task_type: str
    status: str
    created_at: str
    updated_at: str


# --- Endpoints ---

@router.post("", response_model=TaskResponse)
async def api_create_task(req: CreateTaskRequest):
    """创建新任务。"""
    try:
        task_type = TaskType(req.task_type)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"无效的任务类型: {req.task_type}")

    # 按任务类型验证输入
    if task_type == TaskType.KNOWLEDGE_BUILDING:
        if not req.module_name:
            raise HTTPException(status_code=422, detail="知识库构建任务必须指定 module_name")
    else:
        if not req.problem_description and not req.log_content and not req.code_snippet:
            raise HTTPException(status_code=422, detail="至少提供一种输入：问题描述、故障日志或代码片段")

    task = create_task(
        task_type=task_type,
        problem_description=req.problem_description,
        log_content=req.log_content,
        code_snippet=req.code_snippet,
        module_name=req.module_name,
    )
    return TaskResponse(**{
        "task_id": task["task_id"],
        "task_type": task["task_type"],
        "status": task["status"],
        "created_at": task["created_at"],
        "updated_at": task["updated_at"],
    })


@router.get("")
async def api_list_tasks():
    """列出所有任务。"""
    return list_all_tasks()


@router.get("/{task_id}")
async def api_get_task(task_id: str):
    """获取任务详情。"""
    task = get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    task["pid"] = get_running_pid(task_id)
    return task


@router.get("/{task_id}/status")
async def api_get_status(task_id: str):
    """获取任务当前状态。"""
    task = get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"task_id": task_id, "status": task["status"], "pid": get_running_pid(task_id)}


@router.get("/{task_id}/events")
async def api_get_events(task_id: str):
    """获取任务事件列表。"""
    task = get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return read_events(task_id)


@router.get("/{task_id}/result")
async def api_get_result(task_id: str):
    """获取任务最终结果。"""
    task = get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    result = get_task_result(task_id)
    if result is None:
        return {"task_id": task_id, "result": None, "message": "结果尚未生成"}
    return {"task_id": task_id, "result": result}


@router.get("/{task_id}/stream")
async def api_stream_task(task_id: str, after: int = 0):
    """SSE 端点：实时推送任务分析过程。

    - after: 跳过前 N 条已推送事件，用于重连时避免重复。
    - created 状态：启动执行并轮询推送事件。
    - running 状态：仅轮询推送事件（不重复执行）。
    - 终态：推送剩余事件后结束。
    """
    from fastapi.responses import StreamingResponse

    task = get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")

    async def event_generator():
        # --- 1. 推送已有事件（支持 after 偏移） ---
        start_idx = max(0, after)
        existing = read_events(task_id)
        for event in existing[start_idx:]:
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        sent_count = len(existing)

        # --- 2. 如果任务已终态，直接结束 ---
        task_data = get_task(task_id)
        if task_data and task_data["status"] in TERMINAL_STATES:
            yield f"event: done\ndata: {json.dumps({'status': task_data['status']}, ensure_ascii=False)}\n\n"
            return

        settings = get_settings()

        # --- 3. 判断是启动执行还是仅观察 ---
        if task_data["status"] == TaskStatus.RUNNING.value:
            # 已在运行 → 仅轮询观察
            poll_interval = 1.0
        else:
            # created 状态 → 启动执行（状态更新封装在独立协程中，不依赖 SSE 存活）
            start_task(task_id)
            prompt = _build_prompt(task_data, settings)
            asyncio.create_task(
                _execute_and_finalize(task_id, task_data, prompt)
            )
            poll_interval = 0.5

        # --- 4. 统一轮询循环（仅推送事件，不处理结果） ---
        timeout_sec = settings.runtime.task_timeout_seconds
        elapsed = 0.0

        while elapsed < timeout_sec:
            # 检查是否终态
            current = get_task(task_id)
            if current and current["status"] in TERMINAL_STATES:
                # 推送剩余事件后结束
                all_events = read_events(task_id)
                for event in all_events[sent_count:]:
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                yield f"event: done\ndata: {json.dumps({'status': current['status']}, ensure_ascii=False)}\n\n"
                return

            # 推送新事件
            all_events = read_events(task_id)
            for event in all_events[sent_count:]:
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            sent_count = len(all_events)

            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

        # 轮询超时，推送当前状态
        yield f"event: done\ndata: {json.dumps({'status': 'timeout'}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _execute_and_finalize(task_id: str, task_data: dict, prompt: str):
    """执行 CLI 并更新任务状态。作为独立 asyncio Task 运行，不依赖 SSE 连接存活。"""
    try:
        lines = await run_with_timeout(task_id, prompt)
        result = _parse_result(lines)
        # 知识库构建任务完成后：验证知识文件并初始化 meta.json
        if task_data.get("task_type") == TaskType.KNOWLEDGE_BUILDING.value:
            _verify_and_init_knowledge(task_data, result)
        complete_task(task_id, result)
    except TimeoutError:
        timeout_task(task_id)
    except Exception as e:
        fail_task(task_id, str(e))


@router.post("/{task_id}/cancel")
async def api_cancel_task(task_id: str):
    """中止运行中的任务。"""
    task = get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")

    result = cancel_task(task_id)
    if result is None:
        raise HTTPException(status_code=409, detail="任务不在运行状态，无法中止")

    return {"task_id": task_id, "status": result["status"]}


@router.post("/{task_id}/retry")
async def api_retry_task(task_id: str):
    """重试失败/超时/取消的任务。"""
    task = get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")

    if task["status"] not in RETRYABLE_STATES:
        raise HTTPException(status_code=409, detail="当前任务状态不支持重试")

    result = retry_task(task_id)
    return {"task_id": task_id, "status": result["status"]}


def _build_prompt(task_data: dict, settings) -> str:
    """构建发送给 Claude 的 prompt。"""
    task_type = task_data.get("task_type", "problem_locating")
    inp = task_data.get("input", {})

    if task_type == TaskType.KNOWLEDGE_BUILDING.value:
        parts = [
            "/knowledge-builder",
            f"module_name={inp.get('module_name', '')}",
            f"code_repo_root={settings.paths.code_repo_root}",
            f"docs_repo_root={settings.paths.docs_repo_root}",
            f"sdk_repo_root={settings.paths.sdk_repo_root}",
            f"knowledge_root={settings.paths.knowledge_root}",
        ]
    else:
        parts = [
            "/problem-locator",
            f"problem_description={inp.get('problem_description', '')}",
            f"log_content={inp.get('log_content', '')}",
            f"code_snippet={inp.get('code_snippet', '')}",
            f"code_repo_root={settings.paths.code_repo_root}",
            f"docs_repo_root={settings.paths.docs_repo_root}",
            f"sdk_repo_root={settings.paths.sdk_repo_root}",
            f"knowledge_root={settings.paths.knowledge_root}",
        ]
    return "\n".join(parts)


def _parse_result(lines: list[str]) -> dict:
    """从 CLI 输出中解析最终结果。尝试从输出中提取 JSON。"""
    # 尝试找到 final_result JSON
    for line in reversed(lines):
        line = line.strip()
        if line.startswith("{"):
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                continue

    # 无法解析 JSON 时，使用全文作为报告
    full_text = "\n".join(lines)
    return {
        "summary": "分析完成（无法解析结构化结果）",
        "raw_output": full_text[-5000:],  # 限制长度
    }


def _verify_and_init_knowledge(task_data: dict, result: dict) -> None:
    """知识库构建任务完成后，验证知识文件并初始化 meta.json。"""
    from pathlib import Path
    from app.store.knowledge_store import init_module_meta

    module_name = task_data.get("input", {}).get("module_name", "")
    if not module_name:
        logger.warning("知识库构建任务缺少 module_name，跳过 meta.json 初始化")
        return

    settings = get_settings()
    knowledge_dir = Path(settings.paths.knowledge_root) / module_name
    if not knowledge_dir.exists():
        logger.warning(f"知识库目录不存在: {knowledge_dir}，跳过 meta.json 初始化")
        return

    # 检查是否生成了知识文件
    knowledge_files = [
        f for f in knowledge_dir.iterdir()
        if f.is_file() and f.name != "meta.json"
    ]
    if not knowledge_files:
        logger.warning(f"模块 {module_name} 未生成知识文件")
        return

    # 初始化 meta.json
    meta = init_module_meta(module_name)
    logger.info(f"模块 {module_name} 知识库 meta.json 已初始化，包含 {len(meta.get('files', []))} 个文件")
