"use client";

import { useEffect, useState } from "react";
import { getCrawlLogs } from "@/lib/queries";
import type { CrawlLog, Competitor } from "@/lib/types";

type LogWithCompetitor = CrawlLog & { competitor: Pick<Competitor, "id" | "name"> };

export function CrawlActivityLog() {
  const [logs, setLogs] = useState<LogWithCompetitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCrawlLogs(7)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>로딩 중...</p>;
  }

  if (logs.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>최근 7일간 크롤링 기록이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {logs.map((log) => {
        const isError = !!log.error_message;
        const time = new Date(log.run_at).toLocaleString("ko-KR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={log.id}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm"
            style={{
              background: isError ? "#fef2f2" : "var(--bg-warm)",
              border: `1px solid ${isError ? "#fecaca" : "var(--border)"}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span>{isError ? "❌" : "✅"}</span>
              <div>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {log.competitor?.name || "알 수 없음"}
                </span>
                <span className="ml-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {time}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
              {isError ? (
                <span style={{ color: "#dc2626" }}>{log.error_message}</span>
              ) : (
                <>
                  <span>발견 {log.products_found}</span>
                  <span>신제품 {log.new_products}</span>
                  <span>스펙 {log.specs_extracted}</span>
                  {log.duration_ms > 0 && <span>{(log.duration_ms / 1000).toFixed(1)}s</span>}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
