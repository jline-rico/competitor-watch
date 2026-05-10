"use client";

import { useEffect, useState } from "react";
import { getUnmappedSpecs } from "@/lib/queries";

export function UnmappedSpecsBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    getUnmappedSpecs().then((items) => setCount(items.length));
  }, []);

  if (count === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
      <span className="font-medium text-amber-800">
        매핑되지 않은 스펙 항목 {count}개
      </span>
      <span className="text-amber-600 ml-2">
        설정 → 비교 항목 관리에서 매핑하세요
      </span>
    </div>
  );
}
