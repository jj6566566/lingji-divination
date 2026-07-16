"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "@/lib/api";
import useChatStream, { type ChatMessage } from "@/hooks/useChatStream";
import useThreads, { type ThreadSummary } from "@/hooks/useThreads";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatInput, { type ChatInputHandle } from "@/components/chat/ChatInput";
import CastingModal from "@/components/chat/CastingModal";
import SessionSidebar from "@/components/chat/SessionSidebar";

/** Parse chat_history JSON into ChatMessage[] */
function parseChatHistory(json: string | null | undefined): ChatMessage[] {
  if (!json) return [];
  try {
    const entries: { role: string; content: string }[] = JSON.parse(json);
    return entries.map((entry, i) => ({
      id: `hist_${i}`,
      role: entry.role as "user" | "assistant",
      content: entry.content || "",
    }));
  } catch {
    return [];
  }
}

/** Build fallback messages from question + interpretation when chatHistory is empty */
function buildFallbackMessages(question: string, interpretation: string | null): ChatMessage[] {
  const msgs: ChatMessage[] = [];
  if (question) {
    msgs.push({ id: `fb_q`, role: "user", content: question });
  }
  if (interpretation) {
    msgs.push({ id: `fb_i`, role: "assistant", content: interpretation });
  }
  return msgs;
}

