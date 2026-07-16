"""六爻起卦引擎 — 纯算法，不调 LLM"""

import json
import random
from pathlib import Path
from engines.base import BaseEngine

# 八卦映射: (bottom, middle, top) → (name, symbol, element, wuxing)
TRIGRAM_MAP = {
    (1, 1, 1): ("乾", "☰", "天", "金"),
    (0, 0, 0): ("坤", "☷", "地", "土"),
    (1, 0, 0): ("震", "☳", "雷", "木"),
    (0, 1, 0): ("坎", "☵", "水", "水"),
    (0, 0, 1): ("艮", "☶", "山", "土"),
    (1, 1, 0): ("巽", "☴", "风", "木"),
    (1, 0, 1): ("离", "☲", "火", "火"),
    (0, 1, 1): ("兑", "☱", "泽", "金"),
}

# 反查表: trigram_name → binary_tuple, element_name → binary_tuple
_NAME_TO_BINARY = {v[0]: k for k, v in TRIGRAM_MAP.items()}
_ELEMENT_TO_BINARY = {v[2]: k for k, v in TRIGRAM_MAP.items()}


def _build_hexagram_index() -> dict:
    """从 iching_64.json 构建完整的 64 卦索引"""
    json_path = Path(__file__).resolve().parent.parent / "knowledge" / "iching_64.json"
    if not json_path.exists():
        return {
            (0, 0, 0, 0, 0, 0): (2, "坤为地", "䷁", "坤，元亨，利牝马之贞。", "地势坤，君子以厚德载物。"),
            (1, 1, 1, 1, 1, 1): (1, "乾为天", "䷀", "乾，元亨利贞。", "天行健，君子以自强不息。"),
        }

    with open(json_path, "r", encoding="utf-8") as f:
        hexagrams = json.load(f)

    index = {}
    for h in hexagrams:
        name = h["name"]

        # 解析上下卦
        if len(name) >= 2 and name[1] == "为":
            # 八纯卦: "乾为天", "坤为地", "坎为水" ...
            trigram_name = name[0]
            upper_bits = _NAME_TO_BINARY[trigram_name]
            lower_bits = upper_bits
        else:
            # 标准卦名: "水雷屯", "天水讼" ...
            upper_element = name[0]
            lower_element = name[1]
            upper_bits = _ELEMENT_TO_BINARY[upper_element]
            lower_bits = _ELEMENT_TO_BINARY[lower_element]

        # key: 6 位 tuple = (初爻, 二爻, 三爻, 四爻, 五爻, 上爻) = lower_bits + upper_bits
        key = lower_bits + upper_bits
        index[key] = (h["number"], h["name"], h["symbol"], h.get("judgment", ""), h.get("image", ""))

    return index


# 模块级 64 卦完整索引
HEXAGRAM_INDEX = _build_hexagram_index()


class LiuyaoEngine(BaseEngine):
    """六爻起卦引擎"""

    method_name = "liuyao"

    def cast(self, **params) -> dict:
        """掷 6 次铜钱，生成卦象"""
        lines = []
        for i in range(6):
            # 三枚铜钱: 正面(阳)=2, 反面(阴)=3
            coins = [random.randint(0, 1) for _ in range(3)]
            value = sum(2 if c == 1 else 3 for c in coins)

            type_map = {6: "老阴", 7: "少阳", 8: "少阴", 9: "老阳"}
            yao_type = type_map[value]

            lines.append({
                "position": i + 1,          # 第几爻 (从初爻开始)
                "value": value,             # 6/7/8/9
                "type": yao_type,           # 老阴/少阳/少阴/老阳
                "changing": value in (6, 9), # 老阴老阳为变爻
                "yang": value in (7, 9),    # True=阳爻 False=阴爻
            })

        # 组成本卦 (下卦 + 上卦)
        original_lines = [l["yang"] for l in lines]
        original = self._identify_hexagram(original_lines)

        # 组成变卦 (变爻阴阳反转)
        transformed_lines = [
            not l["yang"] if l["changing"] else l["yang"]
            for l in lines
        ]
        transformed = self._identify_hexagram(transformed_lines)

        changing_lines = [
            {"position": l["position"], "name": self._yao_name(l["position"], l["yang"])}
            for l in lines if l["changing"]
        ]

        return {
            "method": "liuyao",
            "lines": lines,
            "original": original,
            "transformed": transformed if changing_lines else None,
            "changing_lines": changing_lines,
        }

    def _identify_hexagram(self, lines: list[bool]) -> dict:
        """根据 6 条爻识别卦象，返回卦名、卦符、卦辞等信息"""
        # 构建 6 位 key: (初爻, 二爻, 三爻, 四爻, 五爻, 上爻)
        key = tuple(1 if y else 0 for y in lines)

        if key in HEXAGRAM_INDEX:
            num, name, symbol, judgment, image = HEXAGRAM_INDEX[key]
            return {
                "number": num,
                "name": name,
                "symbol": symbol,
                "full_name": f"{name} {symbol}",
                "judgment": judgment,
                "image": image,
            }

        # 兜底: 查上下卦 (理论上不会走到这里，因为 64 卦已全部索引)
        lower = tuple(1 if y else 0 for y in lines[:3])  # 初、二、三爻 → 下卦/内卦
        upper = tuple(1 if y else 0 for y in lines[3:])  # 四、五、上爻 → 上卦/外卦

        lower_t = TRIGRAM_MAP.get(lower, ("?", "?", "?", "?"))
        upper_t = TRIGRAM_MAP.get(upper, ("?", "?", "?", "?"))

        return {
            "number": 0,
            "name": f"{upper_t[2]}{lower_t[2]}",
            "symbol": f"({upper_t[1]}{lower_t[1]})",
            "upper_trigram": upper_t[0],
            "lower_trigram": lower_t[0],
            "upper_element": upper_t[3],
            "lower_element": lower_t[3],
            "judgment": "",
            "image": "",
        }

    @staticmethod
    def _yao_name(position: int, yang: bool) -> str:
        """爻位命名: 初九、九二、六三..."""
        yao_names = ["初", "二", "三", "四", "五", "上"]
        prefix = yao_names[position - 1]
        suffix = "九" if yang else "六"
        return f"{prefix}{suffix}"
