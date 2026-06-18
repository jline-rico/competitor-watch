"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { useProducts } from "@/hooks/use-products";
import { useSpecs } from "@/hooks/use-specs";
import { useSpecFields } from "@/hooks/use-spec-fields";
import { useDisplayBrands } from "@/hooks/use-display-brands";
import { setDisplayBrand, updateProduct } from "@/lib/queries";
import { SpecRow } from "./spec-row";
import { OtherSpecsSection } from "./other-specs-section";
import { ProductFilter } from "./product-filter";
import { exportToXlsx } from "@/lib/export-xlsx";
import type { Spec } from "@/lib/types";

function EditableBrandName({
  productId,
  currentName,
  displayBrand,
  onSave,
}: {
  productId: string;
  currentName: string;
  displayBrand?: string;
  onSave: (brand: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(displayBrand || currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const shown = displayBrand || currentName;

  const handleSave = async () => {
    const trimmed = value.trim();
    if (trimmed === currentName && !displayBrand) {
      setEditing(false);
      return;
    }
    if (trimmed === displayBrand) {
      setEditing(false);
      return;
    }
    const saved = trimmed === currentName ? "" : trimmed;
    await setDisplayBrand(productId, saved);
    onSave(saved || currentName);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setValue(shown);
            setEditing(false);
          }
        }}
        className="w-full px-1.5 py-0.5 text-xs"
        style={{
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--accent)",
          background: "var(--surface)",
          outline: "none",
          minWidth: "60px",
          color: "var(--text-secondary)",
        }}
        placeholder={currentName}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 cursor-pointer rounded px-1 py-0.5 transition-colors"
      onClick={() => {
        setValue(shown);
        setEditing(true);
      }}
      title="클릭하여 표시 브랜드 수정"
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-warm)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {shown}
      {displayBrand && displayBrand !== currentName && (
        <span style={{ color: "var(--accent)", fontSize: "0.6em" }}>✎</span>
      )}
    </span>
  );
}

function EditableProductImage({
  product,
  onImageChange,
}: {
  product: { id: string; image_url: string | null; name: string };
  onImageChange: (id: string, url: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(product.image_url || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    const trimmed = url.trim() || null;
    if (trimmed === product.image_url) {
      setEditing(false);
      return;
    }
    await updateProduct(product.id, { image_url: trimmed });
    onImageChange(product.id, trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5" style={{ minWidth: 100 }}>
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setUrl(product.image_url || "");
              setEditing(false);
            }
          }}
          placeholder="이미지 URL 입력"
          className="w-full px-2 py-1 text-xs"
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--accent)",
            background: "var(--surface)",
            outline: "none",
          }}
        />
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            className="rounded px-2 py-0.5 text-xs font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            저장
          </button>
          <button
            onClick={() => {
              setUrl(product.image_url || "");
              setEditing(false);
            }}
            className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group cursor-pointer mx-auto"
      onClick={() => setEditing(true)}
      title="클릭하여 이미지 URL 수정"
    >
      {product.image_url ? (
        <div className="relative">
          <img
            src={product.image_url}
            alt={product.name}
            className="h-16 w-16 rounded-lg object-contain"
            style={{ border: "1px solid var(--border)", background: "white" }}
          />
          <div
            className="absolute inset-0 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(0,0,0,0.4)" }}
          >
            <span className="text-white text-xs font-medium">수정</span>
          </div>
        </div>
      ) : (
        <div
          className="flex h-16 w-16 items-center justify-center rounded-lg transition-colors"
          style={{
            border: "2px dashed var(--border-strong)",
            background: "var(--bg-warm)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border-strong)";
          }}
        >
          <span className="text-xs text-center leading-tight" style={{ color: "var(--text-tertiary)" }}>
            + 이미지
          </span>
        </div>
      )}
    </div>
  );
}

export type SortDir = "asc" | "desc" | null;

interface Props {
  category: string;
  sortField: string | null;
  sortDir: SortDir;
  onSortChange: (field: string | null, dir: SortDir) => void;
  visibleFieldIds: string[] | null;
  onFieldsChange: (fieldIds: string[]) => void;
  brandFilter: string[] | null;
  countryFilter: string[] | null;
  onBrandFilterChange: (brands: string[] | null) => void;
  onCountryFilterChange: (countries: string[] | null) => void;
}

