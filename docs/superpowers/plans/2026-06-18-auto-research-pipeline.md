# Auto Research Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cloudflare Worker + Vercel Cron 기반 자동 크롤링 파이프라인으로 경쟁사 신제품을 감지하고 스펙을 추출하여 Supabase에 저장한다.

**Architecture:** Vercel Cron이 매주 Cloudflare Worker를 트리거하면, Worker가 Browser Run으로 경쟁사 카탈로그를 크롤링하고, Gemini Flash로 제품 목록/스펙을 추출하여 Supabase에 저장한다. 텍스트 추출 실패 시 스크린샷 기반 Vision fallback을 자동 적용한다.

**Tech Stack:** Cloudflare Workers + Browser Run (`@cloudflare/puppeteer`), Gemini 2.0 Flash API, Supabase (PostgreSQL), Next.js API Route (Vercel Cron trigger)

**Spec:** `docs/superpowers/specs/2026-06-18-auto-research-pipeline-design.md`

---

## File Structure

### Cloudflare Worker (새 프로젝트: `cloudflare-crawl-worker/`)

```
cloudflare-crawl-worker/
├── src/
│   ├── index.ts              # Worker 엔트리 + 라우팅 + 인증
│   ├── orchestrator.ts       # 파이프라인 오케스트레이션 (메인 로직)
│   ├── crawler.ts            # Browser Run 크롤링 + 스크린샷
│   ├── gemini.ts             # Gemini API 호출 + 프롬프트
│   ├── html-trimmer.ts       # HTML 정리 (토큰 절약)
│   └── supabase.ts           # Supabase REST API 클라이언트
├── wrangler.toml
├── package.json
└── tsconfig.json
```

### Vercel 측 (기존 프로젝트: `competitor-watch/`)

```
competitor-watch/
├── src/app/api/cron/
│   └── weekly-monitor/
│       └── route.ts          # Vercel Cron → Cloudflare 트리거
├── supabase/migrations/
│   └── 005_auto_research.sql # DB 마이그레이션
└── vercel.json               # Cron 설정
```

---

### Task 1: DB Migration

**Files:**
- Create: `competitor-watch/supabase/migrations/005_auto_research.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- competitors 테이블에 crawl_config 추가
ALTER TABLE competitors
ADD COLUMN IF NOT EXISTS crawl_config jsonb DEFAULT NULL;

-- products 테이블에 specs_source 추가
ALTER TABLE products
ADD COLUMN IF NOT EXISTS specs_source text DEFAULT 'manual';

-- crawl_logs 테이블 생성
CREATE TABLE IF NOT EXISTS crawl_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid REFERENCES competitors(id),
  run_at timestamptz DEFAULT now(),
  catalog_crawl_ok boolean,
  products_found integer DEFAULT 0,
  new_products integer DEFAULT 0,
  specs_extracted integer DEFAULT 0,
  specs_from_image integer DEFAULT 0,
  specs_failed integer DEFAULT 0,
  error_message text,
  duration_ms integer
);

-- crawl_logs RLS (인증된 유저 읽기/쓰기)
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY crawl_logs_auth ON crawl_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

유저에게 Supabase SQL Editor에서 직접 실행하도록 안내한다.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/005_auto_research.sql
git commit -m "feat: add crawl_config, specs_source, crawl_logs for auto research pipeline"
```

---

### Task 2: Cloudflare Worker 프로젝트 셋업

**Files:**
- Create: `cloudflare-crawl-worker/package.json`
- Create: `cloudflare-crawl-worker/tsconfig.json`
- Create: `cloudflare-crawl-worker/wrangler.toml`

- [ ] **Step 1: Initialize project**

```bash
mkdir -p cloudflare-crawl-worker/src
cd cloudflare-crawl-worker
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "crawl-worker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "tail": "wrangler tail"
  },
  "dependencies": {
    "@cloudflare/puppeteer": "^0.0.15"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250530.0",
    "wrangler": "^4.19.0",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "lib": ["ESNext"],
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 4: Create wrangler.toml**

```toml
name = "crawl-worker"
main = "src/index.ts"
compatibility_date = "2025-05-01"

