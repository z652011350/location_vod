from typing import Optional

from app.core.enums import TaskStatus, TaskType
from app.manager.workspace_manager import create_task_workspace, generate_task_id
from app.store.event_store import append_event
from app.store.result_store import write_result, read_result
from app.store.task_store import read_task, update_status, list_tasks


def create_task(
    task_type: TaskType,
    problem_description: str = "",
    log_content: str = "",
    code_snippet: str = "",
    module_name: str = "",
) -> dict:
    """创建新任务并返回 task 数据。"""
    task_id = generate_task_id()
    description = problem_description
    if task_type == TaskType.KNOWLEDGE_BUILDING:
        description = f"知识库构建: {module_name}"

    root = create_task_workspace(
        task_id=task_id,
        task_type=task_type,
        problem_description=problem_description,
        log_content=log_content,
        code_snippet=code_snippet,
    )
    append_event(task_id, "task_created", {"message": "任务已创建"})
    return read_task(task_id)


def get_task(task_id: str) -> Optional[dict]:
    """获取单个任务详情。"""
    return read_task(task_id)


def list_all_tasks() -> list[dict]:
    """列出所有任务。"""
    return list_tasks()


def start_task(task_id: str) -> Optional[dict]:
    """将任务标记为 running。"""
    data = update_status(task_id, TaskStatus.RUNNING)
    if data:
        append_event(task_id, "task_started", {"message": "任务开始执行"})
    return data


def complete_task(task_id: str, result: dict) -> Optional[dict]:
    """标记任务为 succeeded 并写入结果。"""
    write_result(task_id, result)
    data = update_status(task_id, TaskStatus.SUCCEEDED)
    if data:
        append_event(task_id, "task_completed", {"message": "任务执行完成"})
    return data


def fail_task(task_id: str, error: str) -> Optional[dict]:
    """标记任务为 failed。"""
    data = update_status(task_id, TaskStatus.FAILED)
    if data:
        append_event(task_id, "task_failed", {"message": error})
    return data


def timeout_task(task_id: str) -> Optional[dict]:
    """标记任务为 timeout。"""
    data = update_status(task_id, TaskStatus.TIMEOUT)
    if data:
        append_event(task_id, "task_timeout", {"message": "任务执行超时"})
    return data


def get_task_result(task_id: str) -> Optional[dict]:
    """获取任务结果。"""
    return read_result(task_id)
