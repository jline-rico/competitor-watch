"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getSpecFields,
  updateSpecFieldOrder,
  toggleSpecFieldVisibility,
  createSpecField,
} from "@/lib/queries";
import type { SpecField } from "@/lib/types";

export function useSpecFields(category: string) {
  const [fields, setFields] = useState<SpecField[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    getSpecFields(category)
      .then(setFields)
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const reorder = async (reordered: SpecField[]) => {
    const updates = reordered.map((f, i) => ({
      id: f.id,
      sort_order: i,
    }));
    setFields(reordered);
    await updateSpecFieldOrder(updates);
  };

  const toggle = async (id: string, visible: boolean) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, is_visible: visible } : f))
    );
    await toggleSpecFieldVisibility(id, visible);
  };

  const addField = async (field_key: string, field_label: string) => {
    const newField = await createSpecField(category, field_key, field_label);
    setFields((prev) => [...prev, newField]);
  };

  return { fields, loading, reorder, toggle, addField, refresh };
}
