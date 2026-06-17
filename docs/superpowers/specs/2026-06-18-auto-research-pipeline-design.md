# Auto Research Pipeline Design

## Goal

공식 홈페이지에서 경쟁사 신제품을 자동 감지하고, 스펙/가격/이미지를 정확히 추출하여 DB에 저장하는 파이프라인. PC가 꺼져있어도 동작하며, 추가 서버 비용 없이 운영 가능해야 한다.

## Background

### 현재 문제
- n8n + Puppeteer Docker 기반 워크플로우가 설계만 된 상태 (미배포)
- 삼성 등 JS 동적 렌더링 사이트는 일반 HTTP fetch로 크롤링 불가
- 이전 AI 모델이 가격을 올림 처리하는 등 데이터 왜곡 발생
- 일부 업체는 스펙표를 이미지로 게시하여 텍스트 추출 불가

### 핵심 요구사항
- 특정 카탈로그 URL의 전체 제품 목록을 주기적으로 긁어서 신제품 감지
- **공식 페이지에 명시된 스펙을 그대로 추출** (추론/검색/보충 금지)
- 이미지 스펙표도 자동 대응
- 크롤링 실패 시 Gemini 토큰 낭비 방지
- 서버 비용 $0

## Architecture

### 제약 사항

- **Vercel Free**: 서버리스 함수 실행 10초 제한 → 오케스트레이션 불가, 트리거 역할만
- **Cloudflare Workers Free**: CPU 시간 10ms/요청, 하지만 Browser Run은 별도 세션 기반으로 시간 제한 넉넉
- **Cloudflare Browser Run Free**: 동시 2세션, 일 제한 있음 → 경쟁사를 순차 처리
- **Gemini Flash Free**: 분당 15요청, 일 1,500요청 → 충분

### 핵심 결정: 오케스트레이션을 어디서?

Vercel Free 10초 제한으로 Vercel에서 전체 파이프라인을 실행할 수 없다.
**Cloudflare Workers**에서 오케스트레이션한다:
- Vercel Cron → Vercel API Route (단순 트리거, 즉시 반환) → Cloudflare Worker 호출
- Cloudflare Worker가 실제 작업 수행 (크롤링 + Gemini 호출 + Supabase 저장)
- Cloudflare Workers는 Durable Objects 또는 Queue를 활용하면 장시간 작업 가능

### 컴포넌트

| 컴포넌트 | 역할 | 비용 |
|---|---|---|
| Vercel Cron | 매주 월요일 00:00 UTC (09:00 KST) 트리거 | 무료 |
| Vercel API Route | Cloudflare Worker에 트리거 전달 (즉시 반환) | 무료 |
| Cloudflare Worker (orchestrator) | 전체 파이프라인 오케스트레이션 | 무료 |
| Cloudflare Browser Run | 헤드리스 브라우저 크롤링 + 스크린샷 | 무료 |
| Gemini 2.0 Flash API | HTML/이미지 → 구조화 JSON 추출 | 무료 티어 |
| Supabase | 기존 제품과 diff, 신제품 저장 | 기존 사용 중 |

### 보안

- Cloudflare Worker 엔드포인트는 **shared secret** 헤더(`X-Auth-Token`)로 보호
- Vercel 환경변수에 secret 저장, 호출 시 포함
- 인증 실패 시 403 반환

### 전체 흐름

```
[Vercel Cron 매주 월요일 00:00 UTC = 09:00 KST]
  │
  ▼
[Vercel API Route: /api/cron/weekly-monitor]
  │  (Cloudflare Worker에 POST 요청 후 즉시 200 반환)
  │
  ▼
[Cloudflare Worker: orchestrator]
  │
  ├─ 1. Supabase에서 competitors 목록 조회
  │     (id, name, catalog_url, country, crawl_config)
  │
  ├─ 2. 각 competitor를 순차 처리 (동시 2세션 제한 준수)
  │     │
  │     ├─ 2a. catalog_url을 Browser Run으로 크롤링
  │     │      (JS 렌더링 + 스크롤, crawl_config 적용)
  │     │
  │     ├─ 2b. 크롤링 결과 검증
  │     │      → HTML 트리밍 (script/style/nav/footer 제거)
  │     │      → 제품 링크가 0개면 Gemini 호출 스킵
  │     │
  │     ├─ 2c. Gemini Flash에 트리밍된 HTML 전달
  │     │      → 제품명 + 상세페이지 URL 목록 반환
  │     │
  │     ├─ 2d. 기존 products 테이블과 diff
  │     │      → product_url 기준으로 새 제품만 필터링
  │     │
  │     ├─ 2e. 새 제품 각각의 상세페이지를 순차 크롤링
  │     │
  │     ├─ 2f. 스펙 추출 (텍스트 → 이미지 자동 fallback)
  │     │
  │     └─ 2g. Supabase에 저장
  │
  └─ 3. crawl_logs에 실행 결과 기록
```

