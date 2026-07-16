"""会话管理器 — 管理所有占卜会话，按 sessionId 索引"""

from __future__ import annotations
import time
from dataclasses import dataclass, field
from settings import settings


@dataclass
class Message:
    role: str       # "user" | "assistant"
    content: str
    timestamp: float = field(default_factory=time.time)


@dataclass
class Session:
    session_id: str
    method: str
    original_result: dict          # 卦象硬数据，永不丢
    messages: list[Message] = field(default_factory=list)
    summary: dict | None = None    # 压缩后的结构化摘要
    created_at: float = field(default_factory=time.time)
    invite_count: int = 0          # 本次会话已邀请起卦次数
    invite_rejected: bool = False  # 用户是否拒绝过起卦邀请

    def append(self, role: str, content: str):
        self.messages.append(Message(role=role, content=content))

    def get_history(self) -> list[dict]:
        """返回对话历史（给 AI 用的格式）"""
        return [{"role": m.role, "content": m.content} for m in self.messages]

    def estimate_tokens(self) -> int:
        """粗略估算当前上下文的 token 数"""
        total = 0
        for m in self.messages:
            total += len(m.content) // 2  # 中英文混合粗略估算
        return total

    def should_compress(self) -> bool:
        return self.estimate_tokens() > settings.max_context_tokens


class SessionManager:
    """管理所有会话"""

    def __init__(self):
        self._sessions: dict[str, Session] = {}

    def get_or_create(self, session_id: str, method: str = "liuyao",
                      original_result: dict = None) -> Session:
        if session_id not in self._sessions:
            self._sessions[session_id] = Session(
                session_id=session_id,
                method=method,
                original_result=original_result or {},
            )

        session = self._sessions[session_id]
        # 更新卦象硬数据（追问时可能为空）
        if original_result:
            session.original_result = original_result

        return session

    def get(self, session_id: str):
        return self._sessions.get(session_id)

    def remove_expired(self):
        """清理过期会话"""
        now = time.time()
        expired = [
            sid for sid, s in self._sessions.items()
            if now - s.created_at > settings.session_ttl_seconds
        ]
        for sid in expired:
            del self._sessions[sid]


session_manager = SessionManager()
