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
import { AddFieldModal } from "./add-field-modal";
import { CATEGORIES } from "@/lib/constants";
import type { SpecField } from "@/lib/types";

function SortableField({
  field,
  onToggle,
}: {
  field: SpecField;
  onToggle: (id: string, visible: boolean) => void;
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
      style={style}
      className="flex items-center justify-between rounded border bg-white px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <span className="cursor-grab text-gray-400" {...attributes} {...listeners}>
          ⠿
        </span>
        <span className="text-sm">{field.field_label}</span>
        <span className="text-xs text-gray-400">({field.field_key})</span>
      </div>
      <button
        onClick={() => onToggle(field.id, !field.is_visible)}
        className={`text-xs ${field.is_visible ? "text-green-600" : "text-gray-400"}`}
      >
        {field.is_visible ? "표시" : "숨김"}
      </button>
    </div>
  );
}

export function FieldManager() {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const { fields, reorder, toggle, addField } = useSpecFields(category);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    reorder(arrayMove(fields, oldIndex, newIndex));
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border bg-white px-3 py-1.5 text-sm"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          + 항목 추가
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1">
            {fields.map((field) => (
              <SortableField key={field.id} field={field} onToggle={toggle} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {fields.length === 0 && (
        <p className="text-sm text-gray-400 mt-2">이 카테고리에 등록된 비교 항목이 없습니다.</p>
      )}

      <AddFieldModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(key, label) => addField(key, label)}
      />
    </div>
  );
}
