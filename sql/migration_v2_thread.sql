-- 灵机 v2 — 对话线程 (Thread) 支持
-- 用于侧边栏历史对话管理
-- thread_id 使用 UUID (VARCHAR)，由前端生成，方便前端在首次请求时就知道 ID

USE divination;

-- 1. 新增 chat_thread 表
CREATE TABLE IF NOT EXISTS chat_thread (
    id          VARCHAR(64)  NOT NULL PRIMARY KEY COMMENT 'UUID，前端生成',
    user_id     BIGINT       NOT NULL COMMENT '用户ID',
    title       VARCHAR(200) DEFAULT NULL COMMENT '对话标题（首条问题截取）',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted  TINYINT      NOT NULL DEFAULT 0 COMMENT '0正常 1已删除',
    INDEX idx_thread_user (user_id),
    INDEX idx_thread_updated (user_id, updated_at),
    FOREIGN KEY (user_id) REFERENCES user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='对话线程表';

-- 2. divination_record 新增 thread_id (UUID 字符串)
ALTER TABLE divination_record
    ADD COLUMN thread_id VARCHAR(64) DEFAULT NULL AFTER user_id,
    ADD INDEX idx_thread_id (thread_id);
