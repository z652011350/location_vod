import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.core.enums import TaskStatus
from app.manager.workspace_manager import get_task_dir


def read_task(task_id: str) -> Optional[dict]:
    """读取 task.json，不存在返回 None。"""
    task_dir = get_task_dir(task_id)
    if task_dir is None:
        return None
    task_file = task_dir / "task.json"
    if not task_file.exists():
        return None
    with open(task_file, "r", encoding="utf-8") as f:
        return json.load(f)


def update_status(task_id: str, status: TaskStatus) -> Optional[dict]:
    """更新任务状态，返回更新后的 task 数据。"""
    task_dir = get_task_dir(task_id)
    if task_dir is None:
        return None
    task_file = task_dir / "task.json"
    if not task_file.exists():
        return None
    with open(task_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    data["status"] = status.value
    data["updated_at"] = datetime.now().isoformat()
    with open(task_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return data


def list_tasks() -> list[dict]:
    """列出所有任务（按创建时间倒序）。"""
    tasks_root = Path(__file__).resolve().parent.parent.parent / "data" / "tasks"
    tasks_root = _resolve_tasks_root()
    if not tasks_root.exists():
        return []
    results = []
    for d in sorted(tasks_root.iterdir(), reverse=True):
        if d.is_dir():
            task_file = d / "task.json"
            if task_file.exists():
                with open(task_file, "r", encoding="utf-8") as f:
                    results.append(json.load(f))
    return results


def _resolve_tasks_root() -> Path:
    from app.core.config import get_settings
    return Path(get_settings().paths.tasks_root)
