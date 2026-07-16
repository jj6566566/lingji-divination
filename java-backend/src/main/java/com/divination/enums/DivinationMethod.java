package com.divination.enums;

import lombok.Getter;

@Getter
public enum DivinationMethod {

    LIU_YAO("liuyao", "六爻起卦"),
    BA_ZI("bazi", "八字排盘"),
    TAROT("tarot", "塔罗占卜"),
    MEI_HUA("meihua", "梅花易数");

    private final String code;
    private final String displayName;

    DivinationMethod(String code, String displayName) {
        this.code = code;
        this.displayName = displayName;
    }

    public static boolean isValid(String code) {
        for (DivinationMethod m : values()) {
            if (m.code.equals(code)) return true;
        }
        return false;
    }
}
