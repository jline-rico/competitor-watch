"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProduct, updateSpec, createSpec, deleteSpec, getKnownSpecKeys, getDisplayBrands, DISPLAY_BRAND_KEY } from "@/lib/queries";
import type { Product, Spec, Competitor } from "@/lib/types";

interface Props {
  product: Product & { competitor: Pick<Competitor, "id" | "name" | "logo_url"> };
  specs: Spec[];
}

function EditablePrice({
  value,
  productId,
}: {
  value: number | null;
  productId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(value);
  const [display, setDisplay] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await updateProduct(productId, { price });
    setDisplay(price);
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
        <span className="text-lg font-bold">원</span>
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
      {display != null ? `${display.toLocaleString("ko-KR")}원` : "가격 미설정"}
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

      {/* Product image header */}
      <div
        className="mb-6 flex items-center justify-center overflow-hidden"
        style={{
          background: "var(--bg-warm)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          height: "250px",
        }}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-contain p-4"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-5xl">📦</span>
            <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              이미지 없음
            </span>
          </div>
        )}
      </div>

      <div className="flex items-start gap-6">
        <div>
          <p className="text-sm text-gray-500">{displayBrand || product.competitor.name}</p>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          {product.model_number && (
            <p className="text-gray-500">{product.model_number}</p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <EditablePrice value={product.price} productId={product.id} />
            <span className="rounded bg-gray-100 px-2 py-1 text-sm">{product.category}</span>
            {Date.now() - new Date(product.discovered_at).getTime() < 14 * 24 * 60 * 60 * 1000 && (
              <span className="rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white">신규</span>
            )}
          </div>
          {product.product_url && (
            <a
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-blue-600 hover:underline"
            >
              공식 페이지 보기 →
            </a>
          )}
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
