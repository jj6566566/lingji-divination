"""Prompt 模板管理器 — 加载和渲染 Prompt 模板"""

from pathlib import Path


class PromptManager:
    """按占卜方式加载对应的 System Prompt"""

    def __init__(self, prompts_dir: str = None):
        if prompts_dir is None:
            prompts_dir = Path(__file__).parent
        else:
            prompts_dir = Path(prompts_dir)

        self.prompts_dir = Path(prompts_dir)
        self._cache: dict[str, str] = {}

    def load(self, method: str) -> str:
        """加载指定占卜方式的 System Prompt"""
        if method in self._cache:
            return self._cache[method]

        path = self.prompts_dir / f"{method}_system.md"
        if not path.exists():
            # 回退到默认
            path = self.prompts_dir / "liuyao_system.md"

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        self._cache[method] = content
        return content

    def load_boundary(self) -> str:
        """加载边界兜底 Prompt"""
        path = self.prompts_dir / "fallback_boundary.md"
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        return ""


prompt_manager = PromptManager()
