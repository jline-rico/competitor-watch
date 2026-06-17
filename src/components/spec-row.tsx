"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateSpec, createSpec } from "@/lib/queries";
import type { SpecField, Product, Spec } from "@/lib/types";

interface Props {
  field: SpecField;
  products: Product[];
  specsMap: Map<string, Map<string, Spec>>;
  onSpecUpdated: (productId: string, fieldKey: string, spec: Spec) => void;
}

function EditableCell({
  spec,
  productId,
  field,
  onSpecUpdated,
}: {
  spec: Spec | undefined;
  productId: string;
  field: SpecField;
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
        onSpecUpdated(productId, field.field_key, { ...spec, value: trimmed });
      } else {
        const newSpec = await createSpec(
          productId,
          field.field_key,
          field.field_label,
          trimmed
        );
        onSpecUpdated(productId, field.field_key, newSpec);
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
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(22, 163, 74, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
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
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
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

export function SpecRow({ field, products, specsMap, onSpecUpdated }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={{ ...style, borderBottom: "1px solid var(--border)" }}
    >
      <td
        className="w-8 cursor-grab px-2"
        style={{ color: "var(--text-tertiary)" }}
        {...attributes}
        {...listeners}
      >
        ⠿
      </td>
      <td
        className="px-4 py-3 text-sm font-medium whitespace-nowrap"
        style={{ color: "var(--text-secondary)" }}
      >
        {field.field_label}
      </td>
      {products.map((product) => {
        const spec = specsMap.get(product.id)?.get(field.field_key);
        return (
          <td key={product.id} className="px-4 py-3 text-sm">
            <EditableCell
              spec={spec}
              productId={product.id}
              field={field}
              onSpecUpdated={onSpecUpdated}
            />
          </td>
        );
      })}
    </tr>
  );
}
