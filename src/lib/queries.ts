import { supabase } from "./supabase";
import type { Competitor, Product, Spec, SpecField } from "./types";

// --- Competitors ---

export async function getCompetitors() {
  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Competitor[];
}

export async function createCompetitor(
  name: string,
  catalog_url: string,
  country?: string
) {
  const { data, error } = await supabase
    .from("competitors")
    .insert({ name, catalog_url, country: country || null })
    .select()
    .single();
  if (error) throw error;
  return data as Competitor;
}

export async function updateCompetitor(
  id: string,
  updates: Partial<Pick<Competitor, "name" | "catalog_url" | "is_active" | "country">>
) {
  const { error } = await supabase
    .from("competitors")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function softDeleteCompetitor(id: string) {
  const { error } = await supabase
    .from("competitors")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getDeletedCompetitors() {
  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return (data as Competitor[]).filter((c) => {
    const deletedAt = new Date(c.deleted_at!).getTime();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return deletedAt > cutoff;
  });
}

export async function restoreCompetitor(id: string) {
  const { error } = await supabase
    .from("competitors")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) throw error;
}

export async function cleanupDeletedCompetitors() {
  const { data } = await supabase
    .from("competitors")
    .select("id, deleted_at")
    .not("deleted_at", "is", null);
  if (!data) return;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const expired = data.filter(
    (c: { deleted_at: string }) => new Date(c.deleted_at).getTime() <= cutoff
  );
  for (const c of expired) {
    await supabase.from("competitors").delete().eq("id", c.id);
  }
}

export async function getDeletePin(): Promise<string | null> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "delete_pin")
    .maybeSingle();
  return data?.value ?? null;
}

export async function setDeletePin(pin: string) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "delete_pin", value: pin, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// --- Products ---

export async function getProducts(category?: string) {
  let query = supabase
    .from("products")
    .select("*, competitor:competitors(id, name, logo_url)")
    .order("discovered_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as (Product & { competitor: Pick<Competitor, "id" | "name" | "logo_url"> })[];
}

export async function getNewProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*, competitor:competitors(id, name, logo_url)")
    .eq("is_new", true)
    .order("discovered_at", { ascending: false });
  if (error) throw error;
  return data as (Product & { competitor: Pick<Competitor, "id" | "name" | "logo_url"> })[];
}

export async function markProductSeen(id: string) {
  const { error } = await supabase
    .from("products")
    .update({ is_new: false })
    .eq("id", id);
  if (error) throw error;
}

// --- Specs ---

export async function getSpecsForProducts(productIds: string[]) {
  const { data, error } = await supabase
    .from("specs")
    .select("*")
    .in("product_id", productIds);
  if (error) throw error;
  return data as Spec[];
}

export async function updateProduct(
  id: string,
  fields: Partial<{ price: number | null; name: string; model_number: string | null; category: string; image_url: string | null; currency: string }>
) {
  const { error } = await supabase.from("products").update(fields).eq("id", id);
  if (error) throw error;
}

export async function deleteSpec(id: string) {
  const { error } = await supabase.from("specs").delete().eq("id", id);
  if (error) throw error;
}

