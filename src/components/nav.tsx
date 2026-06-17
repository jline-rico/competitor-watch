"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "조사 대상 추가" },
  { href: "/compare", label: "스펙 비교" },
  { href: "/settings", label: "설정" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-40"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="mx-auto flex max-w-6xl items-end justify-between px-5 pt-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" className="flex items-center gap-2.5 pb-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            CW
          </span>
          <span className="text-base font-bold tracking-tight">
            Competitor
            <span style={{ color: "var(--accent)" }}>Watch</span>
          </span>
        </Link>

        <nav className="flex items-end gap-0">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative text-sm font-medium transition-colors"
                style={{
                  padding: "8px 20px",
                  marginBottom: "-1px",
                  color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                  borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = "var(--text-secondary)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = "var(--text-tertiary)";
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
