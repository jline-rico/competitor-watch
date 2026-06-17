"use client";

import { useEffect, useState } from "react";
import { createCompetitor, getCompetitors } from "@/lib/queries";
import { COUNTRIES } from "@/lib/constants";
import type { Competitor } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddUrlModal({ open, onClose }: Props) {
  const [mode, setMode] = useState<"competitor" | "product">("competitor");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedMode, setSubmittedMode] = useState<"competitor" | "product">("competitor");
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (open) getCompetitors().then(setCompetitors).catch(() => {});
  }, [open]);

  const filtered = name.trim()
    ? competitors.filter((c) =>
        c.name.toLowerCase().includes(name.trim().toLowerCase())
      )
    : competitors;

  if (!open) return null;

  const handleSelectCompetitor = (c: Competitor) => {
    setName(c.name);
    if (c.country) setCountry(c.country);
    setShowSuggestions(false);
  };

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !url.trim()) return;
    setLoading(true);
    setError(null);

    try {
      if (mode === "competitor") {
        const created = await createCompetitor(name.trim(), url.trim(), country || undefined);
        // Trigger immediate crawl for this competitor via Worker
        fetch("/api/crawl-single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competitor_name: name.trim(),
            product_url: url.trim(),
            country: country || null,
            competitor_id: created.id,
          }),
        }).catch(() => {});
        setSubmittedMode("competitor");
        setSubmitted(true);
      } else {
        const res = await fetch("/api/crawl-single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competitor_name: name.trim(),
            product_url: url.trim(),
            country: country || null,
          }),
        });
        const data = await res.json();
        if (!data.ok && data.error) {
          setError(data.error);
          return;
        }
        setSubmittedMode("product");
        setSubmitted(true);
      }
    } catch {
      setError("요청 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setUrl("");
    setCountry("");
    setSubmitted(false);
    setError(null);
    setMode("competitor");
    setShowSuggestions(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: "rgba(26, 23, 20, 0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="w-full max-w-lg animate-slide-up"
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            조사 대상 추가
          </h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-warm)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="flex flex-col items-center py-8 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                style={{ background: "var(--success-light)", color: "var(--success)" }}
              >
                ✓
              </span>
              <h3
                className="mt-4 text-lg font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                등록 완료!
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed whitespace-pre-line"
                style={{ color: "var(--text-secondary)" }}
              >
                {submittedMode === "competitor"
                  ? "경쟁사가 등록되었습니다.\n매일 자동으로 신제품을 감지합니다."
                  : "스펙 수집이 완료되었습니다.\n조사 대상 목록에서 확인하세요."}
              </p>
              <button
                onClick={handleClose}
                className="mt-6 w-full py-2.5 text-sm font-semibold text-white"
                style={{
                  borderRadius: "var(--radius-sm)",
                  background: "var(--accent)",
                }}
              >
                확인
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    {
                      key: "competitor" as const,
                      icon: "🏢",
                      title: "경쟁사 사이트 (정기)",
                      desc: "제품 목록 페이지를 등록하면\n매주 자동으로 신제품을 감지합니다",
                    },
                    {
                      key: "product" as const,
                      icon: "📦",
                      title: "개별 제품 페이지 (일회성)",
                      desc: "제품 상세 페이지 1개를 넣으면\n스펙을 즉시 수집합니다",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setMode(opt.key)}
                    className="p-4 text-left transition-all"
                    style={{
                      borderRadius: "var(--radius-md)",
                      border: `2px solid ${mode === opt.key ? "var(--accent)" : "var(--border)"}`,
                      background: mode === opt.key ? "var(--accent-light)" : "var(--surface)",
                    }}
                    onMouseEnter={(e) => {
                      if (mode !== opt.key)
                        e.currentTarget.style.borderColor = "var(--border-strong)";
                    }}
                    onMouseLeave={(e) => {
                      if (mode !== opt.key)
                        e.currentTarget.style.borderColor = "var(--border)";
                    }}
                  >
                    <p className="text-2xl">{opt.icon}</p>
                    <p
                      className="mt-2 text-sm font-semibold"
                      style={{
                        color: mode === opt.key ? "var(--accent)" : "var(--text-primary)",
                      }}
                    >
                      {opt.title}
                    </p>
                    <p
                      className="mt-1 text-xs whitespace-pre-line"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {/* 업체명: 자동완성 */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="업체명 입력 또는 선택"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full px-3.5 py-2.5 text-sm"
                    style={{
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                  />
                  {showSuggestions && filtered.length > 0 && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSuggestions(false)}
                      />
                      <div
                        className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border bg-white shadow-lg overflow-hidden"
                        style={{ borderColor: "var(--border)" }}
                      >
                        {filtered.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleSelectCompetitor(c)}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left hover:bg-amber-50 transition-colors"
                          >
                            <span style={{ color: "var(--text-primary)" }}>{c.name}</span>
                            {c.country && (
                              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                                {c.country}
                              </span>
                            )}
                          </button>
                        ))}
                        {name.trim() && !competitors.some((c) => c.name === name.trim()) && (
                          <button
                            onClick={() => setShowSuggestions(false)}
                            className="w-full px-3.5 py-2.5 text-sm text-left transition-colors"
                            style={{ color: "var(--accent)", borderTop: "1px solid var(--border)" }}
                          >
                            + &quot;{name.trim()}&quot; 새 업체로 등록
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <input
                  type="text"
                  placeholder={
                    mode === "competitor"
                      ? "제품 목록 페이지 URL"
                      : "제품 상세 페이지 URL"
                  }
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono-data"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                />

                {/* 국가: 드롭다운 */}
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: country ? "var(--text-primary)" : "var(--text-tertiary)",
                  }}
                >
                  <option value="">출시 국가 선택</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="mt-2 text-xs" style={{ color: "var(--danger, #dc2626)" }}>
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !name.trim() || !url.trim()}
                className="mt-5 w-full py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
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
                {loading
                  ? "처리 중..."
                  : mode === "competitor"
                    ? "모니터링 시작"
                    : "스펙 수집 시작"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
