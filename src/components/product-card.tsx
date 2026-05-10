import Link from "next/link";
import type { Product, Competitor } from "@/lib/types";

interface Props {
  product: Product & {
    competitor: Pick<Competitor, "id" | "name" | "logo_url">;
  };
}

export function ProductCard({ product }: Props) {
  const dateStr = new Date(product.discovered_at).toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  });

  return (
    <Link href={`/product/${product.id}`} className="block">
    <div className="flex items-center gap-4 rounded-lg border bg-white p-4 transition-colors hover:bg-gray-50">
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.name}
          className="h-16 w-16 rounded object-contain"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {product.is_new && (
            <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
              신규
            </span>
          )}
          <span className="text-sm text-gray-500">
            {product.competitor.name}
          </span>
        </div>
        <p className="mt-1 truncate font-medium">{product.name}</p>
        {product.model_number && (
          <p className="text-sm text-gray-400">{product.model_number}</p>
        )}
      </div>
      <div className="text-right">
        {product.price && (
          <p className="font-semibold">
            {product.price.toLocaleString("ko-KR")}원
          </p>
        )}
        <p className="text-xs text-gray-400">{product.category}</p>
        <p className="text-xs text-gray-400">{dateStr} 발견</p>
      </div>
    </div>
    </Link>
  );
}
