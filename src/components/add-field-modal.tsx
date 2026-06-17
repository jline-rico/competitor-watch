"use client";

import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (field_key: string, field_label: string) => void;
}

function labelToKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[가-힣]+/g, (match) => match)
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9가-힣_]/g, "");
}

export function AddFieldModal({ open, onClose, onAdd }: Props) {
  const [label, setLabel] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (!label.trim()) return;
    const key = labelToKey(label);
    onAdd(key || label.trim(), label.trim());
    setLabel("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: "rgba(26, 23, 20, 0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm animate-slide-up"
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          border: "1px solid var(--border)",
          padding: "24px",
        }}
      >
        <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
          비교 항목 추가
        </h3>
        <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
          스펙 비교 테이블에 표시할 항목명을 입력하세요
        </p>
        <div className="mt-4">
          <input
            type="text"
            placeholder="항목명 (예: 배터리 수명, 해상도, 무게)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            autoFocus
            className="w-full px-3.5 py-2.5 text-sm"
            style={{
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-warm)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!label.trim()}
            className="px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
