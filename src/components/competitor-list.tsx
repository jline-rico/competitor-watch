"use client";

import { useEffect, useState, useRef } from "react";
import {
  getCompetitors,
  updateCompetitor,
  softDeleteCompetitor,
  getDeletedCompetitors,
  restoreCompetitor,
  getDeletePin,
  setDeletePin,
  cleanupDeletedCompetitors,
} from "@/lib/queries";
import { COUNTRIES } from "@/lib/constants";
import { PinModal } from "@/components/pin-modal";
import type { Competitor } from "@/lib/types";

type EditingCell = {
  id: string;
  field: "name" | "catalog_url" | "country";
} | null;

async function triggerCrawl(competitorId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/crawl-single", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalog_mode: true, competitor_id: competitorId }),
    });
    const data = await res.json();
    return data.ok;
  } catch {
    return false;
  }
}

function timeRemaining(deletedAt: string): string {
  const diff = new Date(deletedAt).getTime() + 24 * 60 * 60 * 1000 - Date.now();
  if (diff <= 0) return "만료됨";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}시간 ${minutes}분 남음`;
}

export function CompetitorList() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [deleted, setDeleted] = useState<Competitor[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState("");
  const [pinModal, setPinModal] = useState<{ mode: "verify" | "setup"; targetId: string } | null>(null);
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [crawling, setCrawling] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cleanupDeletedCompetitors().then(() => {
      getCompetitors().then(setCompetitors);
      getDeletedCompetitors().then(setDeleted);
    });
    getDeletePin().then(setSavedPin);
  }, []);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleToggle = async (id: string, current: boolean) => {
    await updateCompetitor(id, { is_active: !current });
    setCompetitors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !current } : c))
    );
  };

  const handleDeleteClick = (id: string) => {
    if (!savedPin) {
      setPinModal({ mode: "setup", targetId: id });
    } else {
      setPinModal({ mode: "verify", targetId: id });
    }
  };

  const handlePinVerified = async () => {
    if (!pinModal) return;
    const targetId = pinModal.targetId;
    setPinModal(null);
    await softDeleteCompetitor(targetId);
    const removed = competitors.find((c) => c.id === targetId);
    setCompetitors((prev) => prev.filter((c) => c.id !== targetId));
    if (removed) {
      const withDeletedAt = { ...removed, deleted_at: new Date().toISOString() };
      setDeleted((prev) => [withDeletedAt, ...prev]);
    }
    setToast("경쟁사가 삭제되었습니다. 24시간 이내 복원 가능합니다.");
  };

  const handleRestore = async (id: string) => {
    await restoreCompetitor(id);
    const restored = deleted.find((c) => c.id === id);
    setDeleted((prev) => prev.filter((c) => c.id !== id));
    if (restored) {
      setCompetitors((prev) =>
        [...prev, { ...restored, deleted_at: null }].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      );
    }
    setToast("경쟁사가 복원되었습니다.");
  };

  const startEdit = (id: string, field: "name" | "catalog_url" | "country", currentValue: string) => {
    setEditing({ id, field });
    setEditValue(currentValue || "");
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { id, field } = editing;
    const trimmed = editValue.trim();
    if (field === "name" && !trimmed) return;
    await updateCompetitor(id, { [field]: trimmed || null });
    setCompetitors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: trimmed || null } : c))
    );
    cancelEdit();
  };

  const grouped = new Map<string, Competitor[]>();
  for (const c of competitors) {
    const country = c.country || "미분류";
    if (!grouped.has(country)) grouped.set(country, []);
    grouped.get(country)!.push(c);
  }
  const sortedCountries = Array.from(grouped.keys()).sort((a, b) =>
    a === "미분류" ? 1 : b === "미분류" ? -1 : a.localeCompare(b, "ko")
  );

  if (competitors.length === 0 && deleted.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
        등록된 경쟁사가 없습니다.
      </p>
    );
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg"
          style={{ background: "var(--accent)" }}
        >
          {toast}
        </div>
      )}

      {/* PIN Modal */}
      {pinModal && (
        <PinModal
          mode={pinModal.mode}
          verifyPin={(pin) => pin === savedPin}
          onVerified={handlePinVerified}
          onCancel={() => setPinModal(null)}
          onSetPin={(pin) => {
            setDeletePin(pin);
            setSavedPin(pin);
          }}
        />
      )}

      {/* Active competitors table */}
      {competitors.length > 0 && (
        <div
          className="overflow-x-auto rounded-lg"
          style={{ border: "1px solid var(--border)" }}
        >
          <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: "var(--bg-warm)" }}>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)", width: "110px", borderBottom: "2px solid var(--border)" }}
                >
                  국가
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)", width: "140px", borderBottom: "2px solid var(--border)" }}
                >
                  경쟁사명
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)", borderBottom: "2px solid var(--border)" }}
                >
                  카탈로그 URL
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)", width: "90px", borderBottom: "2px solid var(--border)" }}
                >
                  상태
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)", width: "160px", borderBottom: "2px solid var(--border)" }}
                >
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedCountries.map((country) => {
                const items = grouped.get(country)!;
                return items.map((c, i) => (
                  <tr
                    key={c.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {/* Country cell */}
                    {i === 0 && (
                      <td
                        rowSpan={items.length}
                        className="px-4 py-3 align-top font-semibold text-sm"
                        style={{
                          color: "var(--text-primary)",
                          borderRight: "1px solid var(--border)",
                          background: "var(--bg-warm)",
                        }}
                      >
                        {editing?.id === c.id && editing.field === "country" ? (
                          <div className="flex items-center gap-1">
                            <input
                              list="settings-country-list"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit();
                                if (e.key === "Escape") cancelEdit();
                              }}
                              placeholder="국가 입력"
                              className="w-full rounded px-1.5 py-0.5 text-sm"
                              style={{
                                background: "var(--surface)",
                                border: "1px solid var(--accent)",
                                color: "var(--text-primary)",
                                outline: "none",
                              }}
                              autoFocus
                            />
                            <datalist id="settings-country-list">
                              {[...new Set([...COUNTRIES, ...competitors.map((c) => c.country).filter(Boolean) as string[]])].map((ct) => (
                                <option key={ct} value={ct} />
                              ))}
                            </datalist>
                            <button onClick={saveEdit} className="text-xs" style={{ color: "var(--success)" }}>✓</button>
                            <button onClick={cancelEdit} className="text-xs" style={{ color: "var(--text-tertiary)" }}>✕</button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer hover:underline"
                            onClick={() => startEdit(c.id, "country", c.country || "")}
                            title="클릭하여 수정"
                          >
                            {country}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Name cell */}
                    <td className="px-4 py-3">
                      {editing?.id === c.id && editing.field === "name" ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="w-full rounded px-2 py-0.5 text-sm font-medium"
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--accent)",
                              color: "var(--text-primary)",
                              outline: "none",
                            }}
                          />
                          <button onClick={saveEdit} className="text-xs shrink-0" style={{ color: "var(--success)" }}>✓</button>
                          <button onClick={cancelEdit} className="text-xs shrink-0" style={{ color: "var(--text-tertiary)" }}>✕</button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer font-semibold hover:underline"
                          style={{ color: "var(--text-primary)" }}
                          onClick={() => startEdit(c.id, "name", c.name)}
                          title="클릭하여 수정"
                        >
                          {c.name}
                        </span>
                      )}
                    </td>

                    {/* URL cell */}
                    <td className="px-4 py-3">
                      {editing?.id === c.id && editing.field === "catalog_url" ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="w-full rounded px-2 py-0.5 text-xs font-mono"
                            style={{
                              background: "var(--surface)",
                              border: "1px solid var(--accent)",
                              color: "var(--text-primary)",
                              outline: "none",
                            }}
                          />
                          <button onClick={saveEdit} className="text-xs shrink-0" style={{ color: "var(--success)" }}>✓</button>
                          <button onClick={cancelEdit} className="text-xs shrink-0" style={{ color: "var(--text-tertiary)" }}>✕</button>
                        </div>
                      ) : (
                        <span
                          className="truncate block font-mono-data text-xs cursor-pointer transition-colors"
                          style={{ color: "var(--text-tertiary)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; }}
                          onClick={() => startEdit(c.id, "catalog_url", c.catalog_url)}
                          title={c.catalog_url}
                        >
                          {c.catalog_url}
                        </span>
                      )}
                    </td>

                    {/* Status toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(c.id, c.is_active)}
                        className="rounded-full px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap"
                        style={{
                          background: c.is_active ? "var(--success-light)" : "var(--bg-warm)",
                          color: c.is_active ? "var(--success)" : "var(--text-tertiary)",
                        }}
                      >
                        {c.is_active ? "활성" : "비활성"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={async () => {
                            setCrawling((prev) => new Set(prev).add(c.id));
                            const ok = await triggerCrawl(c.id);
                            setToast(ok ? "크롤링이 시작되었습니다. 5~10분 후 확인하세요." : "크롤링 요청에 실패했습니다.");
                            setTimeout(() => setCrawling((prev) => {
                              const next = new Set(prev);
                              next.delete(c.id);
                              return next;
                            }), 3000);
                          }}
                          disabled={crawling.has(c.id)}
                          className="rounded-md px-2.5 py-1 text-xs font-semibold transition-all disabled:opacity-40"
                          style={{
                            background: "var(--accent-light)",
                            color: "var(--accent)",
                            whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) e.currentTarget.style.background = "var(--accent)";
                            if (!e.currentTarget.disabled) e.currentTarget.style.color = "#fff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "var(--accent-light)";
                            e.currentTarget.style.color = "var(--accent)";
                          }}
                        >
                          {crawling.has(c.id) ? "요청 중…" : "크롤링"}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(c.id)}
                          className="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
                          style={{
                            color: "var(--text-tertiary)",
                            whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(220, 38, 38, 0.08)";
                            e.currentTarget.style.color = "var(--danger, #dc2626)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--text-tertiary)";
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Recently deleted section */}
      {deleted.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <span style={{ transform: showDeleted ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", display: "inline-block" }}>
              ▶
            </span>
            최근 삭제 ({deleted.length})
          </button>

          {showDeleted && (
            <div
              className="mt-2 rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--border)", background: "var(--bg-warm)" }}
            >
              {deleted.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
                      {c.name}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {c.deleted_at ? timeRemaining(c.deleted_at) : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRestore(c.id)}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
                    style={{
                      background: "var(--surface)",
                      color: "var(--accent)",
                      border: "1px solid var(--border)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    복원
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
