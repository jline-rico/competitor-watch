import Link from "next/link";
import type { Product, Competitor } from "@/lib/types";
import { formatPrice } from "@/lib/format";

interface Props {
  product: Product & {
    competitor: Pick<Competitor, "id" | "name" | "logo_url">;
  };
  displayBrand?: string;
}

export function ProductCard({ product, displayBrand }: Props) {
  const discoveredDate = new Date(product.discovered_at);
  const dateStr = discoveredDate.toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  });
  const isRecent = Date.now() - discoveredDate.getTime() < 14 * 24 * 60 * 60 * 1000;

  return (
    <Link href={`/product/${product.id}`} className="block group">
      <div
        className="flex items-center gap-4 p-4 transition-all"
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--accent-muted)";
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        }}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-16 w-16 rounded-lg object-contain"
            style={{ border: "1px solid var(--border)", background: "var(--bg-warm)" }}
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-lg text-2xl"
            style={{ background: "var(--bg-warm)", border: "1px solid var(--border)" }}
          >
            📦
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isRecent && (
              <span
                className="rounded px-1.5 py-0.5 text-xs font-bold text-white"
                style={{ background: "var(--danger)" }}
              >
                신규
              </span>
            )}
            <span className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
              {displayBrand || product.competitor.name}
            </span>
          </div>
          <p
            className="mt-1 truncate font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {product.name}
          </p>
          {product.model_number && (
            <p className="text-sm font-mono-data" style={{ color: "var(--text-tertiary)" }}>
              {product.model_number}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          {product.price != null && (
            <p className="font-semibold font-mono-data" style={{ color: "var(--text-primary)" }}>
              {formatPrice(product.price, product.currency)}
            </p>
          )}
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            {product.category}{product.country ? ` · ${product.country}` : ""}
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {dateStr} 발견
          </p>
        </div>
      </div>
    </Link>
  );
}
