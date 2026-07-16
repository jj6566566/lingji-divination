"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import CopperCoin from "./CopperCoin";

interface YaoLine {
  position: number;
  value: number;
  type: string;
  changing: boolean;
  yang: boolean;
}

interface CastingModalProps {
  hexagramData: any;
  onConfirm: () => void;
  onCancel: () => void;
  defaultMode?: "interactive" | "auto";
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

/**
 * 从爻值 (6/7/8/9) 推出 3 枚铜钱各自的面
 * value 6 (老阴) → 全阴 [false, false, false]
 * value 7 (少阳) → 一阳二阴 [true, false, false]
 * value 8 (少阴) → 二阳一阴 [true, true, false]
 * value 9 (老阳) → 全阳 [true, true, true]
 */
function getCoinFaces(value: number): boolean[] {
  switch (value) {
    case 6: return [false, false, false];
    case 7: return [true, false, false];
    case 8: return [true, true, false];
    case 9: return [true, true, true];
    default: return [false, false, false];
  }
}

type Phase = "idle" | "flipping" | "revealed";

export default function CastingModal({
  hexagramData,
  onConfirm,
  onCancel,
  defaultMode = "interactive",
}: CastingModalProps) {
  const lines: YaoLine[] = hexagramData?.lines || [];

  const [mode, setMode] = useState<"interactive" | "auto">(defaultMode);
  const [currentStep, setCurrentStep] = useState(0); // 0-5
  const [phase, setPhase] = useState<Phase>(mode === "auto" ? "flipping" : "idle");
  const [revealedLines, setRevealedLines] = useState<YaoLine[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isComplete = revealedLines.length === 6;

  /** 清理定时器 */
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** 开始摇当前爻 */
  const startFlipping = useCallback(() => {
    if (phase !== "idle" || isComplete) return;
    setPhase("flipping");

    // 翻转动画持续约 0.9s (coin-flip keyframe duration)
    timerRef.current = setTimeout(() => {
      const line = lines[currentStep];
      setRevealedLines((prev) => [...prev, line]);
      setPhase("revealed");

      // 揭示后 1.5s 自动推进 (交互模式下也让用户有充分时间看)
      if (currentStep < 5) {
        timerRef.current = setTimeout(() => {
          setCurrentStep((s) => s + 1);
          setPhase(mode === "auto" ? "flipping" : "idle");
        }, 1500);
      }
    }, 950);
  }, [phase, isComplete, lines, currentStep, mode]);

  /** 交互模式：用户点击「下一爻」 */
  const handleNextLine = useCallback(() => {
    if (phase !== "revealed" || isComplete) return;
    clearTimer();
    if (currentStep < 5) {
      setCurrentStep((s) => s + 1);
      setPhase("idle");
    }
  }, [phase, isComplete, currentStep, clearTimer]);

  /** 跳过全部 */
  function handleSkip() {
    clearTimer();
    setRevealedLines([...lines]);
    setCurrentStep(5);
    setPhase("revealed");
  }

  // 自动模式: 驱动动画循环
  useEffect(() => {
    if (mode !== "auto") return;
    if (isComplete) return;

    if (phase === "idle") {
      // 自动模式下立即进入 flipping
      const t = setTimeout(() => startFlipping(), 400);
      return () => clearTimeout(t);
    }

    return () => {};
  }, [mode, isComplete, phase, startFlipping]);

  // 自动模式: 揭示后自动推进
  useEffect(() => {
    if (mode !== "auto") return;
    if (phase !== "revealed" || currentStep >= 5) return;

    // 已经在 startFlipping 里设置了 1.5s 的推进定时器
    // 这里不需要额外处理
  }, [mode, phase, currentStep]);

  // 组件卸载时清理
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const currentYao = currentStep >= 0 && currentStep < 6 ? lines[currentStep] : null;
  const latestLine = revealedLines.length > 0 ? revealedLines[revealedLines.length - 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm transition-colors"
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
            {!isComplete && (
              <span className="text-xs text-amber-400/60 ml-1">
                第 {currentStep + 1}/6 爻
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* 模式切换 */}
            {!isComplete && (
              <button
                onClick={() => {
                  clearTimer();
                  setMode((m) => (m === "interactive" ? "auto" : "interactive"));
                  setPhase("idle");
                }}
                className="text-xs text-white/25 hover:text-white/50 transition-colors"
                title={mode === "interactive" ? "切换为自动模式" : "切换为交互模式"}
              >
                {mode === "interactive" ? "🖐 手动" : "▶ 自动"}
              </button>
            )}

            {/* 跳过 / 确认 */}
            {isComplete ? (
              <button
                onClick={onConfirm}
                className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors"
              >
                确认 →
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                跳过动画
              </button>
            )}
          </div>
        </div>

        {/* 内容区 */}
        <div className="px-6 py-6 space-y-6">
          {/* 铜钱动画区 */}
          <div className="relative rounded-xl border border-white/5 bg-white/[0.02] p-6 overflow-hidden">
            {/* 氛围粒子 (香火) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute rounded-full animate-incense"
                  style={{
                    width: `${2 + Math.random() * 3}px`,
                    height: `${2 + Math.random() * 3}px`,
                    left: `${10 + Math.random() * 80}%`,
                    bottom: "0",
                    background: "rgba(201, 169, 110, 0.25)",
                    animationDelay: `${i * 0.6}s`,
                    animationDuration: `${3 + Math.random() * 3}s`,
                    "--drift": `${(Math.random() - 0.5) * 30}px`,
                  } as React.CSSProperties}
                />
              ))}
            </div>

            {/* 状态文字 */}
            <div className="relative text-center mb-4 z-10">
              {isComplete ? (
                <p className="text-sm text-amber-400/80">六爻皆定</p>
              ) : phase === "idle" ? (
                <div>
                  <p className="text-sm text-amber-400/80">
                    {mode === "interactive" ? "凝神静心，点击摇卦" : "铜钱自动掷出…"}
                  </p>
                  <p className="text-xs text-white/25 mt-1">
                    {YAO_NAMES[currentYao?.position || 1]} · {YAO_MEANINGS[currentYao?.position || 1]}
                  </p>
                </div>
              ) : phase === "flipping" ? (
                <p className="text-sm text-amber-400/60">铜钱旋转中…</p>
              ) : (
                <p className="text-sm text-amber-400/60">
                  {YAO_NAMES[latestLine?.position || 1]}已定
                </p>
              )}
            </div>

            {/* 3 枚铜钱 */}
            <div className="relative z-10 flex items-center justify-center gap-5 py-2">
              {(phase === "idle" && !isComplete
                ? [0, 1, 2]
                : getCoinFaces(currentYao?.value ?? 7)
              ).map((faceOrIdx, i) => {
                // idle 状态下还没有投掷结果, 显示占位（待摇）
                if (phase === "idle" && !isComplete) {
                  return (
                    <div
                      key={i}
                      className="w-[88px] h-[88px] rounded-full border border-white/8 bg-white/[0.03] flex items-center justify-center"
                    >
                      <span className="text-2xl opacity-20">🪙</span>
                    </div>
                  );
                }

                const isYang = typeof faceOrIdx === "boolean" ? faceOrIdx : true;
                return (
                  <CopperCoin
                    key={i}
                    face={isYang ? "yang" : "yin"}
                    isFlipping={phase === "flipping"}
                    landed={phase === "revealed" || isComplete}
                    delay={i * 60}
                    size={88}
                  />
                );
              })}
            </div>

            {/* 爻象文字 */}
            {(phase === "revealed" && latestLine && !isComplete) && (
              <div className="relative z-10 text-center animate-fadeIn mt-3">
                <span className="text-2xl tracking-[0.3em] text-warm-white">
                  {YAO_LINE[latestLine.type] || (latestLine.yang ? "———" : "— —")}
                </span>
                <p className="text-sm text-amber-400 mt-1">
                  {latestLine.type}
                  {latestLine.changing && " · 动爻"}
                </p>
              </div>
            )}

            {/* 完成: 完整卦象 */}
            {isComplete && (
              <div className="relative z-10 text-center space-y-4 animate-fadeIn">
                {/* 本卦 */}
                <div
                  className="inline-block rounded-xl px-6 py-3"
                  style={{
                    boxShadow: "0 0 50px 16px rgba(201, 169, 110, 0.12)",
                  }}
                >
                  <p className="text-xs text-white/30 mb-1">本卦</p>
                  <p className="text-3xl text-warm-white">
                    {hexagramData?.original?.symbol}
                  </p>
                  <p className="text-lg font-semibold text-warm-white mt-1">
                    {hexagramData?.original?.name}
                  </p>
                </div>

                {/* 卦辞 */}
                {hexagramData?.original?.judgment && (
                  <p className="text-sm text-amber-400/70 font-serif italic text-center leading-relaxed max-w-xs mx-auto">
                    「{hexagramData.original.judgment}」
                  </p>
                )}

                {/* 大象辞 */}
                {hexagramData?.original?.image && (
                  <p className="text-xs text-white/25 text-center">
                    {hexagramData.original.image}
                  </p>
                )}

                {/* 变卦 */}
                {hexagramData?.transformed && (
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-xs text-white/30 mb-1">变卦</p>
                    <p className="text-xl text-amber-400/90">
                      {hexagramData.transformed.symbol}
                    </p>
                    <p className="text-base font-semibold text-amber-400 mt-1">
                      {hexagramData.transformed.name}
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
              const isCurrent = currentStep === i && !isRevealed && !isComplete;

              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className={`
                      w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium
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

        {/* 底部按钮 */}
        {isComplete ? (
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
        ) : (
          <div className="border-t border-white/5 px-6 py-4 flex items-center justify-center gap-3">
            {/* 交互模式: 摇卦按钮 */}
            {mode === "interactive" && (
              phase === "idle" ? (
                <button
                  onClick={startFlipping}
                  className="group relative w-20 h-20 rounded-full flex items-center justify-center
                    border-2 border-amber-500/30 bg-amber-500/10
                    hover:border-amber-500/50 hover:bg-amber-500/20
                    active:scale-95 transition-all duration-200
                    animate-shake-pulse"
                >
                  <span className="text-2xl font-bold text-gradient font-serif">
                    摇
                  </span>
                  {/* 外圈脉冲 */}
                  <span className="absolute inset-0 rounded-full border border-amber-400/10 animate-ping" />
                </button>
              ) : phase === "flipping" ? (
                <div className="w-20 h-20 rounded-full border-2 border-amber-500/20 bg-amber-500/5 flex items-center justify-center">
                  <span className="text-xl text-amber-400/40 animate-pulse">···</span>
                </div>
              ) : (
                <button
                  onClick={handleNextLine}
                  className="px-6 py-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10
                    text-sm text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/40
                    transition-colors font-medium"
                >
                  下一爻 →
                </button>
              )
            )}

            {/* 自动模式: 状态提示 */}
            {mode === "auto" && !isComplete && (
              <p className="text-xs text-white/25">自动掷铜钱中，请稍候…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