/** Generate a UUID v4 (simple) for thread IDs */
function genUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function LiuyaoChatPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // ---- Parse initial URL params (avoid useSearchParams to skip Suspense requirement) ----
  const [urlThreadId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search);
    return p.get("thread");
  });

  // Generate stable IDs for the initial new-conversation session
  const [sessionId] = useState(() =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
  const [clientThreadId] = useState(() => genUUID());
  const [currentThreadId, setCurrentThreadId] = useState<string>(clientThreadId);

  // ---- Thread / session state ----
  const { threads, loading: threadsLoading, refresh: refreshThreads } = useThreads();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(clientThreadId);
  const [activeRecordId, setActiveRecordId] = useState<number | undefined>(undefined);
  const [switchingThread, setSwitchingThread] = useState(false);

  // ---- Chat hook ----
  // Skip auto-greet if we have a thread param (thread will be restored instead)
  const hasThreadParam = !!urlThreadId;

  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    handleCast,
    castingData,
    showCasting,
    confirmHexagram,
    cancelCasting,
    setError,
    resetSession,
  } = useChatStream({
    sessionId,
    initialMessages: [],
    threadId: clientThreadId,
    enableGreet: !hasThreadParam,
    enableCasting: true,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ChatInputHandle>(null);

  // ---- Auth guard ----
  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  // ---- Keep sidebar in sync: poll after mount, and on every stream completion ----
  useEffect(() => {
    // Poll for first 10s to catch the greet-created thread
    const t1 = setTimeout(() => refreshThreads(), 1000);
    const t2 = setTimeout(() => refreshThreads(), 3000);
    const t3 = setTimeout(() => refreshThreads(), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [refreshThreads]);

  // Also refresh when a stream finishes (catches interpret updates)
  const prevStreamingRef = useRef(isStreaming);
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming) {
      setTimeout(() => refreshThreads(), 300);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, refreshThreads]);

  // ---- Auto-scroll ----
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const distToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distToBottom < 200) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ---- Restore thread from URL on mount ----
  useEffect(() => {
    if (urlThreadId && threads.length > 0) {
      const thread = threads.find((t) => t.id === urlThreadId);
      if (thread) {
        selectThread(thread);
      }
    }
  }, [threads]); // runs once threads load

  // ---- After interpret: refresh thread list ----
  const wrappedConfirmHexagram = useCallback(() => {
    confirmHexagram();
    // Set active thread ID to the current thread UUID so it highlights in sidebar
    setActiveThreadId(currentThreadId);
    // Refresh threads after a short delay (wait for backend to create record)
    setTimeout(() => refreshThreads(), 2000);
  }, [confirmHexagram, refreshThreads, currentThreadId]);

  // ---- Select a thread ----
  async function selectThread(thread: ThreadSummary) {
    if (switchingThread) return;
    setSwitchingThread(true);

    try {
      const tid = thread.id;
      setActiveThreadId(tid);
      setCurrentThreadId(tid);

      // Fetch the latest record to get chatHistory
      let msgs: ChatMessage[] = [];
      let recId: number | undefined;

      if (thread.latestRecordId) {
        try {
          const url = `/divination/${thread.latestRecordId}`;
          const result = await apiFetch<{
            data: {
              id: number;
              question: string;
              interpretation: string | null;
              chatHistory: string | null;
            };
          }>(url);
          recId = result.data.id;

          msgs = parseChatHistory(result.data.chatHistory);

          // Jackson non_null: if chatHistory was null in DB, field is omitted entirely
          // Fallback: construct basic history from question + interpretation
          if (msgs.length === 0) {
            msgs = buildFallbackMessages(
              result.data.question || "",
              result.data.interpretation,
            );
          }
        } catch {
          // record might be deleted — start fresh
        }
      }

      const newSessionId = `thread_${tid.slice(0, 8)}`;
      setActiveRecordId(recId);

      // Reset the chat stream with loaded history
      resetSession({
        sessionId: newSessionId,
        recordId: recId,
        threadId: tid,
        initialMessages: msgs,
      });

      // Update URL
      router.replace(`/divine/liuyao?thread=${tid}`, { scroll: false });
    } finally {
      setSwitchingThread(false);
    }
  }

  // ---- New conversation ----
  function handleNewThread() {
    const newUUID = genUUID();
    const newSessionId =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    setActiveThreadId(newUUID);
    setActiveRecordId(undefined);
    setCurrentThreadId(newUUID);

    resetSession({
      sessionId: newSessionId,
      recordId: undefined,
      threadId: newUUID,
      initialMessages: [],
    });

    router.replace("/divine/liuyao", { scroll: false });
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  // ---- Delete thread ----
  async function handleDeleteThread(thread: ThreadSummary) {
    if (!confirm(`删除「${thread.title || "新对话"}」及其所有关联记录？`)) return;

    try {
      await apiFetch(`/threads/${thread.id}`, { method: "DELETE" });

      // If deleting the active thread, switch to a new one
      if (activeThreadId === thread.id) {
        handleNewThread();
      }

      refreshThreads();
    } catch (err: any) {
      console.error("删除对话失败:", err);
    }
  }

  // ---- Send ----
  const handleSend = useCallback(
    (message: string) => {
      sendMessage(message);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [sendMessage],
  );

  // ---- Guard ----
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen max-h-screen overflow-hidden pt-16">
      {/* Sidebar */}
      <SessionSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={selectThread}
        onDeleteThread={handleDeleteThread}
        onNewThread={handleNewThread}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        loading={threadsLoading}
      />

      {/* Main chat area */}
      <div
        className={`
          flex flex-col flex-1 min-w-0 transition-all duration-300
          ${sidebarCollapsed ? "ml-0" : "ml-72"}
        `}
      >
        {/* Thread switching overlay */}
        {switchingThread && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg-primary/60 backdrop-blur-sm">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-400/60 animate-pulse" />
          </div>
        )}

        {/* Context restored indicator */}
        {activeThreadId && messages.length > 0 && (
          <div className="flex justify-center pt-3">
            <div className="rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-1">
              <p className="text-xs text-white/25">已恢复之前的对话</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 pb-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
        >
          <div className="max-w-2xl mx-auto pt-4">
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                isStreaming={
                  isStreaming &&
                  msg.role === "assistant" &&
                  msg === messages[messages.length - 1]
                }
                onCast={handleCast}
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
          disabled={isStreaming || switchingThread}
          isStreaming={isStreaming}
        />

        {/* Casting modal */}
        {showCasting && castingData && (
          <CastingModal
            hexagramData={castingData}
            onConfirm={wrappedConfirmHexagram}
            onCancel={cancelCasting}
          />
        )}
      </div>
    </div>
  );
}
