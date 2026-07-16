package com.divination.controller;

import com.divination.common.Result;
import com.divination.dto.LoginRequest;
import com.divination.dto.RegisterRequest;
import com.divination.interceptor.JwtInterceptor;
import com.divination.service.AuthService;
import com.divination.vo.LoginVO;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public Result<LoginVO> register(@Valid @RequestBody RegisterRequest req) {
        LoginVO vo = authService.register(req);
        return Result.ok("注册成功", vo);
    }

    @PostMapping("/login")
    public Result<LoginVO> login(@Valid @RequestBody LoginRequest req) {
        LoginVO vo = authService.login(req);
        return Result.ok(vo);
    }

    @PostMapping("/refresh")
    public Result<LoginVO> refresh() {
        Long userId = JwtInterceptor.getCurrentUserId();
        LoginVO vo = authService.refresh(userId);
        return Result.ok(vo);
    }
}
