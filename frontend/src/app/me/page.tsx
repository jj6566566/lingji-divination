"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "@/lib/api";

interface QuotaInfo {
  used: number;
  maxFree: number;
  remaining: number;
}

export default function MePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);

  // -- Auth guard -----------------------------------------------------------

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // -- Fetch quota on mount -------------------------------------------------

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function fetchQuota() {
      try {
        const result = await apiFetch<{ data: QuotaInfo }>("/user/me/quota");
        if (!cancelled) {
          setQuota(result.data);
        }
      } catch {
        // Silently fail — quota will remain null
      } finally {
        if (!cancelled) {
          setQuotaLoading(false);
        }
      }
    }

    fetchQuota();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // -- Handlers -------------------------------------------------------------

  function handleLogout() {
    logout();
    router.push("/");
  }

  // -- Loading / not authenticated guard ------------------------------------

  if (!isAuthenticated || !user) {
    return null;
  }

  const userInitial = user.username.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col flex-1 items-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">

        {/* ----- User info card ----- */}
        <Card className="glass-card text-center space-y-5">
          {/* Avatar placeholder */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/20 border border-accent/30">
            <span className="text-2xl font-semibold text-accent">
              {userInitial}
            </span>
          </div>

          {/* Username + Email */}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-text-primary">
              {user.username}
            </h2>
            <p className="text-sm text-text-secondary">{user.email}</p>
          </div>

          {/* Quota */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-1.5 text-sm text-text-secondary">
            <span>今日配额：</span>
            {quotaLoading ? (
              <span className="animate-pulse text-white/30">…</span>
            ) : quota ? (
              <span className="text-gold font-medium">
                {quota.used}/{quota.maxFree} 次
              </span>
            ) : (
              <span className="text-white/30">--</span>
            )}
          </div>
        </Card>

        {/* ----- Quick actions ----- */}
        <div className="space-y-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => router.push("/me/records")}
          >
            占卜记录
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-full !text-[#c44b3c] hover:!bg-[#c44b3c]/10"
            onClick={handleLogout}
          >
            退出登录
          </Button>
        </div>

      </div>
    </div>
  );
}
