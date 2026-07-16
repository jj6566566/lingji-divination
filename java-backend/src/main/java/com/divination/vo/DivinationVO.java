package com.divination.vo;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DivinationVO {
    private Long id;
    private String method;
    private String question;
    private String resultJson;
    private String interpretation;
    private String chatHistory;
    private String modelSnapshot;
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer feedback;
    private LocalDateTime createdAt;
}
