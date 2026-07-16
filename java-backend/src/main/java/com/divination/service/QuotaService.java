package com.divination.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.divination.entity.DailyQuota;
import com.divination.exception.QuotaExceededException;
import com.divination.mapper.DailyQuotaMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class QuotaService {

    private final DailyQuotaMapper quotaMapper;
    private final int freePerDay;

    public QuotaService(DailyQuotaMapper quotaMapper,
                        @Value("${app.quota.free-per-day}") int freePerDay) {
        this.quotaMapper = quotaMapper;
        this.freePerDay = freePerDay;
    }

    @Transactional
    public DailyQuota checkAndIncrement(Long userId, LocalDate today) {
        DailyQuota quota = quotaMapper.selectOne(
                new LambdaQueryWrapper<DailyQuota>()
                        .eq(DailyQuota::getUserId, userId)
                        .eq(DailyQuota::getDate, today));

        if (quota == null) {
            // 今天第一次
            quota = new DailyQuota();
            quota.setUserId(userId);
            quota.setDate(today);
            quota.setUsed(1);
            quota.setMaxFree(freePerDay);
            quotaMapper.insert(quota);
            return quota;
        }

        if (quota.getUsed() >= quota.getMaxFree()) {
            throw new QuotaExceededException(quota.getUsed(), quota.getMaxFree());
        }

        quota.setUsed(quota.getUsed() + 1);
        quotaMapper.updateById(quota);
        return quota;
    }

    @Transactional
    public void rollback(Long userId, LocalDate today) {
        DailyQuota quota = quotaMapper.selectOne(
                new LambdaQueryWrapper<DailyQuota>()
                        .eq(DailyQuota::getUserId, userId)
                        .eq(DailyQuota::getDate, today));

        if (quota != null && quota.getUsed() > 0) {
            quota.setUsed(quota.getUsed() - 1);
            quotaMapper.updateById(quota);
        }
    }

    public DailyQuota getTodayQuota(Long userId) {
        LocalDate today = LocalDate.now();
        DailyQuota quota = quotaMapper.selectOne(
                new LambdaQueryWrapper<DailyQuota>()
                        .eq(DailyQuota::getUserId, userId)
                        .eq(DailyQuota::getDate, today));

        if (quota == null) {
            quota = new DailyQuota();
            quota.setUserId(userId);
            quota.setDate(today);
            quota.setUsed(0);
            quota.setMaxFree(freePerDay);
        }
        return quota;
    }
}
