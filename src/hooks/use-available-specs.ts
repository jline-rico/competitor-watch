"use client";

import { useEffect, useState, useCallback } from "react";
import { getAvailableSpecKeys } from "@/lib/queries";

interface AvailableSpec {
  field_key: string;
  field_label: string;
  productCount: number;
}

export function useAvailableSpecs(category: string) {
  const [availableSpecs, setAvailableSpecs] = useState<AvailableSpec[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    getAvailableSpecKeys(category)
      .then(setAvailableSpecs)
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { availableSpecs, loading, refetch };
}
