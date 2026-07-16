"use client";

import { useState, useRef, useImperativeHandle, forwardRef, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onCast: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export interface ChatInputHandle {
  focus: () => void;
}

const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput({ onSend, onCast, disabled, isStreaming }, ref) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled || isStreaming) return;

    onSend(trimmed);
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter 发送，Shift+Enter 换行
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;

    // Auto-resize
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  return (
    <div className="sticky bottom-0 z-10 bg-gradient-to-t from-bg-primary via-bg-primary/95 to-transparent pb-4 pt-8">
      <form onSubmit={handleSubmit} className="flex items-end gap-3 max-w-2xl mx-auto">
        {/* 起卦按钮 */}
        <button
          type="button"
          onClick={onCast}
          disabled={disabled || isStreaming}
          className="flex-shrink-0 flex items-center gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-2.5 text-sm text-amber-400/80 transition-all hover:bg-amber-500/15 hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed"
          title="起卦"
        >
          <span className="text-base">☯</span>
          <span className="hidden sm:inline">起卦</span>
        </button>

        {/* 文本输入 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleInput();
            }}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="写下你想问的..."
            rows={1}
            disabled={disabled || isStreaming}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md px-4 py-2.5 text-[15px] text-white placeholder:text-white/25 focus:border-[#c9a96e]/30 focus:outline-none focus:ring-1 focus:ring-[#c9a96e]/15 disabled:opacity-40 transition-colors"
          />
        </div>

        {/* 发送按钮 */}
        <button
          type="submit"
          disabled={disabled || isStreaming || !input.trim()}
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-[#c9a96e]/15 border border-[#c9a96e]/25 text-[#c9a96e] transition-all hover:bg-[#c9a96e]/25 hover:border-[#c9a96e]/40 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isStreaming ? (
            <span className="inline-block w-2 h-2 rounded-full bg-[#c9a96e] animate-pulse" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
});

export default ChatInput;
