"""生图 API 路由 — LLM 提示词扩写 (DeepSeek) + 通义万相生成 + 编辑"""

from __future__ import annotations
import json
import base64
import aiohttp
from fastapi import APIRouter, UploadFile, File, Form
from settings import settings
from interpreter.llm_client import llm_client

router = APIRouter(prefix="/api/v1")


# ── 通义万相 API 基础 URL ──
DASHSCOPE_BASE = f"https://{settings.dashscope_host}"

# ── wanx2.1-imageedit 支持的编辑功能 ──
EDIT_FUNCTIONS = {
    "remove_watermark": "去水印",
    "description_edit": "指令编辑",
    "stylization_all": "风格迁移",
    "expand": "扩图",
    "super_resolution": "超分",
}


# ── LLM 扩写提示词用的 System Prompt ──

ENHANCE_SYSTEM = """你是一位专业的 AI 绘画提示词工程师。你的任务是根据用户的中文描述，生成高质量的绘画提示词。

你需要输出一个 JSON 对象，格式如下：
{
  "positive_prompt": "正向提示词",
  "negative_prompt": "负向提示词"
}

规则：
1. positive_prompt 用中文撰写，详细描述画面内容、风格、光线、构图、色彩、细节。加入提升画质的描述。长度 50-120 字。
2. negative_prompt 列出不想要的画面元素（如模糊、变形、多余手指、水印、文字、低质量等）。
3. 如果用户中文描述比较简短，你要发挥想象力，合理扩充细节。但不要改变用户描述的核心意图。
4. 只输出 JSON，不要输出其他内容。"""


@router.post("/image/enhance")
async def enhance_prompt(text: str = Form(...)):
    """DeepSeek 扩写提示词

    返回 { positive_prompt, negative_prompt }
    """
    try:
        response = await llm_client.chat(
            messages=[{"role": "user", "content": f"用户描述：{text}"}],
            system=ENHANCE_SYSTEM,
            temperature=0.8,
            max_tokens=600,
        )
        content = response.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(
                l for l in lines if not l.startswith("```")
            ).strip()
        result = json.loads(content)
        return {
            "code": 200,
            "data": {
                "positive_prompt": result.get("positive_prompt", ""),
                "negative_prompt": result.get("negative_prompt", ""),
            },
        }
    except json.JSONDecodeError:
        return {
            "code": 200,
            "data": {
                "positive_prompt": response.strip(),
                "negative_prompt": "模糊, 变形, 低质量, 水印, 文字",
            },
        }
    except Exception as e:
        return {"code": 500, "message": f"提示词扩写失败: {str(e)}"}


