package com.divination.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("divination_record")
public class DivinationRecord {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String threadId;

    private String method;

    private String question;

    private String resultJson;

    private String interpretation;

    private String chatHistory;

    private String modelSnapshot;

    private Integer promptTokens;

    private Integer completionTokens;

    private Integer feedback;

    private String feedbackNote;

    @TableLogic
    private Integer isDeleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