[browser]
binding = "BROWSER"

[vars]
AUTH_TOKEN = "" # 배포 시 wrangler secret으로 설정
SUPABASE_URL = ""
SUPABASE_ANON_KEY = ""
GEMINI_API_KEY = ""
```

- [ ] **Step 5: Install dependencies**

```bash
npm install
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: initialize cloudflare-crawl-worker project"
```

---

### Task 3: HTML Trimmer

**Files:**
- Create: `cloudflare-crawl-worker/src/html-trimmer.ts`

- [ ] **Step 1: Implement HTML trimmer**

```typescript
const REMOVE_TAGS = ["script", "style", "noscript", "nav", "footer", "header", "svg", "iframe"];
const REMOVE_ATTRS = /\s(data-[\w-]+|style|class|onclick|onload|onerror)="[^"]*"/g;
const COMMENT_RE = /<!--[\s\S]*?-->/g;

export function trimHtml(html: string): string {
  let result = html;

  // Remove comments
  result = result.replace(COMMENT_RE, "");

  // Remove unwanted tags and their contents
  for (const tag of REMOVE_TAGS) {
    const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, "gi");
    result = result.replace(re, "");
    // Self-closing
    const selfRe = new RegExp(`<${tag}[^>]*/>`, "gi");
    result = result.replace(selfRe, "");
  }

  // Remove noisy attributes
  result = result.replace(REMOVE_ATTRS, "");

  // Collapse whitespace
  result = result.replace(/\s{2,}/g, " ");

  // If still over 100KB, try to extract just the main/body content area
  if (result.length > 100_000) {
    const mainMatch = result.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
      || result.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
      || result.match(/<div[^>]*id="content"[^>]*>([\s\S]*?)<\/div>/i);
    if (mainMatch) {
      result = mainMatch[1];
    } else {
      // Truncate to 100KB
      result = result.substring(0, 100_000);
    }
  }

  return result.trim();
}

export function hasProductLinks(html: string): boolean {
  // Check if HTML contains likely product links
  const linkCount = (html.match(/<a\s[^>]*href/gi) || []).length;
  return linkCount >= 3;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/html-trimmer.ts
git commit -m "feat: add HTML trimmer for Gemini token optimization"
```

---

### Task 4: Supabase Client

**Files:**
- Create: `cloudflare-crawl-worker/src/supabase.ts`

- [ ] **Step 1: Implement Supabase REST client**

Cloudflare Workers에서는 `@supabase/supabase-js` 대신 REST API를 직접 호출한다 (번들 크기 절약).

```typescript
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  GEMINI_API_KEY: string;
  AUTH_TOKEN: string;
  BROWSER: Fetcher;
}

interface Competitor {
  id: string;
  name: string;
  catalog_url: string;
  country: string | null;
  crawl_config: CrawlConfig | null;
}

interface CrawlConfig {
  waitFor?: number;
  scrollToBottom?: boolean;
  scrollDelay?: number;
}

interface ExistingProduct {
  id: string;
  product_url: string | null;
}

interface CrawlLog {
  competitor_id: string;
  catalog_crawl_ok: boolean;
  products_found: number;
  new_products: number;
  specs_extracted: number;
  specs_from_image: number;
  specs_failed: number;
  error_message: string | null;
  duration_ms: number;
}

export class SupabaseClient {
  constructor(private url: string, private key: string) {}

