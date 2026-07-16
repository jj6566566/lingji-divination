"""DeepSeek API 调用封装 — 流式 + 普通（OpenAI 兼容接口）"""

import json
from openai import AsyncOpenAI
from settings import settings


class LLMClient:
    """DeepSeek API 客户端（延迟初始化，首次调用时创建连接）"""

    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=settings.deepseek_api_key,
                base_url=settings.deepseek_base_url,
            )
        return self._client

    async def stream(self,
                     system: str,
                     messages: list[dict],
                     model: str = None,
                     max_tokens: int = None,
                     temperature: float = None,
                     tools: list[dict] = None):
        """流式调用 DeepSeek。

        当 tools 提供时，yield 两种事件：
          {"type": "text", "content": "..."}
          {"type": "tool_call", "name": "...", "arguments": {...}}
        """
        full_messages = [{"role": "system", "content": system}] + messages

        kwargs = {
            "model": model or settings.default_model,
            "max_tokens": max_tokens or settings.max_tokens,
            "temperature": temperature or settings.temperature,
            "messages": full_messages,
            "stream": True,
        }
        if tools:
            kwargs["tools"] = tools

        stream = await self.client.chat.completions.create(**kwargs)

        # 累积 tool calls（跨 chunk 拼接）
        tool_calls: dict[int, dict] = {}  # index -> {id, name, arguments}

        async for chunk in stream:
            delta = chunk.choices[0].delta

            if delta.content:
                yield {"type": "text", "content": delta.content}

            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = tc.index
                    if idx not in tool_calls:
                        tool_calls[idx] = {"id": "", "name": "", "arguments": ""}
                    if tc.id:
                        tool_calls[idx]["id"] = tc.id
                    if tc.function:
                        if tc.function.name:
                            tool_calls[idx]["name"] += tc.function.name
                        if tc.function.arguments:
                            tool_calls[idx]["arguments"] += tc.function.arguments

        # 输出完整的 tool calls
        for tc_data in sorted(tool_calls.values(), key=lambda t: t["id"]):
            if tc_data["name"]:
                try:
                    args = json.loads(tc_data["arguments"])
                except Exception:
                    args = {}
                yield {"type": "tool_call", "name": tc_data["name"], "arguments": args}

    async def chat(self,
                   messages: list[dict],
                   system: str = None,
                   model: str = None,
                   max_tokens: int = None,
                   temperature: float = None) -> str:
        """非流式调用 DeepSeek，返回完整响应"""
        full_messages = []
        if system:
            full_messages.append({"role": "system", "content": system})
        full_messages.extend(messages)

        response = await self.client.chat.completions.create(
            model=model or settings.default_model,
            max_tokens=max_tokens or settings.max_tokens,
            temperature=temperature or settings.temperature,
            messages=full_messages,
        )
        return response.choices[0].message.content


# 全局单例
llm_client = LLMClient()
