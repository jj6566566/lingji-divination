package com.divination.service;

import com.divination.entity.ChatThread;
import com.divination.entity.DivinationRecord;
import com.divination.enums.DivinationMethod;
import com.divination.exception.BusinessException;
import com.divination.mapper.ChatThreadMapper;
import com.divination.mapper.DivinationMapper;
import com.divination.service.client.AiServiceClient;
import com.divination.service.client.AiServiceClient.StreamAccumulator;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.*;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final DivinationMapper divinationMapper;
    private final ChatThreadMapper threadMapper;
    private final QuotaService quotaService;
    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper;

    public ChatService(DivinationMapper divinationMapper,
                       ChatThreadMapper threadMapper,
                       QuotaService quotaService,
                       AiServiceClient aiServiceClient,
                       ObjectMapper objectMapper) {
        this.divinationMapper = divinationMapper;
        this.threadMapper = threadMapper;
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
        return chat(userId, method, message, sessionId, hexagram, action, inviteRejected, null, null);
    }

    /**
     * 多轮对话 SSE 流（带 recordId + threadId，用于持久化与线程归组）
     *
     * @param threadId UUID 字符串，前端生成；null 时后端自动创建新 thread
     */
    public SseEmitter chat(Long userId, String method, String message,
                           String sessionId, Map<String, Object> hexagram,
                           String action, Boolean inviteRejected, Long recordId,
                           String threadId) {

        if (!DivinationMethod.isValid(method)) {
            throw new BusinessException("不支持的占卜方式: " + method);
        }

        final Long[] effectiveRecordId = { recordId };
        final String[] effectiveThreadId = { threadId };

        // ================================================================
        // 确保 thread 存在 — 新对话首次请求就创建，不等算卦
        // ================================================================
        if (effectiveThreadId[0] != null && !effectiveThreadId[0].isEmpty()
                && threadMapper.selectById(effectiveThreadId[0]) == null) {
            try {
                ChatThread thread = new ChatThread();
                thread.setId(effectiveThreadId[0]);
                thread.setUserId(userId);
                thread.setTitle("新对话");
                threadMapper.insert(thread);
                log.info("创建新对话线程（{}）, threadId={}", action, effectiveThreadId[0]);
            } catch (org.springframework.dao.DuplicateKeyException e) {
                // 并发竞争：前端 Strict Mode 或其他原因导致同一 threadId 同时到达
                log.info("对话线程已存在（并发创建）, threadId={}", effectiveThreadId[0]);
            }
        }

        // ================================================================
        // interpret action: 起卦后解读 → 扣配额 + 创建 record
        // ================================================================
        if ("interpret".equals(action) && hexagram != null) {
            quotaService.checkAndIncrement(userId, LocalDate.now());

            DivinationRecord record = new DivinationRecord();
            record.setUserId(userId);
            record.setThreadId(effectiveThreadId[0]);
            record.setMethod(method);
            record.setQuestion(message);
            try {
                record.setResultJson(objectMapper.writeValueAsString(hexagram));
            } catch (Exception e) {
                record.setResultJson("{}");
            }
            divinationMapper.insert(record);
            effectiveRecordId[0] = record.getId();
            log.info("创建占卜记录, recordId={}, threadId={}", record.getId(), effectiveThreadId[0]);

            // 更新 thread 标题（用算卦问题）和 updated_at
            updateThreadAfterInterpret(effectiveThreadId[0], message);
        }

        // ================================================================
        // 追问 (chat action): 加载已有 record → 恢复上下文
        // ================================================================
        Map<String, Object> hexagramFromDb = null;
        List<Map<String, Object>> historyFromDb = null;
        if (effectiveRecordId[0] != null && !"interpret".equals(action)) {
            DivinationRecord existing = divinationMapper.selectById(effectiveRecordId[0]);
            if (existing == null || !existing.getUserId().equals(userId)) {
                throw new BusinessException(404, "记录不存在");
            }

            // 追溯 threadId
            if (existing.getThreadId() != null) {
                effectiveThreadId[0] = existing.getThreadId();
            }

            // 加载该 record 的 chat_history（已包含完整会话上下文）
            historyFromDb = loadChatHistory(existing);

            // 提取卦象数据
            if (existing.getResultJson() != null) {
                try {
                    hexagramFromDb = objectMapper.readValue(
                            existing.getResultJson(), Map.class);
                } catch (Exception e) {
                    log.warn("解析 resultJson 失败, recordId={}", effectiveRecordId[0]);
                }
            }

            // 更新 thread 时间戳
            if (existing.getThreadId() != null) {
                updateThreadTimestamp(existing.getThreadId());
            }
        }

        // —— 构建累加器 ——
        final Long persistRecordId = effectiveRecordId[0];
        final StreamAccumulator acc = buildAccumulator(persistRecordId, message, action,
                userId, method);

        SseEmitter emitter = new SseEmitter(300_000L);

        Map<String, Object> aiRequest = new HashMap<>();
        aiRequest.put("method", method);
        aiRequest.put("message", message != null ? message : "");
        aiRequest.put("sessionId", sessionId != null ? sessionId : userId + "_chat");
        aiRequest.put("action", action != null ? action : "chat");
        if (inviteRejected != null) {
            aiRequest.put("inviteRejected", inviteRejected);
        }
        // 卦象数据: 优先请求传入，回退 DB
        Map<String, Object> effectiveHexagram = hexagram != null ? hexagram : hexagramFromDb;
        if (effectiveHexagram != null) {
            aiRequest.put("hexagram", effectiveHexagram);
        }
        // 对话历史恢复
        if (historyFromDb != null && !historyFromDb.isEmpty()) {
            aiRequest.put("history", historyFromDb);
        }
        if (persistRecordId != null) {
            aiRequest.put("recordId", persistRecordId);
        }
        if (effectiveThreadId[0] != null) {
            aiRequest.put("threadId", effectiveThreadId[0]);
        }

        aiServiceClient.chatStream(aiRequest, emitter, acc);

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
     * 合并 thread 下所有 record 的 chat_history，按时间排序
     */
    private List<Map<String, Object>> mergeChatHistory(Long userId, String threadId) {
        if (threadId == null) return new ArrayList<>();

        List<DivinationRecord> records = divinationMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<DivinationRecord>()
                        .eq(DivinationRecord::getUserId, userId)
                        .eq(DivinationRecord::getThreadId, threadId)
                        .orderByAsc(DivinationRecord::getCreatedAt)
        );

        List<Map<String, Object>> merged = new ArrayList<>();
        for (DivinationRecord r : records) {
            List<Map<String, Object>> history = loadChatHistory(r);
            if (history != null) {
                merged.addAll(history);
            }
        }
        return merged;
    }

    /**
     * 构建 StreamAccumulator — 流结束时更新数据库
     */
    private StreamAccumulator buildAccumulator(Long recordId, String userMessage,
                                                String action, Long userId, String method) {
        if (recordId == null) return null;

        return new StreamAccumulator() {
            private final StringBuilder textBuffer = new StringBuilder();

            @Override
            public void onText(String chunk) {
                textBuffer.append(chunk);
            }

            @Override
            public void onDone(Map<String, Object> doneData) {
                try {
                    DivinationRecord record = divinationMapper.selectById(recordId);
                    if (record == null) return;

                    String fullText = textBuffer.toString();

                    // 保存解读全文
                    if ("interpret".equals(action) && !fullText.isEmpty()) {
                        record.setInterpretation(fullText);
                    }

                    // 构建/追加 chat_history
                    // 优先使用 AI 服务返回的完整会话历史（包含 greet + 前置聊天 + 解卦）
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> aiChatHistory =
                            (List<Map<String, Object>>) doneData.get("chat_history");

                    List<Map<String, Object>> chatHistory;
                    if (aiChatHistory != null && !aiChatHistory.isEmpty()) {
                        // AI 服务返回了完整历史 — 直接使用（已包含当前轮）
                        chatHistory = new ArrayList<>(aiChatHistory);
                        log.info("使用 AI 服务返回的完整 chat_history, size={}, recordId={}",
                                chatHistory.size(), recordId);
                    } else {
                        // 回退：手动构建
                        chatHistory = loadChatHistory(record);
                        if (userMessage != null && !userMessage.isEmpty()) {
                            Map<String, Object> userEntry = new HashMap<>();
                            userEntry.put("role", "user");
                            userEntry.put("content", userMessage);
                            chatHistory.add(userEntry);
                        }
                        if (!fullText.isEmpty()) {
                            Map<String, Object> assistantEntry = new HashMap<>();
                            assistantEntry.put("role", "assistant");
                            assistantEntry.put("content", fullText);
                            chatHistory.add(assistantEntry);
                        }
                        log.info("手动构建 chat_history, size={}, recordId={}",
                                chatHistory.size(), recordId);
                    }
                    record.setChatHistory(objectMapper.writeValueAsString(chatHistory));

                    // Token 统计
                    @SuppressWarnings("unchecked")
                    Map<String, Object> tokens = (Map<String, Object>) doneData.get("tokens");
                    if (tokens != null) {
                        Object prompt = tokens.get("prompt");
                        Object completion = tokens.get("completion");
                        if (prompt instanceof Number) {
                            record.setPromptTokens(((Number) prompt).intValue());
                        }
                        if (completion instanceof Number) {
                            record.setCompletionTokens(((Number) completion).intValue());
                        }
                    }

                    // 模型快照
                    Object model = doneData.get("model");
                    if (model instanceof String) {
                        record.setModelSnapshot((String) model);
                    }

                    divinationMapper.updateById(record);

                    // 更新 thread 时间戳
                    if (record.getThreadId() != null) {
                        updateThreadTimestamp(record.getThreadId());
                    }

                    log.info("占卜记录已更新, recordId={}, textLen={}", recordId, fullText.length());
                } catch (Exception e) {
                    log.error("保存占卜记录失败, recordId={}", recordId, e);
                }
            }

            @Override
            public void onInterrupt() {
                // 客户端中途断开（切换对话/关闭页面）— 保存已累积的部分内容
                try {
                    String partialText = textBuffer.toString();
                    if (partialText.isEmpty()) return;

                    DivinationRecord record = divinationMapper.selectById(recordId);
                    if (record == null) return;

                    List<Map<String, Object>> chatHistory = loadChatHistory(record);
                    if (userMessage != null && !userMessage.isEmpty()) {
                        Map<String, Object> userEntry = new HashMap<>();
                        userEntry.put("role", "user");
                        userEntry.put("content", userMessage);
                        chatHistory.add(userEntry);
                    }
                    // 标记为中断内容，下次继续时 AI 可以接上
                    Map<String, Object> assistantEntry = new HashMap<>();
                    assistantEntry.put("role", "assistant");
                    assistantEntry.put("content", partialText + "…");
                    chatHistory.add(assistantEntry);

                    record.setChatHistory(objectMapper.writeValueAsString(chatHistory));
                    divinationMapper.updateById(record);

                    if (record.getThreadId() != null) {
                        updateThreadTimestamp(record.getThreadId());
                    }

                    log.info("中断时保存部分内容, recordId={}, partialLen={}", recordId, partialText.length());
                } catch (Exception e) {
                    log.error("保存中断内容失败, recordId={}", recordId, e);
                }
            }
        };
    }

    /**
     * 加载已有 chat_history，返回可变列表
     */
    private List<Map<String, Object>> loadChatHistory(DivinationRecord record) {
        try {
            String json = record.getChatHistory();
            if (json != null && !json.isEmpty() && !"null".equals(json)) {
                return objectMapper.readValue(json,
                        new TypeReference<List<Map<String, Object>>>() {});
            }
        } catch (Exception e) {
            log.warn("解析 chat_history 失败，将重新构建, recordId={}", record.getId());
        }
        return new ArrayList<>();
    }

    /**
     * 更新 thread 标题（用算卦问题）和时间戳
     */
    private void updateThreadAfterInterpret(String threadId, String question) {
        if (threadId == null) return;
        try {
            ChatThread thread = threadMapper.selectById(threadId);
            if (thread != null) {
                if (question != null && !question.isEmpty()) {
                    thread.setTitle(question.length() > 30
                            ? question.substring(0, 30) + "…"
                            : question);
                }
                threadMapper.updateById(thread);
            }
        } catch (Exception e) {
            log.warn("更新 thread 标题失败, threadId={}", threadId);
        }
    }

    /**
     * 更新 thread 的 updated_at
     */
    private void updateThreadTimestamp(String threadId) {
        if (threadId == null) return;
        try {
            ChatThread thread = threadMapper.selectById(threadId);
            if (thread != null) {
                threadMapper.updateById(thread);
            }
        } catch (Exception e) {
            log.warn("更新 thread 时间戳失败, threadId={}", threadId);
        }
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

    // ================================================================
    // Thread 查询（供 ThreadController 使用）
    // ================================================================

    /**
     * 获取用户的 thread 列表（含 preview 信息）
     */
    public List<Map<String, Object>> getUserThreads(Long userId) {
        List<ChatThread> threads = threadMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<ChatThread>()
                        .eq(ChatThread::getUserId, userId)
                        .orderByDesc(ChatThread::getUpdatedAt)
        );

        List<Map<String, Object>> result = new ArrayList<>();
        for (ChatThread thread : threads) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", thread.getId());
            item.put("title", thread.getTitle());
            item.put("createdAt", thread.getCreatedAt());
            item.put("updatedAt", thread.getUpdatedAt());

            // 获取该 thread 下最新的 record
            List<DivinationRecord> records = divinationMapper.selectList(
                    new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<DivinationRecord>()
                            .eq(DivinationRecord::getThreadId, thread.getId())
                            .orderByDesc(DivinationRecord::getCreatedAt)
                            .last("LIMIT 1")
            );

            if (!records.isEmpty()) {
                DivinationRecord latest = records.get(0);
                item.put("latestRecordId", latest.getId());

                // 提取卦名
                try {
                    if (latest.getResultJson() != null) {
                        Map<String, Object> resultJson = objectMapper.readValue(
                                latest.getResultJson(), Map.class);
                        @SuppressWarnings("unchecked")
                        Map<String, Object> original = (Map<String, Object>) resultJson.get("original");
                        if (original != null && original.get("name") != null) {
                            item.put("latestHexagramName", original.get("name"));
                        }
                    }
                } catch (Exception e) {
                    log.warn("解析 resultJson 失败, recordId={}", latest.getId());
                }
            }

            result.add(item);
        }
        return result;
    }

    /**
     * 删除 thread 及其所有关联 records
     */
    public void deleteThread(Long userId, String threadId) {
        ChatThread thread = threadMapper.selectById(threadId);
        if (thread == null || !thread.getUserId().equals(userId)) {
            throw new BusinessException(404, "对话不存在");
        }

        // 软删除所有关联 records
        List<DivinationRecord> records = divinationMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<DivinationRecord>()
                        .eq(DivinationRecord::getThreadId, threadId)
        );
        for (DivinationRecord r : records) {
            divinationMapper.deleteById(r.getId());
        }

        // 软删除 thread
        threadMapper.deleteById(threadId);
        log.info("删除对话线程, threadId={}, recordsDeleted={}", threadId, records.size());
    }
}