  private async request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${this.url}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...((options.headers as Record<string, string>) || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Supabase ${res.status}: ${body}`);
    }
    return res.json();
  }

  async getActiveCompetitors(): Promise<Competitor[]> {
    return this.request("competitors?is_active=eq.true&deleted_at=is.null&select=id,name,catalog_url,country,crawl_config");
  }

  async getExistingProducts(competitorId: string): Promise<ExistingProduct[]> {
    return this.request(`products?competitor_id=eq.${competitorId}&select=id,product_url`);
  }

  async insertProduct(product: Record<string, unknown>): Promise<{ id: string }[]> {
    return this.request("products", {
      method: "POST",
      body: JSON.stringify(product),
    });
  }

  async insertSpecs(specs: Record<string, unknown>[]): Promise<void> {
    if (specs.length === 0) return;
    await this.request("specs", {
      method: "POST",
      body: JSON.stringify(specs),
    });
  }

  async insertCrawlLog(log: CrawlLog): Promise<void> {
    await this.request("crawl_logs", {
      method: "POST",
      body: JSON.stringify(log),
    });
  }
}

export type { Competitor, CrawlConfig, ExistingProduct, CrawlLog };
```

- [ ] **Step 2: Commit**

```bash
git add src/supabase.ts
git commit -m "feat: add Supabase REST client for Cloudflare Worker"
```

---

### Task 5: Gemini Client

**Files:**
- Create: `cloudflare-crawl-worker/src/gemini.ts`

- [ ] **Step 1: Implement Gemini API client with prompts**

```typescript
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const CATEGORIES = ["카메라", "도어락", "센서", "허브", "조명", "스위치", "기타"];

export interface CatalogProduct {
  name: string;
  url: string;
}

export interface ExtractedProduct {
  name: string;
  model: string | null;
  category: string;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  specs: { key: string; label: string; value: string }[];
}

async function callGemini(apiKey: string, contents: unknown[]): Promise<string> {
  const res = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body}`);
  }

  const data = await res.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text.replace(/```json\n?/g, "").replace(/```/g, "").trim();
}

export async function extractCatalogList(
  apiKey: string,
  html: string,
  competitorName: string,
  baseUrl: string,
): Promise<CatalogProduct[]> {
  const prompt = `너는 HTML 파서야. 추론하지 마.
이 HTML은 ${competitorName}의 공식 제품 카탈로그 페이지야.
페이지에 나열된 모든 제품의 이름과 상세 페이지 URL을 추출해.
상대 URL은 ${baseUrl}을 기준으로 절대 URL로 변환해.

출력: [{ "name": "...", "url": "..." }]
HTML에 없는 제품을 추가하지 마. JSON 배열만 반환해.`;

  const text = await callGemini(apiKey, [{ parts: [{ text: prompt }, { text: html }] }]);
  try {
    return JSON.parse(text) as CatalogProduct[];
  } catch {
    return [];
  }
}

export async function extractProductSpecs(
  apiKey: string,
  html: string,
): Promise<ExtractedProduct | null> {
  const prompt = `너는 HTML 파서야. 추론하지 마. 검색하지 마.
주어진 HTML에 명시적으로 적혀있는 정보만 추출해.

규칙:
- HTML에 없는 정보는 절대 채우지 마. null로 남겨.
- 가격은 표시된 숫자 그대로 (반올림/올림 금지)
- 스펙은 스펙표/상세정보 섹션에서만 추출
- 이미지는 제품 메인 이미지 URL만
- source 필드는 반드시 "official"로 설정

출력 (JSON만 반환):
{
  "name": "...",
  "model": "...",
  "category": "...",
  "price": null,
  "currency": null,
  "image_url": "...",
  "specs": [{ "key": "...", "label": "...", "value": "..." }]
}

category는 다음 중 하나: ${CATEGORIES.join(", ")}
매칭되지 않으면 "기타"로 설정.`;

  const text = await callGemini(apiKey, [{ parts: [{ text: prompt }, { text: html }] }]);
  try {
    return JSON.parse(text) as ExtractedProduct;
  } catch {
    return null;
  }
}

