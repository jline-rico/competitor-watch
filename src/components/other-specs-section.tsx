import type { Product, Spec } from "@/lib/types";

interface Props {
  products: Product[];
  specsMap: Map<string, Map<string, Spec>>;
  commonFieldKeys: Set<string>;
}

export function OtherSpecsSection({ products, specsMap, commonFieldKeys }: Props) {
  const otherSpecs = new Map<string, { label: string; specs: Map<string, Spec> }>();

  for (const product of products) {
    const productSpecs = specsMap.get(product.id);
    if (!productSpecs) continue;

    for (const [key, spec] of productSpecs) {
      if (commonFieldKeys.has(key)) continue;
      if (!otherSpecs.has(key)) {
        otherSpecs.set(key, { label: spec.field_label, specs: new Map() });
      }
      otherSpecs.get(key)!.specs.set(product.id, spec);
    }
  }

  if (otherSpecs.size === 0) return null;

  return (
    <>
      <tr className="bg-gray-50">
        <td colSpan={products.length + 2} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">
          기타
        </td>
      </tr>
      {Array.from(otherSpecs.entries()).map(([key, { label, specs }]) => (
        <tr key={key} className="border-b">
          <td className="w-8" />
          <td className="px-4 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">
            {label}
          </td>
          {products.map((product) => {
            const spec = specs.get(product.id);
            return (
              <td key={product.id} className="px-4 py-3 text-sm">
                {spec ? (
                  <span>
                    {spec.value}
                    {spec.source === "researched" && (
                      <span className="ml-1 text-amber-500" title={`리서치 출처: ${spec.source_url || "미확인"}`}>*</span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
