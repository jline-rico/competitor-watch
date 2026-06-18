# 수동 입력 + AI 리서치 & 크롤링 진행 상황 표시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 수동 제품 등록(+선택적 AI 리서치)과 크롤링 진행 상황 표시를 추가한다.

**Architecture:** 메인 피드 버튼을 AI 크롤링 / 직접 입력으로 분리하고, 직접 입력 모달에서 기본정보+스펙을 한번에 등록한다. AI 리서치 토글 ON 시 Worker `/run-single`에 URL 없이 모델명 기반 리서치를 요청한다. 메인 피드 상단에 상태 바를 두어 크롤링 진행 여부와 Gemini 한도를 표시하고, 설정 페이지에 상세 로그 섹션을 추가한다.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase, Cloudflare Workers, Gemini 2.0 Flash API, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-06-18-manual-entry-and-crawl-status-design.md`

---

## File Map

### 새로 생성
| 파일 | 역할 |
|------|------|
| `supabase/migrations/006_manual_entry.sql` | DB 변경: source_type 확장, ai_research_status 컬럼 |
| `src/components/manual-entry-modal.tsx` | 직접 입력 모달 (기본정보 + 스펙 프리로드 + AI 리서치 토글) |
| `src/components/crawl-status-bar.tsx` | 메인 피드 상단 상태 바 |
| `src/components/crawl-activity-log.tsx` | 설정 페이지 크롤링 활동 로그 |
| `src/hooks/use-crawl-status.ts` | 크롤링 상태 + Gemini 한도 조회 훅 |

### 수정
| 파일 | 변경 |
|------|------|
| `src/lib/types.ts` | Product.source_type에 `'manual'` 추가, `ai_research_status` 필드 추가 |
| `src/lib/queries.ts` | 수동 제품 생성, 크롤 로그 조회, Gemini 한도 조회 쿼리 |
| `src/app/page.tsx` | 버튼 2개 분리, 상태 바 삽입 |
| `src/app/settings/page.tsx` | 크롤링 활동 로그 섹션 추가 |
| `cloudflare-crawl-worker/src/index.ts` | `/run-single`에서 URL 없는 리서치 모드 분기 |
| `cloudflare-crawl-worker/src/orchestrator.ts` | `runSingleByName()` 함수 추가 |
| `cloudflare-crawl-worker/src/gemini.ts` | `researchProductByName()` 함수 추가 |
| `src/app/api/crawl-single/route.ts` | product_url 옵셔널 처리, product_id 전달 지원 |

---

### Task 1: DB 마이그레이션

**Files:**
- Create: `supabase/migrations/006_manual_entry.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- source_type CHECK 확장 (manual 추가)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_source_type_check;
ALTER TABLE products ADD CONSTRAINT products_source_type_check
  CHECK (source_type IN ('monitored', 'one_time', 'manual'));

-- AI 리서치 상태 추적
ALTER TABLE products
ADD COLUMN IF NOT EXISTS ai_research_status text DEFAULT NULL;

ALTER TABLE products ADD CONSTRAINT products_ai_research_status_check
  CHECK (ai_research_status IS NULL OR ai_research_status IN ('pending', 'running', 'done', 'failed'));
```

- [ ] **Step 2: Supabase에 마이그레이션 적용**

Supabase 대시보드 SQL Editor에서 실행하거나 로컬에서:
```bash
# 로컬 Supabase 사용 시
npx supabase db push
```

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/006_manual_entry.sql
git commit -m "feat: add manual source_type and ai_research_status to products"
```

---

### Task 2: 타입 및 쿼리 확장

**Files:**
- Modify: `src/lib/types.ts:26` — Product 인터페이스
- Modify: `src/lib/queries.ts` — 새 쿼리 함수 추가

- [ ] **Step 1: Product 타입 확장**

`src/lib/types.ts`에서 Product 인터페이스를 수정:

```typescript
export interface Product {
  id: string;
  competitor_id: string;
  name: string;
  model_number: string | null;
  category: Category;
  product_url: string | null;
  image_url: string | null;
  price: number | null;
  country: string | null;
  currency: string;
  is_new: boolean;
  source_type: "monitored" | "one_time" | "manual";
  ai_research_status: "pending" | "running" | "done" | "failed" | null;
  discovered_at: string;
  competitor?: Competitor;
}
```

