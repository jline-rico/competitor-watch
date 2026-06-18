import type { Category } from "./constants";

export interface Competitor {
  id: string;
  name: string;
  catalog_url: string;
  logo_url: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface Product {
  id: string;
  competitor_id: string;
  name: string;
  model_number: string | null;
  category: Category;
  product_url: string | null;
  image_url: string | null;
  price: number | null;
  country: string | null;
  currency: string;
  is_new: boolean;
  source_type: "monitored" | "one_time" | "manual";
  ai_research_status: "pending" | "running" | "done" | "failed" | null;
  discovered_at: string;
  competitor?: Competitor;
}

export interface Spec {
  id: string;
  product_id: string;
  field_key: string;
  field_label: string;
  value: string;
  source: "official" | "researched";
  source_url: string | null;
  updated_at: string;
}

export interface SpecField {
  id: string;
  category: string;
  field_key: string;
  field_label: string;
  sort_order: number;
  is_visible: boolean;
}

export interface CrawlLog {
  id: string;
  competitor_id: string;
  run_at: string;
  catalog_crawl_ok: boolean;
  products_found: number;
  new_products: number;
  specs_extracted: number;
  specs_from_image: number;
  specs_failed: number;
  error_message: string | null;
  duration_ms: number;
  tokens_used: number;
}
