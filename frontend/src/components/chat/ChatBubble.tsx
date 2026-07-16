"use client";

import StreamingText from "@/components/divination/StreamingText";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  hexagram?: any;
  offerCast?: boolean;
}

interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onCast?: () => void;
}

/** 系统消息 — 卦象卡片等 */
function SystemBubble({ message, onCast }: ChatBubbleProps) {
  return (
    <div className="my-4 flex justify-center">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-4 backdrop-blur-md max-w-sm">
        {/* 起卦完成 */}
        {message.hexagram && (
          <div className="text-center space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] text-amber-400/60">
              起卦完成
            </div>
            <div className="text-lg font-semibold text-warm-white">
              {message.hexagram.original?.name}
              {message.hexagram.transformed && (
                <span className="text-amber-400"> → {message.hexagram.transformed.name}</span>
              )}
            </div>
            {message.hexagram.changing_lines?.length > 0 && (
              <div className="text-sm text-amber-400/80">
                变爻：{message.hexagram.changing_lines.map((l: any) => l.name || `第${l.position}爻`).join(" · ")}
              </div>
            )}
            {message.content && (
              <div className="mt-2 text-sm text-white/60">{message.content}</div>
            )}
          </div>
        )}

        {/* 提议起卦 */}
        {message.offerCast && onCast && (
          <div className="text-center space-y-3">
            <p className="text-sm text-warm-white/80">{message.content || "是否起一卦看看天意？"}</p>
            <button
              onClick={onCast}
              className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-sm text-amber-400 transition-all hover:bg-amber-500/20 hover:border-amber-500/50"
            >
              <span className="text-lg">☯</span>
              有劳先生起卦
            </button>
          </div>
        )}

        {/* 普通系统消息 */}
        {!message.hexagram && !message.offerCast && (
          <p className="text-sm text-white/50 text-center">{message.content}</p>
        )}
      </div>
    </div>
  );
}

/** 卜者消息气泡 */
function AssistantBubble({ message, isStreaming }: ChatBubbleProps) {
  return (
    <div className="my-3 flex items-start gap-3">
      {/* 头像 */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-600/30 to-red-800/30 border border-amber-500/20 flex items-center justify-center">
        <span className="text-lg">☯</span>
      </div>

      {/* 气泡 */}
      <div className="relative max-w-[75%] min-w-[120px] rounded-2xl rounded-tl-sm bg-white/[0.04] backdrop-blur-md border border-white/[0.06] px-5 py-3">
        <div className="text-xs text-amber-400/60 mb-1 font-medium tracking-wide">
          清玄道人
        </div>
        <div className="text-[15px] leading-relaxed text-warm-white/90">
          {message.content ? (
            <StreamingText text={message.content} isStreaming={isStreaming ?? false} />
          ) : (
            <span className="inline-flex items-center gap-1 text-white/30">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-pulse" style={{ animationDelay: "0ms" }} />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-pulse" style={{ animationDelay: "200ms" }} />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-pulse" style={{ animationDelay: "400ms" }} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** 用户消息气泡 */
function UserBubble({ message }: ChatBubbleProps) {
  return (
    <div className="my-3 flex items-start justify-end gap-3">
      <div className="relative max-w-[75%] rounded-2xl rounded-tr-sm bg-white/[0.07] backdrop-blur-md border border-white/[0.08] px-5 py-3">
        <p className="text-[15px] leading-relaxed text-warm-white/80">
          {message.content}
        </p>
      </div>
    </div>
  );
}

export default function ChatBubble({ message, isStreaming, onCast }: ChatBubbleProps) {
  switch (message.role) {
    case "system":
      return <SystemBubble message={message} onCast={onCast} />;
    case "assistant":
      return <AssistantBubble message={message} isStreaming={isStreaming} />;
    case "user":
      return <UserBubble message={message} />;
    default:
      return null;
  }
}
