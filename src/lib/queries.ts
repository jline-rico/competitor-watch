import { supabase } from "./supabase";
import type { Competitor, Product, Spec, SpecField } from "./types";

// --- Competitors ---

export async function getCompetitors() {
  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Competitor[];
}

export async function createCompetitor(
  name: string,
  catalog_url: string
) {
  const { data, error } = await supabase
    .from("competitors")
    .insert({ name, catalog_url })
    .select()
    .single();
  if (error) throw error;
  return data as Competitor;
}

export async function updateCompetitor(
  id: string,
  updates: Partial<Pick<Competitor, "name" | "catalog_url" | "is_active">>
) {
  const { error } = await supabase
    .from("competitors")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCompetitor(id: string) {
  const { error } = await supabase
    .from("competitors")
    .delete()
    .eq("id", id);
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
  const { data: allSpecs } = await supabase.from("specs").select("field_key, field_label, product_id");
  const { data: allFields } = await supabase.from("spec_fields").select("field_key, category");

  if (!allSpecs || !allFields) return [];

  const mappedKeys = new Set(allFields.map((f: { field_key: string }) => f.field_key));
  const unmapped = allSpecs.filter((s: { field_key: string }) => !mappedKeys.has(s.field_key));

  const unique = new Map<string, { field_key: string; field_label: string; count: number }>();
  for (const s of unmapped) {
    const existing = unique.get(s.field_key);
    if (existing) {
      existing.count++;
    } else {
      unique.set(s.field_key, { field_key: s.field_key, field_label: s.field_label, count: 1 });
    }
  }

  return Array.from(unique.values());
}

export async function mapSpecToField(
  field_key: string,
  field_label: string,
  category: string
) {
  return createSpecField(category, field_key, field_label);
}
