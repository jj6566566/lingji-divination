"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface ThreadSummary {
  id: string;
  title: string | null;
  latestHexagramName: string | null;
  latestRecordId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface UseThreadsReturn {
  threads: ThreadSummary[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export default function useThreads(): UseThreadsReturn {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await apiFetch<{ data: ThreadSummary[] }>("/threads");
      setThreads(result.data || []);
    } catch {
      // silently fail — threads remain as-is
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { threads, loading, refresh };
}
