from pathlib import Path
from typing import List

import yaml
from pydantic import BaseModel


class AppConfig(BaseModel):
    host: str = "127.0.0.1"
    port: int = 8000


class PathsConfig(BaseModel):
    data_root: str = "data"
    tasks_root: str = "data/tasks"
    knowledge_root: str = "data/knowledge"
    code_repo_root: str = ""
    docs_repo_root: str = ""
    sdk_repo_root: str = ""
    component_mapping_file: str = ""


class AgentConfig(BaseModel):
    command: str = "claude"
    allowed_tools: List[str] = [
        "Bash", "Read", "Write", "Edit", "Grep", "Glob", "Agent"
    ]


class RuntimeConfig(BaseModel):
    max_concurrent_tasks: int = 1
    task_timeout_seconds: int = 900


class Settings(BaseModel):
    app: AppConfig = AppConfig()
    paths: PathsConfig = PathsConfig()
    agent: AgentConfig = AgentConfig()
    runtime: RuntimeConfig = RuntimeConfig()


_config: Settings | None = None


def load_config(config_path: str = "config/config.yaml") -> Settings:
    global _config
    path = Path(config_path)
    if not path.exists():
        raise FileNotFoundError(f"配置文件不存在: {config_path}")
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    _config = Settings(**(data or {}))
    return _config


def get_settings() -> Settings:
    global _config
    if _config is None:
        _config = load_config()
    return _config
