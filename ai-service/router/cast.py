"""起卦 API 路由 — 纯算法，不调 LLM"""

from fastapi import APIRouter
from pydantic import BaseModel
from engines import engine_registry

router = APIRouter(prefix="/api/v1")


class CastRequest(BaseModel):
    method: str = "liuyao"


@router.post("/divine/cast")
async def cast_hexagram(req: CastRequest):
    """纯起卦接口 — 只跑算法，返回卦象数据，不调 LLM"""
    engine = engine_registry.get(req.method)
    if not engine:
        return {"code": 400, "message": f"不支持的占卜方式: {req.method}"}

    result = engine.cast()
    return {
        "code": 200,
        "data": result,
    }
