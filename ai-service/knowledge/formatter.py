"""将 64 卦知识库格式化为 System Prompt 可注入的文本"""

import json
from pathlib import Path


def load_hexagrams(data_dir: str = None) -> list[dict]:
    """加载 64 卦数据"""
    if data_dir is None:
        data_dir = Path(__file__).parent
    else:
        data_dir = Path(data_dir)

    with open(data_dir / "iching_64.json", "r", encoding="utf-8") as f:
        return json.load(f)


def format_hexagram(hex_data: dict) -> str:
    """格式化单个卦为文本"""
    lines = []
    lines.append(f"### {hex_data['number']}. {hex_data['name']} {hex_data['symbol']}")
    lines.append(f"- 卦辞：{hex_data['judgment']}")
    if hex_data.get("tuan"):
        lines.append(f"- 彖传：{hex_data['tuan']}")
    lines.append(f"- 大象：{hex_data['image']}")
    lines.append("- 六爻：")

    for line in hex_data.get("lines", []):
        pos = line["position"]
        text = line["text"]
        commentary = line.get("commentary", "")
        if commentary:
            lines.append(f"  · {text}（{commentary}）")
        else:
            lines.append(f"  · {text}")

    return "\n".join(lines)


def format_all_hexagrams(data_dir: str = None) -> str:
    """格式化全部 64 卦为可注入 System Prompt 的文本"""
    hexagrams = load_hexagrams(data_dir)

    parts = ["# 六十四卦全览\n"]
    for h in hexagrams:
        parts.append(format_hexagram(h))
        parts.append("")  # 空行分隔

    return "\n".join(parts)


def inject_knowledge(system_prompt: str, data_dir: str = None) -> str:
    """将 64 卦知识注入 System Prompt 的 [HEXAGRAM_KNOWLEDGE] 占位符"""
    knowledge_text = format_all_hexagrams(data_dir)
    return system_prompt.replace("[HEXAGRAM_KNOWLEDGE]", knowledge_text)
