from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.store.knowledge_store import (
    list_modules,
    get_module_meta,
    list_module_files,
    read_knowledge_file,
    write_knowledge_file,
    update_module_status,
    is_agent_running,
)

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


class UpdateStatusRequest(BaseModel):
    status: str


class UpdateFileRequest(BaseModel):
    content: str


@router.get("")
async def api_list_modules():
    """列出所有知识模块。"""
    return list_modules()


@router.get("/{module_name}")
async def api_get_module(module_name: str):
    """获取模块元数据和文件列表。"""
    meta = get_module_meta(module_name)
    if meta is None:
        raise HTTPException(status_code=404, detail="模块不存在")
    return meta


@router.get("/{module_name}/files/{filename}")
async def api_get_file(module_name: str, filename: str):
    """获取知识文件内容。"""
    content = read_knowledge_file(module_name, filename)
    if content is None:
        raise HTTPException(status_code=404, detail="文件不存在")
    return {"filename": filename, "content": content}


@router.put("/{module_name}/status")
async def api_update_status(module_name: str, req: UpdateStatusRequest):
    """更新模块状态标签。"""
    try:
        meta = update_module_status(module_name, req.status)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if meta is None:
        raise HTTPException(status_code=404, detail="模块不存在")
    return meta


@router.put("/{module_name}/files/{filename}")
async def api_update_file(module_name: str, filename: str, req: UpdateFileRequest):
    """更新知识文件内容（人工编辑）。"""
    # 编辑锁：agent 运行时禁止编辑文件内容
    if is_agent_running():
        raise HTTPException(status_code=409, detail="知识库构建任务正在运行，暂时禁止编辑。仅允许更改状态标签进行确认。")
    try:
        write_knowledge_file(module_name, filename, req.content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    # 编辑后自动更新状态为 edited
    update_module_status(module_name, "edited")
    return {"message": "文件已更新，状态已变为 edited"}
