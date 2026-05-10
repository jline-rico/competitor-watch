"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SpecField, Product, Spec } from "@/lib/types";

interface Props {
  field: SpecField;
  products: Product[];
  specsMap: Map<string, Map<string, Spec>>;
}

export function SpecRow({ field, products, specsMap }: Props) {
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
    <tr ref={setNodeRef} style={style} className="border-b">
      <td className="w-8 cursor-grab px-2 text-gray-400" {...attributes} {...listeners}>
        ⠿
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">
        {field.field_label}
      </td>
      {products.map((product) => {
        const spec = specsMap.get(product.id)?.get(field.field_key);
        return (
          <td key={product.id} className="px-4 py-3 text-sm">
            {spec ? (
              <span>
                {spec.value}
                {spec.source === "researched" && (
                  <span
                    className="ml-1 cursor-help text-amber-500"
                    title={`리서치 출처: ${spec.source_url || "미확인"}`}
                  >
                    *
                  </span>
                )}
              </span>
            ) : (
              <span className="text-gray-300">-</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}
