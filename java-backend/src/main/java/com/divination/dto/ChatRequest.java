package com.divination.dto;

import lombok.Data;

import java.util.Map;

@Data
public class ChatRequest {

    private String method = "liuyao";

    /** 消息内容 — greet 时可为空 */
    private String message = "";

    private String sessionId;

    /** 卦象数据 — 起卦完成后传入 */
    private Map<String, Object> hexagram;

    /** chat | interpret | report */
    private String action = "chat";

    /** 用户是否拒绝了起卦邀请 */
    private Boolean inviteRejected;
}
