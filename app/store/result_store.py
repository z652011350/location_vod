import json
from pathlib import Path
from typing import Optional

from app.manager.workspace_manager import get_task_dir


def write_result(task_id: str, result: dict) -> None:
    """写入 final_result.json。"""
    task_dir = get_task_dir(task_id)
    if task_dir is None:
        return
    with open(task_dir / "output" / "final_result.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)


def read_result(task_id: str) -> Optional[dict]:
    """读取 final_result.json，不存在返回 None。"""
    task_dir = get_task_dir(task_id)
    if task_dir is None:
        return None
    result_file = task_dir / "output" / "final_result.json"
    if not result_file.exists():
        return None
    with open(result_file, "r", encoding="utf-8") as f:
        return json.load(f)


def write_report(task_id: str, report_md: str) -> None:
    """写入 final_report.md。"""
    task_dir = get_task_dir(task_id)
    if task_dir is None:
        return
    with open(task_dir / "output" / "final_report.md", "w", encoding="utf-8") as f:
        f.write(report_md)


def read_report(task_id: str) -> Optional[str]:
    """读取 final_report.md，不存在返回 None。"""
    task_dir = get_task_dir(task_id)
    if task_dir is None:
        return None
    report_file = task_dir / "output" / "final_report.md"
    if not report_file.exists():
        return None
    with open(report_file, "r", encoding="utf-8") as f:
        return f.read()
