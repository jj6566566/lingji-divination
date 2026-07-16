package com.divination.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.divination.dto.FeedbackRequest;
import com.divination.entity.DivinationRecord;
import com.divination.enums.DivinationMethod;
import com.divination.exception.BusinessException;
import com.divination.interceptor.JwtInterceptor;
import com.divination.mapper.DivinationMapper;
import com.divination.service.client.AiServiceClient;
import com.divination.vo.DivinationVO;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class DivinationService {

    private static final Logger log = LoggerFactory.getLogger(DivinationService.class);

    private final DivinationMapper divinationMapper;
    private final QuotaService quotaService;
    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper;

    public DivinationService(DivinationMapper divinationMapper,
                             QuotaService quotaService,
                             AiServiceClient aiServiceClient,
                             ObjectMapper objectMapper) {
        this.divinationMapper = divinationMapper;
        this.quotaService = quotaService;
        this.aiServiceClient = aiServiceClient;
        this.objectMapper = objectMapper;
    }

    public SseEmitter divine(Long userId, String method, String question) {
        // 1. 校验占卜方式
        if (!DivinationMethod.isValid(method)) {
            throw new BusinessException("不支持的占卜方式: " + method);
        }

        // 2. 检查配额
        quotaService.checkAndIncrement(userId, LocalDate.now());

        // 3. 创建占卜记录
        DivinationRecord record = new DivinationRecord();
        record.setUserId(userId);
        record.setMethod(method);
        record.setQuestion(question);
        record.setResultJson("{}"); // AI 服务返回后更新
        divinationMapper.insert(record);

        // 4. 创建 SSE 连接
        SseEmitter emitter = new SseEmitter(120_000L);

        // 5. 调用 AI 服务
        Map<String, Object> aiRequest = Map.of(
                "method", method,
                "question", question,
                "sessionId", userId + "_" + record.getId()
        );

        aiServiceClient.divineStream(aiRequest, emitter);

        // 6. 监听完成事件，保存结果
        emitter.onCompletion(() -> {
            // 这里简化处理：AI解读通过其他方式持久化
            // 实际生产中应该解析SSE流并保存
            log.info("占卜完成, recordId={}", record.getId());
        });

        emitter.onError(throwable -> {
            log.error("占卜失败, recordId={}", record.getId(), throwable);
            quotaService.rollback(userId, LocalDate.now());
        });

        emitter.onTimeout(() -> {
            log.warn("占卜超时, recordId={}", record.getId());
            quotaService.rollback(userId, LocalDate.now());
        });

        return emitter;
    }

    public Page<DivinationRecord> listRecords(Long userId, int page, int size) {
        LambdaQueryWrapper<DivinationRecord> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DivinationRecord::getUserId, userId)
               .orderByDesc(DivinationRecord::getCreatedAt);

        Page<DivinationRecord> pageParam = new Page<>(page, size);
        return divinationMapper.selectPage(pageParam, wrapper);
    }

    public DivinationRecord getRecord(Long userId, Long recordId) {
        DivinationRecord record = divinationMapper.selectById(recordId);
        if (record == null) {
            throw new BusinessException(404, "记录不存在");
        }
        if (!record.getUserId().equals(userId)) {
            throw new BusinessException(403, "无权访问");
        }
        return record;
    }

    @Transactional
    public void deleteRecord(Long userId, Long recordId) {
        DivinationRecord record = getRecord(userId, recordId);
        divinationMapper.deleteById(record.getId());
    }

    @Transactional
    public void feedback(Long userId, Long recordId, FeedbackRequest req) {
        DivinationRecord record = getRecord(userId, recordId);
        record.setFeedback(req.getFeedback());
        record.setFeedbackNote(req.getNote());
        divinationMapper.updateById(record);
    }
}
