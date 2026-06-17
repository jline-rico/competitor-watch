# CompetitorWatch v2 Phase 3: 스펙 비교 기능 확장

> **Context:** 사용자가 스펙 비교 페이지에서 발견한 3가지 문제 — 가격에 통화 단위 없음, 가격/국가가 비교 항목에 빠져있음, 비교 결과를 공유할 방법 없음.

## 3-A. 가격 통화 단위 (#1)

### 요구사항
- 제품 가격에 통화 단위(KRW, USD, CNY, JPY, TWD 등) 표시
- DB에 `currency` 컬럼 추가, 기존 데이터는 KRW 기본값
- 모든 가격 표시 위치에 통화 반영

### DB 변경

```sql
ALTER TABLE products ADD COLUMN currency TEXT NOT NULL DEFAULT 'KRW';
```

### 통화 포맷 유틸

`src/lib/format.ts` 신규:

```typescript
formatPrice(price: number | null, currency: string | null): string
```

- KRW: `"13,000원"`
- USD: `"$12.99"`
- JPY: `"¥1,500"`
- CNY: `"¥150"` (또는 `"CN¥150"`)
- TWD: `"NT$500"`
- 기타: `"150 EUR"` 형태 fallback

### UI 변경

#### ProductCard (`product-card.tsx`)
- 기존: `{product.price.toLocaleString("ko-KR")}원`
- 변경: `{formatPrice(product.price, product.currency)}`

#### ProductDetail — EditablePrice (`product-detail.tsx`)
- 가격 옆에 통화 선택 드롭다운 추가
- 지원 통화: `CURRENCIES` 상수 배열 (`["KRW", "USD", "JPY", "CNY", "TWD"]`)
- 통화 변경 시 `updateProduct(id, { currency })` 호출

#### SpecTable 고정 행 (3-B에서 구현)
- 가격 행에서 `formatPrice()` 사용

### 쿼리 변경
- `updateProduct()`: `currency` 필드 허용 추가
- `getProducts()`: `currency` 이미 `select("*")`에 포함되므로 쿼리 변경 없음

### 파일 변경
- `supabase/migrations/004_currency.sql` — 신규
- `src/lib/types.ts` — Product에 `currency: string` 추가
- `src/lib/constants.ts` — `CURRENCIES` 상수 추가
- `src/lib/format.ts` — 신규: `formatPrice()`
- `src/lib/queries.ts` — `updateProduct` 타입에 `currency` 추가
- `src/components/product-card.tsx` — formatPrice 사용
- `src/components/product-detail.tsx` — EditablePrice에 통화 선택 추가

---

## 3-B. 비교 테이블 기본 고정 행 (#11)

### 요구사항
- 스펙 비교 테이블 헤더 아래에 "판매가격"과 "출시국가" 고정 행 추가
- spec_fields와 독립적 — 드래그/순서변경/숨기기 대상이 아님
- 항상 spec 행 위에 고정 표시

### UI 변경

#### SpecTable (`spec-table.tsx`)

`<tbody>` 최상단, DndContext 위에 고정 행 2개 삽입:

**판매가격 행:**
- 좌측 라벨: "판매가격" (드래그 핸들 없음)
- 각 제품 셀: `formatPrice(product.price, product.currency)` — 클릭 시 인라인 편집
- 정렬 지원: 헤더 클릭 시 가격 기준 정렬 (`sortField === "__price__"`)

**출시국가 행:**
- 좌측 라벨: "출시국가" (드래그 핸들 없음)
- 각 제품 셀: `product.country || "-"` — 클릭 시 COUNTRIES 드롭다운 편집
- 정렬 지원: 헤더 클릭 시 국가 기준 정렬 (`sortField === "__country__"`)

### 파일 변경
- `src/components/spec-table.tsx` — 고정 행 2개 + 정렬 로직 확장

---

## 3-C. 공유 가능한 URL (#12)

### 요구사항
- 비교 페이지의 현재 상태(카테고리, 정렬, 보이는 필드)를 URL query params에 반영
- URL을 공유하면 동일한 뷰를 볼 수 있음
- 링크 복사 버튼 제공

### URL 구조

```
/compare?cat=도어락&sort=__price__&dir=asc&fields=id1,id2,id3
```

| Param | 설명 | 기본값 |
|-------|------|--------|
| `cat` | 카테고리 | CATEGORIES[0] ("카메라") |
| `sort` | 정렬 필드키 | 없음 (정렬 안 함) |
| `dir` | 정렬 방향 | 없음 |
| `fields` | 보이는 필드 ID (comma-separated) | 전체 visible fields |

### 동작 원리

1. **초기화**: `useSearchParams()`로 URL에서 상태 읽기. params 없으면 기본값 사용.
2. **상태 → URL**: 카테고리 변경, 정렬 변경, 필드 표시/숨기기 변경 시 `router.replace()` + `URLSearchParams`로 URL 업데이트. `window.history.replaceState`가 아닌 Next.js router 사용.
3. **URL → 상태**: 페이지 로드 시 URL params에서 초기 상태 복원. `fields` param이 있으면 해당 field만 visible로 표시.

### UI 변경

#### 비교 페이지 (`compare/page.tsx`)
- `useSearchParams()` + `useRouter()`로 URL 양방향 동기화
- 카테고리, 정렬 상태를 URL에서 읽고 변경 시 URL 업데이트

#### SpecTable (`spec-table.tsx`)
- 정렬 변경 콜백을 부모로 올림 (onSortChange prop)
- 필드 표시 변경 콜백도 부모로 올림 (onFieldsChange prop)

#### 링크 복사 버튼
- 엑셀 내보내기 버튼 옆에 "링크 복사 🔗" 버튼 추가
- 클릭 시 `navigator.clipboard.writeText(window.location.href)`
- 복사 성공 시 버튼 텍스트 "복사됨 ✓"로 1.5초 변경

### 파일 변경
- `src/app/compare/page.tsx` — URL 상태 관리 + SpecTable에 콜백 전달
- `src/components/spec-table.tsx` — 정렬/필드 변경 콜백 prop 추가, 링크 복사 버튼

---

## 범위 외
- 환율 변환 (통화별 가격을 하나로 통일하는 기능)
- 비교 대상 제품 선택/필터링 (현재는 카테고리 전체)
- 서버사이드 URL 파싱 (클라이언트 only)
- Phase 1, 2, 4 항목들
