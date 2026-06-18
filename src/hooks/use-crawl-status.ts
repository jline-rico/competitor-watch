"use client";

import { useState, useEffect, useCallback } from "react";
import { getLatestCrawlStatus } from "@/lib/queries";

interface CrawlStatus {
  todayApiCalls: number;
  apiLimit: number;
  latestRun: {
    run_at: string;
    competitor: { name: string } | null;
    error_message: string | null;
  } | null;
  pendingResearch: number;
}

export function useCrawlStatus() {
  const [status, setStatus] = useState<CrawlStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getLatestCrawlStatus();
      setStatus(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refresh]);

  return { status, loading, refresh };
}
