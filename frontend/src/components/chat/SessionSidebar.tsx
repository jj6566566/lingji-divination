"use client";

import { type ThreadSummary } from "@/hooks/useThreads";

interface SessionSidebarProps {
  threads: ThreadSummary[];
  activeThreadId: string | null;
  onSelectThread: (thread: ThreadSummary) => void;
  onDeleteThread: (thread: ThreadSummary) => void;
  onNewThread: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  loading?: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / (1000 * 60 * 60);

  if (diffH < 24) {
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  if (diffH < 48) return "昨天";

  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${mo}-${day}`;
}

export default function SessionSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onDeleteThread,
  onNewThread,
  collapsed,
  onToggleCollapse,
  loading,
}: SessionSidebarProps) {
  return (
    <>
      {/* Collapse toggle — always visible */}
      <button
        onClick={onToggleCollapse}
        className={`
          fixed top-20 z-30 flex items-center justify-center
          w-7 h-7 rounded-full border border-white/[0.08]
          bg-bg-primary/90 backdrop-blur-md
          text-white/40 hover:text-white/70
          transition-all duration-300
          ${collapsed ? "left-3" : "left-[284px]"}
        `}
        title={collapsed ? "展开侧边栏" : "收起侧边栏"}
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-16 left-0 z-20 h-[calc(100vh-4rem)]
          bg-bg-primary/95 backdrop-blur-xl
          border-r border-white/[0.06]
          transition-all duration-300 overflow-hidden
          flex flex-col
          ${collapsed ? "w-0 border-r-0" : "w-72"}
        `}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/70 tracking-wide">
              对话记录
            </h2>
            <button
              onClick={onNewThread}
              className="flex items-center gap-1 rounded-lg border border-[#c9a96e]/20 bg-[#c9a96e]/8 px-2.5 py-1 text-xs text-[#c9a96e] transition-all hover:bg-[#c9a96e]/15 hover:border-[#c9a96e]/35"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
              </svg>
              新对话
            </button>
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {loading ? (
            <div className="px-4 py-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-xl bg-white/[0.03] p-3">
                  <div className="h-3.5 w-3/4 rounded bg-white/[0.06] mb-2" />
                  <div className="h-2.5 w-1/2 rounded bg-white/[0.04]" />
                </div>
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-3xl mb-3">🔮</p>
              <p className="text-xs text-white/25 leading-relaxed">
                还没有对话记录
                <br />
                起一卦开始吧
              </p>
            </div>
          ) : (
            <div className="px-2 py-2 space-y-1">
              {threads.map((thread) => {
                const isActive = activeThreadId === thread.id;

                return (
                  <div
                    key={thread.id}
                    className={`group relative rounded-xl transition-all duration-200
                      ${isActive
                        ? "bg-[#c9a96e]/10 border border-[#c9a96e]/20"
                        : "border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]"
                      }
                    `}
                  >
                    <button
                      onClick={() => onSelectThread(thread)}
                      className="w-full text-left px-3 py-2.5"
                    >
                      {/* Title */}
                      <p
                        className={`
                          text-[13px] leading-snug mb-1.5 line-clamp-2 pr-6
                          ${isActive ? "text-warm-white/90 font-medium" : "text-white/60 group-hover:text-white/75"}
                        `}
                      >
                        {thread.title || "新对话"}
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center gap-2">
                        {thread.latestHexagramName && (
                          <span className={`
                            text-[11px] rounded-full px-2 py-0.5
                            ${isActive
                              ? "text-amber-400/80 bg-amber-500/15"
                              : "text-amber-400/50 bg-amber-500/8"
                            }
                          `}>
                            {thread.latestHexagramName}
                          </span>
                        )}
                        <span className="text-[11px] text-white/20 ml-auto flex-shrink-0">
                          {thread.updatedAt ? formatDate(thread.updatedAt) : ""}
                        </span>
                      </div>

                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-r-full bg-[#c9a96e]/60" />
                      )}
                    </button>

                    {/* Delete button — visible on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteThread(thread);
                      }}
                      className={`
                        absolute right-1.5 top-2.5
                        w-6 h-6 rounded-full
                        flex items-center justify-center
                        text-white/15 hover:text-red-400/80
                        hover:bg-red-500/10
                        opacity-0 group-hover:opacity-100
                        transition-all duration-150
                      `}
                      title="删除对话"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-white/[0.04]">
          <p className="text-[10px] text-white/15 text-center">
            {threads.length} 个对话
          </p>
        </div>
      </aside>
    </>
  );
}
