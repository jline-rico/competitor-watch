"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProduct, updateSpec, createSpec, deleteSpec, getKnownSpecKeys, getDisplayBrands, DISPLAY_BRAND_KEY } from "@/lib/queries";
import type { Product, Spec, Competitor } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { CURRENCIES, CATEGORIES, COUNTRIES } from "@/lib/constants";

function EditableText({
  value,
  productId,
  field,
  placeholder,
  className,
  style,
}: {
  value: string | null;
  productId: string;
  field: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || "");
  const [display, setDisplay] = useState(value || "");

  const save = async () => {
    const trimmed = text.trim();
    await updateProduct(productId, { [field]: trimmed || null });
    setDisplay(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`rounded border px-2 py-1 ${className || "text-sm"}`}
          style={{ borderColor: "var(--accent)", minWidth: 150, ...style }}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setText(display); setEditing(false); }
          }}
        />
        <button onClick={save} className="rounded px-2 py-0.5 text-xs font-medium text-white" style={{ background: "var(--accent)" }}>저장</button>
        <button onClick={() => { setText(display); setEditing(false); }} className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100">취소</button>
      </span>
    );
  }

  return (
    <span
      className={`group inline-flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity ${className || ""}`}
      style={style}
      onClick={() => { setText(display); setEditing(true); }}
      title="클릭하여 수정"
    >
      {display || <span style={{ color: "var(--text-tertiary)" }}>{placeholder || "미입력"}</span>}
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0">
        <path d="M11.5 2.5l2 2M2 11l-0.5 3.5L5 14l9-9-2-2-10 10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

function EditableSelect({
  value,
  productId,
  field,
  options,
  placeholder,
}: {
  value: string | null;
  productId: string;
  field: string;
  options: readonly string[];
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(value || "");
  const [display, setDisplay] = useState(value || "");

  const save = async (v: string) => {
    await updateProduct(productId, { [field]: v || null });
    setDisplay(v);
    setSelected(v);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <select
          value={selected}
          onChange={(e) => save(e.target.value)}
          className="rounded border px-2 py-1 text-sm"
          style={{ borderColor: "var(--accent)" }}
          autoFocus
          onBlur={() => setEditing(false)}
        >
          <option value="">{placeholder || "선택"}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </span>
    );
  }

  return (
    <span
      className="group inline-flex items-center gap-1 cursor-pointer rounded bg-gray-100 px-2 py-1 text-sm hover:bg-gray-200 transition-colors"
      onClick={() => setEditing(true)}
      title="클릭하여 변경"
    >
      {display || <span style={{ color: "var(--text-tertiary)" }}>{placeholder || "미선택"}</span>}
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="opacity-0 group-hover:opacity-50 transition-opacity">
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

function EditableCountry({
  value,
  productId,
}: {
  value: string | null;
  productId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || "");
  const [display, setDisplay] = useState(value || "");

  const save = async () => {
    const trimmed = text.trim();
    await updateProduct(productId, { country: trimmed || null });
    setDisplay(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <input
          list="detail-country-list"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="국가 선택 또는 입력"
          className="rounded border px-2 py-1 text-sm"
          style={{ borderColor: "var(--accent)", minWidth: 120 }}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setText(display); setEditing(false); }
          }}
        />
        <datalist id="detail-country-list">
          {COUNTRIES.map((c) => <option key={c} value={c} />)}
        </datalist>
        <button onClick={save} className="rounded px-2 py-0.5 text-xs font-medium text-white" style={{ background: "var(--accent)" }}>저장</button>
        <button onClick={() => { setText(display); setEditing(false); }} className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100">취소</button>
      </span>
    );
  }

  return (
    <span
      className="group inline-flex items-center gap-1 cursor-pointer rounded bg-gray-100 px-2 py-1 text-sm hover:bg-gray-200 transition-colors"
      onClick={() => { setText(display); setEditing(true); }}
      title="클릭하여 변경"
    >
      {display || <span style={{ color: "var(--text-tertiary)" }}>국가 미설정</span>}
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0">
        <path d="M11.5 2.5l2 2M2 11l-0.5 3.5L5 14l9-9-2-2-10 10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  );
}

function EditableImage({
  imageUrl,
  productId,
  productName,
  onImageChange,
}: {
  imageUrl: string | null;
  productId: string;
  productName: string;
  onImageChange: (url: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(imageUrl || "");

  const save = async () => {
    const trimmed = url.trim() || null;
    await updateProduct(productId, { image_url: trimmed });
    onImageChange(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        className="mb-6 flex flex-col items-center justify-center gap-3 p-6"
        style={{
          background: "var(--bg-warm)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--accent)",
          minHeight: "200px",
        }}
      >
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="이미지 URL 입력"
          className="w-full max-w-md px-3 py-2 text-sm"
          style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--accent)", background: "var(--surface)" }}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setUrl(imageUrl || ""); setEditing(false); }
          }}
        />
        <div className="flex gap-2">
          <button onClick={save} className="rounded px-3 py-1 text-sm font-medium text-white" style={{ background: "var(--accent)" }}>저장</button>
          <button onClick={() => { setUrl(imageUrl || ""); setEditing(false); }} className="rounded px-3 py-1 text-sm text-gray-500 hover:bg-gray-100">취소</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-6 flex items-center justify-center overflow-hidden cursor-pointer group relative"
      style={{
        background: "var(--bg-warm)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        height: "250px",
      }}
      onClick={() => { setUrl(imageUrl || ""); setEditing(true); }}
      title="클릭하여 이미지 URL 수정"
    >
      {imageUrl ? (
        <>
          <img src={imageUrl} alt={productName} className="h-full w-full object-contain p-4" />
          <div className="absolute inset-0 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.3)" }}>
            <span className="text-white text-sm font-medium px-3 py-1.5 rounded-lg" style={{ background: "rgba(0,0,0,0.5)" }}>이미지 URL 수정</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <span className="text-5xl">📦</span>
          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>클릭하여 이미지 URL 추가</span>
        </div>
      )}
    </div>
  );
}

