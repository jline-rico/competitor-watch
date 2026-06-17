"use client";

import { CATEGORIES } from "@/lib/constants";

interface Props {
  selected: string;
  onChange: (category: string) => void;
}

export function CategoryFilter({ selected, onChange }: Props) {
  return (
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 text-sm font-medium cursor-pointer"
      style={{
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text-primary)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {CATEGORIES.map((cat) => (
        <option key={cat} value={cat}>
          {cat}
        </option>
      ))}
    </select>
  );
}
