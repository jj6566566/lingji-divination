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

    /** 已有的占卜记录 ID — 追问时传入以追加对话历史 */
    private Long recordId;

    /** 对话线程 ID — 前端生成，用于归组同一对话中的多次占卜 */
    private String threadId;
}
