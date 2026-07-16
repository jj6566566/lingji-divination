"""AI 服务配置"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 服务端口
    host: str = "0.0.0.0"
    port: int = 8000

    # DeepSeek API
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    default_model: str = "deepseek-chat"
    cheap_model: str = "deepseek-chat"  # 用于摘要压缩
    max_tokens: int = 4096
    temperature: float = 0.7

    # 上下文管理
    max_context_tokens: int = 8000
    recent_keep_rounds: int = 5       # 最近N轮保留原文
    summarize_trigger_rounds: int = 10 # 攒够N轮触发压缩

    # 会话
    session_ttl_seconds: int = 3600    # 会话过期时间

    model_config = {"env_prefix": "LINGJI_", "env_file": ".env"}


settings = Settings()
