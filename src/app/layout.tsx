import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { UnmappedSpecsBanner } from "@/components/unmapped-specs-banner";
import "./globals.css";

export const metadata: Metadata = {
  title: "CompetitorWatch",
  description: "경쟁사 신제품 모니터링 및 스펙 비교",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Nav />
        <main className="mx-auto max-w-6xl px-5 py-8">
          <UnmappedSpecsBanner />
          {children}
        </main>
      </body>
    </html>
  );
}
