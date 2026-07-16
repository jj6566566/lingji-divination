package com.divination.controller;

import com.divination.common.Result;
import com.divination.entity.DailyQuota;
import com.divination.entity.User;
import com.divination.interceptor.JwtInterceptor;
import com.divination.service.QuotaService;
import com.divination.service.UserService;
import com.divination.vo.QuotaVO;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/user")
public class UserController {

    private final UserService userService;
    private final QuotaService quotaService;

    public UserController(UserService userService, QuotaService quotaService) {
        this.userService = userService;
        this.quotaService = quotaService;
    }

    @GetMapping("/me")
    public Result<User> me() {
        Long userId = JwtInterceptor.getCurrentUserId();
        User user = userService.getById(userId);
        user.setPassword(null); // 不暴露密码
        return Result.ok(user);
    }

    @PutMapping("/me")
    public Result<Void> updateEmail(@RequestBody Map<String, String> body) {
        Long userId = JwtInterceptor.getCurrentUserId();
        String email = body.get("email");
        userService.updateEmail(userId, email);
        return Result.ok("已更新", null);
    }

    @GetMapping("/me/quota")
    public Result<QuotaVO> quota() {
        Long userId = JwtInterceptor.getCurrentUserId();
        DailyQuota quota = quotaService.getTodayQuota(userId);

        QuotaVO vo = QuotaVO.builder()
                .used(quota.getUsed())
                .maxFree(quota.getMaxFree())
                .remaining(Math.max(0, quota.getMaxFree() - quota.getUsed()))
                .resetAt(LocalDate.now().plusDays(1))
                .build();

        return Result.ok(vo);
    }
}
