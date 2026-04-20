import json
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.core.config import get_settings

# module_name 安全校验正则
MODULE_NAME_PATTERN = re.compile(r"^[a-zA-Z0-9_-]+$")

# 允许的文件名正则（禁止路径遍历）
FILENAME_PATTERN = re.compile(r"^[a-zA-Z0-9_.-]+$")

VALID_STATUSES = {"ai_native", "confirmed", "edited"}


def _knowledge_root() -> Path:
    return Path(get_settings().paths.knowledge_root)


def _resolve_module_path(module_name: str) -> Path:
    """解析并验证模块目录路径，防止路径遍历。"""
    if not MODULE_NAME_PATTERN.match(module_name):
        raise ValueError(f"无效的模块名: {module_name}")
    path = (_knowledge_root() / module_name).resolve()
    if not str(path).startswith(str(_knowledge_root().resolve())):
        raise ValueError(f"路径越界: {module_name}")
    return path


def _resolve_file_path(module_name: str, filename: str) -> Path:
    """解析并验证文件路径，防止路径遍历。"""
    if not FILENAME_PATTERN.match(filename):
        raise ValueError(f"无效的文件名: {filename}")
    module_path = _resolve_module_path(module_name)
    file_path = (module_path / filename).resolve()
    if not str(file_path).startswith(str(module_path.resolve())):
        raise ValueError(f"路径越界: {filename}")
    return file_path


def list_modules() -> list[dict]:
    """列出所有知识模块及其元数据。"""
    root = _knowledge_root()
    if not root.exists():
        return []
    results = []
    for d in sorted(root.iterdir()):
        if d.is_dir() and MODULE_NAME_PATTERN.match(d.name):
            # 始终从磁盘扫描实际文件
            files = sorted(f.name for f in d.iterdir() if f.is_file() and f.name != "meta.json")
            meta = _read_meta(d.name)
            if meta:
                meta["files"] = files
                results.append(meta)
            else:
                if files:
                    results.append({
                        "module_name": d.name,
                        "status": "ai_native",
                        "built_at": None,
                        "files": files,
                    })
    return results


def get_module_meta(module_name: str) -> Optional[dict]:
    """获取模块元数据。

    始终从磁盘扫描实际文件列表（而非使用 meta.json 缓存），
    确保手动添加到目录的文件也能被前端看到。
    """
    module_path = _resolve_module_path(module_name)
    if not module_path.exists():
        return None
    # 从磁盘扫描实际文件列表
    files = sorted(f.name for f in module_path.iterdir() if f.is_file() and f.name != "meta.json")
    meta = _read_meta(module_name)
    if meta:
        # 使用 meta.json 中的状态和元数据，但文件列表始终从磁盘获取
        meta["files"] = files
        return meta
    return {
        "module_name": module_name,
        "status": "ai_native",
        "built_at": None,
        "files": files,
    }


def list_module_files(module_name: str) -> list[str]:
    """列出模块下的知识文件。"""
    module_path = _resolve_module_path(module_name)
    if not module_path.exists():
        return []
    return sorted(f.name for f in module_path.iterdir() if f.is_file() and f.name != "meta.json")


def init_module_meta(module_name: str) -> dict:
    """在知识文件生成后初始化 meta.json。由后端统一调用。"""
    module_path = _resolve_module_path(module_name)
    files = [f.name for f in module_path.iterdir() if f.is_file() and f.name != "meta.json"]
    meta = {
        "module_name": module_name,
        "status": "ai_native",
        "built_at": datetime.now().isoformat(),
        "files": sorted(files),
    }
    with open(module_path / "meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    return meta


def update_module_status(module_name: str, status: str) -> Optional[dict]:
    """更新模块状态标签。"""
    if status not in VALID_STATUSES:
        raise ValueError(f"无效状态: {status}，允许值: {VALID_STATUSES}")
    module_path = _resolve_module_path(module_name)
    meta_file = module_path / "meta.json"
    if not meta_file.exists():
        return None
    with open(meta_file, "r", encoding="utf-8") as f:
        meta = json.load(f)
    meta["status"] = status
    meta["updated_at"] = datetime.now().isoformat()
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    return meta


def read_knowledge_file(module_name: str, filename: str) -> Optional[str]:
    """读取知识文件内容。"""
    file_path = _resolve_file_path(module_name, filename)
    if not file_path.exists():
        return None
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def write_knowledge_file(module_name: str, filename: str, content: str) -> None:
    """写入知识文件内容（人工编辑）。"""
    _resolve_module_path(module_name)  # 验证模块存在
    file_path = _resolve_file_path(module_name, filename)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)


def is_agent_running() -> bool:
    """检查是否有知识库构建 agent 正在运行。"""
    from app.store.task_store import list_tasks
    tasks = list_tasks()
    return any(
        t.get("task_type") == "knowledge_building" and t.get("status") == "running"
        for t in tasks
    )


def is_any_task_running() -> bool:
    """检查是否有任何任务正在运行（包括知识库构建和问题定位）。"""
    from app.store.task_store import list_tasks
    tasks = list_tasks()
    return any(t.get("status") == "running" for t in tasks)


def create_knowledge_file(module_name: str, filename: str, content: str) -> dict:
    """创建新的知识文件并刷新 meta.json。

    Args:
        module_name: 模块名
        filename: 文件名（必须符合 FILENAME_PATTERN）
        content: 文件内容

    Returns:
        更新后的 meta.json 内容
    """
    module_path = _resolve_module_path(module_name)
    if not module_path.exists():
        raise FileNotFoundError(f"模块不存在: {module_name}")

    file_path = _resolve_file_path(module_name, filename)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

    # 刷新 meta.json
    return init_module_meta(module_name)


def _read_meta(module_name: str) -> Optional[dict]:
    """读取 meta.json，不存在返回 None。"""
    module_path = _resolve_module_path(module_name)
    meta_file = module_path / "meta.json"
    if not meta_file.exists():
        return None
    with open(meta_file, "r", encoding="utf-8") as f:
        return json.load(f)
