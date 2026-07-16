package com.divination.exception;

import com.divination.common.Result;
import com.divination.vo.QuotaVO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDate;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(QuotaExceededException.class)
    public Result<?> handleQuotaExceeded(QuotaExceededException e) {
        return Result.fail(429, e.getMessage(),
                QuotaVO.builder()
                        .used(e.getUsed())
                        .maxFree(e.getMaxFree())
                        .remaining(0)
                        .resetAt(LocalDate.now().plusDays(1))
                        .build());
    }

    @ExceptionHandler(AiServiceException.class)
    public Result<?> handleAiService(AiServiceException e) {
        return Result.fail(503, e.getMessage());
    }

    @ExceptionHandler(BusinessException.class)
    public Result<?> handleBusiness(BusinessException e) {
        return Result.fail(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Result<?> handleValidation(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return Result.fail(400, msg);
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Result<?> handleUnknown(Exception e) {
        log.error("未预期异常", e);
        return Result.fail(500, "服务器内部错误，请稍后重试");
    }
}
