"use client";

import { useEffect, useState, useTransition } from "react";
import { getUnmappedSpecs, mapSpecToField } from "@/lib/queries";
import { CATEGORIES } from "@/lib/constants";

type UnmappedItem = {
  field_key: string;
  field_label: string;
  count: number;
  categories: string[];
  products: string[];
};

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
  const [items, setItems] = useState<UnmappedItem[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [mappingKey, setMappingKey] = useState<string | null>(null);

  useEffect(() => {
    getUnmappedSpecs().then(setItems);
  }, []);

  const handleMap = (item: UnmappedItem, categories: string[]) => {
    setMappingKey(item.field_key);
    startTransition(async () => {
      for (const cat of categories) {
        await mapSpecToField(item.field_key, item.field_label, cat);
      }
      setItems((prev) => prev.filter((i) => i.field_key !== item.field_key));
      setMappingKey(null);
    });
  };

  const handleMapAll = (categories: string[]) => {
    startTransition(async () => {
      for (const item of items) {
        for (const cat of categories) {
          await mapSpecToField(item.field_key, item.field_label, cat);
        }
      }
      setItems([]);
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
          <div className="flex items-center justify-between pt-3 pb-2">
            <span className="text-xs font-medium" style={{ color: "#92400e" }}>
              카테고리를 복수 선택할 수 있습니다 (예: 배터리 → 도어락 + 카메라)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "#a16207" }}>
                전체 항목
              </span>
              <CategoryPicker onConfirm={handleMapAll} disabled={pending} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {items.map((item) => (
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
  );
}