interface Props {
  product: Product & { competitor: Pick<Competitor, "id" | "name" | "logo_url"> };
  specs: Spec[];
}

function EditablePrice({
  value,
  currency: initialCurrency,
  productId,
  onCurrencyChange,
}: {
  value: number | null;
  currency: string;
  productId: string;
  onCurrencyChange: (currency: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(value);
  const [display, setDisplay] = useState(value);
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState(initialCurrency);

  const save = async () => {
    setSaving(true);
    await updateProduct(productId, { price, currency });
    setDisplay(price);
    onCurrencyChange(currency);
    setEditing(false);
    setSaving(false);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <input
          type="number"
          value={price ?? ""}
          onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : null)}
          className="w-32 rounded border px-2 py-1 text-lg font-bold"
          style={{ borderColor: "var(--accent)" }}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setPrice(display); setEditing(false); }
          }}
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="rounded border px-1.5 py-1 text-sm"
          style={{ borderColor: "var(--accent)" }}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={saving}
          className="rounded px-2 py-0.5 text-xs font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          {saving ? "..." : "저장"}
        </button>
        <button
          onClick={() => { setPrice(display); setEditing(false); }}
          className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
        >
          취소
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group inline-flex items-center gap-1 text-xl font-bold hover:opacity-70 transition-opacity"
      title="클릭하여 가격 수정"
    >
      {formatPrice(display, currency)}
      <svg
        width="14" height="14" viewBox="0 0 16 16" fill="none"
        className="opacity-0 group-hover:opacity-50 transition-opacity"
      >
        <path d="M11.5 2.5l2 2M2 11l-0.5 3.5L5 14l9-9-2-2-10 10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

