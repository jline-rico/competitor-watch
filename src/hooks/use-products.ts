"use client";

import { useEffect, useState } from "react";
import { getProducts, getNewProducts } from "@/lib/queries";
import type { Product, Competitor } from "@/lib/types";

type ProductWithCompetitor = Product & {
  competitor: Pick<Competitor, "id" | "name" | "logo_url">;
};

export function useProducts(category?: string) {
  const [products, setProducts] = useState<ProductWithCompetitor[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = () => {
    setLoading(true);
    getProducts(category)
      .then(setProducts)
      .finally(() => setLoading(false));
  };

  useEffect(refetch, [category]);

  return { products, loading, refetch };
}

export function useNewProducts() {
  const [products, setProducts] = useState<ProductWithCompetitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNewProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  return { products, loading };
}
