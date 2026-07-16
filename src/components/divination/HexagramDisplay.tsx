"use client";

interface HexagramInfo {
  name: string;
  symbol: string;
  upper_trigram: string;
  lower_trigram: string;
  upper_element: string;
  lower_element: string;
}

interface HexagramDisplayProps {
  original: HexagramInfo;
  transformed: HexagramInfo | null;
  changing_lines: number[];
}

function HexagramCard({
  hexagram,
  label,
  changingLines = [],
  isTransformed = false,
}: {
  hexagram: HexagramInfo;
  label: string;
  changingLines?: number[];
  isTransformed?: boolean;
}) {
  const lines = hexagram.symbol.split("\n").filter(Boolean);

  return (
    <div
      className={`
        flex flex-col items-center rounded-2xl border border-white/10 bg-white/5
        px-8 py-6 backdrop-blur-md
        ${isTransformed ? "border-amber-500/30 bg-amber-500/5" : ""}
      `}
    >
      {/* Label */}
      <span
        className={`
          mb-3 text-xs font-medium uppercase tracking-[0.2em]
          ${isTransformed ? "text-amber-400" : "text-white/45"}
        `}
      >
        {label}
      </span>

      {/* Lines — each line of the symbol */}
      <div className="mb-4 flex flex-col items-center gap-1">
        {lines.map((line, i) => {
          const lineNumber = lines.length - i; // bottom line is line 1
          const isChanging = changingLines.includes(lineNumber);

          return (
            <span
              key={i}
              className={`
                inline-block text-[3rem] leading-none tracking-[0.3em]
                transition-colors duration-500
                ${isChanging ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "text-warm-white"}
              `}
            >
              {line}
            </span>
          );
        })}
      </div>

      {/* Name */}
      <h3 className="text-xl font-semibold tracking-wide text-warm-white">
        {hexagram.name}
      </h3>

      {/* Trigram + element detail */}
      <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
        <span>
          {hexagram.lower_trigram}
          <span className="mx-0.5 opacity-60">·</span>
          {hexagram.lower_element}
        </span>
        <span className="opacity-40">/</span>
        <span>
          {hexagram.upper_trigram}
          <span className="mx-0.5 opacity-60">·</span>
          {hexagram.upper_element}
        </span>
      </div>
    </div>
  );
}

export default function HexagramDisplay({
  original,
  transformed,
  changing_lines,
}: HexagramDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Cards row */}
      <div className="flex items-center gap-4 sm:gap-8">
        {/* 本卦 */}
        <HexagramCard
          hexagram={original}
          label="本卦"
          changingLines={changing_lines}
        />

        {/* Arrow + 变卦 */}
        {transformed && (
          <>
            {/* Arrow */}
            <div className="flex flex-col items-center gap-1 text-amber-400/70">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3"
                />
              </svg>
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/30">
                变卦
              </span>
            </div>

            {/* 变卦 card */}
            <HexagramCard
              hexagram={transformed}
              label="变卦"
              changingLines={changing_lines}
              isTransformed
            />
          </>
        )}
      </div>

      {/* Changing lines indicator */}
      {changing_lines.length > 0 && (
        <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5">
          <span className="text-xs text-amber-400/80">动爻</span>
          <span className="text-sm font-medium text-amber-400">
            {changing_lines
              .sort((a, b) => a - b)
              .map((n) => `第${n}爻`)
              .join(" · ")}
          </span>
        </div>
      )}
    </div>
  );
}
