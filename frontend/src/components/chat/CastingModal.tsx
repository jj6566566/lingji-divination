"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface YaoLine {
  position: number;
  value: number;
  type: string;
  changing: boolean;
  yang: boolean;
}

interface CastingModalProps {
  hexagramData: any; // 完整卦象数据（6 条爻线）
  onConfirm: () => void;
  onCancel: () => void;
}

const YAO_NAMES: Record<number, string> = {
  1: "初爻", 2: "二爻", 3: "三爻",
  4: "四爻", 5: "五爻", 6: "上爻",
};

const YAO_MEANINGS: Record<number, string> = {
  1: "事情的起始",
  2: "事情的发展",
  3: "事情的小成",
  4: "事情的转折",
  5: "事情的鼎盛",
  6: "事情的归宿",
};

const YAO_LINE: Record<string, string> = {
  "少阳": "———",
  "少阴": "— —",
  "老阳": "——○——",
  "老阴": "— —×—",
};

function CoinAnimation({ done, result }: { done: boolean; result?: YaoLine }) {
  return (
    <div className="flex items-center justify-center gap-4 py-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center text-2xl
            border transition-all duration-500
            ${done
              ? "border-amber-500/30 bg-amber-500/10"
              : "border-white/10 bg-white/5 animate-coin-spin"
            }
          `}
        >
          {done ? (result ? (result.yang ? "⚊" : "⚋") : "🪙") : "🪙"}
        </div>
      ))}
    </div>
  );
}

export default function CastingModal({ hexagramData, onConfirm, onCancel }: CastingModalProps) {
  const lines: YaoLine[] = hexagramData?.lines || [];
  const [currentStep, setCurrentStep] = useState(-1); // -1 = 准备; 0-5 = 掷第1-6爻; 6 = 完成
  const [revealedLines, setRevealedLines] = useState<YaoLine[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const advanceStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next < 6) {
        // 显示下一爻
        setRevealedLines((old) => [...old, lines[next]]);
        return next;
      }
      return 6; // 完成
    });
    setIsAnimating(false);
  }, [lines]);

  // 自动播放动画
  useEffect(() => {
    if (currentStep === -1) {
      // 初始延迟后开始
      const t = setTimeout(() => {
        setCurrentStep(0);
        setIsAnimating(true);
      }, 600);
      return () => clearTimeout(t);
    }

    if (currentStep >= 0 && currentStep < 6 && isAnimating) {
      // 每爻动画 2s
      timerRef.current = setTimeout(() => {
        advanceStep();
        setIsAnimating(true);
      }, 2000);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [currentStep, isAnimating, advanceStep]);

  function handleSkip() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRevealedLines([...lines]);
    setCurrentStep(6);
    setIsAnimating(false);
  }

  const isComplete = currentStep === 6;
  const currentYao = currentStep >= 0 && currentStep < 6 ? lines[currentStep] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={isComplete ? undefined : onCancel}
      />

      {/* 弹窗 */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1a1f] shadow-2xl overflow-hidden animate-fade-in-up">
        {/* 头部 */}
        <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">☯</span>
            <span className="text-sm font-medium text-warm-white">
              {isComplete ? "起卦完成" : "六爻起卦"}
            </span>
          </div>
          <button
            onClick={isComplete ? onConfirm : handleSkip}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            {isComplete ? "确认 →" : "跳过动画"}
          </button>
        </div>

        {/* 内容区 */}
        <div className="px-6 py-6 space-y-6">
          {/* 铜钱动画区 */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            {/* 当前掷的爻 */}
            <div className="text-center mb-3">
              {isComplete ? (
                <p className="text-sm text-amber-400/80">六爻皆定</p>
              ) : currentYao ? (
                <p className="text-sm text-amber-400/80">
                  第 {currentStep + 1} 掷 · {YAO_NAMES[currentYao.position]}
                  <span className="block text-xs text-white/30 mt-0.5">
                    {YAO_MEANINGS[currentYao.position]}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-white/30">准备掷铜钱...</p>
              )}
            </div>

            {/* 铜钱 */}
            <CoinAnimation
              done={!isAnimating && currentStep >= 0 && currentStep < 6 && !isComplete}
              result={!isAnimating && currentStep >= 0 ? currentYao ?? undefined : undefined}
            />

            {/* 当前爻结果 */}
            {!isAnimating && currentYao && !isComplete && (
              <div className="text-center animate-fadeIn">
                <span className="text-2xl tracking-[0.3em] text-warm-white">
                  {YAO_LINE[currentYao.type] || (currentYao.yang ? "———" : "— —")}
                </span>
                <p className="text-sm text-amber-400 mt-1">
                  {currentYao.type}
                  {currentYao.changing && " · 动爻"}
                </p>
              </div>
            )}

            {/* 完成状态：显示完整卦象 */}
            {isComplete && (
              <div className="text-center space-y-3 animate-fadeIn">
                {/* 本卦 */}
                <div>
                  <p className="text-xs text-white/30 mb-1">本卦</p>
                  <p className="text-xl font-semibold text-warm-white">
                    {hexagramData?.original?.name}
                  </p>
                  <p className="text-2xl tracking-[0.3em] mt-1 text-warm-white/80">
                    {hexagramData?.original?.symbol}
                  </p>
                </div>

                {/* 变卦 */}
                {hexagramData?.transformed && (
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-xs text-white/30 mb-1">变卦</p>
                    <p className="text-lg font-semibold text-amber-400">
                      {hexagramData.transformed.name}
                    </p>
                    <p className="text-xl tracking-[0.3em] mt-1 text-amber-400/80">
                      {hexagramData.transformed.symbol}
                    </p>
                  </div>
                )}

                {/* 变爻 */}
                {hexagramData?.changing_lines?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-amber-400/60">
                      变爻：{hexagramData.changing_lines.map((l: any) => l.name || l).join(" · ")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 爻线进度条 */}
          <div className="flex items-center justify-center gap-3">
            {lines.map((line, i) => {
              const isRevealed = revealedLines.some((l) => l.position === line.position);
              const isCurrent = currentYao?.position === line.position && isAnimating;

              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                      transition-all duration-300
                      ${isComplete
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                        : isRevealed
                          ? "bg-white/10 border border-white/15 text-warm-white"
                          : isCurrent
                            ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse"
                            : "bg-white/[0.02] border border-white/5 text-white/20"
                      }
                    `}
                  >
                    {i + 1}
                  </div>
                  <span className="text-[10px] text-white/30">
                    {YAO_NAMES[line.position]?.charAt(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部 */}
        {isComplete && (
          <div className="border-t border-white/5 px-6 py-4 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/50 hover:text-white/80 hover:border-white/20 transition-colors"
            >
              重新起卦
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-amber-500/15 border border-amber-500/30 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-500/25 transition-colors font-medium"
            >
              请先生解卦
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
