"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getToken, BASE_URL } from "@/lib/api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  hexagram?: any;
  offerCast?: boolean;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface UseChatStreamOptions {
  sessionId: string;
  initialMessages?: ChatMessage[];
  recordId?: number;
  threadId?: string;
  enableGreet?: boolean;
  enableCasting?: boolean;
}

export interface SessionConfig {
  sessionId: string;
  recordId?: number;
  threadId?: string;
  initialMessages: ChatMessage[];
}

interface UseChatStreamReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (message: string) => void;
  handleCast: () => Promise<void>;
  castingData: any;
  showCasting: boolean;
  confirmHexagram: () => void;
  cancelCasting: () => void;
  setError: (err: string | null) => void;
  resetSession: (config: SessionConfig) => void;
}

// ── Per-thread persisted state (survives thread switches) ──
interface ThreadSlot {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  greeted: boolean;
  invitePending: boolean;
  abortController: AbortController | null;
}

export default function useChatStream({
  sessionId: initialSessionId,
  initialMessages = [],
  recordId: initialRecordId,
  threadId: initialThreadId,
  enableGreet = false,
  enableCasting = false,
}: UseChatStreamOptions): UseChatStreamReturn {
  // ── React state (mirrors active thread) ──
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showCasting, setShowCasting] = useState(false);
  const [castingData, setCastingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Per-thread ref map ──
  const slotsRef = useRef<Map<string, ThreadSlot>>(new Map());
  const activeThreadIdRef = useRef<string>(initialThreadId ?? initialSessionId);

  // Mutable refs for current active thread's params
  const sessionIdRef = useRef(initialSessionId);
  const recordIdRef = useRef(initialRecordId);
  const threadIdRef = useRef(initialThreadId);

  // Init the initial thread slot
  if (!slotsRef.current.has(activeThreadIdRef.current)) {
    slotsRef.current.set(activeThreadIdRef.current, {
      messages: initialMessages,
      isStreaming: false,
      error: null,
      greeted: initialMessages.length > 0,
      invitePending: false,
      abortController: null,
    });
  }

  // Sync refs on prop change
  useEffect(() => { sessionIdRef.current = initialSessionId; }, [initialSessionId]);
  useEffect(() => { recordIdRef.current = initialRecordId; }, [initialRecordId]);
  useEffect(() => { threadIdRef.current = initialThreadId; }, [initialThreadId]);

  // NOTE: Do NOT abort streams on unmount — React Strict Mode would kill
  // the initial greet on double-mount. Streams complete in the background
  // and their results are saved to per-thread slots (refs).

  // ── Helper: get or create a thread slot ──
  function getSlot(tid: string): ThreadSlot {
    let slot = slotsRef.current.get(tid);
    if (!slot) {
      slot = {
        messages: [],
        isStreaming: false,
        error: null,
        greeted: false,
        invitePending: false,
        abortController: null,
      };
      slotsRef.current.set(tid, slot);
    }
    return slot;
  }

  // ── Helper: update messages for a thread (ref map + React if active) ──
  function updateMessages(tid: string, updater: (prev: ChatMessage[]) => ChatMessage[]) {
    const slot = getSlot(tid);
    slot.messages = updater(slot.messages);
    if (tid === activeThreadIdRef.current) {
      setMessages(slot.messages);
    }
  }

  // ── Helper: sync active slot → React state ──
  function syncActiveSlot() {
    const slot = getSlot(activeThreadIdRef.current);
    setMessages(slot.messages);
    setIsStreaming(slot.isStreaming);
    setError(slot.error);
  }

  // ── Auto-greet for initial thread ──
  useEffect(() => {
    if (!enableGreet) return;
    const slot = getSlot(activeThreadIdRef.current);
    if (slot.greeted) return;
    if (slot.messages.length > 0) return;
    sendChatMessage("", "greet", null);
  }, [enableGreet]);

  // ── resetSession: switch to a different thread ──
  const resetSession = useCallback((config: SessionConfig) => {
    const tid = config.threadId ?? activeThreadIdRef.current;

    // Update refs for the new active thread
    sessionIdRef.current = config.sessionId;
    recordIdRef.current = config.recordId;
    threadIdRef.current = config.threadId;

    // Ensure slot exists and merge in initialMessages if provided
    let slot = slotsRef.current.get(tid);
    if (!slot) {
      slot = {
        messages: config.initialMessages,
        isStreaming: false,
        error: null,
        greeted: config.initialMessages.length > 0,
        invitePending: false,
        abortController: null,
      };
      slotsRef.current.set(tid, slot);
    } else if (config.initialMessages.length > 0 && slot.messages.length === 0) {
      // Only overwrite if slot was empty (first load from DB)
      slot.messages = config.initialMessages;
      slot.greeted = true;
    }

    // Switch active thread
    activeThreadIdRef.current = tid;
    syncActiveSlot();

    // Clear casting state (per-thread in the future)
    setShowCasting(false);
    setCastingData(null);

    // Greet for brand-new empty threads
    if (enableGreet && slot.messages.length === 0 && !slot.greeted) {
      setTimeout(() => {
        sendChatMessage("", "greet", null);
      }, 100);
    }
  }, [enableGreet]);

  // ── sendChatMessage: start (or continue) a stream for the CURRENT thread ──
  async function sendChatMessage(
    message: string,
    action: string = "chat",
    hexagram: any = null,
  ) {
    const tid = threadIdRef.current ?? activeThreadIdRef.current;
    const slot = getSlot(tid);

    // Prevent duplicate greet — set synchronously before async call
    if (action === "greet") {
      if (slot.greeted) return;
      slot.greeted = true; // lock immediately (Strict Mode guard)
    }
    // If already streaming in this thread, don't start another
    if (slot.isStreaming) return;

    slot.isStreaming = true;
    slot.error = null;
    if (tid === activeThreadIdRef.current) {
      setIsStreaming(true);
      setError(null);
    }

    const controller = new AbortController();
    // Abort any previous stream for this thread
    slot.abortController?.abort();
    slot.abortController = controller;

    // Add user message to the thread
    if (action === "chat" && message) {
      updateMessages(tid, (prev) => [...prev, {
        id: genId(),
        role: "user",
        content: message,
      }]);
    }

    // For interpret, add system message with hexagram
    if (action === "interpret" && hexagram) {
      console.log("[DEBUG] interpret — hexagram keys:", Object.keys(hexagram));
      updateMessages(tid, (prev) => [...prev, {
        id: genId(),
        role: "system",
        content: "",
        hexagram,
      }]);
    }

    const assistantId = genId();
    let bubbleAdded = false;

    try {
      console.log(`[DEBUG] sendChatMessage — action=${action}, message=${message?.slice(0, 30)}, streamStart`);
      const token = getToken();
      const resp = await fetch(`${BASE_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          method: "liuyao",
          message,
          sessionId: sessionIdRef.current,
          hexagram: hexagram || undefined,
          action,
          inviteRejected: slot.invitePending || undefined,
          recordId: recordIdRef.current || undefined,
          threadId: tid || undefined,
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
                const textContent: string = obj.content || "";
                if (!bubbleAdded) {
                  bubbleAdded = true;
                  updateMessages(tid, (prev) => [...prev, {
                    id: assistantId,
                    role: "assistant" as const,
                    content: textContent,
                  }]);
                } else {
                  updateMessages(tid, (prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + textContent }
                        : m,
                    ),
                  );
                }
              } else if (eventType === "done" || obj.type === "done") {
                slot.isStreaming = false;
                if (tid === activeThreadIdRef.current) setIsStreaming(false);
                offerCast = obj.offer_cast || false;
                if (obj.recordId != null) {
                  recordIdRef.current = obj.recordId;
                }
              } else if (eventType === "error" || obj.type === "error") {
                slot.isStreaming = false;
                slot.error = obj.message || "AI 服务出错";
                if (tid === activeThreadIdRef.current) {
                  setIsStreaming(false);
                  setError(slot.error);
                }
              }
            } catch { /* skip malformed */ }
            eventType = "";
          }
        }
      }

      // After done: mark greet as completed
      if (action === "greet") {
        slot.greeted = true;
      }

      // After done: offer cast card (only for active thread display)
      console.log(`[DEBUG] stream ended — bubbleAdded=${bubbleAdded}, offerCast=${offerCast}, textEvents=${bubbleAdded ? "yes" : "none"}`);
      if (offerCast && enableCasting) {
        slot.invitePending = true;
        updateMessages(tid, (prev) => [...prev, {
          id: genId(),
          role: "system",
          content: "先生提议起卦",
          offerCast: true,
        }]);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("[DEBUG] stream aborted");
        return;
      }
      console.error("[DEBUG] stream error:", err.message || err);
      slot.isStreaming = false;
      if (!bubbleAdded) {
        slot.error = err.message || "对话请求失败";
      }
      if (tid === activeThreadIdRef.current) {
        setIsStreaming(false);
        if (!bubbleAdded) setError(slot.error);
      }
    } finally {
      slot.isStreaming = false;
      slot.abortController = null;
      if (tid === activeThreadIdRef.current) {
        setIsStreaming(false);
      }
    }
  }

  /** User sends a message in the active thread */
  const sendMessage = useCallback(
    (message: string) => {
      const slot = getSlot(activeThreadIdRef.current);
      if (slot.invitePending) {
        slot.invitePending = false;
        updateMessages(activeThreadIdRef.current, (prev) =>
          prev.filter((m) => m.offerCast !== true),
        );
      }
      sendChatMessage(message, "chat", null);
    },
    [],
  );

  /** User clicks 起卦 */
  const handleCast = useCallback(async () => {
    setError(null);

    // Clear the invite card — user accepted the invitation
    const slot = getSlot(activeThreadIdRef.current);
    slot.invitePending = false;
    updateMessages(activeThreadIdRef.current, (prev) =>
      prev.filter((m) => m.offerCast !== true),
    );

    try {
      const token = getToken();
      const resp = await fetch(`${BASE_URL}/divine/cast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ method: "liuyao" }),
      });

      if (!resp.ok) throw new Error("起卦失败");

      const result = await resp.json();
      const hexData = result?.data?.data || result?.data || result;
      setCastingData(hexData);
      setShowCasting(true);
    } catch (err: any) {
      setError(err.message || "起卦请求失败");
    }
  }, []);

  /** Confirm hexagram → trigger interpretation */
  const confirmHexagram = useCallback(() => {
    setShowCasting(false);
    sendChatMessage("请先生为我解卦", "interpret", castingData);
  }, [castingData]);

  /** Cancel casting */
  const cancelCasting = useCallback(() => {
    setShowCasting(false);
    setCastingData(null);
  }, []);

  return {
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
  };
}