- [ ] **Step 2: CrawlLog 타입 추가**

`src/lib/types.ts`에 추가:

```typescript
export interface CrawlLog {
  id: string;
  competitor_id: string;
  run_at: string;
  catalog_crawl_ok: boolean;
  products_found: number;
  new_products: number;
  specs_extracted: number;
  specs_from_image: number;
  specs_failed: number;
  error_message: string | null;
  duration_ms: number;
}
```

- [ ] **Step 3: 수동 제품 생성 쿼리 추가**

`src/lib/queries.ts`에 추가:

```typescript
export async function createManualProduct(params: {
  competitor_name: string;
  name: string;
  model_number?: string;
  category: string;
  country?: string;
  price?: number;
  currency?: string;
  product_url?: string;
  image_url?: string;
  ai_research: boolean;
  specs: { field_key: string; field_label: string; value: string }[];
}) {
  // 1. 경쟁사 찾기 또는 생성
  let competitor: Competitor;
  const existing = await getCompetitors();
  const match = existing.find(
    (c) => c.name.toLowerCase() === params.competitor_name.toLowerCase()
  );

  if (match) {
    competitor = match;
  } else {
    competitor = await createCompetitor(params.competitor_name, "", params.country);
  }

  // 2. 제품 생성
  const { data, error } = await supabase
    .from("products")
    .insert({
      competitor_id: competitor.id,
      name: params.name,
      model_number: params.model_number || null,
      category: params.category,
      country: params.country || competitor.country || null,
      price: params.price || null,
      currency: params.currency || "KRW",
      product_url: params.product_url || null,
      image_url: params.image_url || null,
      source_type: "manual",
      ai_research_status: params.ai_research ? "pending" : null,
    })
    .select()
    .single();
  if (error) throw error;

  // 3. 입력된 스펙 저장
  const filledSpecs = params.specs.filter((s) => s.value.trim());
  if (filledSpecs.length > 0) {
    const { error: specError } = await supabase.from("specs").insert(
      filledSpecs.map((s) => ({
        product_id: data.id,
        field_key: s.field_key,
        field_label: s.field_label,
        value: s.value.trim(),
        source: "official" as const,
      }))
    );
    if (specError) throw specError;
  }

  return data as Product;
}
```

- [ ] **Step 4: 크롤링 로그 조회 쿼리 추가**

`src/lib/queries.ts`에 추가:

```typescript
export async function getCrawlLogs(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("crawl_logs")
    .select("*, competitor:competitors(id, name)")
    .gte("run_at", since.toISOString())
    .order("run_at", { ascending: false });
  if (error) throw error;
  return data as (CrawlLog & { competitor: Pick<Competitor, "id" | "name"> })[];
}

export async function getLatestCrawlStatus() {
  // 오늘 날짜 (KST 기준)
  const today = new Date();
  today.setHours(today.getHours() + 9); // KST offset
  const todayStr = today.toISOString().split("T")[0];

  // 오늘 로그 수 (Gemini 한도 추정용)
  const { count } = await supabase
    .from("crawl_logs")
    .select("*", { count: "exact", head: true })
    .gte("run_at", `${todayStr}T00:00:00+09:00`);

  // 최근 로그 1건 (마지막 크롤링 시각)
  const { data: latest } = await supabase
    .from("crawl_logs")
    .select("run_at, competitor:competitors(name), error_message")
    .order("run_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 현재 진행 중인 AI 리서치
  const { data: pending } = await supabase
    .from("products")
    .select("id")
    .in("ai_research_status", ["pending", "running"]);

  return {
    todayApiCalls: count || 0,
    apiLimit: 1500,
    latestRun: latest,
    pendingResearch: pending?.length || 0,
  };
}
```

- [ ] **Step 5: 커밋**

```bash
git add src/lib/types.ts src/lib/queries.ts
git commit -m "feat: add manual product creation and crawl status queries"
```

---

### Task 3: 크롤링 상태 훅

