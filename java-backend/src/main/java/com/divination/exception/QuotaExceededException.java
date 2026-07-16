package com.divination.exception;

import lombok.Getter;

@Getter
public class QuotaExceededException extends BusinessException {

    private final int used;
    private final int maxFree;

    public QuotaExceededException(int used, int maxFree) {
        super(429, String.format("今日免费次数已用完（%d/%d），请明天再来", used, maxFree));
        this.used = used;
        this.maxFree = maxFree;
    }
}
