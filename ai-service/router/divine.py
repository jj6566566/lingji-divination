"""占卜 API 路由"""

import json
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from interpreter.dispatcher import divine_stream

router = APIRouter(prefix="/api/v1")


class DivineRequest(BaseModel):
    method: str = "liuyao"
    question: str
    sessionId: str = ""
    params: dict = Field(default_factory=dict)
    context: dict = Field(default_factory=dict)


@router.post("/divine/stream")
async def divine_stream_endpoint(req: DivineRequest):
    """流式占卜接口 — SSE 格式返回"""

    async def event_generator():
        async for chunk in divine_stream(
            method=req.method,
            question=req.question,
            session_id=req.sessionId or f"anon_{req.method}",
            user_context=req.context,
        ):
            event_type = chunk.get("type", "message")
            data = json.dumps(chunk, ensure_ascii=False)

            if event_type == "hexagram":
                yield f"event: hexagram\ndata: {data}\n\n"
            elif event_type == "text":
                yield f"event: interpretation\ndata: {data}\n\n"
            elif event_type == "error":
                yield f"event: error\ndata: {data}\n\n"
            elif event_type == "done":
                yield f"event: done\ndata: {data}\n\n"
            else:
                yield f"event: {event_type}\ndata: {data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
