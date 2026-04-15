from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.page_api import router as page_router
from app.api.task_api import router as task_router
from app.core.config import get_settings
from app.core.paths import ensure_dirs


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    ensure_dirs()
    yield


app = FastAPI(title="Location VOD - HarmonyOS 问题辅助定位", lifespan=lifespan)

# 注册 API 路由
app.include_router(task_router)

# 注册页面路由
app.include_router(page_router)

# 静态文件
static_dir = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
