# 비교 테이블 제품 필터링

> **Context:** 비교 테이블에서 특정 업체나 국가의 제품만 골라서 비교하고, 그 필터 상태를 링크로 공유할 수 있어야 함. 업체명도 고정 행으로 항상 표시.

## A. 업체명 고정 행

### 요구사항
- tbody의 최상단에 **업체명** 고정 행 추가 (판매가격/출시국가 위)
- 순서: `업체명 → 판매가격 → 출시국가 → 스펙 행들`
- 정렬 가능 (`__brand__` 필드키, 클릭 시 asc/desc 토글)
- 읽기 전용 (편집은 기존 thead의 EditableBrandName에서)
- 표시 값: `brands.get(p.id) || p.competitor.name` (표시 브랜드 우선)

### UI

```
| 업체명 ↕ | Aqara | Aqara | 삼성전자 | ...
| 판매가격 ↕ | 100원 | 40원 | 89,000원 | ...
| 출시국가 ↕ | 미국  | 미국  | 한국    | ...
```

### 구현

`spec-table.tsx` tbody 최상단, 기존 판매가격 행 위에 추가:

```tsx
{/* Fixed row: 업체명 */}
<tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-warm)" }}>
  <td className="w-8" />
  <td
    className="px-4 py-3 text-sm font-medium whitespace-nowrap cursor-pointer select-none"
    style={{ color: "var(--text-secondary)" }}
    onClick={() => handleHeaderClick("__brand__")}
  >
    업체명
    <SortIndicator field="__brand__" />
  </td>
  {sortedProducts.map((p) => (
    <td key={p.id} className="px-4 py-3 text-sm">
      {brands.get(p.id) || p.competitor.name}
    </td>
  ))}
</tr>
```

`sortedProducts` 정렬에 `__brand__` 케이스 추가:

```typescript
if (sortField === "__brand__") {
  aVal = brands.get(a.id) || a.competitor?.name || "";
  bVal = brands.get(b.id) || b.competitor?.name || "";
}
```

> **참고:** 기존 `__competitor__`와 동일한 로직이지만, 고정 행의 정렬 필드키를 명확히 분리. `__competitor__`는 thead 헤더의 정렬, `__brand__`는 고정 행의 정렬. 두 값이 동일하므로 실제로는 `__competitor__`를 재사용해도 무방 — 구현 시 판단.

---

## B. 필터 바

### 요구사항
- 카테고리 드롭다운 옆에 **업체 필터**와 **국가 필터** 드롭다운 추가
- Multi-select 체크박스 팝오버 (기존 CategoryPicker 패턴)
- 옵션은 현재 카테고리의 제품에서 동적 추출
- 카테고리 변경 시 필터 리셋
- 필터 적용 시 해당하지 않는 제품 컬럼 숨김

### UI 레이아웃

```
[스펙 비교]                          [카메라 ▾]
[제품군별 스펙을 한눈에 비교하세요]

                    [업체: 전체 ▾]  [국가: 전체 ▾]  [링크 복사 🔗]  [엑셀 내보내기 ⬇]
```

필터 드롭다운은 링크 복사/엑셀 버튼과 같은 줄(테이블 위 오른쪽 정렬 영역)에 배치.

### 필터 상태

```typescript
// compare/page.tsx에 추가
const [brandFilter, setBrandFilter] = useState<string[] | null>(null);    // null = 전체
const [countryFilter, setCountryFilter] = useState<string[] | null>(null); // null = 전체
```

### 컴포넌트: ProductFilter

`src/components/product-filter.tsx` 신규 — 재사용 가능한 multi-select 필터 드롭다운.

```typescript
interface ProductFilterProps {
  label: string;          // "업체" | "국가"
  options: string[];      // 동적 추출된 옵션 목록
  selected: string[] | null; // null = 전체
  onChange: (selected: string[] | null) => void;
  disabled?: boolean;
}
```

- 닫힌 상태: `[업체: 전체 ▾]` 또는 `[업체: 2개 선택 ▾]`
- 열린 상태: 체크박스 목록 + "전체 선택/해제" 토글
- 모두 선택하면 → `null` (전체)로 리셋
- 하나도 선택 안 하면 → `null` (전체)로 리셋 (빈 필터 방지)

### 필터 적용 위치

