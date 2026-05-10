"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ProductDetail } from "@/components/product-detail";
import type { Product, Spec, Competitor } from "@/lib/types";

type ProductWithCompetitor = Product & {
  competitor: Pick<Competitor, "id" | "name" | "logo_url">;
};

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductWithCompetitor | null>(null);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase
        .from("products")
        .select("*, competitor:competitors(id, name, logo_url)")
        .eq("id", id)
        .single();
      const { data: s } = await supabase
        .from("specs")
        .select("*")
        .eq("product_id", id);

      setProduct(p as ProductWithCompetitor);
      setSpecs((s as Spec[]) || []);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <p className="py-8 text-center text-gray-400">불러오는 중...</p>;
  if (!product) return <p className="py-8 text-center text-gray-400">제품을 찾을 수 없습니다.</p>;

  return <ProductDetail product={product} specs={specs} />;
}
