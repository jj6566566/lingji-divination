"""算卦引擎基类"""

from abc import ABC, abstractmethod


class BaseEngine(ABC):
    """所有占卜引擎的基类"""

    @property
    @abstractmethod
    def method_name(self) -> str:
        """占卜方式标识: liuyao / bazi / tarot"""
        ...

    @abstractmethod
    def cast(self, **params) -> dict:
        """执行占卜，返回卦象数据 dict"""
        ...

    def validate_params(self, **params) -> bool:
        """校验参数，默认不需要额外参数"""
        return True
