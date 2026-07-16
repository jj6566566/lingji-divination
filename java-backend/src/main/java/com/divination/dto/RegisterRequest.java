package com.divination.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "用户名不能为空")
    @Size(min = 1, max = 32, message = "用户名长度 1-32 位")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Size(min = 1, max = 32, message = "密码长度 1-32 位")
    private String password;

    @Email(message = "邮箱格式不正确")
    private String email;
}
