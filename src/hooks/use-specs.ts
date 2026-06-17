"use client";

import { useEffect, useState } from "react";
import { getSpecsForProducts, DISPLAY_BRAND_KEY } from "@/lib/queries";
import type { Spec } from "@/lib/types";

export function useSpecs(productIds: string[]) {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productIds.length === 0) {
      setSpecs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getSpecsForProducts(productIds)
      .then((data) => setSpecs(data.filter((s) => s.field_key !== DISPLAY_BRAND_KEY)))
      .finally(() => setLoading(false));
  }, [productIds.join(",")]);

  return { specs, loading };
}
