package com.divination.service;

import com.divination.entity.DivinationRecord;
import com.divination.enums.DivinationMethod;
import com.divination.exception.BusinessException;
import com.divination.mapper.DivinationMapper;
import com.divination.service.client.AiServiceClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final DivinationMapper divinationMapper;
    private final QuotaService quotaService;
    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper;

    public ChatService(DivinationMapper divinationMapper,
                       QuotaService quotaService,
                       AiServiceClient aiServiceClient,
                       ObjectMapper objectMapper) {
        this.divinationMapper = divinationMapper;
        this.quotaService = quotaService;
        this.aiServiceClient = aiServiceClient;
        this.objectMapper = objectMapper;
    }

    /**
     * 多轮对话 SSE 流
     */
    public SseEmitter chat(Long userId, String method, String message,
                           String sessionId, Map<String, Object> hexagram,
                           String action, Boolean inviteRejected) {

        if (!DivinationMethod.isValid(method)) {
            throw new BusinessException("不支持的占卜方式: " + method);
        }

        // 如果是首次起卦后的解读，扣配额 + 创建记录
        if ("interpret".equals(action) && hexagram != null) {
            quotaService.checkAndIncrement(userId, LocalDate.now());

            DivinationRecord record = new DivinationRecord();
            record.setUserId(userId);
            record.setMethod(method);
            record.setQuestion(message);
            try {
                record.setResultJson(objectMapper.writeValueAsString(hexagram));
            } catch (Exception e) {
                record.setResultJson("{}");
            }
            divinationMapper.insert(record);
        }

        SseEmitter emitter = new SseEmitter(300_000L);

        Map<String, Object> aiRequest = new HashMap<>();
        aiRequest.put("method", method);
        aiRequest.put("message", message != null ? message : "");
        aiRequest.put("sessionId", sessionId != null ? sessionId : userId + "_chat");
        aiRequest.put("action", action != null ? action : "chat");
        if (inviteRejected != null) {
            aiRequest.put("inviteRejected", inviteRejected);
        }
        if (hexagram != null) {
            aiRequest.put("hexagram", hexagram);
        }

        aiServiceClient.chatStream(aiRequest, emitter);

        emitter.onError(throwable -> {
            log.error("对话失败, userId={}", userId, throwable);
            if ("interpret".equals(action)) {
                quotaService.rollback(userId, LocalDate.now());
            }
        });

        emitter.onTimeout(() -> {
            log.warn("对话超时, userId={}", userId);
        });

        return emitter;
    }

    /**
     * 纯起卦 — 代理到 AI 服务的 cast 接口
     */
    public String cast(String method) {
        if (!DivinationMethod.isValid(method)) {
            throw new BusinessException("不支持的占卜方式: " + method);
        }
        return aiServiceClient.castHexagram(method);
    }
}