export async function extractSpecsFromImage(
  apiKey: string,
  screenshotBase64: string,
): Promise<ExtractedProduct | null> {
  const prompt = `이 스크린샷은 제품 상세 페이지야.
이미지에 보이는 제품명, 모델명, 가격, 스펙 항목과 값을 정확히 그대로 읽어서 JSON으로 반환해.
추론하거나 보충하지 마. 안 보이면 null.

출력 (JSON만 반환):
{
  "name": "...",
  "model": "...",
  "category": "...",
  "price": null,
  "currency": null,
  "image_url": null,
  "specs": [{ "key": "...", "label": "...", "value": "..." }]
}

category는 다음 중 하나: ${CATEGORIES.join(", ")}`;

  const contents = [{
    parts: [
      { text: prompt },
      { inline_data: { mime_type: "image/png", data: screenshotBase64 } },
    ],
  }];

  const text = await callGemini(apiKey, contents);
  try {
    return JSON.parse(text) as ExtractedProduct;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/gemini.ts
git commit -m "feat: add Gemini API client with catalog/spec/vision prompts"
```

---

### Task 6: Browser Crawler

**Files:**
- Create: `cloudflare-crawl-worker/src/crawler.ts`

- [ ] **Step 1: Implement Browser Run crawler**

```typescript
import puppeteer from "@cloudflare/puppeteer";
import type { CrawlConfig } from "./supabase";

const DEFAULT_CONFIG: Required<CrawlConfig> = {
  waitFor: 5000,
  scrollToBottom: false,
  scrollDelay: 1000,
};

interface CrawlResult {
  ok: boolean;
  html: string;
  screenshot: string | null;
  loadedIn: number;
  error?: string;
}

export async function crawlPage(
  browserBinding: Fetcher,
  url: string,
  config?: CrawlConfig | null,
  takeScreenshot = false,
): Promise<CrawlResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const start = Date.now();

  let browser;
  try {
    browser = await puppeteer.launch(browserBinding);
    const page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 900 });

    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    // Wait for dynamic content
    await page.waitForTimeout(cfg.waitFor);

    // Scroll to bottom to trigger lazy loading
    if (cfg.scrollToBottom) {
      let prevHeight = 0;
      for (let i = 0; i < 20; i++) {
        const height = await page.evaluate(() => document.body.scrollHeight);
        if (height === prevHeight) break;
        prevHeight = height;
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(cfg.scrollDelay);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    const html = await page.content();

    let screenshot: string | null = null;
    if (takeScreenshot) {
      const buf = await page.screenshot({ fullPage: true, type: "png" });
      screenshot = Buffer.from(buf).toString("base64");
    }

    return {
      ok: true,
      html,
      screenshot,
      loadedIn: Date.now() - start,
    };
  } catch (err) {
    return {
      ok: false,
      html: "",
      screenshot: null,
      loadedIn: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (browser) await browser.close();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/crawler.ts
git commit -m "feat: add Browser Run crawler with scroll and screenshot support"
```

---

### Task 7: Orchestrator (메인 파이프라인)

**Files:**
- Create: `cloudflare-crawl-worker/src/orchestrator.ts`

- [ ] **Step 1: Implement pipeline orchestration**

```typescript
import { crawlPage } from "./crawler";
import { extractCatalogList, extractProductSpecs, extractSpecsFromImage } from "./gemini";
import { trimHtml, hasProductLinks } from "./html-trimmer";
import type { Env, Competitor, CrawlLog } from "./supabase";
import { SupabaseClient } from "./supabase";

const SPEC_THRESHOLD = 3;

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
      }
    }
  }
  throw lastError;
}

function getBaseUrl(catalogUrl: string): string {
  const u = new URL(catalogUrl);
  return `${u.protocol}//${u.host}`;
}

