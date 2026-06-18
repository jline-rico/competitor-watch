# 수동 입력 + AI 리서치 & 크롤링 진행 상황 표시

## 개요

경쟁사 제품을 등록하는 세 번째 경로(수동 입력 + 선택적 AI 리서치)와, 크롤링 작업의 진행 상황을 사용자에게 보여주는 상태 표시 기능을 추가한다.

## 배경

현재 제품 등록은 두 가지 경로만 존재한다:
1. 경쟁사 사이트 등록 → 정기 크롤링
2. 개별 제품 페이지 URL → 일회성 크롤링

URL을 모르거나 크롤링이 안 되는 사이트의 경우 제품을 등록할 방법이 없다. 또한 크롤링이 제대로 동작했는지, Gemini API 한도가 남아있는지 확인할 수 없다.

## 기능 1: 수동 입력 + AI 리서치

### 진입점 변경

메인 피드 헤더의 기존 "+" 버튼을 두 개로 분리한다:
- **"🤖 AI 크롤링 시키기"** — 기존 `AddUrlModal` 열기 (경쟁사 사이트 / 개별 URL)
- **"✏️ 직접 입력하기"** — 새로운 `ManualEntryModal` 열기

### ManualEntryModal 구성

#### 기본 정보 영역
- 업체명: 기존 경쟁사 자동완성 (competitors 테이블 조회)
- 제품명 (필수)
- 모델번호 (선택)
- 카테고리: 드롭다운 (카메라, 도어락, 센서, 허브, 조명, 스위치, 기타)
- 국가: 드롭다운
- 가격 + 통화 (선택)
- 제품 페이지 URL (선택)
- 이미지 URL (선택)

#### 스펙 영역 — 프리로드
- 카테고리 선택 시 해당 카테고리의 `spec_fields`를 조회하여 빈 입력칸으로 표시
- 각 행: `[필드 라벨] [값 입력칸]`
- 사용자가 원하는 필드에만 값을 채움
- "+ 항목 추가" 버튼으로 커스텀 key-value 추가 가능

#### AI 리서치 토글
- "🤖 빈 항목 AI 리서치" 토글 (기본 OFF)
- ON: 등록 시 빈 스펙 항목을 AI가 웹에서 검색하여 채움
- OFF: 입력한 값만 저장

### 수동 입력 흐름

1. 사용자가 기본 정보 + 스펙 입력
2. AI 리서치 토글 OFF → 바로 DB 저장
   - `products` 생성: `source_type = 'manual'`
   - 입력된 스펙 → `specs` 생성: `source = 'official'`
3. AI 리서치 토글 ON → DB 저장 후 Worker에 리서치 요청
   - `products` 생성: `source_type = 'manual'`, `ai_research_status = 'pending'`
   - 입력된 스펙 → `specs` 생성: `source = 'official'`
   - `/api/crawl-single`에 제품명 + 브랜드 정보 전달 (product_url 없이)
   - Worker가 Gemini로 검색 → 빈 스펙 채움 → `ai_research_status = 'done'` 또는 `'failed'`
   - AI가 채운 스펙: `source = 'researched'`

### Worker 변경 (케이스 B 지원)

`/run-single` 엔드포인트가 `product_url` 없이 `product_name` + `competitor_name`만 받는 경우:
- Gemini에게 "이 제품의 스펙을 검색해줘" 식으로 요청
- 결과를 파싱하여 `specs` 테이블에 저장
- `products.ai_research_status` 업데이트

## 기능 2: 크롤링 진행 상황 표시

### 메인 피드 상단 — 상태 바

버튼 영역 아래에 얇은 상태 바를 표시한다.

#### 상태별 표시:
- **진행 중** (노란 배경): `🔄 크롤링 진행 중... (경쟁사명)` + `Gemini: 253 / 1,500`
- **대기 중** (초록 배경): `✅ 대기 중 — 마지막: 오늘 09:02` + `Gemini: 1,247 / 1,500`
- **한도 부족** (빨간 배경): `⚠️ Gemini API 한도 소진` + `Gemini: 1,500 / 1,500`

#### 데이터 소스:
- 작업 상태: `crawl_logs`의 최신 레코드 + 현재 진행 중 여부
- Gemini 한도: 오늘자 `crawl_logs` 레코드 기반 추정 (정확한 카운트는 Worker에서 관리)

#### 갱신 방식:
- 페이지 로드 시 조회
- 페이지 포커스 시 재조회 (`visibilitychange` 이벤트)

### 설정 페이지 — 크롤링 활동 로그

설정 페이지에 "크롤링 활동 로그" 섹션을 추가한다.

#### 표시 내용:
- 경쟁사별 최근 크롤링 결과 목록
- 각 항목: 경쟁사명, 실행 시각, 성공/실패, 발견 제품수, 신제품수, 에러 메시지
- 최근 7일 로그 표시

## DB 변경

### products 테이블
```sql
-- source_type CHECK 확장
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_source_type_check;
ALTER TABLE products ADD CONSTRAINT products_source_type_check
  CHECK (source_type IN ('monitored', 'one_time', 'manual'));

-- AI 리서치 상태 추적
ALTER TABLE products
ADD COLUMN IF NOT EXISTS ai_research_status text DEFAULT NULL
  CHECK (ai_research_status IN (NULL, 'pending', 'running', 'done', 'failed'));
```

### crawl_logs 테이블
기존 테이블 그대로 활용. 추가 변경 없음.

## 새 컴포넌트

| 파일 | 역할 |
|------|------|
| `src/components/manual-entry-modal.tsx` | 직접 입력 모달 |
| `src/components/crawl-status-bar.tsx` | 메인 피드 상단 상태 바 |
| `src/components/crawl-activity-log.tsx` | 설정 페이지 크롤링 로그 |

## 수정 파일

| 파일 | 변경 |
|------|------|
| `src/app/page.tsx` | 버튼 2개 분리, 상태 바 삽입 |
| `src/app/settings/page.tsx` | 크롤링 활동 로그 섹션 추가 |
| `src/lib/queries.ts` | 수동 제품 생성, 크롤링 로그 조회, Gemini 한도 조회 |
| `src/lib/types.ts` | Product 타입에 `ai_research_status` 추가, `source_type`에 `'manual'` 추가 |
| `cloudflare-crawl-worker/src/index.ts` | `/run-single`에서 URL 없는 리서치 모드 분기 |
| `cloudflare-crawl-worker/src/orchestrator.ts` | 모델명 기반 Gemini 리서치 로직 추가 |

## 디자인 시스템

기존 CSS 변수 기반 테마를 따른다. 상태 바 색상:
- 진행 중: `#fef3c7` 배경 + `#92400e` 텍스트 (앰버 톤)
- 대기 중: `#f0fdf4` 배경 + `#166534` 텍스트 (그린 톤)
- 한도 부족: `#fef2f2` 배경 + `#dc2626` 텍스트 (레드 톤)