@router.post("/image/generate")
async def generate_image(
    positive_prompt: str = Form(...),
    negative_prompt: str = Form(""),
    reference_image: UploadFile | None = File(None),
):
    """调通义万相 (wan2.7-image-pro) 生成图片

    支持参考图：通义万相原生处理参考图风格/构图，不需要额外分析
    返回 { image_url }
    """
    full_prompt = positive_prompt
    if negative_prompt:
        full_prompt += f"。避免以下元素：{negative_prompt}"

    # 构建 messages
    content_parts = [{"text": full_prompt}]

    # 如果有参考图，加入 messages（自动容错缩放）
    if reference_image and reference_image.filename:
        try:
            data_url = await _image_to_data_url(reference_image)
            content_parts.append({"image": data_url})
        except Exception as e:
            print(f"[ImageGen] Failed to read reference image: {e}", flush=True)

    payload = {
        "model": "wan2.7-image-pro",
        "input": {
            "messages": [
                {
                    "role": "user",
                    "content": content_parts,
                }
            ]
        },
        "parameters": {
            "size": "1K",
            "n": 1,
            "watermark": False,
        },
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{DASHSCOPE_BASE}/api/v1/services/aigc/multimodal-generation/generation",
            headers={
                "Authorization": f"Bearer {settings.dashscope_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        ) as resp:
            result = await resp.json()

    # 检查错误
    if resp.status != 200:
        error_msg = result.get("message", str(result))
        return {"code": resp.status, "message": f"通义万相调用失败: {error_msg}"}

    # 解析响应 — DashScope 返回格式:
    # {"output": {"choices": [{"message": {"content": [{"image": "url"}]}}]}}
    try:
        choices = result.get("output", {}).get("choices", [])
        if choices:
            content_items = choices[0].get("message", {}).get("content", [])
            for item in content_items:
                if "image" in item:
                    return {
                        "code": 200,
                        "data": {
                            "image_url": item["image"],
                        },
                    }
        # 可能不存在图片
        return {"code": 500, "message": f"生成失败，未返回图片: {json.dumps(result, ensure_ascii=False)[:300]}"}
    except Exception as e:
        return {"code": 500, "message": f"解析响应失败: {str(e)}"}


# ── 辅助：把上传图转 base64 data URL（自动放大过小的图片）──
async def _image_to_data_url(img: UploadFile, min_size: int = 512) -> str:
    from io import BytesIO
    from PIL import Image

    contents = await img.read()
    image = Image.open(BytesIO(contents))
    w, h = image.size

    # 确保尺寸在 [512, 4096] 区间内，等比缩放 + 极端比例加黑边
    MAX_SIZE = 4096
    if w < min_size or h < min_size or w > MAX_SIZE or h > MAX_SIZE:
        # 先等比缩放让两边都不超 4096，且至少一边 = 512（可能另一边还小于512）
        scale = min_size / min(w, h)
        if max(w, h) * scale > MAX_SIZE:
            scale = MAX_SIZE / max(w, h)
        new_w, new_h = int(w * scale), int(h * scale)
        image = image.resize((new_w, new_h), Image.LANCZOS)

        # 极端比例（如 200×5000）缩完后短边可能还不到 512，居中垫黑边
        if new_w < min_size or new_h < min_size:
            canvas_w = max(new_w, min_size)
            canvas_h = max(new_h, min_size)
            from PIL import Image as PILImage
            canvas = PILImage.new("RGB", (canvas_w, canvas_h), (0, 0, 0))
            x = (canvas_w - new_w) // 2
            y = (canvas_h - new_h) // 2
            canvas.paste(image, (x, y))
            image = canvas

        buf = BytesIO()
        fmt = image.format or "PNG"
        image.save(buf, format=fmt)
        contents = buf.getvalue()

    b64 = base64.b64encode(contents).decode("utf-8")
    mime = img.content_type or "image/jpeg"
    return f"data:{mime};base64,{b64}"


# ── 用 wan2.7-image-pro 做编辑（同步，所有编辑功能统一入口）──
async def _wan27_edit(prompt_text: str, image_url: str, *extra_images: str) -> dict:
    """调 wan2.7-image-pro 同步编辑，返回 {code, data: {image_url}} """
    content_parts: list = [{"text": prompt_text}, {"image": image_url}]
    for img in extra_images:
        if img:
            content_parts.append({"image": img})
    payload = {
        "model": "wan2.7-image-pro",
        "input": {
            "messages": [{"role": "user", "content": content_parts}]
        },
        "parameters": {"size": "1K", "n": 1, "watermark": False},
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{DASHSCOPE_BASE}/api/v1/services/aigc/multimodal-generation/generation",
            headers={"Authorization": f"Bearer {settings.dashscope_api_key}", "Content-Type": "application/json"},
            json=payload,
        ) as resp:
            result = await resp.json()
    if resp.status != 200:
        return {"code": resp.status, "message": f"编辑失败: {result.get('message', str(result))}"}
    try:
        choices = result.get("output", {}).get("choices", [])
        if choices:
            for item in choices[0].get("message", {}).get("content", []):
                if "image" in item:
                    return {"code": 200, "data": {"image_url": item["image"]}}
    except Exception:
        pass
    return {"code": 500, "message": "编辑未返回图片"}


# ── 图片编辑端点 ──

@router.post("/image/edit")
async def edit_image(
    function: str = Form(...),
    base_image: UploadFile = File(...),
    prompt: str = Form(""),
    mask_image: UploadFile | None = File(None),
    # 扩图参数
    expand_top: float = Form(1.0),
    expand_bottom: float = Form(1.0),
    expand_left: float = Form(1.0),
    expand_right: float = Form(1.0),
    # 超分参数（暂未使用）
    scale: int = Form(2),
):
    """图片编辑 — 全功能统一用 wan2.7-image-pro"""
    if function not in EDIT_FUNCTIONS:
        return {"code": 400, "message": f"不支持的编辑功能: {function}，可选: {list(EDIT_FUNCTIONS.keys())}"}

    # 转图片
    try:
        image_url = await _image_to_data_url(base_image)
    except Exception as e:
        return {"code": 400, "message": f"读取图片失败: {str(e)}"}

    # 读取 mask（如果有）
    mask_url = None
    if mask_image and mask_image.filename:
        try:
            mask_url = await _image_to_data_url(mask_image)
        except Exception as e:
            print(f"[ImageGen] Failed to read mask: {e}", flush=True)

    # 根据功能构建 prompt
    if function == "remove_watermark":
        if mask_url:
            pmt = prompt or "仅去除白色框选区域内的文字水印，保持该区域背景自然，图片其余部分完全不动"
        else:
            pmt = prompt or "去除图片中的文字水印，保持背景自然不变"

    elif function == "description_edit":
        if not prompt.strip():
            return {"code": 400, "message": "指令编辑需要提供描述"}
        pmt = prompt

    elif function == "stylization_all":
        style = prompt.strip() or "artistic"
        pmt = f"将图片的风格转换为：{style}，保留原图内容和构图，不要改变主体"

    elif function == "expand":
        parts = []
        if expand_top > 1.0: parts.append(f"上方扩展{int((expand_top-1)*100)}%")
        if expand_bottom > 1.0: parts.append(f"下方扩展{int((expand_bottom-1)*100)}%")
        if expand_left > 1.0: parts.append(f"左侧扩展{int((expand_left-1)*100)}%")
        if expand_right > 1.0: parts.append(f"右侧扩展{int((expand_right-1)*100)}%")
        direction = "、".join(parts) if parts else "四周各扩展30%"
        pmt = f"向外扩展画面，{direction}，扩出的新区域要自然融入原图的内容和风格，无缝衔接"

    elif function == "super_resolution":
        factor = max(1, min(4, scale))
        pmt = f"将这张图片放大到原来的{factor}倍分辨率，增强清晰度和细节，保持内容完全不变"

    else:
        pmt = prompt or "edit the image"

    return await _wan27_edit(pmt, image_url, mask_url or "")


# ── AI 贴合 — Logo/贴图自然融合到产品图 ──

@router.post("/image/composite")
async def ai_composite(
    base_image: UploadFile = File(...),
    stamp_image: UploadFile = File(...),
    prompt: str = Form(""),
):
    """将 stamp（Logo/贴图）AI 自然贴合到 base（产品图）上

    通义万相自动处理透视、光影、纹理融合
    """
    try:
        base_url = await _image_to_data_url(base_image)
        stamp_url = await _image_to_data_url(stamp_image)
    except Exception as e:
        return {"code": 400, "message": f"读取图片失败: {str(e)}"}

    pmt = prompt or "将第二张图中的图案自然地贴合到第一张图的物体表面上，跟随物体的纹理走向、透视角度和光影，让图案看起来像是原本就印在上面的，不要改变第一张图的其他部分"
    return await _wan27_edit(pmt, base_url, stamp_url)
