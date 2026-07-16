from engines.base import BaseEngine
from engines.liuyao import LiuyaoEngine

engine_registry: dict[str, BaseEngine] = {
    "liuyao": LiuyaoEngine(),
}
