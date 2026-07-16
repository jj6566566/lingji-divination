'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';

export default function Header() {
  const { isAuthenticated, logout } = useAuthStore();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/5 bg-white/5 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 bg-clip-text text-2xl font-bold text-transparent">
            🔮 灵机
          </span>
        </Link>

        {/* Center nav links */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/"
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            首页
          </Link>
          <Link
            href="/liuyao"
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            六爻
          </Link>
          <Link
            href="/bazi"
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            八字
          </Link>
          <Link
            href="/tarot"
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            塔罗
          </Link>
        </nav>

        {/* Right side: auth controls */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                href="/profile"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                我的
              </Link>
              <button
                onClick={logout}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
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
