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
      <div className="mx-auto flex max-w-6xl items-end justify-between px-5 pt-3">
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

        <nav className="flex items-end">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative text-sm font-medium"
                style={{
                  padding: "8px 20px 10px",
                  marginBottom: "-1px",
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px",
                  borderBottomLeftRadius: "0",
                  borderBottomRightRadius: "0",
                  color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                  backgroundColor: isActive ? "var(--surface)" : "transparent",
                  borderTopWidth: "1px",
                  borderTopStyle: "solid",
                  borderTopColor: isActive ? "var(--border)" : "transparent",
                  borderLeftWidth: "1px",
                  borderLeftStyle: "solid",
                  borderLeftColor: isActive ? "var(--border)" : "transparent",
                  borderRightWidth: "1px",
                  borderRightStyle: "solid",
                  borderRightColor: isActive ? "var(--border)" : "transparent",
                  borderBottomWidth: "1px",
                  borderBottomStyle: "solid",
                  borderBottomColor: isActive ? "var(--surface)" : "transparent",
                  transition: "color 0.15s, background-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "var(--text-tertiary)";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div style={{ height: "1px", backgroundColor: "var(--border)" }} />
    </header>
  );
}
