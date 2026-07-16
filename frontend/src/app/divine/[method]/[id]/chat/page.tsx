"use client";

import { useEffect, useState, useRef, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "@/lib/api";
import useChatStream, { type ChatMessage } from "@/hooks/useChatStream";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatInput, { type ChatInputHandle } from "@/components/chat/ChatInput";

interface ChatHistoryEntry {
  role: string;
  content: string;
}

interface RecordData {
  id: number;
  method: string;
  question: string;
  resultJson: string;
  interpretation: string | null;
  chatHistory: string | null;
  feedback: number | null;
  createdAt: string;
}

/** Parse chat_history JSON string into ChatMessage[] */
function parseChatHistory(json: string | null): ChatMessage[] {
  if (!json) return [];
  try {
    const entries: ChatHistoryEntry[] = JSON.parse(json);
    return entries.map((entry, i) => ({
      id: `hist_${i}`,
      role: entry.role as "user" | "assistant",
      content: entry.content || "",
    }));
  } catch {
    return [];
  }
}

/** Extract hexagram name from resultJson */
function extractHexName(resultJson: string | null): string {
  if (!resultJson) return "";
  try {
    const data = JSON.parse(resultJson);
    return data?.original?.name || "";
  } catch {
    return "";
  }
}

export default function FollowUpChatPage({
  params,
}: {
  params: Promise<{ method: string; id: string }>;
}) {
  const resolved = use(params);
  const { method, id } = resolved;
  const recordId = parseInt(id, 10);

  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [record, setRecord] = useState<RecordData | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);

  const sessionId = `record_${recordId}`;

  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    setError,
  } = useChatStream({
    sessionId,
    initialMessages,
    recordId,
    enableGreet: false,
    enableCasting: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ChatInputHandle>(null);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  // Load record
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    async function load() {
      try {
        const result = await apiFetch<{ data: RecordData }>(
          `/divination/${recordId}`
        );
        if (!cancelled) {
          setRecord(result.data);
          // Parse chatHistory for initial messages
          const histMsgs = parseChatHistory(result.data.chatHistory);
          setInitialMessages(histMsgs);
        }
      } catch {
        if (!cancelled) {
          router.replace("/me/records");
        }
      } finally {
        if (!cancelled) setLoadingRecord(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [recordId, isAuthenticated, router]);

  // Auto-scroll
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const distToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distToBottom < 200) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = useCallback(
    (msg: string) => {
      sendMessage(msg);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [sendMessage],
  );

  if (!isAuthenticated) return null;

  const hexName = extractHexName(record?.resultJson || null);

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Header bar */}
      <div className="sticky top-0 z-20 bg-bg-primary/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Back */}
          <button
            onClick={() => router.push(`/divine/${method}/${recordId}`)}
            className="flex-shrink-0 text-white/40 hover:text-white/70 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {hexName && (
                <span className="text-sm font-medium text-amber-400/80">
                  {hexName}
                </span>
              )}
              <span className="text-xs text-white/30">追问对话</span>
            </div>
            {record?.question && (
              <p className="text-xs text-white/25 truncate mt-0.5">
                {record.question.length > 40
                  ? record.question.slice(0, 40) + "…"
                  : record.question}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 pb-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        <div className="max-w-2xl mx-auto pt-4">
          {/* Loading */}
          {loadingRecord && (
            <div className="flex items-center justify-center py-20">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-400/60 animate-pulse" />
              <span className="ml-2 text-sm text-white/30">加载对话记录…</span>
            </div>
          )}

          {/* System note: context restored */}
          {!loadingRecord && initialMessages.length > 0 && (
            <div className="my-3 flex justify-center">
              <div className="rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-1.5">
                <p className="text-xs text-white/25">
                  已恢复之前的对话
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isStreaming={
                isStreaming &&
                msg.role === "assistant" &&
                msg === messages[messages.length - 1]
              }
            />
          ))}

          {/* Error */}
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

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput
        ref={inputRef}
        onSend={handleSend}
        disabled={isStreaming || loadingRecord}
        isStreaming={isStreaming}
      />
    </div>
  );
}
