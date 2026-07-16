package com.divination.service.client;

import com.divination.exception.AiServiceException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
public class AiServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AiServiceClient.class);

    private final String baseUrl;
    private final int timeout;
    private final ObjectMapper objectMapper;

    public AiServiceClient(@Value("${app.ai-service.base-url}") String baseUrl,
                           @Value("${app.ai-service.timeout}") int timeout,
                           ObjectMapper objectMapper) {
        this.baseUrl = baseUrl;
        this.timeout = timeout;
        this.objectMapper = objectMapper;
    }

    /**
     * 对话流式请求 — 多轮聊天 + 解卦 + 报告
     */
    public void chatStream(Map<String, Object> request, SseEmitter emitter) {
        streamToAiService("/api/v1/chat/stream", request, emitter);
    }

    /**
     * 纯起卦 — 只跑算法，不调 LLM
     */
    public String castHexagram(String method) {
        try {
            String json = objectMapper.writeValueAsString(Map.of("method", method));
            URI uri = URI.create(baseUrl + "/api/v1/divine/cast");
            HttpURLConnection conn = (HttpURLConnection) uri.toURL().openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(timeout);
            conn.setReadTimeout(timeout);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(json.getBytes(StandardCharsets.UTF_8));
                os.flush();
            }

            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
            }
            return sb.toString();
        } catch (Exception e) {
            log.error("起卦调用失败", e);
            throw new AiServiceException("起卦服务暂时不可用");
        }
    }

    public void divineStream(Map<String, Object> request, SseEmitter emitter) {
        streamToAiService("/api/v1/divine/stream", request, emitter);
    }

    private void streamToAiService(String path, Map<String, Object> request, SseEmitter emitter) {
        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                String json = objectMapper.writeValueAsString(request);
                URI uri = URI.create(baseUrl + path);
                conn = (HttpURLConnection) uri.toURL().openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Accept", "text/event-stream");
                conn.setDoOutput(true);
                conn.setConnectTimeout(timeout);
                conn.setReadTimeout(timeout);

                // 发送请求体
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(json.getBytes(StandardCharsets.UTF_8));
                    os.flush();
                }

                // 读取并转发 SSE 流
                int status = conn.getResponseCode();
                if (status != 200) {
                    emitter.send(SseEmitter.event()
                            .name("error")
                            .data(Map.of("type", "error", "message", "AI 服务返回错误: " + status)));
                    emitter.complete();
                    return;
                }

                // 解析上游 SSE，重新发送为标准 SSE 事件
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                    String line;
                    String currentEvent = "message";
                    while ((line = reader.readLine()) != null) {
                        if (line.isEmpty()) {
                            continue;
                        }
                        if (line.startsWith("event:")) {
                            String ev = line.substring(6).trim();
                            if (!ev.isEmpty()) {
                                currentEvent = ev;
                            }
                        } else if (line.startsWith("data:")) {
                            String data = line.substring(5).trim();
                            try {
                                emitter.send(SseEmitter.event()
                                        .name(currentEvent)
                                        .data(data));
                            } catch (java.io.IOException clientEx) {
                                // 客户端断开连接是正常行为，不当作错误
                                log.info("客户端断开连接，停止推送");
                                break;
                            }
                            currentEvent = "message";
                        }
                    }
                }

                // 尝试优雅关闭，忽略客户端断开异常
                try {
                    emitter.complete();
                } catch (Exception ignored) {}
                log.info("AI 服务流式响应完成");

            } catch (Exception e) {
                log.error("AI 服务调用失败", e);
                // 只在非客户端断开的情况下尝试发送错误
                if (!isClientAbort(e)) {
                    try {
                        emitter.send(SseEmitter.event()
                                .name("error")
                                .data("{\"type\":\"error\",\"message\":\"AI 服务暂时不可用，请稍后重试\"}"));
                    } catch (Exception ignored) {}
                }
                try {
                    emitter.complete();
                } catch (Exception ignored) {}
            } finally {
                if (conn != null) conn.disconnect();
            }
        }, "ai-client-thread").start();
    }

    /** 判断是否为客户端断开连接异常（非服务端错误） */
    private boolean isClientAbort(Throwable e) {
        Throwable cause = e;
        while (cause != null) {
            if (cause instanceof java.io.IOException
                    && cause.getMessage() != null
                    && (cause.getMessage().contains("中止")
                        || cause.getMessage().contains("abort")
                        || cause.getMessage().contains("reset")
                        || cause.getMessage().contains("broken pipe"))) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }
}
