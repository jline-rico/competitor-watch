"use client";

import type { Product, Spec, Competitor } from "@/lib/types";

interface Props {
  product: Product & { competitor: Pick<Competitor, "id" | "name" | "logo_url"> };
  specs: Spec[];
}

export function ProductDetail({ product, specs }: Props) {
  const officialSpecs = specs.filter((s) => s.source === "official");
  const researchedSpecs = specs.filter((s) => s.source === "researched");

  return (
    <div>
      <div className="flex items-start gap-6">
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-40 w-40 rounded-lg object-contain border"
          />
        )}
        <div>
          <p className="text-sm text-gray-500">{product.competitor.name}</p>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          {product.model_number && (
            <p className="text-gray-500">{product.model_number}</p>
          )}
          <div className="mt-2 flex items-center gap-3">
            {product.price && (
              <span className="text-xl font-bold">
                {product.price.toLocaleString("ko-KR")}원
              </span>
            )}
            <span className="rounded bg-gray-100 px-2 py-1 text-sm">{product.category}</span>
            {product.is_new && (
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
        <h2 className="text-lg font-semibold mb-3">공식 스펙</h2>
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full">
            <tbody>
              {officialSpecs.map((spec) => (
                <tr key={spec.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 w-1/3">
                    {spec.field_label}
                  </td>
                  <td className="px-4 py-3 text-sm">{spec.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {researchedSpecs.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">
            리서치 스펙 <span className="text-sm font-normal text-amber-500">* 공식 미확인</span>
          </h2>
          <div className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
            <table className="w-full">
              <tbody>
                {researchedSpecs.map((spec) => (
                  <tr key={spec.id} className="border-b border-amber-200 last:border-0">
                    <td className="px-4 py-3 text-sm font-medium text-gray-600 w-1/3">
                      {spec.field_label}
                    </td>
                    <td className="px-4 py-3 text-sm">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