export function SpecTable({ category, sortField, sortDir, onSortChange, visibleFieldIds, onFieldsChange, brandFilter, countryFilter, onBrandFilterChange, onCountryFilterChange }: Props) {
  const router = useRouter();
  const { products, loading: pLoading } = useProducts(category);
  const productIds = products.map((p) => p.id);
  const { specs, loading: sLoading } = useSpecs(productIds);
  const { brands, setBrands, loading: bLoading } = useDisplayBrands(productIds);
  const { fields, loading: fLoading, reorder, renameField, toggle, addField, refresh: refreshFields } = useSpecFields(category);

  const [localSpecs, setLocalSpecs] = useState<Map<string, Spec>>(new Map());
  const [localImages, setLocalImages] = useState<Map<string, string | null>>(new Map());
  const [copied, setCopied] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  }));

  const specsMap = new Map<string, Map<string, Spec>>();
  for (const spec of specs) {
    if (!specsMap.has(spec.product_id)) {
      specsMap.set(spec.product_id, new Map());
    }
    specsMap.get(spec.product_id)!.set(spec.field_key, spec);
  }
  for (const [key, spec] of localSpecs) {
    const [productId, fieldKey] = key.split(":::");
    if (!specsMap.has(productId)) {
      specsMap.set(productId, new Map());
    }
    specsMap.get(productId)!.set(fieldKey, spec);
  }

  const uniqueBrands = [...new Set(products.map((p) => brands.get(p.id) || p.competitor?.name || ""))].sort();
  const uniqueCountries = [...new Set(products.map((p) => p.country || "").filter(Boolean))].sort();

  const filteredProducts = products.filter((p) => {
    if (brandFilter) {
      const brandName = brands.get(p.id) || p.competitor?.name || "";
      if (!brandFilter.includes(brandName)) return false;
    }
    if (countryFilter) {
      if (!countryFilter.includes(p.country || "")) return false;
    }
    return true;
  });

  const visibleFields = visibleFieldIds
    ? fields.filter((f) => visibleFieldIds.includes(f.id))
    : fields.filter((f) => f.is_visible);
  const commonFieldKeys = new Set(visibleFields.map((f) => f.field_key));

  const handleSpecUpdated = useCallback(
    (productId: string, fieldKey: string, spec: Spec) => {
      setLocalSpecs((prev) => {
        const next = new Map(prev);
        next.set(`${productId}:::${fieldKey}`, spec);
        return next;
      });
    },
    []
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);

    if (activeId.startsWith("other::")) {
      if (over.id === "__hide_zone__") return;
      const { fieldKey, fieldLabel } = active.data.current as { fieldKey: string; fieldLabel: string };
      await addField(fieldKey, fieldLabel);
      refreshFields();
      return;
    }

    if (over.id === "__hide_zone__") {
      toggle(activeId, false);
      return;
    }
    const oldIndex = visibleFields.findIndex((f) => f.id === active.id);
    const newIndex = visibleFields.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(visibleFields, oldIndex, newIndex);
    reorder(reordered);
  };

  const handleHeaderClick = (fieldKey: string) => {
    if (sortField === fieldKey) {
      if (sortDir === "asc") onSortChange(fieldKey, "desc");
      else onSortChange(null, null);
    } else {
      onSortChange(fieldKey, "asc");
    }
  };

  const sortedProducts = (() => {
    if (!sortField || !sortDir) return filteredProducts;
    return [...filteredProducts].sort((a, b) => {
      let aVal: string;
      let bVal: string;

      if (sortField === "__competitor__") {
        aVal = brands.get(a.id) || a.competitor?.name || "";
        bVal = brands.get(b.id) || b.competitor?.name || "";
      } else if (sortField === "__product__") {
        aVal = a.name;
        bVal = b.name;
      } else if (sortField === "__price__") {
        const aNum = a.price ?? 0;
        const bNum = b.price ?? 0;
        const cmp = aNum - bNum;
        return sortDir === "asc" ? cmp : -cmp;
      } else if (sortField === "__country__") {
        const aCountry = a.country || "";
        const bCountry = b.country || "";
        const cmp = aCountry.localeCompare(bCountry, "ko");
        return sortDir === "asc" ? cmp : -cmp;
      } else {
        aVal = specsMap.get(a.id)?.get(sortField)?.value ?? "";
        bVal = specsMap.get(b.id)?.get(sortField)?.value ?? "";
      }

      const cmp = aVal.localeCompare(bVal, "ko");
      return sortDir === "asc" ? cmp : -cmp;
    });
  })();

  if (pLoading || sLoading || fLoading || bLoading) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <div
          className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--border-strong)", borderTopColor: "transparent" }}
        />
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          불러오는 중...
        </p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div
        className="flex flex-col items-center py-16 text-center"
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px dashed var(--border-strong)",
        }}
      >
        <span className="text-4xl">📊</span>
        <p className="mt-4 font-semibold" style={{ color: "var(--text-primary)" }}>
          이 카테고리에 제품이 없습니다
        </p>
        <p className="mt-1.5 text-sm" style={{ color: "var(--text-tertiary)" }}>
          조사 대상 추가 탭에서 경쟁사를 먼저 등록하세요
        </p>
      </div>
    );
  }

  function HideDropZone({ colSpan }: { colSpan: number }) {
    const { setNodeRef, isOver } = useDroppable({ id: "__hide_zone__" });
    return (
      <tr
        ref={setNodeRef}
        style={{
          background: isOver ? "rgba(194, 65, 12, 0.08)" : "var(--bg-warm)",
          borderBottom: isOver ? "2px solid var(--accent)" : "1px solid var(--border)",
          transition: "all 0.15s ease",
        }}
      >
        <td
          colSpan={colSpan}
          className="px-4 py-2 text-xs font-bold uppercase"
          style={{ color: isOver ? "var(--accent)" : "var(--text-tertiary)" }}
        >
          {isOver ? "↓ 여기에 놓으면 숨김 처리됩니다" : "기타"}
        </td>
      </tr>
    );
  }

  const SortIndicator = ({ field }: { field: string }) => {
    if (sortField !== field) return <span style={{ color: "var(--text-tertiary)", opacity: 0.3, fontSize: "0.7em" }}> ↕</span>;
    return <span style={{ color: "var(--accent)", fontSize: "0.8em" }}>{sortDir === "asc" ? " ↑" : " ↓"}</span>;
  };

  return (
    <div>
      <div className="flex justify-end mb-3 gap-2 flex-wrap">
        {uniqueBrands.length > 1 && (
          <ProductFilter
            label="업체"
            options={uniqueBrands}
            selected={brandFilter}
            onChange={onBrandFilterChange}
          />
        )}
        {uniqueCountries.length > 1 && (
          <ProductFilter
            label="국가"
            options={uniqueCountries}
            selected={countryFilter}
            onChange={onCountryFilterChange}
          />
        )}
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all"
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: copied ? "var(--success-light, rgba(34,197,94,0.1))" : "var(--surface)",
            color: copied ? "var(--success, #22c55e)" : "var(--text-secondary)",
            boxShadow: "var(--shadow-sm)",
          }}
          onMouseEnter={(e) => {
            if (!copied) {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.color = "var(--text-primary)";
            }
          }}
          onMouseLeave={(e) => {
            if (!copied) {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }
          }}
        >
          {copied ? "복사됨 ✓" : "링크 복사 🔗"}
        </button>
        <button
          onClick={() => exportToXlsx(sortedProducts, specsMap, fields, category)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all"
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-secondary)",
            boxShadow: "var(--shadow-sm)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--border-strong)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          엑셀 내보내기 ⬇
        </button>
      </div>
      <div
        className="overflow-x-auto"
        style={{
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-sm)",
          transform: "rotateX(180deg)",
        }}
      >
        <div style={{ transform: "rotateX(180deg)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-warm)" }}>
              <th className="w-8" />
              <th className="px-4 pt-4 pb-2 text-left text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
                제품 이미지
              </th>
              {sortedProducts.map((p) => (
                <th key={p.id} className="px-4 pt-4 pb-2 text-center">
                  <EditableProductImage
                    product={{
                      ...p,
                      image_url: localImages.has(p.id) ? localImages.get(p.id)! : p.image_url,
                    }}
                    onImageChange={(id, url) => {
                      setLocalImages((prev) => {
                        const next = new Map(prev);
                        next.set(id, url);
                        return next;
                      });
                    }}
                  />
                </th>
              ))}
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-warm)" }}>
              <th className="w-8" />
              <th
                className="px-4 py-2 text-left text-xs font-medium cursor-pointer select-none"
                style={{ color: "var(--text-tertiary)" }}
                onClick={() => handleHeaderClick("__product__")}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; }}
              >
                제품명
                <SortIndicator field="__product__" />
              </th>
              {sortedProducts.map((p) => (
                <th key={p.id} className="px-4 py-2 text-left">
                  <p
                    className="text-sm font-semibold cursor-pointer select-none transition-colors"
                    style={{ color: "var(--text-primary)" }}
                    onClick={() => router.push(`/product/${p.id}`)}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
                    title="제품 상세 페이지로 이동"
                  >
                    {p.name}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Fixed row: 업체명 */}
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-warm)" }}>
              <td className="w-8" />
              <td
                className="px-4 py-3 text-sm font-medium whitespace-nowrap cursor-pointer select-none"
                style={{ color: "var(--text-secondary)" }}
                onClick={() => handleHeaderClick("__competitor__")}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                업체명
                <SortIndicator field="__competitor__" />
              </td>
              {sortedProducts.map((p) => (
                <td key={p.id} className="px-4 py-3 text-sm">
                  <EditableBrandName
                    productId={p.id}
                    currentName={p.competitor.name}
                    displayBrand={brands.get(p.id)}
                    onSave={(brand) => {
                      setBrands((prev) => {
                        const next = new Map(prev);
                        if (brand === p.competitor.name) next.delete(p.id);
                        else next.set(p.id, brand);
                        return next;
                      });
                    }}
                  />
                </td>
              ))}
            </tr>
            {/* Fixed row: 판매가격 */}
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-warm)" }}>
              <td className="w-8" />
              <td
                className="px-4 py-3 text-sm font-medium whitespace-nowrap cursor-pointer select-none"
                style={{ color: "var(--text-secondary)" }}
                onClick={() => handleHeaderClick("__price__")}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                판매가격
                <SortIndicator field="__price__" />
              </td>
              {sortedProducts.map((p) => (
                <td key={p.id} className="px-4 py-3 text-sm font-mono-data">
                  {formatPrice(p.price, p.currency)}
                </td>
              ))}
            </tr>
            {/* Fixed row: 출시국가 */}
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-warm)" }}>
              <td className="w-8" />
              <td
                className="px-4 py-3 text-sm font-medium whitespace-nowrap cursor-pointer select-none"
                style={{ color: "var(--text-secondary)" }}
                onClick={() => handleHeaderClick("__country__")}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                출시국가
                <SortIndicator field="__country__" />
              </td>
              {sortedProducts.map((p) => (
                <td key={p.id} className="px-4 py-3 text-sm">
                  {p.country || <span style={{ color: "var(--text-tertiary)" }}>-</span>}
                </td>
              ))}
            </tr>
            {visibleFieldIds ? (
              <>
                {visibleFields.map((field) => (
                  <SpecRow
                    key={field.id}
                    field={field}
                    products={sortedProducts}
                    specsMap={specsMap}
                    onSpecUpdated={handleSpecUpdated}
                    onFieldRenamed={renameField}
                  />
                ))}
                <OtherSpecsSection
                  products={sortedProducts}
                  specsMap={specsMap}
                  commonFieldKeys={commonFieldKeys}
                  onSpecUpdated={handleSpecUpdated}
                />
              </>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={visibleFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  {visibleFields.map((field) => (
                    <SpecRow
                      key={field.id}
                      field={field}
                      products={sortedProducts}
                      specsMap={specsMap}
                      onSpecUpdated={handleSpecUpdated}
                      onFieldRenamed={renameField}
                    />
                  ))}
                </SortableContext>
                <HideDropZone colSpan={sortedProducts.length + 2} />
                <OtherSpecsSection
                  products={sortedProducts}
                  specsMap={specsMap}
                  commonFieldKeys={commonFieldKeys}
                  onSpecUpdated={handleSpecUpdated}
                  hideHeader
                />
              </DndContext>
            )}
          </tbody>
        </table>
        </div>
      </div>
      <p className="mt-2.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
        * = 리서치 출처 &nbsp;&nbsp; ⠿ = 드래그 순서변경/기타로 숨김 &nbsp;&nbsp; 셀 클릭 = 값 수정 &nbsp;&nbsp; 헤더 클릭 = 정렬
      </p>
    </div>
  );
}