`spec-table.tsx`에서 `sortedProducts` 계산 전에 필터 적용:

```typescript
const filteredProducts = products.filter((p) => {
  if (brandFilter) {
    const brandName = brands.get(p.id) || p.competitor?.name || "";
    if (!brandFilter.includes(brandName)) return false;
  }
  if (countryFilter) {
    if (!countryFilter.includes(p.country || "")) return false;
  }
  return true;
});

// 이후 filteredProducts를 정렬
const sortedProducts = (() => {
  if (!sortField || !sortDir) return filteredProducts;
  return [...filteredProducts].sort(/* ... */);
})();
```

### 옵션 추출

`spec-table.tsx` 내부에서 products 기반으로 추출 후 부모에게 전달하거나, `compare/page.tsx`에서 직접 접근하기 어려우므로 **SpecTable 내부에서 필터 UI를 렌더링**:

```typescript
// spec-table.tsx Props 확장
interface Props {
  category: string;
  sortField: string | null;
  sortDir: SortDir;
  onSortChange: (field: string | null, dir: SortDir) => void;
  visibleFieldIds: string[] | null;
  onFieldsChange: (fieldIds: string[]) => void;
  brandFilter: string[] | null;        // 추가
  countryFilter: string[] | null;      // 추가
  onBrandFilterChange: (brands: string[] | null) => void;   // 추가
  onCountryFilterChange: (countries: string[] | null) => void; // 추가
}
```

SpecTable 내부에서 products 로딩 후 고유 업체/국가 목록 추출:

```typescript
const uniqueBrands = [...new Set(products.map((p) => brands.get(p.id) || p.competitor?.name || ""))].sort();
const uniqueCountries = [...new Set(products.map((p) => p.country || "").filter(Boolean))].sort();
```

필터 드롭다운은 기존 "링크 복사" / "엑셀 내보내기" 버튼과 같은 줄에 배치.

---

## C. URL 반영

### 추가 URL 파라미터

| 파라미터 | 값 예시 | 설명 |
|---------|--------|------|
| `brands` | `Aqara,삼성전자` | 선택된 업체명 (쉼표 구분) |
| `countries` | `미국` | 선택된 국가 (쉼표 구분) |

필터 미적용(전체) 시 파라미터 생략.

### compare/page.tsx 변경

```typescript
// 초기값 읽기
const initialBrands = searchParams.get("brands")
  ? searchParams.get("brands")!.split(",")
  : null;
const initialCountries = searchParams.get("countries")
  ? searchParams.get("countries")!.split(",")
  : null;

const [brandFilter, setBrandFilter] = useState<string[] | null>(initialBrands);
const [countryFilter, setCountryFilter] = useState<string[] | null>(initialCountries);
```

`updateUrl` 확장:
```typescript
const updateUrl = useCallback(
  (cat, sort, dir, fields, brands, countries) => {
    const params = new URLSearchParams();
    params.set("cat", cat);
    if (sort && dir) { params.set("sort", sort); params.set("dir", dir); }
    if (fields) { params.set("fields", fields.join(",")); }
    if (brands) { params.set("brands", brands.join(",")); }
    if (countries) { params.set("countries", countries.join(",")); }
    router.replace(`/compare?${params.toString()}`, { scroll: false });
  },
  [router]
);
```

카테고리 변경 시 필터 리셋:
```typescript
const handleCategoryChange = (cat: string) => {
  setCategory(cat);
  setSortField(null);
  setSortDir(null);
  setVisibleFieldIds(null);
  setBrandFilter(null);      // 추가
  setCountryFilter(null);    // 추가
  updateUrl(cat, null, null, null, null, null);
};
```

---

## 영향받는 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `src/app/compare/page.tsx` | brandFilter/countryFilter state + URL 동기화 + SpecTable props 전달 |
| `src/components/spec-table.tsx` | Props 확장, 업체명 고정 행, 필터 적용(filteredProducts), 필터 드롭다운 렌더링, `__brand__` 정렬 |
| `src/components/product-filter.tsx` | 신규 — multi-select 필터 드롭다운 컴포넌트 |

## 변경하지 않는 파일

- DB 마이그레이션 없음
- `src/lib/types.ts` 변경 없음
- `src/lib/queries.ts` 변경 없음
