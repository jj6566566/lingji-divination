package com.divination.exception;

public class AiServiceException extends BusinessException {
    public AiServiceException(String message) {
        super(503, message);
    }

    public AiServiceException(String message, Throwable cause) {
        super(503, message);
        initCause(cause);
    }
}
