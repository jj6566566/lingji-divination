"""六爻起卦引擎 — 纯算法，不调 LLM"""

import random
from engines.base import BaseEngine

# 八卦映射
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

# 完整 64 卦信息 (简化版，完整数据在 knowledge/)
HEXAGRAM_INDEX = {
    (0, 0, 0, 0, 0, 0): (2, "坤为地", "䷁"),
    (1, 1, 1, 1, 1, 1): (1, "乾为天", "䷀"),
    # 完整索引在 knowledge/iching_64.json
}


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

        # 组成本卦 (上卦 + 下卦)
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
        """根据 6 条爻识别卦象，返回卦名、卦符、上下卦信息"""
        # 先从索引查（简化版只有乾坤）
        key = tuple(1 if y else 0 for y in lines)
        if key in HEXAGRAM_INDEX:
            num, name, symbol = HEXAGRAM_INDEX[key]
            return {
                "number": num,
                "name": name,
                "symbol": symbol,
                "full_name": f"{name} {symbol}",
            }

        # 否则查上下卦
        upper = lines[:3]  # 上卦（5、6、4爻 → 外卦）
        lower = lines[3:]  # 下卦（3、2、1爻 → 内卦，注意顺序反转）

        upper_t = TRIGRAM_MAP.get(tuple(upper), ("?", "?", "?", "?"))
        lower_t = TRIGRAM_MAP.get(tuple(lower), ("?", "?", "?", "?"))

        return {
            "number": 0,  # 需要从完整知识库查
            "name": f"{upper_t[2]}{lower_t[2]}",
            "symbol": f"({upper_t[1]}{lower_t[1]})",
            "upper_trigram": upper_t[0],
            "lower_trigram": lower_t[0],
            "upper_element": upper_t[3],
            "lower_element": lower_t[3],
        }

    @staticmethod
    def _yao_name(position: int, yang: bool) -> str:
        """爻位命名: 初九、九二、六三..."""
        yao_names = ["初", "二", "三", "四", "五", "上"]
        prefix = yao_names[position - 1]
        suffix = "九" if yang else "六"
        return f"{prefix}{suffix}"
