from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

router = APIRouter(tags=["pages"])

templates_dir = Path(__file__).resolve().parent.parent / "templates"
templates = Jinja2Templates(directory=str(templates_dir))


@router.get("/app/", response_class=HTMLResponse)
async def page_index(request: Request):
    """主页：提交问题 + 任务列表。"""
    return templates.TemplateResponse(request, "index.html", context={})


@router.get("/app/tasks/{task_id}", response_class=HTMLResponse)
async def page_task_detail(request: Request, task_id: str):
    """详情页：对话式分析过程展示。"""
    return templates.TemplateResponse(
        request, "task_detail.html", context={"task_id": task_id}
    )
