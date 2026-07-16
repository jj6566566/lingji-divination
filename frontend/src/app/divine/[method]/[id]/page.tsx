"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "@/lib/api";

interface HexagramInfo {
  number?: number;
  name?: string;
  symbol?: string;
  full_name?: string;
  judgment?: string;
  image?: string;
}

interface ChangingLine {
  position: number;
  name: string;
  yang: boolean;
}

interface ResultData {
  original?: HexagramInfo;
  transformed?: HexagramInfo | null;
  changing_lines?: ChangingLine[];
  lines?: any[];
}

interface RecordDetail {
  id: number;
  method: string;
  question: string;
  resultJson: string;
  interpretation: string | null;
  chatHistory: string | null;
  modelSnapshot: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  feedback: number | null;
  createdAt: string;
}

const METHOD_LABELS: Record<string, string> = {
  liuyao: "六爻起卦",
  bazi: "八字排盘",
  tarot: "塔罗占卜",
  meihua: "梅花易数",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${mi}`;
}

function parseResult(jsonStr: string | null): ResultData | null {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/** Convert single-char symbol (䷀) to 6-line display */
function renderHexagramLines(result: ResultData) {
  const original = result.original;
  const transformed = result.transformed;
  const changingPositions = new Set(
    (result.changing_lines || []).map((cl) => cl.position)
  );

  // Build 6 lines from the lines array if available
  if (result.lines && result.lines.length === 6) {
    return (
      <div className="space-y-4">
        {/* Lines display — bottom to top (初爻→上爻) */}
        <div className="flex flex-col items-center gap-1.5">
          {[...result.lines].reverse().map((line, i) => {
            const pos = 6 - i;
            const isChanging = changingPositions.has(pos);
            const isYang = line.yang;
            return (
              <div key={pos} className="flex items-center gap-3">
                <span className="text-xs text-white/30 w-5 text-right">
                  {pos === 6 ? "上" : pos === 1 ? "初" : pos}
                </span>
                <span
                  className={`
                    text-[2rem] leading-none tracking-[0.4em] font-serif
                    transition-colors
                    ${isChanging
                      ? "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                      : "text-warm-white"
                    }
                  `}
                >
                  {isYang ? "⚊ ⚊ ⚊" : "⚋ ⚋ ⚋"}
                </span>
                {isChanging && (
                  <span className="text-xs text-amber-400/80 w-6">○→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback: just show symbol chars
  return (
    <div className="flex items-center justify-center gap-8 py-4">
      <div className="text-center">
        <div className="text-5xl mb-2">{original?.symbol || "?"}</div>
        <div className="text-sm text-warm-white/80">{original?.name}</div>
      </div>
      {transformed && (
        <>
          <div className="text-2xl text-amber-400/60">→</div>
          <div className="text-center">
            <div className="text-5xl mb-2">{transformed.symbol || "?"}</div>
            <div className="text-sm text-amber-400/80">{transformed.name}</div>
          </div>
        </>
      )}
    </div>
  );
}

export default function DivineDetailPage({
  params,
}: {
  params: Promise<{ method: string; id: string }>;
}) {
  const resolved = use(params);
  const { method, id } = resolved;
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  // Fetch record
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    async function fetchRecord() {
      try {
        const result = await apiFetch<{ data: RecordDetail }>(
          `/divination/${id}`
        );
        if (!cancelled) {
          setRecord(result.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRecord();

    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated]);

  // Feedback
  async function handleFeedback(value: number) {
    if (!record || feedbackSubmitting) return;
    setFeedbackSubmitting(true);
    try {
      await apiFetch(`/divination/${record.id}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          feedback: value,
          note: "",
        }),
      });
      setRecord({ ...record, feedback: value });
    } catch (err: any) {
      // silently fail
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  // Guard
  if (!isAuthenticated) return null;

  // -- Loading ---------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-4 animate-pulse">
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-6 w-3/4 rounded bg-white/5" />
          <div className="h-48 rounded-2xl bg-white/5" />
          <div className="h-64 rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  // -- Error ----------------------------------------------------------------
  if (error || !record) {
    return (
      <div className="flex flex-col flex-1 items-center px-4 py-10">
        <div className="w-full max-w-md text-center space-y-4">
          <p className="text-red-400">{error || "记录不存在"}</p>
          <Button variant="ghost" onClick={() => router.back()}>
            ← 返回
          </Button>
        </div>
      </div>
    );
  }

  const result = parseResult(record.resultJson);
  const methodLabel = METHOD_LABELS[record.method] || record.method;

  return (
    <div className="flex flex-col flex-1 items-center px-4 py-10">
      <div className="w-full max-w-2xl space-y-6">
        {/* Back button + meta */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/me/records")}
            className="text-white/35 hover:text-white/60"
          >
            ← 返回记录
          </Button>
          <span className="text-xs text-white/30">
            {formatDate(record.createdAt)}
          </span>
        </div>

        {/* Method badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-amber-400/80 bg-amber-500/10 rounded-full px-3 py-1">
            {methodLabel}
          </span>
        </div>

        {/* Question */}
        <h2 className="text-xl font-semibold text-warm-white leading-relaxed">
          {record.question}
        </h2>

        {/* Hexagram visualization */}
        {result && (
          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] py-6 px-4">
            {/* Names row */}
            <div className="text-center mb-4">
              <span className="text-sm text-amber-400/60 tracking-[0.15em]">
                {result.original?.full_name || result.original?.name}
              </span>
              {result.transformed && (
                <span className="text-amber-400/70">
                  {" "}→{" "}
                  {result.transformed.full_name || result.transformed.name}
                </span>
              )}
            </div>

            {/* Lines visualization */}
            {renderHexagramLines(result)}

            {/* Changing lines */}
            {result.changing_lines && result.changing_lines.length > 0 && (
              <div className="mt-4 flex justify-center">
                <span className="text-xs text-amber-400/70 bg-amber-500/10 rounded-full px-3 py-1">
                  变爻：{result.changing_lines.map((cl) => cl.name || `第${cl.position}爻`).join(" · ")}
                </span>
              </div>
            )}

            {/* Judgment */}
            {result.original?.judgment && (
              <div className="mt-4 text-center">
                <p className="text-xs text-amber-400/50 mb-1">卦辞</p>
                <p className="text-sm text-warm-white/70 italic leading-relaxed max-w-md mx-auto">
                  {result.original.judgment}
                </p>
              </div>
            )}

            {/* Image */}
            {result.original?.image && (
              <div className="mt-2 text-center">
                <p className="text-xs text-amber-400/50 mb-1">大象</p>
                <p className="text-sm text-warm-white/60 leading-relaxed max-w-md mx-auto">
                  {result.original.image}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Interpretation */}
        {record.interpretation && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
            <h3 className="text-sm font-medium text-amber-400/70 mb-4 tracking-wide">
              清玄道人解读
            </h3>
            <div className="text-[15px] leading-relaxed text-warm-white/85 whitespace-pre-wrap">
              {record.interpretation}
            </div>
          </div>
        )}

        {/* Feedback */}
        <div className="flex items-center justify-center gap-4 py-2">
          <button
            onClick={() => handleFeedback(1)}
            disabled={feedbackSubmitting}
            className={`
              inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-all
              ${record.feedback === 1
                ? "bg-green-500/15 border border-green-500/30 text-green-400"
                : "border border-white/10 text-white/40 hover:border-green-500/30 hover:text-green-400"
              }
            `}
          >
            👍 有帮助
          </button>
          <button
            onClick={() => handleFeedback(0)}
            disabled={feedbackSubmitting}
            className={`
              inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-all
              ${record.feedback === 0
                ? "bg-red-500/15 border border-red-500/30 text-red-400"
                : "border border-white/10 text-white/40 hover:border-red-500/30 hover:text-red-400"
              }
            `}
          >
            👎 一般般
          </button>
        </div>

        {/* Token info */}
        {record.promptTokens != null && record.promptTokens > 0 && (
          <div className="text-center text-xs text-white/20">
            prompt: {record.promptTokens} · completion: {record.completionTokens}
            {record.modelSnapshot && ` · ${record.modelSnapshot}`}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 pt-2 pb-8">
          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push(`/divine/${record.method}/${record.id}/chat`)}
            className="gap-2"
          >
            💬 继续追问
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push("/divine/liuyao")}
          >
            再占一次
          </Button>
        </div>
      </div>
    </div>
  );
}