async function processCompetitor(
  env: Env,
  db: SupabaseClient,
  competitor: Competitor,
): Promise<CrawlLog> {
  const start = Date.now();
  const log: CrawlLog = {
    competitor_id: competitor.id,
    catalog_crawl_ok: false,
    products_found: 0,
    new_products: 0,
    specs_extracted: 0,
    specs_from_image: 0,
    specs_failed: 0,
    error_message: null,
    duration_ms: 0,
  };

  try {
    // Step 1: Crawl catalog page
    const catalogResult = await withRetry(() =>
      crawlPage(env.BROWSER, competitor.catalog_url, competitor.crawl_config)
    );

    if (!catalogResult.ok) {
      log.error_message = `Catalog crawl failed: ${catalogResult.error}`;
      return log;
    }

    log.catalog_crawl_ok = true;
    const trimmed = trimHtml(catalogResult.html);

    // Step 2: Validate HTML has product content
    if (!hasProductLinks(trimmed)) {
      log.error_message = "No product links found in catalog HTML - skipping Gemini call";
      return log;
    }

    // Step 3: Extract product list via Gemini
    const baseUrl = getBaseUrl(competitor.catalog_url);
    const catalogProducts = await withRetry(() =>
      extractCatalogList(env.GEMINI_API_KEY, trimmed, competitor.name, baseUrl)
    );
    log.products_found = catalogProducts.length;

    if (catalogProducts.length === 0) return log;

    // Step 4: Diff with existing products
    const existing = await db.getExistingProducts(competitor.id);
    const existingUrls = new Set(existing.map((p) => p.product_url));
    const newProducts = catalogProducts.filter((p) => !existingUrls.has(p.url));
    log.new_products = newProducts.length;

    if (newProducts.length === 0) return log;

    // Step 5: Process each new product
    for (const product of newProducts) {
      try {
        // Crawl product detail page
        const detailResult = await withRetry(() =>
          crawlPage(env.BROWSER, product.url, { waitFor: 5000 })
        );

        if (!detailResult.ok) {
          log.specs_failed++;
          continue;
        }

        const detailTrimmed = trimHtml(detailResult.html);

        // Try text extraction first
        let extracted = await withRetry(() =>
          extractProductSpecs(env.GEMINI_API_KEY, detailTrimmed)
        );

        let specsSource: string = "official_text";

        // Image fallback if too few specs
        if (!extracted || extracted.specs.length < SPEC_THRESHOLD) {
          const ssResult = await crawlPage(
            env.BROWSER,
            product.url,
            { waitFor: 3000 },
            true, // take screenshot
          );

          if (ssResult.ok && ssResult.screenshot) {
            const visionResult = await withRetry(() =>
              extractSpecsFromImage(env.GEMINI_API_KEY, ssResult.screenshot!)
            );

            if (visionResult && visionResult.specs.length > (extracted?.specs.length || 0)) {
              extracted = visionResult;
              specsSource = "official_image";
              log.specs_from_image++;
            }
          }
        }

        if (!extracted) {
          log.specs_failed++;
          continue;
        }

        // Save product
        const [saved] = await db.insertProduct({
          name: extracted.name || product.name,
          model_number: extracted.model || null,
          category: extracted.category || "기타",
          product_url: product.url,
          image_url: extracted.image_url || null,
          price: extracted.price || null,
          currency: extracted.currency || (competitor.country === "한국" ? "KRW" : "USD"),
          country: competitor.country || null,
          competitor_id: competitor.id,
          source_type: "monitored",
          specs_source: specsSource,
        });

        // Save specs
        if (saved && extracted.specs.length > 0) {
          const specs = extracted.specs.map((s) => ({
            product_id: saved.id,
            field_key: s.key || s.label.toLowerCase().replace(/\s+/g, "_"),
            field_label: s.label,
            value: String(s.value),
            source: "official",
          }));
          await db.insertSpecs(specs);
          log.specs_extracted += specs.length;
        }
      } catch (err) {
        log.specs_failed++;
      }
    }
  } catch (err) {
    log.error_message = err instanceof Error ? err.message : String(err);
  } finally {
    log.duration_ms = Date.now() - start;
  }

  return log;
}

