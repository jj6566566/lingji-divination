"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { getToken } from "@/lib/api";
import ChatBubble, { type ChatMessage } from "@/components/chat/ChatBubble";
import ChatInput, { type ChatInputHandle } from "@/components/chat/ChatInput";
import CastingModal from "@/components/chat/CastingModal";

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function LiuyaoChatPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId] = useState(genId());
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCasting, setShowCasting] = useState(false);
  const [castingData, setCastingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ChatInputHandle>(null);
  const greetedRef = useRef(false);
  const invitePendingRef = useRef(false); // 当前是否有待接受的起卦邀请

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  // Abort on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // 初始化：让大模型生成随机欢迎语（只发一次）
  useEffect(() => {
    if (!isAuthenticated || greetedRef.current) return;
    sendChatMessage("", sessionId, "greet", null);
  }, [isAuthenticated, sessionId]);

  // Auto-scroll to bottom when messages change (unless user scrolled up)
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const distToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distToBottom < 200) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  /** Send a chat message to the AI service */
  async function sendChatMessage(
    message: string,
    sid: string,
    action: string = "chat",
    hexagram: any = null,
  ) {
    setIsStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    // Add user message (not for greet)
    if (action === "chat") {
      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content: message,
      };
      setMessages((prev) => [...prev, userMsg]);
    }

    // For interpret/report, add a system message with hexagram
    if (action === "interpret" && hexagram) {
      const sysMsg: ChatMessage = {
        id: genId(),
        role: "system",
        content: "",
        hexagram,
      };
      setMessages((prev) => [...prev, sysMsg]);
    }

    // Stream assistant response — bubble added on first text chunk, never empty
    const assistantId = genId();
    let bubbleAdded = false;

    try {
      const token = getToken();
      const resp = await fetch("http://localhost:8080/api/v1/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          method: "liuyao",
          message,
          sessionId: sid,
          hexagram: hexagram || undefined,
          action,
          inviteRejected: invitePendingRef.current || undefined,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `请求失败 (${resp.status})`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "";
      let offerCast = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) { eventType = ""; continue; }

          if (trimmed.startsWith("event:")) {
            eventType = trimmed.slice(6).trim();
          } else if (trimmed.startsWith("data:")) {
            const dataStr = trimmed.slice(5).trim();
            try {
              const obj = JSON.parse(dataStr);

              if (eventType === "text" || obj.type === "text") {
                if (!bubbleAdded) {
                  bubbleAdded = true;
                  setMessages((prev) => [...prev, {
                    id: assistantId,
                    role: "assistant" as const,
                    content: obj.content || "",
                  }]);
                } else {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + (obj.content || "") }
                        : m,
                    ),
                  );
                }
              } else if (eventType === "done" || obj.type === "done") {
                setIsStreaming(false);
                offerCast = obj.offer_cast || false;
              } else if (eventType === "error" || obj.type === "error") {
                setError(obj.message || "AI 服务出错");
                setIsStreaming(false);
              }
            } catch { /* skip malformed */ }
            eventType = "";
          }
        }
      }

      // 欢迎语生成成功
      if (action === "greet") greetedRef.current = true;

      // After done: if LLM offered to cast, show offer card
      if (offerCast) {
        invitePendingRef.current = true;
        const offerMsg: ChatMessage = {
          id: genId(),
          role: "system",
          content: "先生提议起卦",
          offerCast: true,
        };
        setMessages((prev) => [...prev, offerMsg]);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      // 如果已有内容（流式输出正常完成），不当作错误
      if (!bubbleAdded) {
        setError(err.message || "对话请求失败");
      }
    } finally {
      setIsStreaming(false);
    }
  }

  /** User sends a message */
  const handleSend = useCallback(
    (message: string) => {
      // 用户打字意味着拒绝了起卦邀请
      if (invitePendingRef.current) {
        invitePendingRef.current = false;
        // 移除邀请卡片
        setMessages((prev) => prev.filter((m) => m.offerCast !== true));
      }
      sendChatMessage(message, sessionId, "chat", null);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [sessionId],
  );

  /** User clicks 起卦 — call cast API then show modal */
  const handleCast = useCallback(async () => {
    setError(null);
    try {
      const token = getToken();
      const resp = await fetch("http://localhost:8080/api/v1/divine/cast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ method: "liuyao" }),
      });

      if (!resp.ok) throw new Error("起卦失败");

      const result = await resp.json();
      // Java backend wraps: {code: 200, data: {code: 200, data: {...}}}
      const hexData = result?.data?.data || result?.data || result;
      setCastingData(hexData);
      setShowCasting(true);
    } catch (err: any) {
      setError(err.message || "起卦请求失败");
    }
  }, []);

  /** User confirms hexagram after animation */
  const handleConfirmHexagram = useCallback(() => {
    setShowCasting(false);
    // Trigger interpretation
    sendChatMessage("请先生为我解卦", sessionId, "interpret", castingData);
  }, [castingData, sessionId]);

  /** User cancels casting */
  const handleCancelCasting = useCallback(() => {
    setShowCasting(false);
    setCastingData(null);
  }, []);

  if (!isAuthenticated) return null;

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* 对话区 */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 pt-20 pb-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        <div className="max-w-2xl mx-auto">

          {/* 消息列表 */}
          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && msg.role === "assistant" && msg === messages[messages.length - 1]}
              onCast={handleCast}
            />
          ))}

          {/* 错误提示 */}
          {error && (
            <div className="my-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-center">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-xs text-red-400/60 hover:text-red-400 transition-colors"
              >
                关闭
              </button>
            </div>
          )}

          {/* 底部锚点 */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入栏 */}
      <ChatInput
        ref={inputRef}
        onSend={handleSend}
        disabled={isStreaming}
        isStreaming={isStreaming}
      />

      {/* 起卦弹窗 */}
      {showCasting && castingData && (
        <CastingModal
          hexagramData={castingData}
          onConfirm={handleConfirmHexagram}
          onCancel={handleCancelCasting}
          defaultMode="interactive"
        />
      )}
    </div>
  );
}