**Files:**
- Create: `src/hooks/use-crawl-status.ts`

- [ ] **Step 1: 훅 작성**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { getLatestCrawlStatus } from "@/lib/queries";

interface CrawlStatus {
  todayApiCalls: number;
  apiLimit: number;
  latestRun: {
    run_at: string;
    competitor: { name: string } | null;
    error_message: string | null;
  } | null;
  pendingResearch: number;
}

export function useCrawlStatus() {
  const [status, setStatus] = useState<CrawlStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getLatestCrawlStatus();
      setStatus(data);
    } catch {
      // 조용히 실패
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refresh]);

  return { status, loading, refresh };
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/hooks/use-crawl-status.ts
git commit -m "feat: add useCrawlStatus hook"
```

---

### Task 4: 크롤링 상태 바 컴포넌트

**Files:**
- Create: `src/components/crawl-status-bar.tsx`

- [ ] **Step 1: 컴포넌트 작성**

메인 피드 상단에 표시되는 얇은 상태 바. 세 가지 상태:
- 진행 중 (노란 배경): 크롤링/AI 리서치 진행 중
- 대기 중 (초록 배경): 마지막 크롤링 시각
- 한도 부족 (빨간 배경): Gemini API 한도 소진

```typescript
"use client";

import { useCrawlStatus } from "@/hooks/use-crawl-status";

