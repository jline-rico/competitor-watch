"use client";

import { ProductCard } from "./product-card";
import type { Product, Competitor } from "@/lib/types";

type ProductWithCompetitor = Product & {
  competitor: Pick<Competitor, "id" | "name" | "logo_url">;
};

interface Props {
  products: ProductWithCompetitor[];
  loading: boolean;
  brands: Map<string, string>;
  totalCount: number;
}

export function ProductFeed({ products, loading, brands, totalCount }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <div
          className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--border-strong)", borderTopColor: "transparent" }}
        />
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          불러오는 중...
        </p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div
        className="flex flex-col items-center py-16 text-center"
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px dashed var(--border-strong)",
        }}
      >
        <span className="text-4xl">{totalCount === 0 ? "📦" : "🔍"}</span>
        <p className="mt-4 font-semibold" style={{ color: "var(--text-primary)" }}>
          {totalCount === 0
            ? "아직 등록된 조사 대상이 없습니다"
            : "조건에 맞는 제품이 없습니다"}
        </p>
        <p className="mt-1.5 text-sm" style={{ color: "var(--text-tertiary)" }}>
          {totalCount === 0
            ? "상단 +추가 버튼으로 경쟁사를 등록해보세요"
            : "검색어 또는 필터를 변경해보세요"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} displayBrand={brands.get(product.id)} />
      ))}
    </div>
  );
}
