"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CategoryFilter } from "@/components/category-filter";
import { SpecTable, type SortDir } from "@/components/spec-table";
import { CATEGORIES } from "@/lib/constants";

function ComparePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialCat = searchParams.get("cat") || CATEGORIES[0];
  const initialSort = searchParams.get("sort") || null;
  const initialDir = (searchParams.get("dir") as SortDir) || null;
  const initialFields = searchParams.get("fields") || null;
  const initialBrands = searchParams.get("brands")?.split(",") ?? null;
  const initialCountries = searchParams.get("countries")?.split(",") ?? null;

  const [category, setCategory] = useState<string>(initialCat);
  const [sortField, setSortField] = useState<string | null>(initialSort);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);
  const [visibleFieldIds, setVisibleFieldIds] = useState<string[] | null>(
    initialFields ? initialFields.split(",") : null
  );
  const [brandFilter, setBrandFilter] = useState<string[] | null>(initialBrands);
  const [countryFilter, setCountryFilter] = useState<string[] | null>(initialCountries);

  const updateUrl = useCallback(
    (cat: string, sort: string | null, dir: SortDir, fields: string[] | null, brands: string[] | null, countries: string[] | null) => {
      const params = new URLSearchParams();
      params.set("cat", cat);
      if (sort && dir) {
        params.set("sort", sort);
        params.set("dir", dir);
      }
      if (fields) {
        params.set("fields", fields.join(","));
      }
      if (brands) {
        params.set("brands", brands.join(","));
      }
      if (countries) {
        params.set("countries", countries.join(","));
      }
      router.replace(`/compare?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setSortField(null);
    setSortDir(null);
    setVisibleFieldIds(null);
    setBrandFilter(null);
    setCountryFilter(null);
    updateUrl(cat, null, null, null, null, null);
  };

  const handleSortChange = (field: string | null, dir: SortDir) => {
    setSortField(field);
    setSortDir(dir);
    updateUrl(category, field, dir, visibleFieldIds, brandFilter, countryFilter);
  };

  const handleFieldsChange = (fieldIds: string[]) => {
    setVisibleFieldIds(fieldIds);
    updateUrl(category, sortField, sortDir, fieldIds, brandFilter, countryFilter);
  };

  const handleBrandFilterChange = (brands: string[] | null) => {
    setBrandFilter(brands);
    updateUrl(category, sortField, sortDir, visibleFieldIds, brands, countryFilter);
  };

  const handleCountryFilterChange = (countries: string[] | null) => {
    setCountryFilter(countries);
    updateUrl(category, sortField, sortDir, visibleFieldIds, brandFilter, countries);
  };

  return (
    <>
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            스펙 비교
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            제품군별 스펙을 한눈에 비교하세요
          </p>
        </div>
        <CategoryFilter selected={category} onChange={handleCategoryChange} />
      </div>
      <div className="mt-8 animate-fade-in stagger-1">
        <SpecTable
          category={category}
          sortField={sortField}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          visibleFieldIds={visibleFieldIds}
          onFieldsChange={handleFieldsChange}
          brandFilter={brandFilter}
          countryFilter={countryFilter}
          onBrandFilterChange={handleBrandFilterChange}
          onCountryFilterChange={handleCountryFilterChange}
        />
      </div>
    </>
  );
}

export default function ComparePage() {
  return (
    <Suspense>
      <ComparePageInner />
    </Suspense>
  );
}