export async function runPipeline(env: Env): Promise<{ logs: CrawlLog[] }> {
  const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const competitors = await db.getActiveCompetitors();

  const logs: CrawlLog[] = [];

  // Process sequentially (Browser Run concurrency limit = 2)
  for (const competitor of competitors) {
    const log = await processCompetitor(env, db, competitor);
    await db.insertCrawlLog(log);
    logs.push(log);
  }

  return { logs };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/orchestrator.ts
git commit -m "feat: add pipeline orchestrator with text/image spec extraction"
```

---

### Task 8: Worker Entry Point

**Files:**
- Create: `cloudflare-crawl-worker/src/index.ts`

- [ ] **Step 1: Implement Worker entry with auth**

```typescript
import { runPipeline } from "./orchestrator";
import type { Env } from "./supabase";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Auth check
    const token = request.headers.get("X-Auth-Token");
    if (token !== env.AUTH_TOKEN) {
      return new Response("Unauthorized", { status: 403 });
    }

    const url = new URL(request.url);

    if (url.pathname === "/run" && request.method === "POST") {
      try {
        const result = await runPipeline(env);
        return Response.json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return Response.json({ error: message }, { status: 500 });
      }
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true, timestamp: new Date().toISOString() });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: add Worker entry point with auth and /run endpoint"
```

---

### Task 9: Vercel Cron Trigger

**Files:**
- Create: `competitor-watch/src/app/api/cron/weekly-monitor/route.ts`
- Create: `competitor-watch/vercel.json`

- [ ] **Step 1: Create API route**

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const workerUrl = process.env.CRAWL_WORKER_URL;
  const authToken = process.env.CRAWL_WORKER_AUTH_TOKEN;

  if (!workerUrl || !authToken) {
    return NextResponse.json(
      { error: "Missing CRAWL_WORKER_URL or CRAWL_WORKER_AUTH_TOKEN" },
      { status: 500 },
    );
  }

  try {
    // Fire and forget - don't wait for full pipeline
    fetch(`${workerUrl}/run`, {
      method: "POST",
      headers: { "X-Auth-Token": authToken },
    }).catch(() => {
      // Intentionally fire-and-forget
    });

    return NextResponse.json({
      triggered: true,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to trigger worker" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create vercel.json**

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-monitor",
      "schedule": "0 0 * * 1"
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/weekly-monitor/route.ts vercel.json
git commit -m "feat: add Vercel Cron trigger for weekly monitor"
```

---

### Task 10: 배포 + 통합 테스트

- [ ] **Step 1: Cloudflare Worker 배포**

유저에게 안내:
1. Cloudflare 계정 생성/로그인
2. `cd cloudflare-crawl-worker && npx wrangler login`
3. Secret 설정:
   ```bash
   npx wrangler secret put AUTH_TOKEN
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_ANON_KEY
   npx wrangler secret put GEMINI_API_KEY
   ```
4. `npm run deploy`

- [ ] **Step 2: Vercel 환경변수 설정**

Vercel 대시보드에서:
- `CRAWL_WORKER_URL`: `https://crawl-worker.<account>.workers.dev`
- `CRAWL_WORKER_AUTH_TOKEN`: Worker의 AUTH_TOKEN과 동일 값

- [ ] **Step 3: 수동 테스트**

Worker에 직접 요청 보내서 테스트:
```bash
curl -X POST https://crawl-worker.<account>.workers.dev/run \
  -H "X-Auth-Token: <token>" \
  -H "Content-Type: application/json"
```

- [ ] **Step 4: Supabase에서 crawl_logs 확인**

```sql
SELECT * FROM crawl_logs ORDER BY run_at DESC LIMIT 5;
```

- [ ] **Step 5: Vercel에 Push + Deploy**

```bash
cd ../competitor-watch
git push origin main
```

Vercel Cron이 다음 월요일에 자동 실행되는지 확인.
