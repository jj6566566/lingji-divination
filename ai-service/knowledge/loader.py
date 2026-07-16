"""知识库加载器 — 加载卦象、五行等结构化知识"""

import json
from pathlib import Path


class KnowledgeLoader:
    """加载并检索卦象知识"""

    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = Path(__file__).parent
        else:
            data_dir = Path(data_dir)

        self.data_dir = Path(data_dir)

        # 加载 64 卦知识
        with open(self.data_dir / "iching_64.json", "r", encoding="utf-8") as f:
            self.hexagrams = json.load(f)

        # 建索引
        self._by_name: dict[str, dict] = {}
        self._by_number: dict[int, dict] = {}
        for h in self.hexagrams:
            self._by_name[h["name"]] = h
            self._by_number[h["number"]] = h

    def lookup(self, method: str, result: dict) -> list[dict]:
        """根据占卜结果查找相关知识"""
        if method == "liuyao":
            return self._lookup_liuyao(result)
        return []

    def _lookup_liuyao(self, result: dict) -> list[dict]:
        """查找六爻相关的卦辞爻辞"""
        knowledge = []

        original = result.get("original", {})
        name = original.get("name", "")
        hex_data = self._by_name.get(name) or self._find_hexagram(name)
        if hex_data:
            knowledge.append({
                "type": "hexagram",
                "name": name,
                "judgment": hex_data.get("judgment", ""),     # 卦辞
                "image": hex_data.get("image", ""),           # 大象
                "tuan": hex_data.get("tuan", ""),             # 彖传
            })

        # 找变爻的爻辞
        for cl in result.get("changing_lines", []):
            position = cl["position"]
            if hex_data:
                for line in hex_data.get("lines", []):
                    if line["position"] == position:
                        knowledge.append({
                            "type": "yao_line",
                            "position": position,
                            "name": cl["name"],
                            "text": line.get("text", ""),     # 爻辞
                            "commentary": line.get("commentary", ""), # 象传
                        })
                        break

        # 变卦信息
        transformed = result.get("transformed")
        if transformed:
            t_name = transformed.get("name", "")
            t_data = self._by_name.get(t_name) or self._find_hexagram(t_name)
            if t_data:
                knowledge.append({
                    "type": "transformed_hexagram",
                    "name": t_name,
                    "judgment": t_data.get("judgment", ""),
                })

        return knowledge

    def _find_hexagram(self, name: str):
        """模糊匹配卦名"""
        for h in self.hexagrams:
            if name in h["name"] or h["name"] in name:
                return h
        return None


# 全局单例
knowledge_loader = KnowledgeLoader()
