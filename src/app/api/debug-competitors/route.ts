import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, name, catalog_url, country, is_active, crawl_config, deleted_at")
    .order("created_at");

  const { data: recentLogs } = await supabase
    .from("crawl_logs")
    .select("competitor_id, catalog_crawl_ok, products_found, new_products, error_message, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ competitors, recentLogs });
}
