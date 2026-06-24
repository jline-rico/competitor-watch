"use client";

import { useEffect, useState, useTransition } from "react";
import { getUnmappedWithSuggestions, mapSpecToField, mergeSpecKey } from "@/lib/queries";
import type { UnmappedWithSuggestion } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/constants";

function CategoryPicker({
  onConfirm,
  disabled,
  suggestedCategories,
}: {
  onConfirm: (categories: string[]) => void;
  disabled: boolean;
  suggestedCategories?: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    if (popoverOpen && suggestedCategories?.length) {
      setSelected(new Set(suggestedCategories));
    }
  }, [popoverOpen]);

  const toggle = (cat: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const confirm = () => {
    if (selected.size === 0) return;
    onConfirm(Array.from(selected));
    setSelected(new Set());
    setPopoverOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setPopoverOpen(!popoverOpen)}
        disabled={disabled}
        className="rounded border bg-white px-2.5 py-1 text-xs whitespace-nowrap flex items-center gap-1.5 hover:bg-gray-50 transition-colors"
        style={{ borderColor: "#fde68a", color: "#78350f" }}
      >
        {disabled ? (
          "매핑 중..."
        ) : selected.size > 0 ? (
          <>
            <span>{selected.size}개 선택</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                confirm();
              }}
              className="rounded px-1.5 py-0.5 text-white font-medium cursor-pointer"
              style={{ background: "var(--accent)" }}
            >
              매핑
            </span>
          </>
        ) : (
          "카테고리 선택 ▾"
        )}
      </button>

      {popoverOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setPopoverOpen(false)}
          />
          <div
            className="absolute right-0 top-full mt-1 z-20 rounded-lg border bg-white shadow-lg p-2 min-w-[160px]"
            style={{ borderColor: "#fde68a" }}
          >
            <div className="flex flex-col gap-0.5">
              {suggestedCategories && suggestedCategories.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#92400e" }}>
                    📌 추천
                  </div>
                  {CATEGORIES.filter((cat) => suggestedCategories.includes(cat)).map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-xs cursor-pointer hover:bg-amber-50 transition-colors"
                      style={{ color: "#78350f", background: selected.has(cat) ? "#fef3c7" : undefined }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(cat)}
                        onChange={() => toggle(cat)}
                        className="rounded accent-amber-600"
                      />
                      {cat}
                    </label>
                  ))}
                  <div className="my-1 border-t" style={{ borderColor: "#fde68a" }} />
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#a16207" }}>
                    기타
                  </div>
                </>
              )}
              {CATEGORIES.filter((cat) => !suggestedCategories?.includes(cat)).map((cat) => (
                <label
                  key={cat}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-xs cursor-pointer hover:bg-amber-50 transition-colors"
                  style={{ color: "#78350f" }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(cat)}
                    onChange={() => toggle(cat)}
                    className="rounded accent-amber-600"
                  />
                  {cat}
                </label>
              ))}
            </div>
            {selected.size > 0 && (
              <button
                onClick={confirm}
                className="mt-2 w-full rounded-md px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                {selected.size}개 카테고리에 매핑
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function UnmappedSpecsBanner() {
  const [items, setItems] = useState<UnmappedWithSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [mappingKey, setMappingKey] = useState<string | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const duplicates = items.filter((i) => i.suggestion !== null);
  const newItems = items.filter((i) => i.suggestion === null);

  useEffect(() => {
    getUnmappedWithSuggestions().then(setItems);
  }, []);

  const handleMap = (item: UnmappedWithSuggestion, categories: string[]) => {
    setMappingKey(item.field_key);
    startTransition(async () => {
      for (const cat of categories) {
        await mapSpecToField(item.field_key, item.field_label, cat);
      }
      const refreshed = await getUnmappedWithSuggestions();
      setItems(refreshed);
      setMappingKey(null);
    });
  };

  const handleApproveAll = () => {
    if (!confirm(`중복 항목 ${duplicates.length}개를 기존 항목으로 병합합니다.\n계속하시겠습니까?`)) return;
    startTransition(async () => {
      for (const item of duplicates) {
        if (item.suggestion) {
          await mergeSpecKey(
            item.field_key,
            item.suggestion.canonical_key,
            item.suggestion.canonical_label,
            item.categories
          );
        }
      }
      const refreshed = await getUnmappedWithSuggestions();
      setItems(refreshed);
    });
  };

  const handleDismissSuggestion = (fieldKey: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.field_key === fieldKey ? { ...item, suggestion: null } : item
      )
    );
  };

  const handleAiAnalyze = async () => {
    setAiAnalyzing(true);
    try {
      const { data: allFields } = await supabase
        .from("spec_fields")
        .select("field_key, field_label, category");

      const res = await fetch("/api/analyze-unmapped", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unmapped: newItems.map((i) => ({ key: i.field_key, label: i.field_label })),
          existing: allFields ?? [],
        }),
      });

      if (res.ok) {
        const results: { key: string; canonical_key: string; canonical_label: string }[] = await res.json();
        setItems((prev) =>
          prev.map((item) => {
            const match = results.find((r) => r.key === item.field_key);
            if (match && !item.suggestion) {
              return {
                ...item,
                suggestion: {
                  canonical_key: match.canonical_key,
                  canonical_label: match.canonical_label,
                  match_type: "ai" as const,
                },
              };
            }
            return item;
          })
        );
      }
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleAutoMapAll = () => {
    if (!confirm(`${newItems.length}개 새 항목을 추천 카테고리 기준으로 일괄 매핑합니다.\n계속하시겠습니까?`)) return;
    startTransition(async () => {
      for (const item of newItems) {
        const cats = item.categories.length > 0 ? item.categories : ["기타"];
        for (const cat of cats) {
          await mapSpecToField(item.field_key, item.field_label, cat);
        }
      }
      const refreshed = await getUnmappedWithSuggestions();
      setItems(refreshed);
    });
  };

  if (items.length === 0) return null;

  return (
    <div
      className="mb-6 animate-fade-in overflow-hidden"
      style={{
        background: "var(--warning-light)",
        borderRadius: "var(--radius-md)",
        border: "1px solid #fde68a",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-left hover:opacity-80 transition-opacity"
      >
        <span className="text-lg">⚠️</span>
        <div className="flex-1">
          <span className="font-semibold" style={{ color: "#92400e" }}>
            매핑되지 않은 스펙 항목 {items.length}개
            {duplicates.length > 0 && ` (중복 ${duplicates.length})`}
          </span>
          <span className="ml-2" style={{ color: "#a16207" }}>
            클릭하여 상세 확인 및 매핑
          </span>
        </div>
        <span
          className="transition-transform duration-200"
          style={{
            color: "#92400e",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          className="px-4 pb-4"
          style={{ borderTop: "1px solid #fde68a" }}
        >
          {/* Section 1: Duplicates */}
          {duplicates.length > 0 && (
            <div className="pt-3 pb-2">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold" style={{ color: "#92400e" }}>
                  🔗 기존 항목과 중복 ({duplicates.length}개)
                </span>
                <button
                  onClick={handleApproveAll}
                  disabled={pending}
                  className="rounded border px-3 py-1 text-xs font-semibold whitespace-nowrap hover:opacity-80 transition-opacity disabled:opacity-40"
                  style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                >
                  {pending ? "병합 중..." : `전체 승인 (${duplicates.length}개)`}
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {duplicates.map((item) => (
                  <div
                    key={item.field_key}
                    className="rounded-md bg-white/60 px-3 py-2"
                    style={{ border: "1px solid #fde68a" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: "#78350f" }}>
                          {item.field_key}
                        </span>
                        <span className="text-xs" style={{ color: "#a16207" }}>→</span>
                        <span className="text-sm font-medium" style={{ color: "var(--accent)" }}>
                          {item.suggestion!.canonical_key}
                        </span>
                        <span className="text-xs" style={{ color: "#a16207" }}>
                          ({item.suggestion!.canonical_label})
                        </span>
                        <span
                          className="rounded-full px-1.5 py-0.5 text-xs"
                          style={{ background: "#fef3c7", color: "#92400e" }}
                        >
                          {item.count}개 제품
                        </span>
                      </div>
                      <button
                        onClick={() => handleDismissSuggestion(item.field_key)}
                        className="rounded border px-2 py-1 text-xs whitespace-nowrap hover:opacity-80 transition-opacity"
                        style={{ borderColor: "#fde68a", color: "#a16207" }}
                      >
                        무시
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: New items */}
          {newItems.length > 0 && (
            <div className="pt-3 pb-2">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold" style={{ color: "#92400e" }}>
                  🆕 새 항목 ({newItems.length}개)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAiAnalyze}
                    disabled={aiAnalyzing || pending}
                    className="rounded border px-3 py-1 text-xs font-semibold whitespace-nowrap hover:opacity-80 transition-opacity disabled:opacity-40"
                    style={{ borderColor: "#7c3aed", color: "#7c3aed" }}
                  >
                    {aiAnalyzing ? "분석 중..." : "AI 중복 분석"}
                  </button>
                  <button
                    onClick={handleAutoMapAll}
                    disabled={pending}
                    className="rounded border px-3 py-1 text-xs font-semibold whitespace-nowrap hover:opacity-80 transition-opacity disabled:opacity-40"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                  >
                    {pending ? "매핑 중..." : `추천 기준 일괄 매핑 (${newItems.length}개)`}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {newItems.map((item) => (
                  <div
                    key={item.field_key}
                    className="rounded-md bg-white/60 px-3 py-2"
                    style={{ border: "1px solid #fde68a" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium" style={{ color: "#78350f" }}>
                          {item.field_label}
                        </span>
                        <span className="text-xs" style={{ color: "#a16207" }}>
                          {item.field_key}
                        </span>
                        <span
                          className="rounded-full px-1.5 py-0.5 text-xs"
                          style={{ background: "#fef3c7", color: "#92400e" }}
                        >
                          {item.count}개 제품
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.categories.length > 0 && (
                          <button
                            onClick={() => handleMap(item, item.categories)}
                            disabled={pending && mappingKey === item.field_key}
                            className="rounded border px-2 py-1 text-xs font-medium whitespace-nowrap hover:opacity-80 transition-opacity"
                            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                          >
                            추천 매핑 ({item.categories.length})
                          </button>
                        )}
                        <CategoryPicker
                          onConfirm={(cats) => handleMap(item, cats)}
                          disabled={pending && mappingKey === item.field_key}
                          suggestedCategories={item.categories}
                        />
                      </div>
                    </div>
                    {item.categories.length > 0 && (
                      <div className="mt-1.5 text-xs" style={{ color: "#a16207" }}>
                        └ {item.categories.join(", ")}
                        {item.products.length <= 3
                          ? `: ${item.products.join(", ")}`
                          : `: ${item.products.slice(0, 3).join(", ")} 외 ${item.products.length - 3}개`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
