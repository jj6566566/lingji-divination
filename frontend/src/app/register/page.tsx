"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/stores/auth";

export default function RegisterPage() {
  const router = useRouter();
  const isLoading = useAuthStore((s) => s.isLoading);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("请输入用户名");
      return;
    }
    if (!password || password.length < 6) {
      setError("密码至少需要6位");
      return;
    }

    const result = await useAuthStore.getState().register(
      username.trim(),
      password,
      email.trim() || undefined,
    );

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error ?? "注册失败，请稍后再试");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md glass-card !p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gradient mb-2">注册</h1>
          <p className="text-sm text-white/50">加入灵机，探索命运</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <Input
            label="用户名"
            placeholder="请输入用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />

          <Input
            label="密码"
            type="password"
            placeholder="至少6位"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Input
            label="邮箱（选填）"
            type="email"
            placeholder="请输入邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          {/* Error message */}
          {error && (
            <p
              className="text-sm text-red-400 text-center bg-red-500/10 rounded-lg py-2.5 border border-red-500/20"
              role="alert"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-1"
          >
            注 册
          </Button>
        </form>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-white/40">
          已有账号？
          <Link
            href="/login"
            className="text-[#c9a96e] hover:text-[#e0c78a] transition-colors duration-150"
          >
            立即登录
          </Link>
        </p>
      </Card>
    </div>
  );
}
