"use client";

import { useState, useEffect } from "react";

const SCHEDULE_OPTIONS = [
  { value: "daily", label: "매일 09:00", cron: "0 9 * * *" },
  { value: "weekly-mon", label: "매주 월요일 09:00", cron: "0 9 * * 1" },
  { value: "weekly-fri", label: "매주 금요일 09:00", cron: "0 9 * * 5" },
  { value: "biweekly", label: "격주 월요일 09:00", cron: "0 9 */2 * 1" },
];

type SyncStatus = "idle" | "saving" | "saved" | "error";

export function ScheduleConfig() {
  const [schedule, setSchedule] = useState("weekly-mon");
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("monitor-schedule");
    if (saved) setSchedule(saved);
  }, []);

  const handleSave = async () => {
    setStatus("saving");
    setErrorMsg("");
    localStorage.setItem("monitor-schedule", schedule);

    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL;
    if (!webhookUrl) {
      setErrorMsg("NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL 환경변수가 설정되지 않았습니다");
      setStatus("error");
      return;
    }

    const selected = SCHEDULE_OPTIONS.find((o) => o.value === schedule);
    try {
      const res = await fetch(`${webhookUrl}/update-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule: schedule,
          cron: selected?.cron,
          label: selected?.label,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      setErrorMsg(
        `n8n 연결 실패 — 워크플로우가 실행 중인지 확인하세요 (${e instanceof Error ? e.message : "알 수 없는 오류"})`
      );
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <select
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          className="px-3 py-2 text-sm font-medium cursor-pointer"
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-primary)",
          }}
        >
          {SCHEDULE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          className="px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-60"
          style={{
            borderRadius: "var(--radius-sm)",
            background: "var(--accent)",
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled)
              e.currentTarget.style.background = "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--accent)";
          }}
        >
          {status === "saving" ? "저장 중..." : "저장"}
        </button>
        {status === "saved" && (
          <span className="text-sm font-medium" style={{ color: "var(--success)" }}>
            저장 완료
          </span>
        )}
      </div>
      {status === "error" && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {errorMsg}
        </p>
      )}
      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        저장 시 n8n 워크플로우의 Cron 스케줄이 자동으로 업데이트됩니다.
        n8n이 실행 중이어야 합니다.
      </p>
    </div>
  );
}
