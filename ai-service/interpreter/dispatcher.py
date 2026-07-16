"""统一解卦调度器 — 按占卜方式分发引擎 + 组装上下文 + 调 LLM"""

import json
from engines import engine_registry
from knowledge.loader import knowledge_loader
from prompts.manager import prompt_manager
from context.session_manager import session_manager, Session
from context.context_assembler import context_assembler
from interpreter.llm_client import llm_client


async def divine_stream(method: str, question: str, session_id: str,
                        user_context: dict = None):
    """流式占卜 — 返回 async generator"""

    # --- 第1步：算卦（纯算法，不花 token）---
    engine = engine_registry.get(method)
    if not engine:
        yield {"type": "error", "message": f"不支持的占卜方式: {method}"}
        return

    result = engine.cast()
    yield {"type": "hexagram", "data": result}

    # --- 第2步：查知识库 ---
    knowledge = knowledge_loader.lookup(method, result)
    yield {"type": "knowledge_ready", "count": len(knowledge)}

    # --- 第3步：获取或创建会话 ---
    session = session_manager.get_or_create(session_id, method, result)

    # --- 第4步：加载 System Prompt ---
    system_prompt = prompt_manager.load(method)

    # --- 第5步：组装上下文 ---
    system_content = context_assembler.build(
        system_prompt=system_prompt,
        knowledge=knowledge,
        result=result,
        question=question,
        user_context=user_context,
        chat_history=session.get_history(),
        summary=session.summary,
    )

    # --- 第6步：流式调 LLM ---
    full_response = ""
    try:
        async for chunk in llm_client.stream(
            system=system_content,
            messages=[{"role": "user", "content": question}],
        ):
            full_response += chunk
            yield {"type": "text", "content": chunk}

    except Exception as e:
        yield {"type": "error", "message": f"AI 服务调用失败: {str(e)}"}
        return

    # --- 第7步：保存对话历史 ---
    session.append("user", question)
    session.append("assistant", full_response)

    # --- 第8步：检查是否需要压缩 ---
    if session.should_compress():
        # 异步触发压缩（不阻塞当前请求）
        import asyncio
        asyncio.create_task(_compress_session(session))

    # --- 第9步：返回完成 ---
    yield {
        "type": "done",
        "model": "claude-sonnet-5",
        "tokens": {
            "prompt": len(system_content) // 2,
            "completion": len(full_response) // 2,
        },
    }


async def _compress_session(session: Session):
    """后台压缩会话"""
    from context.summarizer import Summarizer
    summarizer = Summarizer(llm_client)
    summary = await summarizer.summarize(
        session.get_history()[:-2],  # 不压缩最后两轮
        session.original_result,
    )
    if summary:
        session.summary = summary
        # 保留最近几轮原始消息
        from settings import settings
        session.messages = session.messages[-settings.recent_keep_rounds * 2:]
