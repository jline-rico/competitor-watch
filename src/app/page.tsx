"use client";

import { useState, useMemo } from "react";
import { useProducts } from "@/hooks/use-products";
import { useDisplayBrands } from "@/hooks/use-display-brands";
import { useDebounce } from "@/hooks/use-debounce";
import { ProductFeed } from "@/components/product-feed";
import { AddUrlModal } from "@/components/add-url-modal";
import { COUNTRIES, CATEGORIES } from "@/lib/constants";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  const { products, loading } = useProducts();
  const { brands } = useDisplayBrands(products.map((p) => p.id));

  const filtered = useMemo(() => {
    let result = products;

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.model_number && p.model_number.toLowerCase().includes(q)) ||
          p.competitor.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.country && p.country.toLowerCase().includes(q))
      );
    }

    if (country) {
      result = result.filter((p) => (p.country || "") === country);
    }

    if (category) {
      result = result.filter((p) => p.category === category);
    }

    return result;
  }, [products, debouncedSearch, country, category]);

  const selectStyle = {
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text-primary)",
  };

  return (
    <>
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            조사 대상 추가
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            경쟁사 사이트 또는 개별 제품 페이지를 등록하세요
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-md active:scale-[0.98]"
          style={{
            background: "var(--accent)",
            boxShadow: "var(--shadow-sm)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--accent-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--accent)")
          }
        >
          <span className="text-base leading-none">+</span>
          추가
        </button>
      </div>

      {/* Filter bar */}
      <div
        className="mt-6 flex items-center gap-3 animate-fade-in stagger-1"
      >
        <div className="relative flex-1">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="제품명, 모델번호, 업체명으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2.5 pl-9 pr-3 text-sm"
            style={{
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-primary)",
              outline: "none",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          />
        </div>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="px-3 py-2.5 text-sm"
          style={selectStyle}
        >
          <option value="">전체 국가</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2.5 text-sm"
          style={selectStyle}
        >
          <option value="">전체 카테고리</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 animate-fade-in stagger-2">
        <ProductFeed products={filtered} loading={loading} brands={brands} totalCount={products.length} />
      </div>
      <AddUrlModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
