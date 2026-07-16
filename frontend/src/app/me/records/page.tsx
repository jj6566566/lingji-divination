"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "@/lib/api";

interface RecordItem {
  id: number;
  method: string;
  question: string;
  resultJson: string;
  interpretation: string | null;
  feedback: number | null;
  createdAt: string;
}

interface PageData {
  total: number;
  page: number;
  size: number;
  list: RecordItem[];
}

const METHOD_LABELS: Record<string, string> = {
  liuyao: "六爻起卦",
  bazi: "八字排盘",
  tarot: "塔罗占卜",
  meihua: "梅花易数",
};

const METHOD_ICONS: Record<string, string> = {
  liuyao: "🪙",
  bazi: "📜",
  tarot: "🃏",
  meihua: "🌸",
};

function parseHexagramName(resultJson: string | null): string | null {
  if (!resultJson) return null;
  try {
    const data = JSON.parse(resultJson);
    return data?.original?.name || null;
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${mi}`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

export default function RecordsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const pageSize = 10;

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  // Fetch records
  const fetchRecords = useCallback(
    async (p: number, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await apiFetch<{ data: PageData }>(
          `/divination?page=${p}&size=${pageSize}`
        );
        const data = result.data;
        setTotal(data.total);

        if (append) {
          setRecords((prev) => [...prev, ...data.list]);
        } else {
          setRecords(data.list);
        }
        setPage(p);
      } catch {
        // silently fail — records remain as-is
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchRecords(1);
  }, [isAuthenticated, fetchRecords]);

  // Handlers
  function handleLoadMore() {
    fetchRecords(page + 1, true);
  }

  function handleClick(record: RecordItem) {
    router.push(`/divine/${record.method}/${record.id}`);
  }

  // Guard
  if (!isAuthenticated) return null;

  const hasMore = records.length < total;

  // -- Loading skeleton ------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center px-4 py-10">
        <div className="w-full max-w-md space-y-4">
          <h1 className="text-lg font-semibold text-text-primary mb-4">占卜记录</h1>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card animate-pulse !p-5">
              <div className="h-4 w-16 rounded bg-white/10 mb-2" />
              <div className="h-5 w-3/4 rounded bg-white/5 mb-2" />
              <div className="h-3 w-24 rounded bg-white/5" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // -- Empty state -----------------------------------------------------------
  if (records.length === 0) {
    return (
      <div className="flex flex-col flex-1 items-center px-4 py-10">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="text-5xl">🔮</div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary mb-2">
              还没有占卜记录
            </h1>
            <p className="text-sm text-text-secondary">
              去起一卦，让清玄道人为你解读
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push("/divine/liuyao")}
          >
            开始占卜
          </Button>
        </div>
      </div>
    );
  }

  // -- Records list ----------------------------------------------------------
  return (
    <div className="flex flex-col flex-1 items-center px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        {/* Header + count */}
        <div className="flex items-baseline justify-between mb-2">
          <h1 className="text-lg font-semibold text-text-primary">占卜记录</h1>
          <span className="text-xs text-text-secondary">
            共 {total} 条
          </span>
        </div>

        {/* List */}
        {records.map((record) => {
          const hexName = parseHexagramName(record.resultJson);
          const methodLabel = METHOD_LABELS[record.method] || record.method;
          const methodIcon = METHOD_ICONS[record.method] || "🔮";

          return (
            <button
              key={record.id}
              onClick={() => handleClick(record)}
              className="w-full text-left"
            >
              <Card className="glass-card !p-5 transition-all hover:border-white/15 hover:bg-white/[0.06] cursor-pointer group">
                {/* Top row: icon + method + date */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{methodIcon}</span>
                    <span className="text-xs font-medium text-amber-400/80 bg-amber-500/10 rounded-full px-2 py-0.5">
                      {methodLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Feedback indicator */}
                    {record.feedback === 1 && (
                      <span className="text-xs text-green-400/70">👍</span>
                    )}
                    {record.feedback === 0 && (
                      <span className="text-xs text-red-400/70">👎</span>
                    )}
                    <span className="text-xs text-white/30">
                      {formatDate(record.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Question */}
                <p className="text-[15px] text-warm-white/85 mb-2 leading-relaxed">
                  {truncate(record.question, 60)}
                </p>

                {/* Hexagram name + interpretation preview */}
                <div className="flex items-center gap-3">
                  {hexName && (
                    <span className="text-sm text-amber-400/70 font-medium">
                      {hexName}
                    </span>
                  )}
                  {record.interpretation && (
                    <span className="text-xs text-white/35 truncate">
                      {truncate(record.interpretation, 50)}
                    </span>
                  )}
                </div>

                {/* Arrow hint */}
                <div className="flex justify-end mt-2">
                  <svg
                    className="w-4 h-4 text-white/15 group-hover:text-white/30 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </div>
              </Card>
            </button>
          );
        })}

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="lg"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full text-white/50 hover:text-white/80"
            >
              {loadingMore ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400/60 animate-pulse" />
                  加载中…
                </span>
              ) : (
                `加载更多 (${records.length}/${total})`
              )}
            </Button>
          </div>
        )}

        {/* Back link */}
        <div className="flex justify-center pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/me")}
            className="text-white/35 hover:text-white/60"
          >
            ← 返回个人中心
          </Button>
        </div>
      </div>
    </div>
  );
}
