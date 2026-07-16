package com.divination.vo;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ThreadVO {
    private String id;
    private Long userId;
    private String title;
    /** 最新记录中的卦名（从 resultJson.original.name 提取） */
    private String latestHexagramName;
    /** 最新记录的 ID，用于切换时加载 chatHistory */
    private Long latestRecordId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
