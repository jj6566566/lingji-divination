"""灵机 AI 服务 — FastAPI 入口"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from router.divine import router as divine_router
from router.cast import router as cast_router
from router.chat import router as chat_router
from router.image_gen import router as image_gen_router
from settings import settings

app = FastAPI(
    title="灵机 AI 占卜服务",
    description="提供六爻、八字、塔罗等占卜方式的 AI 解读",
    version="0.1.0",
)

# 跨域配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(divine_router)
app.include_router(cast_router)
app.include_router(chat_router)
app.include_router(image_gen_router)


@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "ok", "service": "lingji-ai"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
