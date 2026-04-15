import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.core.config import get_settings
from app.core.enums import TaskStatus, TaskType


def _tasks_root() -> Path:
    return Path(get_settings().paths.tasks_root)


def create_task_workspace(
    task_id: str,
    task_type: TaskType,
    problem_description: str = "",
    log_content: str = "",
    code_snippet: str = "",
    module_name: str = "",
) -> Path:
    """创建任务工作目录结构并写入初始 task.json。"""
    root = _tasks_root() / task_id
    (root / "input").mkdir(parents=True, exist_ok=True)
    (root / "process").mkdir(exist_ok=True)
    (root / "output").mkdir(exist_ok=True)

    task_data = {
        "task_id": task_id,
        "task_type": task_type.value,
        "status": TaskStatus.CREATED.value,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "input": {
            "problem_description": problem_description,
            "log_content": log_content,
            "code_snippet": code_snippet,
            "module_name": module_name,
        },
    }
    with open(root / "task.json", "w", encoding="utf-8") as f:
        json.dump(task_data, f, ensure_ascii=False, indent=2)

    return root


def get_task_dir(task_id: str) -> Optional[Path]:
    """获取任务目录路径，不存在返回 None。"""
    d = _tasks_root() / task_id
    return d if d.is_dir() else None


def generate_task_id() -> str:
    """生成 task_id，格式：task_YYYYMMDD_HHMMSS_xxxx。"""
    now = datetime.now()
    import random
    suffix = f"{random.randint(0, 9999):04d}"
    return f"task_{now.strftime('%Y%m%d_%H%M%S')}_{suffix}"
