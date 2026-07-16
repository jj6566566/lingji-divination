"use client";

import Link from "next/link";

interface MethodCardProps {
  icon: string;
  name: string;
  description: string;
  href: string;
  available?: boolean;
}

export default function MethodCard({
  icon,
  name,
  description,
  href,
  available = true,
}: MethodCardProps) {
  const cardContent = (
    <div
      className={`
        relative rounded-xl border border-white/10 bg-white/5 p-6
        backdrop-blur-md transition-all duration-300 ease-out
        hover:scale-[1.03] hover:border-accent/40 hover:shadow-[0_0_24px_rgba(168,85,247,0.25)]
        ${!available ? "pointer-events-none opacity-50" : "cursor-pointer"}
      `}
    >
      {/* Unavailable badge */}
      {!available && (
        <span className="absolute right-3 top-3 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-medium text-amber-400">
          即将开放
        </span>
      )}

      {/* Icon */}
      <div className="mb-4 text-[3rem] leading-none drop-shadow-lg" aria-hidden>
        {icon}
      </div>

      {/* Name */}
      <h3 className="mb-2 text-lg font-semibold tracking-wide text-warm-white">
        {name}
      </h3>

      {/* Description */}
      <p className="text-sm leading-relaxed text-white/55">{description}</p>
    </div>
  );

  if (!available) {
    return cardContent;
  }

  return (
    <Link href={href} className="block focus:outline-none">
      {cardContent}
    </Link>
  );
}