function EditableSpecRow({
  spec,
  onUpdate,
  onDelete,
}: {
  spec: Spec;
  onUpdate: (id: string, value: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(spec.value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await updateSpec(spec.id, value);
    onUpdate(spec.id, value);
    setEditing(false);
    setSaving(false);
  };

  const isResearched = spec.source === "researched";

  return (
    <tr className={`border-b last:border-0 ${isResearched ? "border-amber-200" : ""}`}>
      <td className={`px-4 py-3 text-sm font-medium text-gray-600 w-1/3 ${isResearched ? "" : "bg-gray-50"}`}>
        {spec.field_label}
      </td>
      <td className="px-4 py-3 text-sm">
        {editing ? (
          <span className="inline-flex items-center gap-1.5">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="rounded border px-2 py-1 text-sm flex-1"
              style={{ borderColor: "var(--accent)", minWidth: 200 }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") { setValue(spec.value); setEditing(false); }
              }}
            />
            <button
              onClick={save}
              disabled={saving}
              className="rounded px-2 py-0.5 text-xs font-medium text-white shrink-0"
              style={{ background: "var(--accent)" }}
            >
              {saving ? "..." : "저장"}
            </button>
            <button
              onClick={() => { setValue(spec.value); setEditing(false); }}
              className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 shrink-0"
            >
              취소
            </button>
          </span>
        ) : (
          <span className="group flex items-center justify-between">
            <span>
              {spec.value}
              {spec.source_url && (
                <a
                  href={spec.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-xs text-blue-500 hover:underline"
                >
                  출처
                </a>
              )}
              {isResearched && (
                <span className="ml-2 text-xs text-amber-500">* 수동 추가</span>
              )}
            </span>
            <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditing(true)}
                className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                수정
              </button>
              <button
                onClick={() => onDelete(spec.id)}
                className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50"
              >
                삭제
              </button>
            </span>
          </span>
        )}
      </td>
    </tr>
  );
}

function AddSpecRow({
  productId,
  existingKeys,
  onAdd,
}: {
  productId: string;
  existingKeys: { field_key: string; field_label: string }[];
  onAdd: (spec: Spec) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"pick" | "custom">("pick");
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [value, setValue] = useState("");
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = existingKeys.filter(
    (k) =>
      k.field_label.toLowerCase().includes(filter.toLowerCase()) ||
      k.field_key.toLowerCase().includes(filter.toLowerCase())
  );

  const pickExisting = (key: string, label: string) => {
    setSelectedKey(key);
    setSelectedLabel(label);
    setStep("custom");
  };

  const save = async () => {
    const finalLabel = selectedLabel || customLabel.trim();
    const finalKey = selectedKey || customLabel.trim().toLowerCase().replace(/\s+/g, "_");
    if (!finalLabel || !value.trim()) return;
    setSaving(true);
    const newSpec = await createSpec(productId, finalKey, finalLabel, value.trim());
    onAdd(newSpec);
    reset();
    setSaving(false);
  };

  const reset = () => {
    setOpen(false);
    setStep("pick");
    setSelectedKey("");
    setSelectedLabel("");
    setCustomLabel("");
    setValue("");
    setFilter("");
  };

  if (!open) {
    return (
      <tr>
        <td colSpan={2} className="px-4 py-2">
          <button
            onClick={() => setOpen(true)}
            className="text-xs font-medium transition-colors hover:opacity-70"
            style={{ color: "var(--accent)" }}
          >
            + 항목 수동 추가
          </button>
        </td>
      </tr>
    );
  }

  if (step === "pick") {
    return (
      <tr className="border-t border-amber-200">
        <td colSpan={2} className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: "#92400e" }}>
              추가할 스펙 항목 선택
            </span>
            <button
              onClick={reset}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              취소
            </button>
          </div>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="항목 검색..."
            className="w-full rounded border px-2.5 py-1.5 text-sm mb-2"
            style={{ borderColor: "#fde68a" }}
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5 mb-2">
            {filtered.map((k) => (
              <button
                key={k.field_key}
                onClick={() => pickExisting(k.field_key, k.field_label)}
                className="rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-amber-400 hover:bg-amber-50"
                style={{ borderColor: "#fde68a", color: "#78350f" }}
              >
                {k.field_label}
              </button>
            ))}
            {filtered.length === 0 && existingKeys.length > 0 && (
              <span className="text-xs text-gray-400 py-1">일치하는 항목이 없습니다</span>
            )}
          </div>
          <button
            onClick={() => {
              setCustomLabel(filter);
              setStep("custom");
            }}
            className="text-xs font-medium transition-colors hover:opacity-70"
            style={{ color: "var(--accent)" }}
          >
            + 새 항목명으로 직접 입력
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-amber-200">
      <td className="px-4 py-2">
        {selectedLabel ? (
          <div className="flex items-center gap-2">
            <span
              className="rounded-full border px-2.5 py-1 text-xs font-medium"
              style={{ borderColor: "var(--accent)", color: "#78350f", background: "#fef3c7" }}
            >
              {selectedLabel}
            </span>
            <button
              onClick={() => { setSelectedKey(""); setSelectedLabel(""); setStep("pick"); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              변경
            </button>
          </div>
        ) : (
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="새 항목명 (예: 무게)"
            className="w-full rounded border px-2 py-1 text-sm"
            style={{ borderColor: "var(--accent)" }}
            autoFocus
          />
        )}
      </td>
      <td className="px-4 py-2">
        <span className="flex items-center gap-1.5">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="값 (예: 320g)"
            className="rounded border px-2 py-1 text-sm flex-1"
            style={{ borderColor: "var(--accent)" }}
            autoFocus={!!selectedLabel}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") reset();
            }}
          />
          <button
            onClick={save}
            disabled={saving || (!selectedLabel && !customLabel.trim()) || !value.trim()}
            className="rounded px-2 py-0.5 text-xs font-medium text-white shrink-0 disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {saving ? "..." : "추가"}
          </button>
          <button
            onClick={reset}
            className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 shrink-0"
          >
            취소
          </button>
        </span>
      </td>
    </tr>
  );
}

export function ProductDetail({ product, specs: initialSpecs }: Props) {
  const router = useRouter();
  const [specs, setSpecs] = useState(initialSpecs.filter((s) => s.field_key !== DISPLAY_BRAND_KEY));
  const [knownKeys, setKnownKeys] = useState<{ field_key: string; field_label: string }[]>([]);
  const [displayBrand, setDisplayBrand] = useState<string | null>(null);
  const [currency, setCurrency] = useState(product.currency);
  const [imageUrl, setImageUrl] = useState(product.image_url);

  useEffect(() => {
    getKnownSpecKeys().then(setKnownKeys);
    getDisplayBrands([product.id]).then((m) => setDisplayBrand(m.get(product.id) ?? null));
  }, [product.id]);

  const officialSpecs = specs.filter((s) => s.source === "official" && s.field_key !== DISPLAY_BRAND_KEY);
  const handleUpdate = (id: string, value: string) => {
    setSpecs((prev) => prev.map((s) => (s.id === id ? { ...s, value } : s)));
  };

  const handleDelete = async (id: string) => {
    await deleteSpec(id);
    setSpecs((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAdd = (spec: Spec) => {
    setSpecs((prev) => [...prev, spec]);
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-70"
          style={{ color: "var(--accent)" }}
        >
          목록으로 돌아가기
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Product image header — click to edit */}
      <EditableImage
        imageUrl={imageUrl}
        productId={product.id}
        productName={product.name}
        onImageChange={setImageUrl}
      />

      <div className="flex items-start gap-6">
        <div>
          <p className="text-sm text-gray-500">{displayBrand || product.competitor.name}</p>
          <h1 className="text-2xl font-bold">
            <EditableText value={product.name} productId={product.id} field="name" placeholder="제품명" className="text-2xl font-bold" />
          </h1>
          <EditableText value={product.model_number} productId={product.id} field="model_number" placeholder="모델번호 입력" className="text-gray-500" />
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <EditablePrice
              value={product.price}
              currency={currency}
              productId={product.id}
              onCurrencyChange={setCurrency}
            />
            <EditableSelect value={product.category} productId={product.id} field="category" options={CATEGORIES} placeholder="카테고리" />
            <EditableCountry value={product.country} productId={product.id} />
            {Date.now() - new Date(product.discovered_at).getTime() < 14 * 24 * 60 * 60 * 1000 && (
              <span className="rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white">신규</span>
            )}
          </div>
          <div className="mt-2">
            <EditableText value={product.product_url} productId={product.id} field="product_url" placeholder="제품 페이지 URL 입력" className="text-sm text-blue-600" />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">
          공식 스펙
        </h2>
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full">
            <tbody>
              {officialSpecs.map((spec) => (
                <EditableSpecRow
                  key={spec.id}
                  spec={spec}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
              {officialSpecs.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-sm text-gray-400">
                    등록된 공식 스펙이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">
          수동 추가
          <span className="ml-2 text-xs font-normal text-amber-500">* AI가 놓친 공식 스펙을 직접 추가</span>
        </h2>
        <div className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
          <table className="w-full">
            <tbody>
              <AddSpecRow
                productId={product.id}
                existingKeys={knownKeys.filter(
                  (k) => !specs.some((s) => s.field_key === k.field_key)
                )}
                onAdd={handleAdd}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
