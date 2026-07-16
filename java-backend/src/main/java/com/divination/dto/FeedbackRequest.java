package com.divination.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FeedbackRequest {

    @NotNull(message = "请提供反馈")
    @Min(0) @Max(1)
    private Integer feedback;

    @Size(max = 256, message = "备注最多 256 字")
    private String note;
}
