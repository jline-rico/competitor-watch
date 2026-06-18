# CompetitorWatch — 경쟁사 신제품 모니터링 대시보드

## 프로젝트 개요

스마트홈 IoT 업계 경쟁사의 신제품/스펙을 자동 수집하고 비교하는 B2B 내부 도구.
경쟁사 공식 홈페이지에서 제품 카탈로그를 주기적으로 크롤링하여 신제품을 감지하고,
개별 제품 페이지에서 스펙을 자동 추출하여 비교 테이블로 제공한다.

## 기술 스택

- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS 4
- **Database**: Supabase (PostgreSQL + RLS)
- **자동 크롤링**: Cloudflare Worker + Browser Run + Gemini 2.0 Flash API
- **배포**: Vercel (프론트) + Cloudflare Workers (크롤러)
- **기타**: @dnd-kit (드래그앤드롭), xlsx (엑셀 내보내기)

## 프로젝트 구조

```
competitor-watch/
├── src/
│   ├── app/                    # Next.js App Router 페이지
│   │   ├── page.tsx            # 메인: 제품 피드 + 필터
│   │   ├── compare/page.tsx    # 스펙 비교 테이블
│   │   ├── settings/page.tsx   # 설정 (PIN, 스펙 필드, 경쟁사 관리)
│   │   ├── product/[id]/       # 제품 상세 페이지
│   │   └── api/
│   │       ├── crawl-single/   # 단건 크롤링 프록시 → Cloudflare Worker
│   │       └── cron/           # Vercel Cron → Worker 트리거
│   ├── components/             # React 컴포넌트
│   │   ├── add-url-modal.tsx   # 조사 대상 추가 모달 (정기/일회성)
│   │   ├── product-feed.tsx    # 제품 카드 그리드
│   │   ├── product-card.tsx    # 개별 제품 카드
│   │   ├── product-detail.tsx  # 제품 상세 정보
│   │   ├── product-filter.tsx  # 업체/국가 필터 바
│   │   ├── spec-table.tsx      # 비교 테이블
│   │   ├── field-manager.tsx   # 스펙 필드 관리 (CRUD + 드래그 정렬)
│   │   ├── competitor-list.tsx # 경쟁사 관리 (소프트 삭제/복원)
│   │   └── nav.tsx             # 네비게이션 바
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-products.ts     # 제품 목록 fetch + 필터
│   │   ├── use-specs.ts        # 스펙 데이터 fetch
│   │   └── use-spec-fields.ts  # 스펙 필드 정의 fetch
│   └── lib/
│       ├── types.ts            # TypeScript 타입 정의
│       ├── queries.ts          # Supabase CRUD 쿼리
│       ├── supabase.ts         # Supabase 클라이언트
│       ├── constants.ts        # 카테고리, 국가, 통화 상수
│       └── format.ts           # 가격 포맷 유틸
├── cloudflare-crawl-worker/    # 자동 크롤링 Worker (독립 프로젝트)
│   └── src/
│       ├── index.ts            # Worker 엔트리 (/run, /run-single, /health)
│       ├── orchestrator.ts     # 파이프라인 오케스트레이터
│       ├── crawler.ts          # Puppeteer 기반 크롤링
│       ├── gemini.ts           # Gemini API 호출 (카탈로그/스펙/이미지)
│       ├── html-trimmer.ts     # HTML 정리 (토큰 절약)
│       └── supabase.ts         # Supabase REST 클라이언트
├── supabase/migrations/        # DB 마이그레이션 SQL
└── vercel.json                 # Vercel Cron 설정 (매일 09:00 KST)
```

## DB 테이블

- **competitors**: 경쟁사 (name, catalog_url, country, crawl_config jsonb, is_active, deleted_at)
- **products**: 제품 (competitor_id FK, name, model_number, category, product_url, image_url, price, currency, country, source_type, specs_source)
- **specs**: 스펙 (product_id FK, field_key, field_label, value, source)
- **spec_fields**: 비교 테이블 컬럼 정의 (category, field_key, field_label, sort_order, is_visible)
- **crawl_logs**: 크롤링 로그 (competitor_id, catalog_crawl_ok, products_found, new_products, error_message)

카테고리: 카메라, 도어락, 센서, 허브, 조명, 스위치, 기타
국가: 한국, 미국, 중국, 일본, 대만, 글로벌
통화: KRW, USD, JPY, CNY, TWD

## 주요 흐름

### 자동 크롤링 (정기)
매일 09:00 KST Vercel Cron → Cloudflare Worker `/run` →
경쟁사별 카탈로그 크롤링 → Gemini로 제품 목록 추출 → 기존 DB 대비 신제품만 필터 →
신제품 상세 크롤링 → 스펙 추출 (텍스트 우선, 이미지 Vision 폴백) → Supabase 저장.
이번 주 성공한 경쟁사는 건너뜀 (Gemini 한도 대응 일일 리트라이).

### 단건 크롤링 (일회성)
UI "개별 제품 페이지" 모달 → Next.js `/api/crawl-single` → Worker `/run-single` →
URL 크롤링 → Gemini 스펙 추출 → Supabase 저장.

## 디자인 시스템

- CSS 변수 기반 테마: `--accent`, `--surface`, `--border`, `--text-primary` 등
- 따뜻한 톤 베이지/앰버 컬러 팔레트
- 인라인 스타일 + Tailwind 유틸리티 혼합

## 코딩 컨벤션

- TypeScript strict mode
- Next.js App Router — `"use client"` 명시적 선언
- Supabase 쿼리는 `src/lib/queries.ts`에 집중
- 커스텀 훅은 `src/hooks/`에 분리
- 한국어 UI, 코드 주석 최소화
- 컴포넌트 파일당 하나의 export

## 환경 변수

### Vercel
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `CRAWL_WORKER_URL` — Cloudflare Worker URL
- `CRAWL_WORKER_AUTH_TOKEN` — Worker 인증 토큰
- `CRON_SECRET` — Vercel Cron 인증

### Cloudflare Worker (wrangler secret)
- `AUTH_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`

## 주의사항

- `cloudflare-crawl-worker/`는 독립 프로젝트 (별도 package.json, tsconfig)
- Worker 배포: `cd cloudflare-crawl-worker && npx wrangler deploy`
- Supabase RLS가 개발용(anon 전체 허용) — 프로덕션 전 교체 필요
- Gemini 무료 한도: 일 1,500 요청 / Cloudflare Browser Run: 동시 2세션
