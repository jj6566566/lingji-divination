package com.divination.controller;

import com.divination.common.Result;
import com.divination.dto.ChatRequest;
import com.divination.interceptor.JwtInterceptor;
import com.divination.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /**
     * 多轮对话 SSE 流
     */
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@Valid @RequestBody ChatRequest req) {
        Long userId = JwtInterceptor.getCurrentUserId();
        return chatService.chat(
                userId,
                req.getMethod(),
                req.getMessage(),
                req.getSessionId(),
                req.getHexagram(),
                req.getAction(),
                req.getInviteRejected(),
                req.getRecordId(),
                req.getThreadId()
        );
    }

    /**
     * 纯起卦 — 只跑算法，不调 LLM
     */
    @PostMapping("/divine/cast")
    public Result<Map<String, Object>> cast(@RequestBody Map<String, String> req) {
        JwtInterceptor.getCurrentUserId(); // 验证登录
        String method = req.getOrDefault("method", "liuyao");
        String json = chatService.cast(method);
        try {
            Map<String, Object> result = new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, Map.class);
            return Result.ok(result);
        } catch (Exception e) {
            return Result.fail(500, "起卦结果解析失败");
        }
    }
}
