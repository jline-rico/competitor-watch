"use client";

import { useCrawlStatus } from "@/hooks/use-crawl-status";

export function CrawlStatusBar() {
  const { status, loading } = useCrawlStatus();

  if (loading || !status) return null;

  const { todayTokens, tokenLimit, latestRun, pendingResearch } = status;
  const isRunning = pendingResearch > 0;
  const isOverLimit = todayTokens >= tokenLimit;

  let bg: string;
  let border: string;
  let color: string;
  let icon: string;
  let message: string;

  if (isOverLimit) {
    bg = "#fef2f2";
    border = "#fecaca";
    color = "#dc2626";
    icon = "⚠️";
    message = "Gemini API 한도 소진 — AI 기능 일시 중단";
  } else if (isRunning) {
    bg = "#fef3c7";
    border = "#fde68a";
    color = "#92400e";
    icon = "🔄";
    message = `작업 진행 중... (${pendingResearch}건)`;
  } else {
    bg = "#f0fdf4";
    border = "#bbf7d0";
    color = "#166534";
    icon = "✅";
    const lastTime = latestRun
      ? new Date(latestRun.run_at).toLocaleString("ko-KR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "기록 없음";
    message = `대기 중 — 마지막: ${lastTime}`;
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-xs font-medium"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-sm)",
        color,
      }}
    >
      <span>
        {icon} {message}
      </span>
      <span>
        Gemini: {todayTokens >= 1000 ? `${Math.round(todayTokens / 1000).toLocaleString()}K` : todayTokens.toLocaleString()} / {(tokenLimit / 1000).toLocaleString()}K 토큰
      </span>
    </div>
  );
}
