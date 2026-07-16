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
  const card = (
    <div
      className={`glass-card p-6 text-center transition-all duration-300 hover:scale-[1.03] hover:border-[#c9a96e]/30 ${
        !available ? "opacity-50" : "cursor-pointer"
      }`}
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{name}</h3>
      <p className="text-sm text-[#8b8680]">{description}</p>
      {!available && (
        <span className="inline-block mt-3 px-2 py-1 text-xs rounded bg-white/5 text-[#8b8680]">
          即将开放
        </span>
      )}
    </div>
  );

  if (!available) return card;

  return <Link href={href} className="block no-underline">{card}</Link>;
}
