"""对话式占卜 API 路由"""

from __future__ import annotations
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from interpreter.chat_dispatcher import chat_stream, generate_report

router = APIRouter(prefix="/api/v1")


class ChatRequest(BaseModel):
    method: str = "liuyao"
    message: str = ""
    sessionId: str = ""
    hexagram: dict | None = None
    action: str = "chat"  # "chat" | "interpret" | "report"
    inviteRejected: bool = False  # 用户是否拒绝了起卦邀请
    recordId: int | None = None   # 占卜记录 ID（持久化追问用）
    history: list[dict] | None = None  # 预填充的对话历史（session 恢复用）
    threadId: str | None = None  # 对话线程 ID（前端生成，归组多次占卜）


@router.post("/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    """对话流式接口 — 多轮聊天 + 解卦 + 报告"""

    async def event_generator():
        async for chunk in chat_stream(
            method=req.method,
            message=req.message,
            session_id=req.sessionId or f"anon_{req.method}_{id(req)}",
            hexagram=req.hexagram,
            action=req.action,
            invite_rejected=req.inviteRejected,
            record_id=req.recordId,
            history=req.history,
        ):
            event_type = chunk.get("type", "message")
            data = json.dumps(chunk, ensure_ascii=False)

            if event_type == "text":
                yield f"event: text\ndata: {data}\n\n"
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


class ReportRequest(BaseModel):
    method: str = "liuyao"
    sessionId: str


@router.post("/chat/report")
async def report_stream_endpoint(req: ReportRequest):
    """独立报告生成接口"""

    async def event_generator():
        async for chunk in generate_report(
            method=req.method,
            session_id=req.sessionId,
        ):
            event_type = chunk.get("type", "message")
            data = json.dumps(chunk, ensure_ascii=False)
            if event_type == "text":
                yield f"event: text\ndata: {data}\n\n"
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
