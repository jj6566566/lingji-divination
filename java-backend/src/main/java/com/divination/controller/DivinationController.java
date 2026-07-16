package com.divination.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.divination.common.PageResult;
import com.divination.common.Result;
import com.divination.dto.DivinationRequest;
import com.divination.dto.FeedbackRequest;
import com.divination.entity.DivinationRecord;
import com.divination.interceptor.JwtInterceptor;
import com.divination.service.DivinationService;
import com.divination.vo.DivinationVO;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/divination")
public class DivinationController {

    private final DivinationService divinationService;

    public DivinationController(DivinationService divinationService) {
        this.divinationService = divinationService;
    }

    @PostMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter divine(@Valid @RequestBody DivinationRequest req) {
        Long userId = JwtInterceptor.getCurrentUserId();
        return divinationService.divine(userId, req.getMethod(), req.getQuestion());
    }

    @GetMapping
    public Result<PageResult<DivinationVO>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        Long userId = JwtInterceptor.getCurrentUserId();
        Page<DivinationRecord> records = divinationService.listRecords(userId, page, size);

        var list = records.getRecords().stream().map(r -> DivinationVO.builder()
                .id(r.getId())
                .threadId(r.getThreadId())
                .method(r.getMethod())
                .question(r.getQuestion())
                .resultJson(r.getResultJson())
                .interpretation(r.getInterpretation())
                .feedback(r.getFeedback())
                .createdAt(r.getCreatedAt())
                .build()).collect(Collectors.toList());

        return Result.ok(PageResult.of(records.getTotal(), page, size, list));
    }

    @GetMapping("/{id}")
    public Result<DivinationVO> get(@PathVariable Long id) {
        Long userId = JwtInterceptor.getCurrentUserId();
        DivinationRecord r = divinationService.getRecord(userId, id);

        DivinationVO vo = DivinationVO.builder()
                .id(r.getId())
                .threadId(r.getThreadId())
                .method(r.getMethod())
                .question(r.getQuestion())
                .resultJson(r.getResultJson())
                .interpretation(r.getInterpretation())
                .chatHistory(r.getChatHistory())
                .modelSnapshot(r.getModelSnapshot())
                .promptTokens(r.getPromptTokens())
                .completionTokens(r.getCompletionTokens())
                .feedback(r.getFeedback())
                .createdAt(r.getCreatedAt())
                .build();

        return Result.ok(vo);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        Long userId = JwtInterceptor.getCurrentUserId();
        divinationService.deleteRecord(userId, id);
        return Result.ok("已删除", null);
    }

    @PostMapping("/{id}/feedback")
    public Result<Void> feedback(@PathVariable Long id,
                                 @Valid @RequestBody FeedbackRequest req) {
        Long userId = JwtInterceptor.getCurrentUserId();
        divinationService.feedback(userId, id, req);
        return Result.ok("感谢反馈", null);
    }
}
