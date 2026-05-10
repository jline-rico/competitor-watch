"use client";

import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "./product-card";

export function ProductFeed() {
  const { products, loading } = useProducts();

  if (loading) {
    return <p className="py-8 text-center text-gray-400">불러오는 중...</p>;
  }

  if (products.length === 0) {
    return (
      <p className="py-8 text-center text-gray-400">
        등록된 제품이 없습니다. 오른쪽 상단의 [+ URL 추가] 버튼으로 경쟁사를 등록하세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
