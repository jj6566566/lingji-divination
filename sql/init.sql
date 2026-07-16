-- 灵机 - 数据库初始化脚本
-- 首次启动 MySQL 容器时自动执行

CREATE DATABASE IF NOT EXISTS divination
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE divination;

-- ============================================
-- 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS user (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(32)  NOT NULL UNIQUE COMMENT '用户名',
    password      VARCHAR(128) NOT NULL COMMENT 'BCrypt加密后的密码',
    email         VARCHAR(64)  DEFAULT NULL COMMENT '邮箱',
    avatar_url    VARCHAR(256) DEFAULT NULL COMMENT '头像URL',
    role          VARCHAR(16)  NOT NULL DEFAULT 'user' COMMENT '角色: user/admin',
    status        TINYINT      NOT NULL DEFAULT 1 COMMENT '1正常 0禁用',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ============================================
-- 占卜记录表
-- ============================================
CREATE TABLE IF NOT EXISTS divination_record (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT       NOT NULL COMMENT '用户ID',
    method          VARCHAR(16)  NOT NULL COMMENT '占卜方式: liuyao/bazi/tarot/meihua',
    question        TEXT         NOT NULL COMMENT '用户的问题',
    result_json     JSON         NOT NULL COMMENT '卦象原始数据',
    interpretation  MEDIUMTEXT   DEFAULT NULL COMMENT 'AI完整解读',
    chat_history    JSON         DEFAULT NULL COMMENT '追问对话记录',
    model_snapshot  VARCHAR(64)  DEFAULT NULL COMMENT '使用的模型',
    prompt_tokens   INT          DEFAULT 0 COMMENT 'Prompt token消耗',
    completion_tokens INT        DEFAULT 0 COMMENT '输出token消耗',
    feedback        TINYINT      DEFAULT NULL COMMENT '1赞 0踩 NULL未评价',
    feedback_note   VARCHAR(256) DEFAULT NULL COMMENT '用户反馈备注',
    is_deleted      TINYINT      NOT NULL DEFAULT 0 COMMENT '0正常 1已删除',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_user_method (user_id, method),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='占卜记录表';

-- ============================================
-- 每日配额表
-- ============================================
CREATE TABLE IF NOT EXISTS daily_quota (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT   NOT NULL,
    date        DATE     NOT NULL COMMENT '日期',
    used        INT      NOT NULL DEFAULT 0 COMMENT '已用次数',
    max_free    INT      NOT NULL DEFAULT 3 COMMENT '每日免费上限',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_date (user_id, date),
    FOREIGN KEY (user_id) REFERENCES user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每日免费次数配额';
