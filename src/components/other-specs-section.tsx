"use client";

import { useState, useRef, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { updateSpec, createSpec, renameSpecsByFieldKey } from "@/lib/queries";
import type { Product, Spec } from "@/lib/types";

function EditableCell({
  spec,
  productId,
  fieldKey,
  fieldLabel,
  onSpecUpdated,
}: {
  spec: Spec | undefined;
  productId: string;
  fieldKey: string;
  fieldLabel: string;
  onSpecUpdated: (productId: string, fieldKey: string, spec: Spec) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(spec?.value ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(spec?.value ?? "");
  }, [spec?.value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (trimmed === (spec?.value ?? "")) {
      setEditing(false);
      return;
    }
    if (!trimmed && !spec) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      if (spec) {
        await updateSpec(spec.id, trimmed);
        onSpecUpdated(productId, fieldKey, { ...spec, value: trimmed });
      } else {
        const newSpec = await createSpec(productId, fieldKey, fieldLabel, trimmed);
        onSpecUpdated(productId, fieldKey, newSpec);
      }
    } catch {
      setValue(spec?.value ?? "");
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    const handleCancel = () => {
      setValue(spec?.value ?? "");
      setEditing(false);
    };

    return (
      <span className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleCancel}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          disabled={saving}
          className="px-2 py-1 text-sm"
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--accent)",
            background: "var(--surface)",
            outline: "none",
            minWidth: "80px",
          }}
        />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleSave}
          disabled={saving}
          title="저장"
          className="cursor-pointer border-none transition-colors"
          style={{
            background: "transparent",
            color: "var(--success, #16a34a)",
            fontSize: "14px",
            padding: "2px 4px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {saving ? "⏳" : "✓"}
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleCancel}
          title="취소"
          className="cursor-pointer border-none transition-colors"
          style={{
            background: "transparent",
            color: "var(--text-tertiary)",
            fontSize: "14px",
            padding: "2px 4px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          ✕
        </button>
      </span>
    );
  }

  return (
    <span
      className="inline-block cursor-pointer rounded px-1.5 py-0.5 transition-colors"
      onClick={() => setEditing(true)}
      title="클릭하여 수정"
      style={{ minHeight: "1.5em" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-warm)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {spec ? (
        <>
          {spec.value}
          {spec.source === "researched" && (
            <span
              className="ml-1 cursor-help"
              style={{ color: "var(--warning)" }}
              title={`리서치 출처: ${spec.source_url || "미확인"}`}
            >
              *
            </span>
          )}
        </>
      ) : (
        <span style={{ color: "var(--text-tertiary)" }}>-</span>
      )}
    </span>
  );
}

function EditableOtherLabel({
  fieldKey,
  label,
  onRenamed,
}: {
  fieldKey: string;
  label: string;
  onRenamed: (fieldKey: string, newLabel: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(label);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(label);
  }, [label]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === label) {
      setValue(label);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await renameSpecsByFieldKey(fieldKey, trimmed);
      onRenamed(fieldKey, trimmed);
    } catch {
      setValue(label);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleCancel = () => {
    setValue(label);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleCancel}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          disabled={saving}
          className="px-2 py-1 text-sm font-medium"
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--accent)",
            background: "var(--surface)",
            outline: "none",
            minWidth: "80px",
            color: "var(--text-secondary)",
          }}
        />
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleSave}
          disabled={saving}
          title="저장"
          className="cursor-pointer border-none transition-colors"
          style={{
            background: "transparent",
            color: "var(--success, #16a34a)",
            fontSize: "14px",
            padding: "2px 4px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {saving ? "⏳" : "✓"}
        </button>
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleCancel}
          title="취소"
          className="cursor-pointer border-none transition-colors"
          style={{
            background: "transparent",
            color: "var(--text-tertiary)",
            fontSize: "14px",
            padding: "2px 4px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          ✕
        </button>
      </span>
    );
  }

  return (
    <span
      className="cursor-pointer rounded px-1 py-0.5 transition-colors"
      onClick={() => setEditing(true)}
      title="클릭하여 항목명 수정"
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-warm)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </span>
  );
}

