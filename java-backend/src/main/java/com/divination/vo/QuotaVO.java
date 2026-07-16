package com.divination.vo;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class QuotaVO {
    private Integer used;
    private Integer maxFree;
    private Integer remaining;
    private LocalDate resetAt;
}
