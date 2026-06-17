"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSpecFields } from "@/hooks/use-spec-fields";
import { useAvailableSpecs } from "@/hooks/use-available-specs";
import { AddFieldModal } from "./add-field-modal";
import { CATEGORIES } from "@/lib/constants";
import type { SpecField } from "@/lib/types";

function SortableField({
  field,
  productCount,
  onToggle,
  onRemove,
}: {
  field: SpecField;
  productCount: number;
  onToggle: (id: string, visible: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
      }}
      className="flex items-center justify-between px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <span
          className="cursor-grab"
          style={{ color: "var(--text-tertiary)" }}
          {...attributes}
          {...listeners}
        >
          ⠿
        </span>
        <span className="text-sm" style={{ color: "var(--text-primary)" }}>
          {field.field_label}
        </span>
        <span
          className="text-xs"
          style={{ color: productCount === 0 ? "var(--danger)" : "var(--text-tertiary)" }}
        >
          ({productCount}개 제품)
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {field.is_visible ? (
          <button
            onClick={() => onToggle(field.id, false)}
            className="text-xs px-2 py-0.5 rounded transition-colors"
            style={{
              color: "var(--success)",
              background: "rgba(34,197,94,0.1)",
            }}
          >
            표시
          </button>
        ) : (
          <button
            onClick={() => onToggle(field.id, true)}
            className="text-xs px-2 py-0.5 rounded transition-colors"
            style={{
              color: "var(--text-tertiary)",
              background: "rgba(0,0,0,0.04)",
            }}
          >
            제외
          </button>
        )}
        <button
          onClick={() => {
            if (confirm(`"${field.field_label}" 항목을 삭제하시겠습니까?\n매핑이 완전히 제거되며, 기타 항목으로 돌아갑니다.`)) {
              onRemove(field.id);
            }
          }}
          className="text-xs px-2 py-0.5 rounded transition-colors"
          style={{ color: "var(--danger)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          삭제
        </button>
      </div>
    </div>
  );
}

export function FieldManager() {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const { fields, reorder, toggle, addField, removeField } = useSpecFields(category);
  const { availableSpecs, refetch: refetchAvailable } = useAvailableSpecs(category);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  }));

  const registeredKeys = new Set(fields.map((f) => f.field_key));
  const countMap = new Map(availableSpecs.map((s) => [s.field_key, s.productCount]));
  const unregistered = availableSpecs.filter((s) => !registeredKeys.has(s.field_key));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    reorder(arrayMove(fields, oldIndex, newIndex));
  };

  const handleRemove = async (id: string) => {
    await removeField(id);
    refetchAvailable();
  };

  const handleAdd = async (fieldKey: string, fieldLabel: string) => {
    await addField(fieldKey, fieldLabel);
    refetchAvailable();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-1.5 text-sm font-medium cursor-pointer"
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-primary)",
          }}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          onClick={() => setModalOpen(true)}
          className="px-3 py-1.5 text-sm font-medium transition-colors"
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-secondary)",
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
          + 커스텀 항목 추가
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1">
            {fields.map((field) => (
              <SortableField
                key={field.id}
                field={field}
                productCount={countMap.get(field.field_key) ?? 0}
                onToggle={toggle}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {fields.length === 0 && (
        <p className="text-sm mt-2" style={{ color: "var(--text-tertiary)" }}>
          이 카테고리에 등록된 비교 항목이 없습니다.
        </p>
      )}

      {unregistered.length > 0 && (
        <div className="mt-4">
          <p
            className="text-xs font-semibold uppercase mb-2 px-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            추가 가능한 항목
          </p>
          <div className="flex flex-col gap-1">
            {unregistered.map((spec) => (
              <div
                key={spec.field_key}
                className="flex items-center justify-between px-3 py-2"
                style={{
                  background: "var(--bg-warm)",
                  border: "1px dashed var(--border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {spec.field_label}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    ({spec.productCount}개 제품)
                  </span>
                </div>
                <button
                  onClick={() => handleAdd(spec.field_key, spec.field_label)}
                  className="text-xs px-2 py-0.5 rounded font-medium transition-colors"
                  style={{
                    color: "var(--accent)",
                    border: "1px solid var(--accent-muted)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--accent)";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--accent)";
                  }}
                >
                  추가
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddFieldModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(key, label) => handleAdd(key, label)}
      />
    </div>
  );
}
