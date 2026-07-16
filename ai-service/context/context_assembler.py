"""上下文组装器 — 组装发给 LLM 的最终 Prompt"""

from __future__ import annotations
from context.session_manager import Session


class ContextAssembler:
    """将系统指令、卦象知识、对话历史组装成最终 Prompt"""

    def build(self,
              system_prompt: str,
              knowledge: list[dict],
              result: dict,
              question: str,
              user_context: dict | None = None,
              chat_history: list[dict] | None = None,
              summary: dict | None = None) -> str:

        # 格式化知识
        knowledge_text = self._format_knowledge(knowledge)

        # 用户上下文
        user_text = ""
        if user_context:
            profile = user_context.get("userProfile", "")
            if profile:
                user_text = f"用户背景: {profile}\n"

        # 当前问题
        question_text = f"用户的问题: {question}"

        # 如果有所述摘要
        summary_text = ""
        if summary:
            summary_text = f"之前的对话摘要: {summary}\n"

        # 构建系统消息内容
        system_content = f"""{system_prompt}

## 当前卦象
{self._format_result(result)}

## 相关卦辞爻辞
{knowledge_text}

## 用户信息
{user_text}
{question_text}
"""

        if summary_text:
            system_content += f"\n{summary_text}"

        return system_content

    def _format_result(self, result: dict) -> str:
        """格式化卦象结果"""
        lines = []
        original = result.get("original", {})
        if original:
            lines.append(f"本卦: {original.get('full_name', original.get('name', ''))}")

        transformed = result.get("transformed")
        if transformed:
            lines.append(f"变卦: {transformed.get('full_name', transformed.get('name', ''))}")

        changing = result.get("changing_lines", [])
        if changing:
            names = [c["name"] for c in changing]
            lines.append(f"变爻: {', '.join(names)}")

        for line in result.get("lines", []):
            marker = " (动)" if line.get("changing") else ""
            lines.append(f"第{line['position']}爻: {line['type']}{marker}")

        return "\n".join(lines)

    def _format_knowledge(self, knowledge: list[dict]) -> str:
        """格式化知识检索结果"""
        if not knowledge:
            return "无特别记录"

        parts = []
        for k in knowledge:
            t = k["type"]
            if t == "hexagram":
                parts.append(f"【{k['name']}】卦辞: {k.get('judgment','')}")
                if k.get("image"):
                    parts.append(f"大象: {k['image']}")
                if k.get("tuan"):
                    parts.append(f"彖传: {k['tuan']}")
            elif t == "yao_line":
                parts.append(f"【{k['name']}】爻辞: {k.get('text','')}")
                if k.get("commentary"):
                    parts.append(f"象传: {k.get('commentary','')}")
            elif t == "transformed_hexagram":
                parts.append(f"【{k['name']}（变卦）】卦辞: {k.get('judgment','')}")

        return "\n".join(parts)


context_assembler = ContextAssembler()
