# CompetitorWatch v2 Phase 4: AI/매핑 품질 개선

> **Context:** 매핑 배너에 출처 정보가 없어 판단이 어렵고, 카테고리 매핑이 혼란스럽고, 스펙 셀 수정 시 확인 버튼이 없어 저장 의도가 불명확함.

## 4-A. 매핑 배너에 카테고리 + 제품명 표시 (#7)

### 요구사항
- 미매핑 스펙 배너에서 각 항목이 **어떤 카테고리/제품**에서 왔는지 표시
- CategoryPicker에 해당 스펙이 실제 존재하는 카테고리를 추천 옵션으로 제시

### 쿼리 변경

`getUnmappedSpecs()` in `src/lib/queries.ts`:

현재 반환: `{ field_key, field_label, count }`
변경 후: `{ field_key, field_label, count, categories: string[], products: string[] }`

현재 코드는 `product_id`를 가져오지만 사용하지 않음. product 테이블을 join해서 `name`, `category`를 가져옴.

> **참고:** `product:products(...)` alias 패턴은 기존 `getProducts()`의 `competitor:competitors(...)` 패턴과 동일. Supabase가 join 결과의 타입을 자동 추론하지 못하므로 `as any`로 캐스팅 후 접근.

```typescript
export async function getUnmappedSpecs() {
  const { data: allSpecs } = await supabase
    .from("specs")
    .select("field_key, field_label, product_id, product:products(name, category)");
  const { data: allFields } = await supabase
    .from("spec_fields")
    .select("field_key, category");

  if (!allSpecs || !allFields) return [];

  const mappedKeys = new Set(allFields.map((f) => f.field_key));
  const unmapped = allSpecs.filter(
    (s) => s.field_key !== DISPLAY_BRAND_KEY && !mappedKeys.has(s.field_key)
  );

  const unique = new Map<string, {
    field_key: string;
    field_label: string;
    count: number;
    categories: Set<string>;
    products: Set<string>;
  }>();

  for (const s of unmapped) {
    const existing = unique.get(s.field_key);
    const prod = (s as any).product;
    const catName: string = prod?.category ?? "미분류";
    const prodName: string = prod?.name ?? "알 수 없음";
    if (existing) {
      existing.count++;
      existing.categories.add(catName);
      existing.products.add(prodName);
    } else {
      unique.set(s.field_key, {
        field_key: s.field_key,
        field_label: s.field_label,
        count: 1,
        categories: new Set([catName]),
        products: new Set([prodName]),
      });
    }
  }

  return Array.from(unique.values()).map((item) => ({
    ...item,
    categories: Array.from(item.categories),
    products: Array.from(item.products),
  }));
}
```

### UI 변경 (`unmapped-specs-banner.tsx`)

타입 변경:
```typescript
type UnmappedItem = {
  field_key: string;
  field_label: string;
  count: number;
  categories: string[];
  products: string[];
};
```

각 미매핑 항목 행에 출처 정보 추가:
```
[배터리 용량]  battery_capacity  3개 제품
 └ 소형 기기: ProductA, ProductB | 카메라: ProductC
                                    [카테고리 선택 ▾]
```

- 카테고리별로 그룹핑하여 "카테고리: 제품1, 제품2" 형태 표시
- 제품명이 3개 초과 시 "외 N개" 처리

### CategoryPicker 개선

- `suggestedCategories?: string[]` prop 추가 (해당 스펙이 존재하는 카테고리 목록)
- 추천 카테고리를 목록 상단에 "📌 추천" 라벨과 함께 표시
- 추천 카테고리는 기본 체크 상태 (사용자가 해제 가능)

**초기화 로직:**
```typescript
// popoverOpen이 true로 바뀔 때 suggestedCategories로 selected 초기화
useEffect(() => {
  if (popoverOpen && suggestedCategories?.length) {
    setSelected(new Set(suggestedCategories));
  }
}, [popoverOpen]);
```
`useState` 초기값 대신 `useEffect`로 처리 — popover를 닫았다 다시 열 때도 추천이 리셋됨.

---

## 4-B. 경쟁사 카테고리 vs 우리 카테고리 매핑 (#6)

### 문제
1. 경쟁사 카테고리명 ≠ 우리 카테고리명 (예: "스마트 도어락" vs "도어락")
2. 하나의 스펙이 여러 카테고리에 걸칠 수 있음 (예: "배터리" → 도어락 + 카메라)
3. 매핑할 때 어떤 카테고리를 선택해야 할지 힌트 없음

### 해결

