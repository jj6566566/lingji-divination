package com.divination.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DivinationRequest {

    @NotBlank(message = "占卜方式不能为空")
    private String method;

    @NotBlank(message = "问题不能为空")
    @Size(min = 1, max = 500, message = "问题长度 1-500 字")
    private String question;
}
