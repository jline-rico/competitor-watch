"use client";

import { useEffect, useState } from "react";
import {
  getCompetitors,
  getSpecFields,
  createManualProduct,
} from "@/lib/queries";
import { CATEGORIES, COUNTRIES, CURRENCIES } from "@/lib/constants";
import type { Competitor, SpecField } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ManualEntryModal({ open, onClose }: Props) {
  const [competitorName, setCompetitorName] = useState("");
  const [productName, setProductName] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("KRW");
  const [productUrl, setProductUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [specFields, setSpecFields] = useState<SpecField[]>([]);
  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  const [customSpecs, setCustomSpecs] = useState<{ label: string; value: string }[]>([]);

  const [aiResearch, setAiResearch] = useState(false);

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) getCompetitors().then(setCompetitors).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!category) {
      setSpecFields([]);
      setSpecValues({});
      return;
    }
    getSpecFields(category).then((fields) => {
      setSpecFields(fields.filter((f) => f.is_visible));
      setSpecValues({});
    }).catch(() => {});
  }, [category]);

  const filtered = competitorName.trim()
    ? competitors.filter((c) =>
        c.name.toLowerCase().includes(competitorName.trim().toLowerCase())
      )
    : competitors;

  if (!open) return null;

  const handleSelectCompetitor = (c: Competitor) => {
    setCompetitorName(c.name);
    if (c.country) setCountry(c.country);
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    if (!competitorName.trim() || !productName.trim() || !category) return;
    setLoading(true);
    setError(null);

    try {
      const specs = [
        ...specFields
          .filter((f) => specValues[f.field_key]?.trim())
          .map((f) => ({
            field_key: f.field_key,
            field_label: f.field_label,
            value: specValues[f.field_key],
          })),
        ...customSpecs
          .filter((s) => s.label.trim() && s.value.trim())
          .map((s) => ({
            field_key: s.label.toLowerCase().replace(/\s+/g, "_"),
            field_label: s.label,
            value: s.value,
          })),
      ];

      const product = await createManualProduct({
        competitor_name: competitorName.trim(),
        name: productName.trim(),
        model_number: modelNumber.trim() || undefined,
        category,
        country: country || undefined,
        price: price ? Number(price) : undefined,
        currency: currency || undefined,
        product_url: productUrl.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        ai_research: aiResearch,
        specs,
      });

      if (aiResearch) {
        fetch("/api/crawl-single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competitor_name: competitorName.trim(),
            product_name: productName.trim(),
            model_number: modelNumber.trim() || null,
            country: country || null,
            product_id: product.id,
            research_mode: true,
          }),
        }).catch(() => {});
      }

      setSubmitted(true);
    } catch {
      setError("등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCompetitorName("");
    setProductName("");
    setModelNumber("");
    setCategory("");
    setCountry("");
    setPrice("");
    setCurrency("KRW");
    setProductUrl("");
    setImageUrl("");
    setSpecFields([]);
    setSpecValues({});
    setCustomSpecs([]);
    setAiResearch(false);
    setSubmitted(false);
    setError(null);
    onClose();
  };

  const inputStyle = {
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--surface)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: "rgba(26, 23, 20, 0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up"
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            직접 입력
          </h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)" }}
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
              <h3 className="mt-4 text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                등록 완료!
              </h3>
              <p className="mt-2 text-sm whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
                {aiResearch
                  ? "제품이 등록되었습니다.\n빈 항목은 AI가 리서치 중입니다."
                  : "제품이 등록되었습니다."}
              </p>
              <button
                onClick={handleClose}
                className="mt-6 w-full py-2.5 text-sm font-semibold text-white"
                style={{ borderRadius: "var(--radius-sm)", background: "var(--accent)" }}
              >
                확인
              </button>
            </div>
          ) : (
            <>
              <div
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--accent)" }}
              >
                기본 정보
              </div>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="업체명 입력 또는 선택"
                    value={competitorName}
                    onChange={(e) => { setCompetitorName(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full px-3.5 py-2.5 text-sm"
                    style={inputStyle}
                  />
                  {showSuggestions && filtered.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowSuggestions(false)} />
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
                              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{c.country}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <input type="text" placeholder="제품명 (필수)" value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm" style={inputStyle} />

                <input type="text" placeholder="모델번호 (선택)" value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm" style={inputStyle} />

                <div className="flex gap-2">
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-sm" style={{
                      ...inputStyle,
                      color: category ? "var(--text-primary)" : "var(--text-tertiary)",
                    }}>
                    <option value="">카테고리 선택</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input list="manual-country-list" value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="국가 선택 또는 입력"
                    className="flex-1 px-3.5 py-2.5 text-sm" style={{
                      ...inputStyle,
                      color: country ? "var(--text-primary)" : "var(--text-tertiary)",
                    }} />
                  <datalist id="manual-country-list">
                    {COUNTRIES.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div className="flex gap-2">
                  <input type="number" placeholder="가격 (선택)" value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-sm" style={inputStyle} />
                  <input list="manual-currency-list" value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="통화"
                    className="w-24 px-3.5 py-2.5 text-sm" style={inputStyle} />
                  <datalist id="manual-currency-list">
                    {CURRENCIES.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <input type="text" placeholder="제품 페이지 URL (선택)" value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono-data" style={inputStyle} />

                <input type="text" placeholder="이미지 URL (선택)" value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono-data" style={inputStyle} />
              </div>

              {category && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--accent)" }}>
                      스펙 항목 — {category}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      기존 항목 자동 로드됨
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {specFields.map((f) => (
                      <div key={f.id} className="flex gap-2 items-center">
                        <span className="text-xs w-24 flex-shrink-0 truncate"
                          style={{ color: "var(--text-secondary)" }}>
                          {f.field_label}
                        </span>
                        <input
                          type="text"
                          placeholder="값 입력"
                          value={specValues[f.field_key] || ""}
                          onChange={(e) => setSpecValues((prev) => ({ ...prev, [f.field_key]: e.target.value }))}
                          className="flex-1 px-2.5 py-1.5 text-sm"
                          style={inputStyle}
                        />
                      </div>
                    ))}

                    {customSpecs.map((s, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="항목명"
                          value={s.label}
                          onChange={(e) => {
                            const next = [...customSpecs];
                            next[i] = { ...next[i], label: e.target.value };
                            setCustomSpecs(next);
                          }}
                          className="w-24 flex-shrink-0 px-2.5 py-1.5 text-xs"
                          style={inputStyle}
                        />
                        <input
                          type="text"
                          placeholder="값 입력"
                          value={s.value}
                          onChange={(e) => {
                            const next = [...customSpecs];
                            next[i] = { ...next[i], value: e.target.value };
                            setCustomSpecs(next);
                          }}
                          className="flex-1 px-2.5 py-1.5 text-sm"
                          style={inputStyle}
                        />
                        <button
                          onClick={() => setCustomSpecs(customSpecs.filter((_, j) => j !== i))}
                          className="text-xs px-1"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setCustomSpecs([...customSpecs, { label: "", value: "" }])}
                    className="mt-2 w-full py-1.5 text-xs"
                    style={{
                      border: "1px dashed var(--border)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-tertiary)",
                      background: "transparent",
                    }}
                  >
                    + 항목 추가
                  </button>
                </div>
              )}

              <div
                className="mt-4 flex items-center justify-between px-3 py-3"
                style={{
                  background: "var(--accent-light)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--accent-border, #fde68a)",
                }}
              >
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                    🤖 빈 항목 AI 리서치
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    비어있는 스펙을 AI가 검색해서 채웁니다
                  </div>
                </div>
                <button
                  onClick={() => setAiResearch(!aiResearch)}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: aiResearch ? "var(--accent)" : "var(--border)" }}
                >
                  <span
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                    style={{ left: aiResearch ? "22px" : "2px" }}
                  />
                </button>
              </div>

              {error && (
                <p className="mt-2 text-xs" style={{ color: "var(--danger, #dc2626)" }}>{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !competitorName.trim() || !productName.trim() || !category}
                className="mt-5 w-full py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderRadius: "var(--radius-sm)", background: "var(--accent)" }}
              >
                {loading ? "등록 중..." : "등록하기"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
