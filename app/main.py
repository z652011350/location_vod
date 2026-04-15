from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.task_api import router as task_router
from app.api.knowledge_api import router as knowledge_router
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
app.include_router(knowledge_router)

# React 前端构建产物
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    # 静态资源（JS/CSS）
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    # SPA fallback: 所有非 /api 路由返回 index.html
    @app.get("/{path:path}")
    async def serve_spa(request: Request, path: str):
        # 不拦截 API 路由
        if path.startswith("api/"):
            return None
        # 尝试匹配静态文件
        file_path = frontend_dist / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        # SPA fallback
        return FileResponse(str(frontend_dist / "index.html"))
