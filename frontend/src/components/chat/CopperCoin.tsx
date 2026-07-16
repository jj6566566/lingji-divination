"use client";

interface CopperCoinProps {
  face: "yang" | "yin";       // 乾面(阳) 还是 坤面(阴)
  isFlipping: boolean;         // 是否正在翻转
  landed: boolean;             // 是否已落地静止
  delay?: number;              // 交错延迟 ms
  size?: number;               // 尺寸 px
}

/**
 * SVG 方孔铜钱 (战国/汉代风格)
 * - 阴阳两面分别显示「乾」「坤」币文
 * - 3D 铜色金属渐变质感
 * - 方孔设计
 */
export default function CopperCoin({
  face,
  isFlipping,
  landed,
  delay = 0,
  size = 72,
}: CopperCoinProps) {
  const character = face === "yang" ? "乾" : "坤";
  const finalFace = face;

  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        perspective: "800px",
      }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: "preserve-3d",
          animation: isFlipping
            ? `coin-flip 0.9s ease-out ${delay}ms forwards`
            : undefined,
        }}
      >
        {/* 正面 — 乾面 (显示"乾"字) */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          <CoinFace
            character={finalFace === "yang" ? "乾" : "坤"}
            landed={landed && finalFace === "yang"}
          />
        </div>

        {/* 背面 — 坤面 (显示"坤"字), rotateY 180° */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <CoinFace
            character={finalFace === "yang" ? "坤" : "乾"}
            landed={landed && finalFace === "yin"}
          />
        </div>
      </div>
    </div>
  );
}

/** 单面铜钱 SVG */
function CoinFace({ character, landed }: { character: string; landed: boolean }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`w-full h-full transition-all duration-500 ${
        landed ? "drop-shadow-[0_0_8px_rgba(201,169,110,0.4)]" : ""
      }`}
    >
      <defs>
        {/* 铜色径向渐变 */}
        <radialGradient id="copperGrad" cx="40%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#F5DEB3" />
          <stop offset="25%" stopColor="#D4AF37" />
          <stop offset="55%" stopColor="#C9A96E" />
          <stop offset="80%" stopColor="#B8860B" />
          <stop offset="100%" stopColor="#8B6914" />
        </radialGradient>
        {/* 高光渐变 */}
        <radialGradient id="coinHighlight" cx="35%" cy="30%" r="30%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        {/* 内缘阴影 */}
        <filter id="innerShadow">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
          <feOffset dx="0" dy="0" />
          <feComposite operator="out" in2="SourceAlpha" />
          <feFlood floodColor="#000" floodOpacity="0.4" />
          <feComposite operator="in" in2="blur" />
          <feComposite operator="in" in2="SourceGraphic" />
        </filter>
      </defs>

      {/* 外圆主体 */}
      <circle cx="60" cy="60" r="52" fill="url(#copperGrad)" />

      {/* 高光 */}
      <circle cx="60" cy="60" r="52" fill="url(#coinHighlight)" />

      {/* 外缘凸起边线 */}
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke="#D4AF37"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <circle
        cx="60"
        cy="60"
        r="48"
        fill="none"
        stroke="#8B6914"
        strokeWidth="0.8"
        opacity="0.5"
      />

      {/* 方孔: 42,42 到 78,78 (36x36) */}
      <rect
        x="40"
        y="40"
        width="40"
        height="40"
        rx="1.5"
        fill="#0f0f14"
        stroke="#8B6914"
        strokeWidth="1"
      />

      {/* 方孔内缘阴影 */}
      <rect
        x="40"
        y="40"
        width="40"
        height="40"
        rx="1.5"
        fill="none"
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="3"
      />

      {/* 币文 */}
      <text
        x="60"
        y="60"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="34"
        fontFamily="'Noto Serif SC', 'SimSun', 'STSong', serif"
        fontWeight="normal"
        fill="#9B8060"
        opacity="0.75"
        letterSpacing="2"
      >
        {character}
      </text>

      {/* 四角小装饰点 (云纹简化) */}
      {[
        [60, 20],
        [60, 100],
        [20, 60],
        [100, 60],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="2.5"
          fill="#D4AF37"
          opacity="0.55"
        />
      ))}
    </svg>
  );
}
