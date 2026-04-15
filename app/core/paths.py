from pathlib import Path

from app.core.config import get_settings


def ensure_dirs() -> None:
    """确保所有必要的数据目录存在。"""
    settings = get_settings()
    for key in ("data_root", "tasks_root", "knowledge_root"):
        dir_path = Path(settings.paths.model_dump()[key])
        dir_path.mkdir(parents=True, exist_ok=True)
