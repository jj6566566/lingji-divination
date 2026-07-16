"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/stores/auth";

const REMEMBER_KEY = "lingji_remember";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // On mount, restore saved credentials
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const { username: u, password: p } = JSON.parse(saved);
        setUsername(u || "");
        setPassword(p || "");
        setRemember(true);
      }
    } catch {}
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("请输入用户名和密码");
      return;
    }

    setIsLoading(true);
    try {
      const result = await useAuthStore.getState().login(username, password);
      if (result.success) {
        // Save or clear remembered credentials
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }));
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        router.push("/");
      } else {
        setError(result.error ?? "登录失败，请重试");
      }
    } catch {
      setError("网络错误，请检查连接后重试");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md glass-card">
        {/* Title */}
        <h1 className="text-center text-4xl font-bold text-gradient font-serif tracking-wider">
          登录
        </h1>

        {/* Subtitle */}
        <p className="mt-2 text-center text-sm text-white/50">
          欢迎回到灵机
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <Input
            label="用户名"
            placeholder="请输入用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
          />

          <Input
            label="密码"
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />

          {/* Remember me */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 accent-[#c9a96e] cursor-pointer"
            />
            <span className="text-sm text-white/50">记住账号密码</span>
          </label>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="mt-2 w-full"
          >
            登 录
          </Button>
        </form>

        {/* Register link */}
        <p className="mt-6 text-center text-sm text-white/40">
          还没有账号？
          <Link
            href="/register"
            className="text-[#c9a96e] transition-colors hover:text-[#e0c78a]"
          >
            立即注册
          </Link>
        </p>
      </Card>
    </div>
  );
}