4-A에서 이미 **카테고리 + 제품 출처 정보**를 표시하므로 문제 3은 해결됨.

4-A에서 이미 CategoryPicker가 **multi-select**이므로 문제 2도 해결됨 (기존 코드 이미 복수 선택 지원).

문제 1 추가 대응:
- CategoryPicker에서 **추천 카테고리를 기본 선택** 상태로 제시 (4-A의 suggestedCategories)
- "모든 추천 카테고리에 매핑" 단축 동작: 추천이 있는 경우 한 번 클릭으로 모든 추천 카테고리에 바로 매핑
- 이를 통해 사용자가 카테고리를 직접 판단하지 않아도 됨

### 빠른 매핑 버튼

각 미매핑 항목에 추천 카테고리가 있을 경우, CategoryPicker 옆에 **"추천 매핑"** 버튼 추가:
```
[배터리 용량]  ...  [추천 매핑 (2)] [카테고리 선택 ▾]
```
- 클릭 시 추천 카테고리 전체에 한 번에 매핑
- 추천 카테고리가 없으면 버튼 숨김

**핸들러:** 기존 `handleMap`을 재사용 — `item.categories`를 직접 전달:
```typescript
{item.categories.length > 0 && (
  <button
    onClick={() => handleMap(item, item.categories)}
    disabled={pending && mappingKey === item.field_key}
    className="rounded border px-2 py-1 text-xs font-medium whitespace-nowrap"
    style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
  >
    추천 매핑 ({item.categories.length})
  </button>
)}
```

---

## 4-C. 스펙 셀 수정 시 확인 버튼 (#4)

### 요구사항
- 비교 테이블에서 스펙 셀 수정 시 **명시적 확인(저장) 버튼** 필요
- 다른 곳 클릭(blur) 시에는 **취소** 처리 (수정 의도 철회)
- Enter → 저장, Escape → 취소 유지

### 현재 구현 (`spec-row.tsx` EditableCell)

```typescript
// 현재: blur 시 자동 저장, 확인 버튼 없음
if (editing) {
  return (
    <input
      onBlur={handleSave}  // ← 문제: blur 시 저장
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") { /* 취소 */ }
      }}
    />
  );
}
```

### 변경 후

```typescript
if (editing) {
  return (
    <span className="inline-flex items-center gap-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleCancel}   // ← blur 시 취소
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") handleCancel();
        }}
        // ... styles
      />
      <button
        onMouseDown={(e) => e.preventDefault()}  // blur 방지
        onClick={handleSave}
        disabled={saving}
        title="저장"
        // 초록색 체크 아이콘 스타일
      >
        {saving ? "⏳" : "✓"}
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}  // blur 방지
        onClick={handleCancel}
        title="취소"
        // 회색 X 아이콘 스타일
      >
        ✕
      </button>
    </span>
  );
}
```

핵심 구현 포인트:
- **✓/✕ 버튼에 `onMouseDown={(e) => e.preventDefault()`** — 버튼 클릭 시 input의 blur 이벤트가 먼저 발생하는 것을 방지. 이렇게 해야 blur=취소 동작과 버튼 클릭 저장이 충돌하지 않음.
- `handleCancel`: `setValue(spec?.value ?? ""); setEditing(false);`
- `handleSave`: 기존 저장 로직 유지, 저장 성공 시 `setEditing(false)`
- 저장 중 input + 버튼 모두 `disabled`

### 스타일

```css
/* ✓ 버튼 */
background: transparent;
color: var(--success, #16a34a);
border: none;
cursor: pointer;
font-size: 14px;
padding: 2px 4px;
border-radius: var(--radius-sm);

/* hover */
background: rgba(22, 163, 74, 0.1);

/* ✕ 버튼 */
color: var(--text-tertiary);
/* hover */
background: rgba(0, 0, 0, 0.05);
```

---

## 영향받는 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/queries.ts` | `getUnmappedSpecs()` — product join, 반환 타입 확장 |
| `src/components/unmapped-specs-banner.tsx` | 타입 변경, 출처 정보 표시, CategoryPicker에 suggestedCategories 전달, 빠른 매핑 버튼 |
| `src/components/spec-row.tsx` | EditableCell에 ✓/✕ 버튼, blur→취소, onMouseDown preventDefault |

## 변경하지 않는 파일

- `src/lib/types.ts` — 타입 변경 없음 (UnmappedItem은 컴포넌트 로컬 타입)
- `src/components/field-manager.tsx` — 변경 없음
- DB 마이그레이션 — 필요 없음 (기존 테이블 구조 활용)
