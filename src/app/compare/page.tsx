"use client";

import { useState } from "react";
import { CategoryFilter } from "@/components/category-filter";
import { SpecTable } from "@/components/spec-table";
import { CATEGORIES } from "@/lib/constants";

export default function ComparePage() {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">스펙 비교</h1>
        <CategoryFilter selected={category} onChange={setCategory} />
      </div>
      <div className="mt-6">
        <SpecTable category={category} />
      </div>
    </>
  );
}