### 재시도 로직

- Cloudflare Worker / Gemini API 호출 실패 시 최대 2회 재시도 (지수 백오프)
- 재시도 후에도 실패 시 해당 경쟁사/제품 스킵, 에러를 crawl_logs에 기록

## Cloudflare Worker: 크롤링 서비스

### API 인터페이스

내부 호출만 허용 (shared secret 인증).

```
POST https://crawl-worker.<account>.workers.dev/crawl
Headers: { "X-Auth-Token": "<shared-secret>" }

Request:
{
  "url": "https://www.samsung.com/sec/smartthings-accessories/all-smartthings-accessories/",
  "waitFor": 8000,
  "scrollToBottom": true,
  "scrollDelay": 2000,
  "screenshot": false
}

Response (성공):
{
  "ok": true,
  "html": "<html>...</html>",
  "screenshot": null,
  "loadedIn": 6200
}

Response (스크린샷 요청):
{
  "ok": true,
  "html": "<html>...</html>",
  "screenshot": "data:image/png;base64,...",
  "loadedIn": 7500
}
```

### 기술 스택
- `@cloudflare/puppeteer` 패키지
- Cloudflare Workers + Browser Run (무료 티어)
- 실제 Chrome 실행으로 대부분의 anti-bot 통과

### HTML 트리밍

크롤링된 HTML에서 불필요한 요소를 제거하여 Gemini 토큰을 절약한다.
삼성 같은 사이트는 원본 HTML이 500KB+이므로 트리밍이 필수.

제거 대상: `<script>`, `<style>`, `<noscript>`, `<nav>`, `<footer>`, `<header>`, 
`<!-- 주석 -->`, `data-*` 속성, 인라인 style 속성, SVG 아이콘

트리밍 후에도 Gemini Flash 컨텍스트(1M 토큰)를 초과할 가능성은 낮으나,
안전을 위해 트리밍 후 100KB 이상이면 본문 영역만 추출하는 2차 트리밍 적용.

### crawl_config (competitors 테이블)

사이트별 크롤링 전략을 DB에 저장. 코드 수정 없이 튜닝 가능.

```json
// 삼성 (JS 무거움, lazy-load)
{
  "waitFor": 8000,
  "scrollToBottom": true,
  "scrollDelay": 2000
}

// Aqara (정적 사이트)
{
  "waitFor": 3000,
  "scrollToBottom": false
}

// 기본값 (crawl_config가 null인 경우)
{
  "waitFor": 5000,
  "scrollToBottom": false,
  "scrollDelay": 1000
}
```

## 스펙 추출 전략

### 원칙
- **공식 페이지 HTML에서 직접 추출만 허용**
- 웹 검색, 추론, 보충 절대 금지
- HTML에 없는 정보는 null로 남김

### 2단계 자동 추출 (모든 제품 동일 로직)

```
1. 상세페이지 HTML에서 텍스트 기반 스펙 추출
2. 결과 확인:
   - 스펙 3개 이상 → 성공, 저장
   - 스펙 0~2개 → 이미지 fallback (자동)
     a. 상세페이지 풀 스크린샷 촬영 (Cloudflare Worker)
     b. Gemini Vision에 스크린샷 전달
     c. 이미지에서 스펙표 읽기
   - Vision도 실패 → "추출 실패" 로그, needs_review 플래그
```

업체/제품 구분 없이 동일 흐름. 텍스트로 충분히 나오면 이미지 단계를 건너뛰어 토큰 절약.

### Gemini 프롬프트: 카탈로그 목록 추출

```
너는 HTML 파서야. 추론하지 마.
이 HTML은 {competitor_name}의 공식 제품 카탈로그 페이지야.
페이지에 나열된 모든 제품의 이름과 상세 페이지 URL을 추출해.
상대 URL은 {base_url}을 기준으로 절대 URL로 변환해.

출력: [{ "name": "...", "url": "..." }]
HTML에 없는 제품을 추가하지 마.
```

### Gemini 프롬프트: 텍스트 스펙 추출

