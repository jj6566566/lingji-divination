"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const navLinks = [
    { href: "/", label: "首页" },
    { href: "/divine/liuyao", label: "六爻" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 glass-card rounded-none border-t-0 border-l-0 border-r-0">
      <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span className="text-2xl">🔮</span>
          <span className="text-xl font-bold text-gold">灵机</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                pathname === link.href
                  ? "bg-white/10 text-white"
                  : "text-[#8b8680] hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/me"
                className="text-sm text-[#8b8680] hover:text-white transition-colors"
              >
                {user.username}
              </Link>
              <button
                onClick={logout}
                className="text-sm text-[#8b8680] hover:text-red-400 transition-colors"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-[#8b8680] hover:text-white transition-colors"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="px-4 py-1.5 rounded-lg text-sm bg-[#c44b3c] text-white hover:bg-[#d45b4c] transition-colors"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
