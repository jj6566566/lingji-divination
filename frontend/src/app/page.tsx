"use client";

import { useEffect } from "react";
import MethodCard from "@/components/divination/MethodCard";
import { useAuthStore } from "@/stores/auth";

const methods = [
  { icon: "🪙", name: "六爻起卦", description: "掷铜钱问吉凶，决策之助", href: "/divine/liuyao" },
  { icon: "📜", name: "八字排盘", description: "看运势命理，知进退之道", href: "#", available: false },
  { icon: "🃏", name: "塔罗占卜", description: "探索情感选择，倾听内心", href: "#", available: false },
];

export default function Home() {
  const { user, init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-16">
      {/* Hero */}
      <div className="text-center mb-12 animate-fade-in-up">
        <h1 className="text-5xl md:text-7xl font-extrabold text-gold mb-4 tracking-tight">
          灵机
        </h1>
        <p className="text-lg md:text-xl text-[#8b8680] mb-2">
          古今易理 × 人工智能
        </p>
        <p className="text-sm text-[#8b8680]/60">
          千年智慧，为你解一卦
        </p>
      </div>

      {/* Method Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full mb-12">
        {methods.map((m, i) => (
          <div
            key={m.name}
            className="animate-fade-in-up"
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            <MethodCard {...m} />
          </div>
        ))}
      </div>

      {/* CTA for unauthenticated */}
      {!user && (
        <div className="text-center animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
          <p className="text-sm text-[#8b8680] mb-3">
            未登录每天免费 3 次
          </p>
          <a
            href="/login"
            className="inline-block px-8 py-3 rounded-xl bg-[#c44b3c] text-white font-medium hover:bg-[#d45b4c] transition-colors shadow-lg shadow-[#c44b3c]/20"
          >
            免费体验
          </a>
        </div>
      )}
    </div>
  );
}
