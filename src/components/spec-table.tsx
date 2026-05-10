"use client";

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
} from "@dnd-kit/sortable";
import { useProducts } from "@/hooks/use-products";
import { useSpecs } from "@/hooks/use-specs";
import { useSpecFields } from "@/hooks/use-spec-fields";
import { SpecRow } from "./spec-row";
import { OtherSpecsSection } from "./other-specs-section";
import { exportToXlsx } from "@/lib/export-xlsx";
import type { Spec } from "@/lib/types";

interface Props {
  category: string;
}

export function SpecTable({ category }: Props) {
  const { products, loading: pLoading } = useProducts(category);
  const productIds = products.map((p) => p.id);
  const { specs, loading: sLoading } = useSpecs(productIds);
  const { fields, loading: fLoading, reorder } = useSpecFields(category);

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

  const visibleFields = fields.filter((f) => f.is_visible);
  const commonFieldKeys = new Set(visibleFields.map((f) => f.field_key));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleFields.findIndex((f) => f.id === active.id);
    const newIndex = visibleFields.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(visibleFields, oldIndex, newIndex);
    reorder(reordered);
  };

  if (pLoading || sLoading || fLoading) {
    return <p className="py-8 text-center text-gray-400">불러오는 중...</p>;
  }

  if (products.length === 0) {
    return <p className="py-8 text-center text-gray-400">이 카테고리에 제품이 없습니다.</p>;
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => exportToXlsx(products, specsMap, fields, category)}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          엑셀 내보내기 ⬇
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="w-8" />
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500" />
              {products.map((p) => (
                <th key={p.id} className="px-4 py-3 text-left">
                  <p className="text-xs text-gray-400">{p.competitor.name}</p>
                  <p className="text-sm font-medium">{p.name}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visibleFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                {visibleFields.map((field) => (
                  <SpecRow
                    key={field.id}
                    field={field}
                    products={products}
                    specsMap={specsMap}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <OtherSpecsSection
              products={products}
              specsMap={specsMap}
              commonFieldKeys={commonFieldKeys}
            />
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        * = 리서치 출처 (공식 미확인) &nbsp;&nbsp; ⠿ = 드래그하여 순서 변경
      </p>
    </div>
  );
}
