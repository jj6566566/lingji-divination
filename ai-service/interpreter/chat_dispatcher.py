"""对话式占卜调度器 — 多轮对话 + 起卦 + 解卦 + 报告"""

from __future__ import annotations
import json
import asyncio
from engines import engine_registry
from knowledge.formatter import inject_knowledge
from prompts.manager import prompt_manager
from context.session_manager import session_manager, Session
from interpreter.llm_client import llm_client

# 起卦邀请工具定义（Function Calling）
INVITE_TOOL = {
    "type": "function",
    "function": {
        "name": "invite_casting",
        "description": (
            "邀请用户起卦占卜。当经过充分交流、用户问题已经清晰，你决定提议起卦时调用。"
            "不要在刚开始对话、用户还在倾诉、或已经起过卦正在追问时调用。"
        ),
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
}
from settings import settings


async def chat_stream(
    method: str,
    message: str,
    session_id: str,
    hexagram: dict | None = None,
    action: str = "chat",  # "chat" | "interpret" | "report"
    invite_rejected: bool = False,
    record_id: int | None = None,
    history: list[dict] | None = None,
) -> dict:
    """多轮对话流式响应

    Args:
        method: 占卜方式 (liuyao, etc.)
        message: 用户消息
        session_id: 会话 ID
        hexagram: 卦象数据（起卦完成时传入）
        action: 当前动作类型
        record_id: 占卜记录 ID（透传回 done 事件）
        history: 预填充的对话历史（从 DB 恢复 session 用）
    """
    # --- 第1步：获取或创建会话 ---
    session = session_manager.get_or_create(session_id, method)

    # 处理用户拒绝起卦邀请
    if invite_rejected:
        session.invite_rejected = True

    # 如果提供了 history（从 DB 恢复的对话历史），预填充到 session
    if history and not session.messages:
        for msg in history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if content:
                session.append(role, content)

    # --- 第2步：加载 System Prompt（含 64 卦全量知识）---
    raw_prompt = prompt_manager.load(f"{method}_chat")
    if not raw_prompt:
        # 回退到旧 prompt
        raw_prompt = prompt_manager.load(method)

    # 注入 64 卦全量知识
    system_prompt = inject_knowledge(raw_prompt)

    # --- 第3步：保存卦象数据（如果有）---
    if hexagram:
        session.original_result = hexagram
        session.append("system", json.dumps({
            "event": "hexagram_cast",
            "data": {
                "original": hexagram.get("original", {}).get("name", ""),
                "transformed": hexagram.get("transformed", {}).get("name", "") if hexagram.get("transformed") else None,
                "changing_lines": [cl.get("name", "") for cl in hexagram.get("changing_lines", [])],
            }
        }, ensure_ascii=False))

    # --- 第4步：构建消息列表 ---
    messages = build_messages(session, message, hexagram, action)

    # --- 第5步：流式调 LLM（带 tool calling）---
    # 非 greet/interpret/report 的对话中启用起卦邀请工具
    enable_tools = action not in ("greet", "interpret", "report")
    tools = [INVITE_TOOL] if enable_tools else None

    print(f"[DEBUG] action={action}, tools_enabled={enable_tools}, "
          f"msg_count={len(messages)}, "
          f"system_prompt_len={len(system_prompt)}, "
          f"hexagram_keys={list(hexagram.keys()) if hexagram else None}",
          flush=True)

    full_response = ""
    tool_called = None
    event_count = 0
    try:
        async for event in llm_client.stream(
            system=system_prompt,
            messages=messages,
            temperature=0.9 if action == "greet" else None,
            tools=tools,
        ):
            event_count += 1
            if event["type"] == "text":
                full_response += event["content"]
                yield {"type": "text", "content": event["content"]}
            elif event["type"] == "tool_call":
                if event["name"] == "invite_casting":
                    tool_called = event

        print(f"[DEBUG] stream completed, event_count={event_count}, "
              f"response_len={len(full_response)}, "
              f"tool_called={tool_called is not None}",
              flush=True)

    except Exception as e:
        print(f"[DEBUG] stream ERROR: {e}", flush=True)
        yield {"type": "error", "message": f"AI 服务调用失败: {str(e)}"}
        return

    # --- 第6步：保存对话历史 ---
    session.append("user", message)
    session.append("assistant", full_response)

    # --- 第7步：检查是否需要压缩 ---
    if session.should_compress():
        asyncio.create_task(_compress_session(session))

    # --- 第8步：信任 AI 的判断 ---
    # AI 调用了 invite_casting() 说明它已在对话中判断时机合适
    # 不再做额外的冷却限制 — Prompt 里的规则足够约束 AI 的行为
    offer_cast = tool_called is not None

    done_event = {
        "type": "done",
        "offer_cast": offer_cast,
        "tokens": {
            "prompt": len(system_prompt) // 2,
            "completion": len(full_response) // 2,
        },
        "chat_history": [
            {"role": m["role"], "content": m["content"]}
            for m in session.get_history()
        ],
    }
    if record_id is not None:
        done_event["recordId"] = record_id

    yield done_event


def build_messages(
    session: Session,
    current_message: str,
    hexagram: dict | None,
    action: str,
) -> list[dict]:
    """构建发给 LLM 的消息列表"""
    messages = []

    # 添加历史消息（含摘要替代的旧消息）
    history = session.get_history()
    if session.summary:
        # 有摘要时：摘要 + 最近几轮
        messages.append({
            "role": "system",
            "content": f"【此前对话的摘要】{json.dumps(session.summary, ensure_ascii=False)}"
        })
        recent = history[-(settings.recent_keep_rounds * 2):]
        messages.extend(recent)
    else:
        messages.extend(history)

    # 追问时提醒：围绕原始卦象，不要捏造新卦
    if action == "chat" and session.original_result and session.original_result.get("lines"):
        hex_reminder = _format_hexagram_for_chat(session.original_result)
        messages.append({
            "role": "system",
            "content": f"【重要提醒】用户正在追问之前的卦。以下是当初起出的卦象（系统引擎生成，不可改变）。请围绕这个卦象回答用户的问题，绝对不要编造新的卦名或爻线。\n\n{hex_reminder}",
        })

    # 欢迎语：用户刚进入，LLM 主动打招呼
    if action == "greet":
        messages.append({
            "role": "system",
            "content": "(用户刚刚进入对话。请根据你的身份，主动向用户打招呼。语气自然有古韵，不要像客服一样说「请问有什么可以帮您」)",
        })
        # 必须有 user 消息来触发 LLM 回复（DeepSeek API 要求以 user 结尾）
        messages.append({
            "role": "user",
            "content": current_message or "你好",
        })
    # 如果是起卦后的解读请求
    elif action == "interpret" and hexagram:
        hex_context = _format_hexagram_for_chat(hexagram)
        messages.append({
            "role": "system",
            "content": (
                "起卦完成。请严格按照 System Prompt 中「第四阶段：解卦」的三步结构为用户解读。\n"
                "三步缺一不可：收束 → 分层拆解（六爻全讲，每爻锚定用户处境）→ 综合解读（串画面+引爻辞+给分量结尾+追问）。\n"
                "你不是在翻译古文，你是在用卦讲述用户的处境。\n\n"
                f"卦象数据：\n{hex_context}"
            ),
        })
        # 用户的消息作为触发
        messages.append({
            "role": "user",
            "content": current_message or "请先生为我解卦"
        })
    elif action == "report" and session.original_result:
        hex_context = _format_hexagram_for_chat(session.original_result)
        messages.append({
            "role": "system",
            "content": f"用户希望查看完整报告。请基于以下卦象和对话历史，为用户撰写一份完整的占卜报告（一封信的格式）。\n\n卦象：\n{hex_context}"
        })
        messages.append({
            "role": "user",
            "content": current_message or "请为我写一份完整的占卜报告"
        })
    else:
        # 普通对话
        messages.append({
            "role": "user",
            "content": current_message
        })

    return messages


def _format_hexagram_for_chat(hexagram: dict) -> str:
    """格式化卦象数据为 LLM 可读文本"""
    lines = []

    original = hexagram.get("original", {})
    if original:
        lines.append(f"本卦：{original.get('name', '')} {original.get('symbol', '')}")
        if original.get("full_name"):
            lines.append(f"全称：{original['full_name']}")

    transformed = hexagram.get("transformed")
    if transformed:
        lines.append(f"变卦：{transformed.get('name', '')} {transformed.get('symbol', '')}")

    changing = hexagram.get("changing_lines", [])
    if changing:
        names = [c.get("name", f"第{c.get('position','')}爻") for c in changing]
        lines.append(f"变爻：{', '.join(names)}")

    lines.append("\n六爻详情：")
    for line_data in hexagram.get("lines", []):
        pos = line_data["position"]
        yao_type = line_data["type"]
        marker = " 【动爻】" if line_data.get("changing") else ""
        yang = "阳" if line_data.get("yang") else "阴"
        lines.append(f"  第{pos}爻：{yao_type}（{yang}）{marker}")

    return "\n".join(lines)


async def _compress_session(session: Session):
    """后台压缩会话"""
    from context.summarizer import Summarizer
    summarizer = Summarizer(llm_client)
    summary = await summarizer.summarize(
        session.messages[:-2],
        session.original_result,
    )
    if summary:
        session.summary = summary
        session.messages = session.messages[-settings.recent_keep_rounds * 2:]


async def generate_report(
    method: str,
    session_id: str,
) -> dict:
    """生成完整占卜报告（用于独立报告生成请求）"""
    session = session_manager.get(session_id)
    if not session or not session.original_result:
        yield {"type": "error", "message": "未找到对应的占卜记录"}
        return

    raw_prompt = prompt_manager.load(f"{method}_chat")
    system_prompt = inject_knowledge(raw_prompt)

    hex_context = _format_hexagram_for_chat(session.original_result)

    report_instruction = f"""请为用户撰写一份完整的六爻占卜报告。格式为一封信——"清玄道人致某某"。

报告需包含：
1. 回应用户的问题和处境
2. 本卦总解（卦辞 + 白话 + 大意）
3. 逐爻分析（每个变爻的爻辞 + 白话 + 关联用户处境）
4. 变卦含义（如有）
5. 综合判断
6. 趋避建议
7. 结尾寄语

语气：像长辈给晚辈写信，有温度，有分寸，不模板化。

卦象数据：
{hex_context}"""

    full_report = ""
    try:
        async for event in llm_client.stream(
            system=system_prompt,
            messages=session.get_history() + [
                {"role": "system", "content": report_instruction},
                {"role": "user", "content": "请为我写一份完整的占卜报告"},
            ],
        ):
            if event["type"] == "text":
                full_report += event["content"]
                yield {"type": "text", "content": event["content"]}
            elif event["type"] == "error":
                yield event
    except Exception as e:
        yield {"type": "error", "message": f"报告生成失败: {str(e)}"}
        return

    session.append("assistant", f"[报告]\n{full_report}")
    yield {"type": "done"}