function DraggableOtherRow({
  fieldKey,
  label,
  products,
  specs,
  onLabelRenamed,
  onSpecUpdated,
  draggable,
}: {
  fieldKey: string;
  label: string;
  products: Product[];
  specs: Map<string, Spec>;
  onLabelRenamed: (fieldKey: string, newLabel: string) => void;
  onSpecUpdated: (productId: string, fieldKey: string, spec: Spec) => void;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `other::${fieldKey}`,
    data: { fieldKey, fieldLabel: label },
    disabled: !draggable,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : {};

  return (
    <tr ref={setNodeRef} style={{ ...style, borderBottom: "1px solid var(--border)" }}>
      <td
        className="w-8 px-2"
        style={{ color: draggable ? "var(--text-tertiary)" : "transparent", cursor: draggable ? "grab" : "default" }}
        {...(draggable ? { ...attributes, ...listeners } : {})}
      >
        {draggable ? "⠿" : ""}
      </td>
      <td
        className="px-4 py-3 text-sm font-medium whitespace-nowrap"
        style={{ color: "var(--text-secondary)" }}
      >
        <EditableOtherLabel fieldKey={fieldKey} label={label} onRenamed={onLabelRenamed} />
      </td>
      {products.map((product) => {
        const spec = specs.get(product.id);
        return (
          <td key={product.id} className="px-4 py-3 text-sm">
            <EditableCell
              spec={spec}
              productId={product.id}
              fieldKey={fieldKey}
              fieldLabel={label}
              onSpecUpdated={onSpecUpdated}
            />
          </td>
        );
      })}
    </tr>
  );
}

interface Props {
  products: Product[];
  specsMap: Map<string, Map<string, Spec>>;
  commonFieldKeys: Set<string>;
  onSpecUpdated?: (productId: string, fieldKey: string, spec: Spec) => void;
  hideHeader?: boolean;
}

export function OtherSpecsSection({ products, specsMap, commonFieldKeys, onSpecUpdated, hideHeader }: Props) {
  const [labelOverrides, setLabelOverrides] = useState<Map<string, string>>(new Map());
  const otherSpecs = new Map<string, { label: string; specs: Map<string, Spec> }>();

  for (const product of products) {
    const productSpecs = specsMap.get(product.id);
    if (!productSpecs) continue;

    for (const [key, spec] of productSpecs) {
      if (commonFieldKeys.has(key)) continue;
      if (!otherSpecs.has(key)) {
        otherSpecs.set(key, { label: labelOverrides.get(key) || spec.field_label, specs: new Map() });
      }
      otherSpecs.get(key)!.specs.set(product.id, spec);
    }
  }

  if (otherSpecs.size === 0) return null;

  const handleLabelRenamed = (fieldKey: string, newLabel: string) => {
    setLabelOverrides((prev) => {
      const next = new Map(prev);
      next.set(fieldKey, newLabel);
      return next;
    });
  };

  const handleSpecUpdated = (productId: string, fieldKey: string, spec: Spec) => {
    onSpecUpdated?.(productId, fieldKey, spec);
  };

  return (
    <>
      {!hideHeader && (
        <tr style={{ background: "var(--bg-warm)" }}>
          <td
            colSpan={products.length + 2}
            className="px-4 py-2 text-xs font-bold uppercase"
            style={{ color: "var(--text-tertiary)" }}
          >
            기타
          </td>
        </tr>
      )}
      {Array.from(otherSpecs.entries()).map(([key, { label, specs }]) => (
        <DraggableOtherRow
          key={key}
          fieldKey={key}
          label={label}
          products={products}
          specs={specs}
          onLabelRenamed={handleLabelRenamed}
          onSpecUpdated={handleSpecUpdated}
          draggable={hideHeader ?? false}
        />
      ))}
    </>
  );
}