export function CrawlStatusBar() {
  const { status, loading } = useCrawlStatus();

  if (loading || !status) return null;

  const { todayApiCalls, apiLimit, latestRun, pendingResearch } = status;
  const isRunning = pendingResearch > 0;
  const isOverLimit = todayApiCalls >= apiLimit;

  let bg: string;
  let border: string;
  let color: string;
  let icon: string;
  let message: string;

  if (isOverLimit) {
    bg = "#fef2f2";
    border = "#fecaca";
    color = "#dc2626";
    icon = "⚠️";
    message = "Gemini API 한도 소진 — AI 기능 일시 중단";
  } else if (isRunning) {
    bg = "#fef3c7";
    border = "#fde68a";
    color = "#92400e";
    icon = "🔄";
    message = `작업 진행 중... (${pendingResearch}건)`;
  } else {
    bg = "#f0fdf4";
    border = "#bbf7d0";
    color = "#166534";
    icon = "✅";
    const lastTime = latestRun
      ? new Date(latestRun.run_at).toLocaleString("ko-KR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "기록 없음";
    message = `대기 중 — 마지막: ${lastTime}`;
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-xs font-medium"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: "var(--radius-sm)",
        color,
      }}
    >
      <span>
        {icon} {message}
      </span>
      <span>
        Gemini: {todayApiCalls.toLocaleString()} / {apiLimit.toLocaleString()}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/crawl-status-bar.tsx
git commit -m "feat: add CrawlStatusBar component"
```

---

### Task 5: 직접 입력 모달

**Files:**
- Create: `src/components/manual-entry-modal.tsx`

- [ ] **Step 1: 모달 컴포넌트 작성**

기존 `add-url-modal.tsx`의 스타일 패턴을 따르되, 구조가 다름:
- 기본 정보 영역: 업체명(자동완성), 제품명, 모델번호, 카테고리, 국가, 가격+통화, URL, 이미지URL
- 스펙 영역: 카테고리 선택 시 `spec_fields` 프리로드 → 빈칸으로 표시 + 항목 추가
- AI 리서치 토글: 빈 스펙을 AI가 채움
- 등록 버튼

```typescript
"use client";

import { useEffect, useState } from "react";
import {
  getCompetitors,
  getSpecFields,
  createManualProduct,
} from "@/lib/queries";
import { CATEGORIES, COUNTRIES, CURRENCIES } from "@/lib/constants";
import type { Competitor, SpecField } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ManualEntryModal({ open, onClose }: Props) {
  // 기본 정보
  const [competitorName, setCompetitorName] = useState("");
  const [productName, setProductName] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("KRW");
  const [productUrl, setProductUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // 스펙
  const [specFields, setSpecFields] = useState<SpecField[]>([]);
  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  const [customSpecs, setCustomSpecs] = useState<{ label: string; value: string }[]>([]);

  // AI 리서치
  const [aiResearch, setAiResearch] = useState(false);

  // UI 상태
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) getCompetitors().then(setCompetitors).catch(() => {});
  }, [open]);

  // 카테고리 변경 시 spec_fields 로드
  useEffect(() => {
    if (!category) {
      setSpecFields([]);
      setSpecValues({});
      return;
    }
    getSpecFields(category).then((fields) => {
      setSpecFields(fields.filter((f) => f.is_visible));
      setSpecValues({});
    }).catch(() => {});
  }, [category]);

  const filtered = competitorName.trim()
    ? competitors.filter((c) =>
        c.name.toLowerCase().includes(competitorName.trim().toLowerCase())
      )
    : competitors;

  if (!open) return null;

  const handleSelectCompetitor = (c: Competitor) => {
    setCompetitorName(c.name);
    if (c.country) setCountry(c.country);
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    if (!competitorName.trim() || !productName.trim() || !category) return;
    setLoading(true);
    setError(null);

    try {
      const specs = [
        ...specFields
          .filter((f) => specValues[f.field_key]?.trim())
          .map((f) => ({
            field_key: f.field_key,
            field_label: f.field_label,
            value: specValues[f.field_key],
          })),
        ...customSpecs
          .filter((s) => s.label.trim() && s.value.trim())
          .map((s) => ({
            field_key: s.label.toLowerCase().replace(/\s+/g, "_"),
            field_label: s.label,
            value: s.value,
          })),
      ];

      const product = await createManualProduct({
        competitor_name: competitorName.trim(),
        name: productName.trim(),
        model_number: modelNumber.trim() || undefined,
        category,
        country: country || undefined,
        price: price ? Number(price) : undefined,
        currency: currency || undefined,
        product_url: productUrl.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        ai_research: aiResearch,
        specs,
      });

      // AI 리서치 요청
      if (aiResearch) {
        fetch("/api/crawl-single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            competitor_name: competitorName.trim(),
            product_name: productName.trim(),
            model_number: modelNumber.trim() || null,
            country: country || null,
            product_id: product.id,
            research_mode: true,
          }),
        }).catch(() => {});
      }

      setSubmitted(true);
    } catch {
      setError("등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCompetitorName("");
    setProductName("");
    setModelNumber("");
    setCategory("");
    setCountry("");
    setPrice("");
    setCurrency("KRW");
    setProductUrl("");
    setImageUrl("");
    setSpecFields([]);
    setSpecValues({});
    setCustomSpecs([]);
    setAiResearch(false);
    setSubmitted(false);
    setError(null);
    onClose();
  };

  const inputStyle = {
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "var(--surface)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: "rgba(26, 23, 20, 0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up"
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          border: "1px solid var(--border)",
        }}
      >
        {/* 헤더 */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
          style={{
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            직접 입력
          </h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {submitted ? (
            /* 완료 화면 - add-url-modal.tsx와 동일 패턴 */
            <div className="flex flex-col items-center py-8 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                style={{ background: "var(--success-light)", color: "var(--success)" }}
              >
                ✓
              </span>
              <h3 className="mt-4 text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                등록 완료!
              </h3>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                {aiResearch
                  ? "제품이 등록되었습니다.\n빈 항목은 AI가 리서치 중입니다."
                  : "제품이 등록되었습니다."}
              </p>
              <button
                onClick={handleClose}
                className="mt-6 w-full py-2.5 text-sm font-semibold text-white"
                style={{ borderRadius: "var(--radius-sm)", background: "var(--accent)" }}
              >
                확인
              </button>
            </div>
          ) : (
            <>
              {/* 기본 정보 */}
              <div
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--accent)" }}
              >
                기본 정보
              </div>
              <div className="flex flex-col gap-2">
                {/* 업체명 자동완성 */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="업체명 입력 또는 선택"
                    value={competitorName}
                    onChange={(e) => { setCompetitorName(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full px-3.5 py-2.5 text-sm"
                    style={inputStyle}
                  />
                  {showSuggestions && filtered.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowSuggestions(false)} />
                      <div
                        className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border bg-white shadow-lg overflow-hidden"
                        style={{ borderColor: "var(--border)" }}
                      >
                        {filtered.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleSelectCompetitor(c)}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left hover:bg-amber-50 transition-colors"
                          >
                            <span style={{ color: "var(--text-primary)" }}>{c.name}</span>
                            {c.country && (
                              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{c.country}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <input type="text" placeholder="제품명 (필수)" value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm" style={inputStyle} />

                <input type="text" placeholder="모델번호 (선택)" value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm" style={inputStyle} />

                <div className="flex gap-2">
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-sm" style={{
                      ...inputStyle,
                      color: category ? "var(--text-primary)" : "var(--text-tertiary)",
                    }}>
                    <option value="">카테고리 선택</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={country} onChange={(e) => setCountry(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-sm" style={{
                      ...inputStyle,
                      color: country ? "var(--text-primary)" : "var(--text-tertiary)",
                    }}>
                    <option value="">국가 선택</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="flex gap-2">
                  <input type="number" placeholder="가격 (선택)" value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-sm" style={inputStyle} />
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                    className="w-24 px-3.5 py-2.5 text-sm" style={inputStyle}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <input type="text" placeholder="제품 페이지 URL (선택)" value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono-data" style={inputStyle} />

                <input type="text" placeholder="이미지 URL (선택)" value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono-data" style={inputStyle} />
              </div>

              {/* 스펙 영역 */}
              {category && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--accent)" }}>
                      스펙 항목 — {category}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      기존 항목 자동 로드됨
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {specFields.map((f) => (
                      <div key={f.id} className="flex gap-2 items-center">
                        <span className="text-xs w-24 flex-shrink-0 truncate"
                          style={{ color: "var(--text-secondary)" }}>
                          {f.field_label}
                        </span>
                        <input
                          type="text"
                          placeholder="값 입력"
                          value={specValues[f.field_key] || ""}
                          onChange={(e) => setSpecValues((prev) => ({ ...prev, [f.field_key]: e.target.value }))}
                          className="flex-1 px-2.5 py-1.5 text-sm"
                          style={inputStyle}
                        />
                      </div>
                    ))}

                    {/* 커스텀 항목 */}
                    {customSpecs.map((s, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="항목명"
                          value={s.label}
                          onChange={(e) => {
                            const next = [...customSpecs];
                            next[i] = { ...next[i], label: e.target.value };
                            setCustomSpecs(next);
                          }}
                          className="w-24 flex-shrink-0 px-2.5 py-1.5 text-xs"
                          style={inputStyle}
                        />
                        <input
                          type="text"
                          placeholder="값 입력"
                          value={s.value}
                          onChange={(e) => {
                            const next = [...customSpecs];
                            next[i] = { ...next[i], value: e.target.value };
                            setCustomSpecs(next);
                          }}
                          className="flex-1 px-2.5 py-1.5 text-sm"
                          style={inputStyle}
                        />
                        <button
                          onClick={() => setCustomSpecs(customSpecs.filter((_, j) => j !== i))}
                          className="text-xs px-1"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setCustomSpecs([...customSpecs, { label: "", value: "" }])}
                    className="mt-2 w-full py-1.5 text-xs"
                    style={{
                      border: "1px dashed var(--border)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-tertiary)",
                      background: "transparent",
                    }}
                  >
                    + 항목 추가
                  </button>
                </div>
              )}

              {/* AI 리서치 토글 */}
              <div
                className="mt-4 flex items-center justify-between px-3 py-3"
                style={{
                  background: "var(--accent-light)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--accent-border, #fde68a)",
                }}
              >
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                    🤖 빈 항목 AI 리서치
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    비어있는 스펙을 AI가 검색해서 채웁니다
                  </div>
                </div>
                <button
                  onClick={() => setAiResearch(!aiResearch)}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: aiResearch ? "var(--accent)" : "var(--border)" }}
                >
                  <span
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
                    style={{ left: aiResearch ? "22px" : "2px" }}
                  />
                </button>
              </div>

              {error && (
                <p className="mt-2 text-xs" style={{ color: "var(--danger, #dc2626)" }}>{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !competitorName.trim() || !productName.trim() || !category}
                className="mt-5 w-full py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderRadius: "var(--radius-sm)", background: "var(--accent)" }}
              >
                {loading ? "등록 중..." : "등록하기"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/manual-entry-modal.tsx
git commit -m "feat: add ManualEntryModal component"
```

---

### Task 6: 메인 피드 페이지 수정

**Files:**
- Modify: `src/app/page.tsx:1-149`

- [ ] **Step 1: 버튼 분리 + 상태 바 삽입**

`src/app/page.tsx` 변경사항:
- import 추가: `ManualEntryModal`, `CrawlStatusBar`
- 기존 `modalOpen` → `aiModalOpen`으로 변경
- `manualModalOpen` 상태 추가
- 헤더 영역의 단일 "추가" 버튼 → "🤖 AI 크롤링 시키기" + "✏️ 직접 입력하기" 두 개 버튼
- 필터 바 위에 `<CrawlStatusBar />` 삽입
- 하단에 `<ManualEntryModal />` 추가

주요 변경 부분 (line 1-12 imports):
```typescript
import { ManualEntryModal } from "@/components/manual-entry-modal";
import { CrawlStatusBar } from "@/components/crawl-status-bar";
```

주요 변경 부분 (line 12-13 state):
```typescript
const [aiModalOpen, setAiModalOpen] = useState(false);
const [manualModalOpen, setManualModalOpen] = useState(false);
```

주요 변경 부분 (line 72-88 버튼 영역):
```tsx
<div className="flex items-center gap-2">
  <button
    onClick={() => setAiModalOpen(true)}
    className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-md active:scale-[0.98]"
    style={{ background: "var(--accent)", boxShadow: "var(--shadow-sm)" }}
  >
    <span className="text-base leading-none">🤖</span>
    AI 크롤링 시키기
  </button>
  <button
    onClick={() => setManualModalOpen(true)}
    className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all hover:shadow-md active:scale-[0.98]"
    style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      color: "var(--text-primary)",
    }}
  >
    <span className="text-base leading-none">✏️</span>
    직접 입력하기
  </button>
</div>
```

필터 바 위에 삽입:
```tsx
<div className="mt-4 animate-fade-in stagger-1">
  <CrawlStatusBar />
</div>
```

하단 모달:
```tsx
<AddUrlModal open={aiModalOpen} onClose={() => setAiModalOpen(false)} />
<ManualEntryModal open={manualModalOpen} onClose={() => setManualModalOpen(false)} />
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/page.tsx
git commit -m "feat: split add buttons and add crawl status bar to main feed"
```

---

### Task 7: 크롤링 활동 로그 컴포넌트

**Files:**
- Create: `src/components/crawl-activity-log.tsx`

- [ ] **Step 1: 컴포넌트 작성**

설정 페이지에 표시되는 최근 7일 크롤링 로그 목록.

```typescript
"use client";

import { useEffect, useState } from "react";
import { getCrawlLogs } from "@/lib/queries";
import type { CrawlLog, Competitor } from "@/lib/types";

type LogWithCompetitor = CrawlLog & { competitor: Pick<Competitor, "id" | "name"> };

export function CrawlActivityLog() {
  const [logs, setLogs] = useState<LogWithCompetitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCrawlLogs(7)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>로딩 중...</p>;
  }

  if (logs.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>최근 7일간 크롤링 기록이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {logs.map((log) => {
        const isError = !!log.error_message;
        const time = new Date(log.run_at).toLocaleString("ko-KR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div
            key={log.id}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm"
            style={{
              background: isError ? "#fef2f2" : "var(--bg-warm)",
              border: `1px solid ${isError ? "#fecaca" : "var(--border)"}`,
            }}
          >
            <div className="flex items-center gap-3">
              <span>{isError ? "❌" : "✅"}</span>
              <div>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {log.competitor?.name || "알 수 없음"}
                </span>
                <span className="ml-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {time}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
              {isError ? (
                <span style={{ color: "#dc2626" }}>{log.error_message}</span>
              ) : (
                <>
                  <span>발견 {log.products_found}</span>
                  <span>신제품 {log.new_products}</span>
                  <span>스펙 {log.specs_extracted}</span>
                  {log.duration_ms > 0 && <span>{(log.duration_ms / 1000).toFixed(1)}s</span>}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/crawl-activity-log.tsx
git commit -m "feat: add CrawlActivityLog component"
```

---

### Task 8: 설정 페이지에 활동 로그 섹션 추가

**Files:**
- Modify: `src/app/settings/page.tsx:1-112`

- [ ] **Step 1: import 및 섹션 추가**

`src/app/settings/page.tsx` 수정:

import 추가:
```typescript
import { CrawlActivityLog } from "@/components/crawl-activity-log";
```

기존 "제품군별 비교 항목 관리" 섹션 뒤에 새 섹션 추가 (line 107 `</section>` 뒤):

```tsx
<section
  className="animate-fade-in stagger-5"
  style={{
    background: "var(--surface)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-sm)",
  }}
>
  <div
    className="px-5 py-4"
    style={{ borderBottom: "1px solid var(--border)" }}
  >
    <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
      크롤링 활동 로그
    </h2>
  </div>
  <div className="p-5">
    <CrawlActivityLog />
  </div>
</section>
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add crawl activity log section to settings page"
```

---

### Task 9: API 라우트 수정 (research_mode 지원)

**Files:**
- Modify: `src/app/api/crawl-single/route.ts:1-27`

- [ ] **Step 1: research_mode 분기 추가**

`product_url` 없이 `research_mode: true`로 오는 요청을 Worker에 전달:

```typescript
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const workerUrl = process.env.CRAWL_WORKER_URL;
  const workerToken = process.env.CRAWL_WORKER_AUTH_TOKEN;

  if (!workerUrl || !workerToken) {
    return NextResponse.json(
      { error: "Crawl worker not configured" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const endpoint = body.research_mode ? "/run-research" : "/run-single";

  const res = await fetch(`${workerUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": workerToken,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : 500 });
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/api/crawl-single/route.ts
git commit -m "feat: add research_mode routing to crawl-single API"
```

---

### Task 10: Worker에 모델명 기반 리서치 추가

**Files:**
- Modify: `cloudflare-crawl-worker/src/gemini.ts` — `researchProductByName()` 추가
- Modify: `cloudflare-crawl-worker/src/orchestrator.ts` — `runResearch()` 추가
- Modify: `cloudflare-crawl-worker/src/index.ts` — `/run-research` 엔드포인트 추가

- [ ] **Step 1: Gemini 리서치 함수 추가**

`cloudflare-crawl-worker/src/gemini.ts`에 추가:

```typescript
export async function researchProductByName(
  apiKey: string,
  productName: string,
  competitorName: string,
  existingSpecs: { key: string; label: string }[],
): Promise<ExtractedProduct | null> {
  const specsToFill = existingSpecs.length > 0
    ? `\n다음 항목을 중점적으로 찾아줘: ${existingSpecs.map((s) => s.label).join(", ")}`
    : "";

  const prompt = `너는 제품 리서치 전문가야.
${competitorName}의 "${productName}" 제품에 대해 알려진 공식 스펙 정보를 정리해줘.${specsToFill}

규칙:
- 공식 사이트나 신뢰할 수 있는 출처의 정보만 사용
- 확실하지 않은 정보는 포함하지 마
- source 필드는 반드시 "researched"로 설정

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

  const text = await callGemini(apiKey, [{ parts: [{ text: prompt }] }]);
  try {
    return JSON.parse(text) as ExtractedProduct;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: orchestrator에 runResearch 함수 추가**

`cloudflare-crawl-worker/src/orchestrator.ts`에 추가:

```typescript
import { researchProductByName } from "./gemini";

export async function runResearch(
  env: Env,
  params: {
    competitor_name: string;
    product_name: string;
    model_number?: string | null;
    country?: string | null;
    product_id: string;
  },
): Promise<{ ok: boolean; specs_count?: number; error?: string }> {
  const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

  try {
    // ai_research_status → running
    await db.request(`products?id=eq.${params.product_id}`, {
      method: "PATCH",
      body: JSON.stringify({ ai_research_status: "running" }),
    });

    // 기존 스펙 키 조회 (빈 항목 파악용)
    const existingSpecs = await db.request(
      `specs?product_id=eq.${params.product_id}&select=field_key,field_label`
    ) as { field_key: string; field_label: string }[];

    const searchName = params.model_number
      ? `${params.product_name} (${params.model_number})`
      : params.product_name;

    const result = await withRetry(() =>
      researchProductByName(
        env.GEMINI_API_KEY,
        searchName,
        params.competitor_name,
        existingSpecs.map((s) => ({ key: s.field_key, label: s.field_label })),
      ),
    );

    if (!result || result.specs.length === 0) {
      await db.request(`products?id=eq.${params.product_id}`, {
        method: "PATCH",
        body: JSON.stringify({ ai_research_status: "failed" }),
      });
      return { ok: false, error: "No specs found via research" };
    }

    // 기존에 없는 스펙만 추가
    const existingKeys = new Set(existingSpecs.map((s) => s.field_key));
    const newSpecs = result.specs
      .filter((s) => !existingKeys.has(s.key))
      .map((s) => ({
        product_id: params.product_id,
        field_key: s.key || s.label.toLowerCase().replace(/\s+/g, "_"),
        field_label: s.label,
        value: String(s.value),
        source: "researched",
      }));

    if (newSpecs.length > 0) {
      await db.insertSpecs(newSpecs);
    }

    // ai_research_status → done
    await db.request(`products?id=eq.${params.product_id}`, {
      method: "PATCH",
      body: JSON.stringify({ ai_research_status: "done" }),
    });

    return { ok: true, specs_count: newSpecs.length };
  } catch (err) {
    await db.request(`products?id=eq.${params.product_id}`, {
      method: "PATCH",
      body: JSON.stringify({ ai_research_status: "failed" }),
    }).catch(() => {});
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
```

- [ ] **Step 3: Worker 엔드포인트 추가**

`cloudflare-crawl-worker/src/index.ts`에 `/run-research` 라우트 추가 (line 22, `/run-single` 블록 뒤):

```typescript
if (url.pathname === "/run-research" && request.method === "POST") {
  try {
    const body = await request.json() as {
      competitor_name: string;
      product_name: string;
      model_number?: string | null;
      country?: string | null;
      product_id: string;
    };
    if (!body.product_name || !body.competitor_name || !body.product_id) {
      return Response.json(
        { error: "competitor_name, product_name, and product_id are required" },
        { status: 400 },
      );
    }
    const result = await runResearch(env, body);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
```

import 추가 (line 1):
```typescript
import { runPipeline, runSingle, runResearch } from "./orchestrator";
```

- [ ] **Step 4: Worker SupabaseClient에 PATCH 지원 확인**

현재 `SupabaseClient.request()`는 이미 generic하게 구현되어 있어 PATCH도 동작함. 추가 변경 불필요.

- [ ] **Step 5: 커밋**

```bash
git add cloudflare-crawl-worker/src/gemini.ts cloudflare-crawl-worker/src/orchestrator.ts cloudflare-crawl-worker/src/index.ts
git commit -m "feat: add model name-based AI research endpoint to Worker"
```

---

### Task 11: 통합 테스트 및 검증

- [ ] **Step 1: 프론트엔드 빌드 확인**

```bash
cd competitor-watch-clone && npm run build
```

타입 에러 없이 빌드 성공해야 함.

- [ ] **Step 2: UI 동작 확인**

```bash
npm run dev
```

확인 항목:
1. 메인 피드에 "🤖 AI 크롤링 시키기" + "✏️ 직접 입력하기" 버튼 2개 표시
2. "AI 크롤링 시키기" → 기존 AddUrlModal 열림
3. "직접 입력하기" → ManualEntryModal 열림
4. 카테고리 선택 시 스펙 필드 프리로드
5. 상태 바 표시 (crawl_logs 데이터 기반)
6. 설정 페이지에 크롤링 활동 로그 섹션 표시

- [ ] **Step 3: 커밋 (수정사항 있으면)**

```bash
git add -A && git commit -m "fix: address integration issues"
```
