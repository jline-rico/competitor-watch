"use client";

import { useEffect, useState } from "react";
import { getDisplayBrands } from "@/lib/queries";

export function useDisplayBrands(productIds: string[]) {
  const [brands, setBrands] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productIds.length === 0) {
      setBrands(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    getDisplayBrands(productIds)
      .then(setBrands)
      .finally(() => setLoading(false));
  }, [productIds.join(",")]);

  return { brands, setBrands, loading };
}
