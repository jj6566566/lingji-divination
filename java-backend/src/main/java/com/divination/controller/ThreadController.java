package com.divination.controller;

import com.divination.common.Result;
import com.divination.interceptor.JwtInterceptor;
import com.divination.service.ChatService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/threads")
public class ThreadController {

    private final ChatService chatService;

    public ThreadController(ChatService chatService) {
        this.chatService = chatService;
    }

    /**
     * 当前用户的对话线程列表
     */
    @GetMapping
    public Result<List<Map<String, Object>>> list() {
        Long userId = JwtInterceptor.getCurrentUserId();
        List<Map<String, Object>> threads = chatService.getUserThreads(userId);
        return Result.ok(threads);
    }

    /**
     * 删除对话线程（含关联记录）
     */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        Long userId = JwtInterceptor.getCurrentUserId();
        chatService.deleteThread(userId, id);
        return Result.ok("已删除", null);
    }
}
