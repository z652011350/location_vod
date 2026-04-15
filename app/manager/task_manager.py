import asyncio
import logging
from typing import Optional

from app.core.enums import TaskStatus, TaskType
from app.manager.workspace_manager import create_task_workspace, generate_task_id
from app.store.event_store import append_event
from app.store.result_store import write_result, read_result
from app.store.task_store import read_task, update_status, list_tasks, reset_task_data
from app.agent.claude_executor import get_running_executor

logger = logging.getLogger(__name__)


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
        module_name=module_name,
    )
    logger.info(f"已创建任务 {task_id}，类型: {task_type.value}，工作空间路径: {root}")
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


def cancel_task(task_id: str) -> Optional[dict]:
    """中止运行中的任务：终止 Claude CLI 子进程并更新状态。"""
    data = read_task(task_id)
    if data is None or data["status"] != TaskStatus.RUNNING.value:
        return None

    # 尝试终止运行中的子进程
    executor = get_running_executor(task_id)
    if executor:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(executor.kill())
            else:
                loop.run_until_complete(executor.kill())
            logger.info(f"[{task_id}] 已通过 cancel_task 终止子进程")
        except Exception as e:
            logger.warning(f"[{task_id}] 终止子进程时出错（可能已自行结束）: {e}")

    # 无论 kill 是否成功，都更新状态
    result = update_status(task_id, TaskStatus.CANCELLED)
    if result:
        append_event(task_id, "task_cancelled", {"message": "任务已被用户中止"})
    return result


def get_task_result(task_id: str) -> Optional[dict]:
    """获取任务结果。"""
    return read_result(task_id)


# 允许重试的终态集合（包括 succeeded，因为某些成功任务结果可能无效）
RETRYABLE_STATES = {
    TaskStatus.SUCCEEDED.value,
    TaskStatus.FAILED.value,
    TaskStatus.TIMEOUT.value,
    TaskStatus.CANCELLED.value,
}


def retry_task(task_id: str) -> Optional[dict]:
    """重试终态任务：清理旧数据，重置为 created 状态。"""
    data = read_task(task_id)
    if data is None:
        return None

    if data["status"] not in RETRYABLE_STATES:
        return None

    result = reset_task_data(task_id, TaskStatus.CREATED)
    if result:
        append_event(task_id, "task_retried", {"message": "任务已重试"})
    return result
