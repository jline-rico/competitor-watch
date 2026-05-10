import type { Category } from "./constants";

export interface Competitor {
  id: string;
  name: string;
  catalog_url: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
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
  is_new: boolean;
  source_type: "monitored" | "one_time";
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
