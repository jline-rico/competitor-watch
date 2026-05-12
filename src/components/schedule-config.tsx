"use client";

import { useState } from "react";

const SCHEDULE_OPTIONS = [
  { value: "daily", label: "매일 09:00" },
  { value: "weekly-mon", label: "매주 월요일 09:00" },
  { value: "weekly-fri", label: "매주 금요일 09:00" },
  { value: "biweekly", label: "격주 월요일 09:00" },
];

export function ScheduleConfig() {
  const [schedule, setSchedule] = useState("weekly-mon");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("monitor-schedule", schedule);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex items-center gap-3">
      <select
        value={schedule}
        onChange={(e) => setSchedule(e.target.value)}
        className="rounded-md border bg-white px-3 py-2 text-sm"
      >
        {SCHEDULE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <button
        onClick={handleSave}
        className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-800"
      >
        저장
      </button>
      {saved && <span className="text-sm text-green-600">저장됨</span>}
      <p className="text-xs text-gray-400">
        * n8n 워크플로우의 Cron 설정을 수동으로 맞춰주세요
      </p>
    </div>
  );
}
