"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MethodCard from "@/components/divination/MethodCard";
import { useAuthStore } from "@/stores/auth";

const methods = [
  {
    icon: "🪙",
    name: "六爻起卦",
    description: "掷铜钱问吉凶，决策之助",
    href: "/divine/liuyao",
  },
  {
    icon: "📜",
    name: "八字排盘",
    description: "看运势命理，知进退之道",
    href: "#",
    available: false,
  },
  {
    icon: "🃏",
    name: "塔罗占卜",
    description: "探索情感选择，倾听内心",
    href: "#",
    available: false,
  },
] as const;

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 pt-16">
      {/* ---- Hero ---- */}
      <div
        className={`flex flex-col items-center text-center transition-all duration-1000 ease-out ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0"
        }`}
      >
        <h1 className="text-6xl font-extrabold text-gradient sm:text-7xl">
          灵机
        </h1>

        <p className="mt-5 text-xl font-medium text-text-primary sm:text-2xl">
          古今易理 × 人工智能
        </p>

        <p className="mt-3 text-base text-text-secondary">
          千年智慧，为你解一卦
        </p>
      </div>

      {/* ---- Method cards ---- */}
      <div
        className={`mt-16 grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3 transition-all duration-1000 delay-200 ease-out ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0"
        }`}
      >
        {methods.map((method) => (
          <MethodCard key={method.name} {...method} />
        ))}
      </div>

      {/* ---- CTA (guests only) ---- */}
      {!isAuthenticated && (
        <div
          className={`mt-12 transition-all duration-1000 delay-500 ease-out ${
            visible
              ? "translate-y-0 opacity-100"
              : "translate-y-8 opacity-0"
          }`}
        >
          <Link
            href="/login"
            className="inline-block rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:scale-105 hover:shadow-amber-500/40"
          >
            免费体验
          </Link>
        </div>
      )}
    </div>
  );
}
