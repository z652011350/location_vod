import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.manager.workspace_manager import get_task_dir


def append_event(task_id: str, event_type: str, data: dict) -> None:
    """向 events.jsonl 追加一条事件。"""
    task_dir = get_task_dir(task_id)
    if task_dir is None:
        return
    events_file = task_dir / "process" / "events.jsonl"
    event = {
        "timestamp": datetime.now().isoformat(),
        "event_type": event_type,
        **data,
    }
    with open(events_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


def read_events(task_id: str) -> list[dict]:
    """读取所有事件，返回列表。"""
    task_dir = get_task_dir(task_id)
    if task_dir is None:
        return []
    events_file = task_dir / "process" / "events.jsonl"
    if not events_file.exists():
        return []
    events = []
    with open(events_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                events.append(json.loads(line))
    return events
