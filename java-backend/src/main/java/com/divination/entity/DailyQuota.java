package com.divination.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("daily_quota")
public class DailyQuota {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private LocalDate date;

    private Integer used;

    private Integer maxFree;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
