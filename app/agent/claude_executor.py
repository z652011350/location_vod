import asyncio
import logging
from pathlib import Path
from typing import AsyncIterator, Optional

from app.core.config import get_settings
from app.store.event_store import append_event

logger = logging.getLogger(__name__)

# 全局进程注册表：跟踪运行中的 ClaudeExecutor 实例，供中止任务使用
_running_executors: dict[str, "ClaudeExecutor"] = {}


def register_executor(task_id: str, executor: "ClaudeExecutor") -> None:
    """注册运行中的 executor。"""
    _running_executors[task_id] = executor


def unregister_executor(task_id: str) -> None:
    """注销 executor（执行完成或异常后调用）。"""
    _running_executors.pop(task_id, None)


def get_running_executor(task_id: str) -> Optional["ClaudeExecutor"]:
    """获取指定任务的运行中 executor，无则返回 None。"""
    return _running_executors.get(task_id)


def get_running_pid(task_id: str) -> Optional[int]:
    """获取指定任务运行中 Claude CLI 子进程的 PID，无则返回 None。"""
    executor = _running_executors.get(task_id)
    if executor and executor.process and executor.process.returncode is None:
        return executor.process.pid
    return None


class ClaudeExecutor:
    """封装 Claude Code CLI 的子进程调用。"""

    def __init__(self, task_id: str):
        self.task_id = task_id
        self.settings = get_settings()
        self.process: Optional[asyncio.subprocess.Process] = None

    def _build_command(self, prompt: str) -> list[str]:
        """构建 CLI 命令参数列表。"""
        tools_str = ",".join(self.settings.agent.allowed_tools)
        prompt = prompt.replace('\\','\\\\').replace('"','\\"').replace('\n','\\n')

        return [
            self.settings.agent.command,
            "-p", prompt,
            "--allowedTools", tools_str,
        ]

    async def execute(self, prompt: str) -> AsyncIterator[str]:
        """执行 Claude CLI 命令，实时 yield stdout 行。

        同时将每行写入 process/stdout.log 并作为事件记录。
        """
        cmd = self._build_command(prompt)
        logger.info(f"[{self.task_id}] 执行命令: {' '.join(cmd[:3])}...")

        self.process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        # 记录子进程 PID
        append_event(self.task_id, "cli_started", {"pid": self.process.pid})
        logger.info(f"[{self.task_id}] Claude CLI 进程已启动, PID: {self.process.pid}")

        # 读取 stderr 的后台任务
        stderr_lines: list[str] = []

        async def _read_stderr():
            assert self.process.stderr is not None
            async for line in self.process.stderr:
                stderr_lines.append(line.decode("utf-8", errors="replace"))

        stderr_task = asyncio.create_task(_read_stderr())

        # 实时读取 stdout
        stdout_log_path = self._get_stdout_log_path()
        assert self.process.stdout is not None

        async for raw_line in self.process.stdout:
            text = raw_line.decode("utf-8", errors="replace").rstrip("\n")
            if text:
                # 写入 stdout.log
                with open(stdout_log_path, "a", encoding="utf-8") as f:
                    f.write(text + "\n")
                yield text

        await stderr_task

        # 写入 stderr.log
        if stderr_lines:
            stderr_path = self._get_stderr_log_path()
            with open(stderr_path, "w", encoding="utf-8") as f:
                f.writelines(stderr_lines)

        return_code = await self.process.wait()
        if return_code != 0:
            stderr_msg = "".join(stderr_lines[-5:]) if stderr_lines else "无 stderr 输出"
            logger.error(f"[{self.task_id}] CLI 退出码 {return_code}: {stderr_msg}")

    async def kill(self) -> None:
        """终止正在运行的进程。"""
        if self.process and self.process.returncode is None:
            self.process.kill()
            await self.process.wait()
            logger.info(f"[{self.task_id}] 进程已终止")

    def _get_task_dir(self) -> Path:
        from app.manager.workspace_manager import get_task_dir
        d = get_task_dir(self.task_id)
        assert d is not None, f"任务目录不存在: {self.task_id}"
        return d

    def _get_stdout_log_path(self) -> Path:
        return self._get_task_dir() / "process" / "stdout.log"

    def _get_stderr_log_path(self) -> Path:
        return self._get_task_dir() / "process" / "stderr.log"


async def run_with_timeout(
    task_id: str,
    prompt: str,
    timeout: Optional[int] = None,
) -> list[str]:
    """执行 CLI 命令，带超时控制，返回所有 stdout 行。"""
    if timeout is None:
        timeout = get_settings().runtime.task_timeout_seconds

    executor = ClaudeExecutor(task_id)
    lines: list[str] = []

    register_executor(task_id, executor)
    try:
        async with asyncio.timeout(timeout):
            async for line in executor.execute(prompt):
                lines.append(line)
                append_event(task_id, "cli_output", {"content": line[:500]})
    except TimeoutError:
        await executor.kill()
        append_event(task_id, "cli_timeout", {"message": f"执行超时 ({timeout}s)"})
        raise
    except Exception as e:
        append_event(task_id, "cli_error", {"message": str(e)})
        raise
    finally:
        unregister_executor(task_id)

    return lines
