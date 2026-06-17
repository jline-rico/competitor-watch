"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  label: string;
  options: string[];
  selected: string[] | null;
  onChange: (selected: string[] | null) => void;
}

export function ProductFilter({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allSelected = !selected;
  const count = selected?.length ?? options.length;

  const toggle = (option: string) => {
    if (!selected) {
      onChange(options.filter((o) => o !== option));
    } else {
      const next = selected.includes(option)
        ? selected.filter((s) => s !== option)
        : [...selected, option];
      if (next.length === 0 || next.length === options.length) {
        onChange(null);
      } else {
        onChange(next);
      }
    }
  };

  const toggleAll = () => {
    onChange(allSelected ? [] : null);
  };

  const displayText = allSelected
    ? `${label}: 전체`
    : count === 1
      ? `${label}: ${selected![0]}`
      : `${label}: ${count}개 선택`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition-all"
        style={{
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
          background: selected ? "var(--accent-light)" : "var(--surface)",
          color: selected ? "var(--accent)" : "var(--text-secondary)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {displayText}
        <span style={{ fontSize: "0.7em", marginLeft: 2 }}>▾</span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] py-1 animate-scale-in"
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <label
            className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors"
            style={{
              borderBottom: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontWeight: 600,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-warm)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              style={{ accentColor: "var(--accent)" }}
            />
            전체
          </label>
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-warm)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <input
                type="checkbox"
                checked={allSelected || (selected?.includes(option) ?? false)}
                onChange={() => toggle(option)}
                style={{ accentColor: "var(--accent)" }}
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
