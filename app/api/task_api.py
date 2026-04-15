import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agent.claude_executor import run_with_timeout
from app.core.enums import TaskStatus, TaskType
from app.manager.task_manager import (
    create_task,
    get_task,
    list_all_tasks,
    start_task,
    complete_task,
    fail_task,
    timeout_task,
    get_task_result,
)
from app.store.event_store import read_events, append_event
from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


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
    if not req.problem_description and not req.log_content and not req.code_snippet:
        raise HTTPException(status_code=422, detail="至少提供一种输入：问题描述、故障日志或代码片段")

    try:
        task_type = TaskType(req.task_type)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"无效的任务类型: {req.task_type}")

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
    return task


@router.get("/{task_id}/status")
async def api_get_status(task_id: str):
    """获取任务当前状态。"""
    task = get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"task_id": task_id, "status": task["status"]}


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
async def api_stream_task(task_id: str):
    """SSE 端点：实时推送任务分析过程。"""
    from fastapi.responses import StreamingResponse

    task = get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")

    async def event_generator():
        # 推送已有事件
        for event in read_events(task_id):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

        # 如果任务已完成，直接结束
        task_data = get_task(task_id)
        if task_data and task_data["status"] in (
            TaskStatus.SUCCEEDED.value,
            TaskStatus.FAILED.value,
            TaskStatus.TIMEOUT.value,
            TaskStatus.CANCELLED.value,
        ):
            yield f"event: done\ndata: {json.dumps({'status': task_data['status']})}\n\n"
            return

        # 启动分析任务
        settings = get_settings()
        prompt = _build_prompt(task_data, settings)

        start_task(task_id)
        yield f"data: {json.dumps({'event_type': 'task_started', 'message': '开始分析'}, ensure_ascii=False)}\n\n"

        try:
            lines = await run_with_timeout(task_id, prompt)

            # 从输出中解析最终结果
            result = _parse_result(lines)
            complete_task(task_id, result)
            yield f"data: {json.dumps({'event_type': 'task_completed', 'message': '分析完成'}, ensure_ascii=False)}\n\n"
            yield f"event: done\ndata: {json.dumps({'status': 'succeeded'}, ensure_ascii=False)}\n\n"

        except TimeoutError:
            timeout_task(task_id)
            yield f"data: {json.dumps({'event_type': 'task_timeout', 'message': '执行超时'}, ensure_ascii=False)}\n\n"
            yield f"event: done\ndata: {json.dumps({'status': 'timeout'}, ensure_ascii=False)}\n\n"

        except Exception as e:
            fail_task(task_id, str(e))
            yield f"data: {json.dumps({'event_type': 'task_failed', 'message': str(e)}, ensure_ascii=False)}\n\n"
            yield f"event: done\ndata: {json.dumps({'status': 'failed'}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _build_prompt(task_data: dict, settings) -> str:
    """构建发送给 Claude 的 prompt。"""
    inp = task_data.get("input", {})
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