export async function updateSpec(id: string, value: string) {
  const { error } = await supabase
    .from("specs")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function createSpec(
  product_id: string,
  field_key: string,
  field_label: string,
  value: string,
  source: "official" | "researched" = "official"
) {
  const { data, error } = await supabase
    .from("specs")
    .insert({
      product_id,
      field_key,
      field_label,
      value,
      source,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Spec;
}

// --- Spec Fields ---

export async function getSpecFields(category: string) {
  const { data, error } = await supabase
    .from("spec_fields")
    .select("*")
    .eq("category", category)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as SpecField[];
}

export async function updateSpecFieldOrder(
  fields: { id: string; sort_order: number }[]
) {
  const promises = fields.map((f) =>
    supabase
      .from("spec_fields")
      .update({ sort_order: f.sort_order })
      .eq("id", f.id)
  );
  await Promise.all(promises);
}

export async function toggleSpecFieldVisibility(
  id: string,
  is_visible: boolean
) {
  const { error } = await supabase
    .from("spec_fields")
    .update({ is_visible })
    .eq("id", id);
  if (error) throw error;
}

export async function createSpecField(
  category: string,
  field_key: string,
  field_label: string
) {
  const { data: existing } = await supabase
    .from("spec_fields")
    .select("sort_order")
    .eq("category", category)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("spec_fields")
    .insert({ category, field_key, field_label, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return data as SpecField;
}

export async function getUnmappedSpecs() {
  const { data: allSpecs } = await supabase
    .from("specs")
    .select("field_key, field_label, product_id, product:products(name, category)");
  const { data: allFields } = await supabase
    .from("spec_fields")
    .select("field_key, category");

  if (!allSpecs || !allFields) return [];

  const mappedKeys = new Set(allFields.map((f: { field_key: string }) => f.field_key));
  const unmapped = allSpecs.filter((s: { field_key: string }) => s.field_key !== DISPLAY_BRAND_KEY && !mappedKeys.has(s.field_key));

  const unique = new Map<string, {
    field_key: string;
    field_label: string;
    count: number;
    categories: Set<string>;
    products: Set<string>;
  }>();

  for (const s of unmapped) {
    const existing = unique.get(s.field_key);
    const prod = (s as any).product;
    const catName: string = prod?.category ?? "미분류";
    const prodName: string = prod?.name ?? "알 수 없음";
    if (existing) {
      existing.count++;
      existing.categories.add(catName);
      existing.products.add(prodName);
    } else {
      unique.set(s.field_key, {
        field_key: s.field_key,
        field_label: s.field_label,
        count: 1,
        categories: new Set([catName]),
        products: new Set([prodName]),
      });
    }
  }

  return Array.from(unique.values()).map((item) => ({
    ...item,
    categories: Array.from(item.categories),
    products: Array.from(item.products),
  }));
}

export async function getKnownSpecKeys() {
  const { data } = await supabase
    .from("specs")
    .select("field_key, field_label");
  if (!data) return [];
  const unique = new Map<string, string>();
  for (const s of data) {
    if (s.field_key === DISPLAY_BRAND_KEY) continue;
    if (!unique.has(s.field_key)) unique.set(s.field_key, s.field_label);
  }
  return Array.from(unique.entries()).map(([field_key, field_label]) => ({ field_key, field_label }));
}

export const DISPLAY_BRAND_KEY = "__display_brand__";

export async function getDisplayBrands(productIds: string[]) {
  if (productIds.length === 0) return new Map<string, string>();
  const { data } = await supabase
    .from("specs")
    .select("product_id, value")
    .in("product_id", productIds)
    .eq("field_key", DISPLAY_BRAND_KEY);
  const map = new Map<string, string>();
  if (data) {
    for (const row of data) map.set(row.product_id, row.value);
  }
  return map;
}

export async function setDisplayBrand(productId: string, brand: string) {
  const { data: existing } = await supabase
    .from("specs")
    .select("id")
    .eq("product_id", productId)
    .eq("field_key", DISPLAY_BRAND_KEY)
    .maybeSingle();

  if (existing) {
    if (!brand.trim()) {
      await supabase.from("specs").delete().eq("id", existing.id);
      return null;
    }
    await supabase
      .from("specs")
      .update({ value: brand.trim(), updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else if (brand.trim()) {
    await supabase.from("specs").insert({
      product_id: productId,
      field_key: DISPLAY_BRAND_KEY,
      field_label: "표시 브랜드",
      value: brand.trim(),
      source: "official",
    });
  }
  return brand.trim() || null;
}

export async function renameSpecField(
  id: string,
  fieldKey: string,
  newLabel: string
) {
  const { error: fieldErr } = await supabase
    .from("spec_fields")
    .update({ field_label: newLabel })
    .eq("id", id);
  if (fieldErr) throw fieldErr;
  await supabase
    .from("specs")
    .update({ field_label: newLabel })
    .eq("field_key", fieldKey);
}

export async function renameSpecsByFieldKey(
  fieldKey: string,
  newLabel: string
) {
  const { error } = await supabase
    .from("specs")
    .update({ field_label: newLabel })
    .eq("field_key", fieldKey);
  if (error) throw error;
}

export async function deleteSpecField(id: string, fieldKey: string) {
  await supabase.from("specs").delete().eq("field_key", fieldKey);
  const { error } = await supabase.from("spec_fields").delete().eq("id", id);
  if (error) throw error;
}

export async function getAvailableSpecKeys(category: string) {
  const { data: products } = await supabase
    .from("products")
    .select("id")
    .eq("category", category);
  if (!products || products.length === 0) return [];

  const productIds = products.map((p: { id: string }) => p.id);
  const { data: specs } = await supabase
    .from("specs")
    .select("field_key, field_label, product_id")
    .in("product_id", productIds);
  if (!specs) return [];

  const map = new Map<string, { field_key: string; field_label: string; productCount: number }>();
  for (const s of specs) {
    if (s.field_key === DISPLAY_BRAND_KEY) continue;
    const existing = map.get(s.field_key);
    if (existing) {
      existing.productCount++;
    } else {
      map.set(s.field_key, { field_key: s.field_key, field_label: s.field_label, productCount: 1 });
    }
  }
  return Array.from(map.values());
}

export async function mapSpecToField(
  field_key: string,
  field_label: string,
  category: string
) {
  return createSpecField(category, field_key, field_label);
}
