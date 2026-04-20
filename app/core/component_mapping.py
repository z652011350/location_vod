"""组件路径映射配置模块。

从 CSV 文件加载 kit_name -> component_name -> component_path 的映射关系，
用于闭源代码仓目录结构与开源版本不一致的场景。

component_path 以 '/' 开头表示相对于 code_repo_root 的路径。
例如：component_path=/xxx/path/to/xxxxx 对应 {code_repo_root}/xxx/path/to/xxxxx
"""

import csv
import logging
from pathlib import Path
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_mapping_cache: list[dict] | None = None


def _clear_cache() -> None:
    """清除缓存（主要用于测试）。"""
    global _mapping_cache
    _mapping_cache = None


def load_component_mapping() -> list[dict]:
    """加载并缓存组件路径映射表。

    Returns:
        映射列表，每项包含 kit_name, component_name, component_path。
        如果配置文件不存在或为空，返回空列表。
    """
    global _mapping_cache
    if _mapping_cache is not None:
        return _mapping_cache

    settings = get_settings()
    mapping_file = settings.paths.component_mapping_file
    if not mapping_file:
        _mapping_cache = []
        return _mapping_cache

    path = Path(mapping_file)
    if not path.exists():
        logger.info(f"组件映射文件不存在: {mapping_file}，将使用目录扫描模式")
        _mapping_cache = []
        return _mapping_cache

    try:
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            _mapping_cache = [
                row for row in reader
                if row.get("component_name") and row.get("component_path")
            ]
        logger.info(f"已加载 {len(_mapping_cache)} 条组件路径映射")
    except Exception as e:
        logger.warning(f"加载组件映射文件失败: {e}，将使用目录扫描模式")
        _mapping_cache = []

    return _mapping_cache


def get_component_list(code_repo_root: str) -> list[dict]:
    """获取组件列表，优先使用映射表，否则回退到顶级目录扫描。

    Args:
        code_repo_root: 代码仓根目录路径

    Returns:
        组件列表，每项包含 name 和 path。
    """
    mapping = load_component_mapping()

    if mapping:
        root = Path(code_repo_root)
        result = []
        for row in mapping:
            comp_path = row["component_path"].lstrip("/")
            full_path = root / comp_path
            result.append({
                "name": row["component_name"],
                "path": str(full_path),
                "kit_name": row.get("kit_name", ""),
            })
        return result

    # 回退：扫描顶级目录
    root = Path(code_repo_root)
    if not root.exists():
        return []
    modules = []
    for d in sorted(root.iterdir()):
        if d.is_dir() and not d.name.startswith("."):
            modules.append({"name": d.name, "path": str(d)})
    return modules


def resolve_component_path(component_name: str, code_repo_root: str) -> Optional[str]:
    """根据映射表解析组件的实际代码仓路径。

    Args:
        component_name: 组件名（对应 CSV 中的 component_name 列）
        code_repo_root: 代码仓根目录路径

    Returns:
        映射后的完整路径，如果不在映射表中返回 None。
    """
    mapping = load_component_mapping()
    for row in mapping:
        if row["component_name"] == component_name:
            comp_path = row["component_path"].lstrip("/")
            return str(Path(code_repo_root) / comp_path)
    return None
