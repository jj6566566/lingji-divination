"""摘要压缩器 — 压缩旧对话为结构化摘要"""

from settings import settings
from interpreter.llm_client import LLMClient


class Summarizer:
    """调 LLM 压缩对话历史"""

    def __init__(self, llm_client: LLMClient = None):
        self.llm_client = llm_client

    async def summarize(self, messages: list[dict], original_result: dict) -> dict:
        """将对话历史压缩为结构化摘要"""
        if not self.llm_client:
            return {}

        conversation = "\n".join(
            [f"[{m['role']}]: {m['content']}" for m in messages]
        )

        result_text = ""
        orig = original_result.get("original", {})
        trans = original_result.get("transformed")
        result_text = f"本卦: {orig.get('name','')}"
        if trans:
            result_text += f" → 变卦: {trans.get('name','')}"

        prompt = f"""请将以下占卜对话压缩成一段结构化摘要。保留关键信息，去掉寒暄。

卦象: {result_text}

对话:
{conversation}

返回 JSON 格式:
{{
  "user_profile": "用户的基本信息和处境",
  "divination_brief": "卦象和核心结论",
  "key_insights": ["关键发现1", "关键发现2"],
  "unresolved_questions": ["还没回答的问题"]
}}"""

        try:
            # 用便宜的模型做压缩
            response = await self.llm_client.chat(
                messages=[{"role": "user", "content": prompt}],
                model=settings.cheap_model,
                max_tokens=500,
                temperature=0.3,
            )
            import json
            return json.loads(response)
        except Exception:
            return {"compressed_text": conversation[:500]}