```
너는 HTML 파서야. 추론하지 마. 검색하지 마.
주어진 HTML에 명시적으로 적혀있는 정보만 추출해.

규칙:
- HTML에 없는 정보는 절대 채우지 마. null로 남겨.
- 가격은 표시된 숫자 그대로 (반올림/올림 금지)
- 스펙은 스펙표/상세정보 섹션에서만 추출
- 이미지는 제품 메인 이미지 URL만
- source 필드는 반드시 "official"로 설정

출력:
{
  "name": "...",
  "model": "...",
  "category": "...",
  "price": 0,
  "currency": "KRW|USD",
  "image_url": "...",
  "specs": [{ "key": "...", "label": "...", "value": "..." }]
}

category는 다음 중 하나: {categories}
(categories는 DB의 실제 카테고리 목록을 동적으로 주입)
```

### Gemini 프롬프트: 이미지 스펙 추출 (Vision fallback)

```
이 스크린샷은 제품 상세 페이지야.
이미지에 보이는 스펙 항목과 값을 정확히 그대로 읽어서 JSON으로 반환해.
추론하거나 보충하지 마. 안 보이면 null.

출력:
{
  "name": "...",
  "model": "...",
  "category": "...",
  "price": 0,
  "currency": "KRW|USD",
  "image_url": null,
  "specs": [{ "key": "...", "label": "...", "value": "..." }]
}
```

## DB 변경

### competitors 테이블 변경

```sql
ALTER TABLE competitors
ADD COLUMN crawl_config jsonb DEFAULT NULL;
```

### 신규 테이블: crawl_logs

크롤링 실행 기록. 디버깅 및 모니터링용.

```sql
CREATE TABLE crawl_logs (
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
```

### products 테이블 변경

specs의 출처를 추적하기 위해 products에 플래그 추가:

```sql
ALTER TABLE products
ADD COLUMN specs_source text DEFAULT 'manual'
  CHECK (specs_source IN ('manual', 'official_text', 'official_image', 'failed'));
```

- `manual`: 수동 입력
- `official_text`: 공식 페이지 HTML에서 텍스트 추출
- `official_image`: 공식 페이지 스크린샷에서 이미지 추출 (정확도 낮을 수 있음)
- `failed`: 자동 추출 실패, 수동 확인 필요

## 파일 구조

```
competitor-watch/
├── src/app/api/cron/
│   └── weekly-monitor/
│       └── route.ts          # Vercel Cron → Cloudflare 트리거 (즉시 반환)
├── src/lib/
│   └── crawl-client.ts       # Cloudflare Worker 호출 유틸

cloudflare-crawl-worker/       # 별도 프로젝트 (Cloudflare Workers)
├── src/
│   ├── index.ts              # Worker 엔트리 + 라우팅
│   ├── orchestrator.ts       # 파이프라인 오케스트레이션
│   ├── crawler.ts            # Browser Run 크롤링 + 스크린샷
│   ├── gemini.ts             # Gemini API 호출 + 프롬프트
│   ├── html-trimmer.ts       # HTML 정리 (토큰 절약)
│   └── supabase.ts           # Supabase diff + 저장
├── wrangler.toml             # Cloudflare 설정 + 환경변수
└── package.json
```

## Vercel Cron 설정

`vercel.json`:
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

Note: `0 0 * * 1` = 매주 월요일 00:00 UTC = 09:00 KST
```

## 토큰 낭비 방지

1. **크롤링 검증**: HTML에 제품 관련 요소가 없으면 Gemini 호출 스킵
2. **HTML 트리밍**: `<script>`, `<style>`, `<nav>`, `<footer>` 등 제거 후 Gemini에 전달 (토큰 50%+ 절감)
3. **이미지 fallback 조건부**: 텍스트에서 스펙 3개 이상 나오면 이미지 단계 스킵
4. **가격 이상 감지**: 기존 가격 대비 50% 이상 차이나면 `needs_review` 플래그

## n8n 워크플로우와의 관계

- 기존 n8n 워크플로우 JSON 파일은 `n8n-workflows/` 디렉토리에 레퍼런스로 보존
- 새 파이프라인이 안정화되면 n8n 관련 파일 제거 가능
- n8n은 더 이상 사용하지 않음

## 향후 확장

- 수동 트리거 버튼 (대시보드에서 "지금 리서치 실행")
- Slack/이메일 알림 (새 제품 발견 시)
- 개별 제품 가격 변동 감지
