# CompetitorWatch v2 Phase 4: AI/매핑 품질 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매핑 배너에 출처 정보 표시, 카테고리 추천 매핑, 스펙 셀 편집 시 확인/취소 버튼 추가

**Architecture:** queries.ts의 `getUnmappedSpecs()`에 product join 추가 → unmapped-specs-banner.tsx에서 출처 표시 + CategoryPicker에 추천 기능 → spec-row.tsx EditableCell에 저장/취소 버튼 추가. DB 마이그레이션 없음.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, Supabase PostgreSQL REST API

**Spec:** `competitor-watch/docs/superpowers/specs/2026-06-17-cw-v2-phase4-ai-mapping-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/queries.ts` | Modify (lines 249-269) | `getUnmappedSpecs()` — product join, 반환 타입 확장 |
| `src/components/unmapped-specs-banner.tsx` | Modify (전체) | UnmappedItem 타입 확장, CategoryPicker에 suggestedCategories prop, 출처 정보 UI, 빠른 매핑 버튼 |
| `src/components/spec-row.tsx` | Modify (lines 16-97) | EditableCell — ✓/✕ 버튼, blur→취소, onMouseDown preventDefault |

---

### Task 1: getUnmappedSpecs() 쿼리에 product join 추가

**Files:**
- Modify: `src/lib/queries.ts:249-269`

- [ ] **Step 1: `getUnmappedSpecs()` 함수를 product join + 출처 정보 반환으로 교체**

Replace lines 249-269 in `src/lib/queries.ts` with:

```typescript
export async function getUnmappedSpecs() {
  const { data: allSpecs } = await supabase
    .from("specs")
    .select("field_key, field_label, product_id, product:products(name, category)");
  const { data: allFields } = await supabase
    .from("spec_fields")
    .select("field_key, category");

  if (!allSpecs || !allFields) return [];

  const mappedKeys = new Set(allFields.map((f: { field_key: string }) => f.field_key));
  const unmapped = allSpecs.filter((s: { field_key: string }) => s.field_key !== DISPLAY_BRAND_KEY && !mappedKeys.has(s.field_key));

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

- [ ] **Step 2: 개발 서버 확인**

Run: `cd competitor-watch && npm run dev`
Expected: 컴파일 에러 없음. 설정 페이지의 매핑 배너가 정상 동작 (아직 UI는 이전과 동일 — 반환 타입이 상위 호환)

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat: add product join to getUnmappedSpecs for category/product info"
```

---

### Task 2: unmapped-specs-banner.tsx — 출처 표시 + CategoryPicker 추천 + 빠른 매핑

**Files:**
- Modify: `src/components/unmapped-specs-banner.tsx` (전체)

**Context:**
- `getUnmappedSpecs()`가 이제 `{ field_key, field_label, count, categories: string[], products: string[] }` 반환
- CategoryPicker에 `suggestedCategories` prop 추가 필요
- 각 항목 행에 출처 정보 (카테고리: 제품명) 표시
- 추천 카테고리가 있으면 "추천 매핑" 버튼 표시

- [ ] **Step 1: UnmappedItem 타입 확장**

Replace line 7:
```typescript
// Before:
type UnmappedItem = { field_key: string; field_label: string; count: number };

// After:
type UnmappedItem = {
  field_key: string;
  field_label: string;
  count: number;
  categories: string[];
  products: string[];
};
```

- [ ] **Step 2: CategoryPicker에 suggestedCategories prop 추가**

CategoryPicker의 props 타입 변경 (line 9-12):
```typescript
// Before:
function CategoryPicker({
  onConfirm,
  disabled,
}: {
  onConfirm: (categories: string[]) => void;
  disabled: boolean;
}) {

// After:
function CategoryPicker({
  onConfirm,
  disabled,
  suggestedCategories,
}: {
  onConfirm: (categories: string[]) => void;
  disabled: boolean;
  suggestedCategories?: string[];
}) {
```

- [ ] **Step 3: CategoryPicker 내부 — popover 열릴 때 추천 카테고리 기본 선택**

`const [popoverOpen, setPopoverOpen] = useState(false);` 다음에 useEffect 추가:

```typescript
useEffect(() => {
  if (popoverOpen && suggestedCategories?.length) {
    setSelected(new Set(suggestedCategories));
  }
}, [popoverOpen]);
```

**주의:** `useEffect` import는 이미 파일 상단에 있음.

- [ ] **Step 4: CategoryPicker 내부 — 추천 카테고리를 목록 상단에 분리 표시**

`CATEGORIES.map((cat) => ...)` 부분을 추천/기타로 분리:

```tsx
<div className="flex flex-col gap-0.5">
  {suggestedCategories && suggestedCategories.length > 0 && (
    <>
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#92400e" }}>
        📌 추천
      </div>
      {CATEGORIES.filter((cat) => suggestedCategories.includes(cat)).map((cat) => (
        <label
          key={cat}
          className="flex items-center gap-2 rounded px-2 py-1.5 text-xs cursor-pointer hover:bg-amber-50 transition-colors"
          style={{ color: "#78350f", background: selected.has(cat) ? "#fef3c7" : undefined }}
        >
          <input
            type="checkbox"
            checked={selected.has(cat)}
            onChange={() => toggle(cat)}
            className="rounded accent-amber-600"
          />
          {cat}
        </label>
      ))}
      <div className="my-1 border-t" style={{ borderColor: "#fde68a" }} />
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#a16207" }}>
        기타
      </div>
    </>
  )}
  {CATEGORIES.filter((cat) => !suggestedCategories?.includes(cat)).map((cat) => (
    <label
      key={cat}
      className="flex items-center gap-2 rounded px-2 py-1.5 text-xs cursor-pointer hover:bg-amber-50 transition-colors"
      style={{ color: "#78350f" }}
    >
      <input
        type="checkbox"
        checked={selected.has(cat)}
        onChange={() => toggle(cat)}
        className="rounded accent-amber-600"
      />
      {cat}
    </label>
  ))}
</div>
```

**주의:** `suggestedCategories`가 없거나 빈 배열이면 기존과 동일하게 전체 CATEGORIES를 평탄하게 표시.

- [ ] **Step 5: 각 항목 행에 출처 정보 표시**

items.map 내부, 기존 행 구조를 수정. 현재 `<div className="flex items-center gap-3">` 안의 내용 아래에 출처 줄 추가:

```tsx
{items.map((item) => (
  <div
    key={item.field_key}
    className="rounded-md bg-white/60 px-3 py-2"
    style={{ border: "1px solid #fde68a" }}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium" style={{ color: "#78350f" }}>
          {item.field_label}
        </span>
        <span className="text-xs" style={{ color: "#a16207" }}>
          {item.field_key}
        </span>
        <span
          className="rounded-full px-1.5 py-0.5 text-xs"
          style={{ background: "#fef3c7", color: "#92400e" }}
        >
          {item.count}개 제품
        </span>
      </div>
      <div className="flex items-center gap-2">
        {item.categories.length > 0 && (
          <button
            onClick={() => handleMap(item, item.categories)}
            disabled={pending && mappingKey === item.field_key}
            className="rounded border px-2 py-1 text-xs font-medium whitespace-nowrap hover:opacity-80 transition-opacity"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            추천 매핑 ({item.categories.length})
          </button>
        )}
        <CategoryPicker
          onConfirm={(cats) => handleMap(item, cats)}
          disabled={pending && mappingKey === item.field_key}
          suggestedCategories={item.categories}
        />
      </div>
    </div>
    {item.categories.length > 0 && (
      <div className="mt-1.5 text-xs" style={{ color: "#a16207" }}>
        └ {item.categories.map((cat) => cat).join(", ")}
        {item.products.length <= 3
          ? `: ${item.products.join(", ")}`
          : `: ${item.products.slice(0, 3).join(", ")} 외 ${item.products.length - 3}개`}
      </div>
    )}
  </div>
))}
```

**주의:** 기존 행의 최상위 `<div>`에서 `className="flex items-center justify-between"`을 제거하고 내부에 flex row를 새로 만듦 (출처 줄을 아래에 추가하기 위해).

- [ ] **Step 6: 개발 서버 확인**

Run: `cd competitor-watch && npm run dev`
Expected:
- 설정 페이지에서 매핑 배너 펼치면 각 항목에 카테고리/제품 출처 표시
- CategoryPicker 열면 추천 카테고리가 상단에 기본 체크 상태
- "추천 매핑" 버튼 클릭 시 해당 카테고리에 바로 매핑

- [ ] **Step 7: Commit**

```bash
git add src/components/unmapped-specs-banner.tsx
git commit -m "feat: show source categories/products in unmapped banner, add suggested mapping"
```

---

### Task 3: EditableCell에 확인/취소 버튼 추가

**Files:**
- Modify: `src/components/spec-row.tsx:16-97`

**Context:**
- 현재 EditableCell은 blur 시 자동 저장, 확인 버튼 없음
- 변경: blur→취소, ✓(저장)/✕(취소) 버튼 추가
- 버튼에 `onMouseDown={(e) => e.preventDefault()}` 필수 — blur 방지

- [ ] **Step 1: EditableCell 편집 모드 UI 교체**

Replace the editing branch (lines 72-97) with:

```tsx
if (editing) {
  const handleCancel = () => {
    setValue(spec?.value ?? "");
    setEditing(false);
  };

  return (
    <span className="inline-flex items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleCancel}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") handleCancel();
        }}
        disabled={saving}
        className="px-2 py-1 text-sm"
        style={{
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--accent)",
          background: "var(--surface)",
          outline: "none",
          minWidth: "80px",
        }}
      />
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleSave}
        disabled={saving}
        title="저장"
        className="cursor-pointer border-none transition-colors"
        style={{
          background: "transparent",
          color: "var(--success, #16a34a)",
          fontSize: "14px",
          padding: "2px 4px",
          borderRadius: "var(--radius-sm)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(22, 163, 74, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        {saving ? "⏳" : "✓"}
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleCancel}
        title="취소"
        className="cursor-pointer border-none transition-colors"
        style={{
          background: "transparent",
          color: "var(--text-tertiary)",
          fontSize: "14px",
          padding: "2px 4px",
          borderRadius: "var(--radius-sm)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        ✕
      </button>
    </span>
  );
}
```

**핵심:**
- `onBlur={handleCancel}` — 다른 곳 클릭 시 수정 취소
- `onMouseDown={(e) => e.preventDefault()}` — ✓/✕ 버튼 클릭 시 input blur 방지
- `handleCancel`은 기존 Escape 키 핸들러와 동일한 로직
- `w-full` 제거 — `<span>` wrapper 안에서 input이 full-width일 필요 없음

- [ ] **Step 2: 개발 서버 확인**

Run: `cd competitor-watch && npm run dev`
Expected:
- 비교 테이블에서 셀 클릭 → 편집 모드 진입 → ✓/✕ 버튼 표시
- ✓ 클릭 → 저장 (값 반영)
- ✕ 클릭 → 취소 (원래 값 복원)
- 다른 곳 클릭(blur) → 취소
- Enter → 저장
- Escape → 취소

- [ ] **Step 3: Commit**

```bash
git add src/components/spec-row.tsx
git commit -m "feat: add confirm/cancel buttons to spec cell editing, blur cancels"
```

---

### Task 4: Integration Test + Deploy

**Files:**
- None (verification only)

- [ ] **Step 1: 전체 기능 통합 확인**

개발 서버에서 다음을 확인:

1. **매핑 배너 출처 정보**: 설정 페이지에서 미매핑 스펙 배너 펼치기 → 각 항목에 카테고리/제품 출처 표시 확인
2. **CategoryPicker 추천**: 배너에서 "카테고리 선택" 클릭 → 추천 카테고리가 상단에 체크된 상태로 표시
3. **빠른 매핑**: "추천 매핑 (N)" 버튼 클릭 → 해당 카테고리에 바로 매핑, 항목 사라짐
4. **EditableCell 확인 버튼**: 비교 페이지에서 셀 클릭 → ✓/✕ 버튼 표시, 각 동작 정상
5. **blur 취소**: 셀 편집 중 다른 셀 클릭 → 수정 취소됨
6. **기존 기능 회귀 없음**: 비교 테이블 정렬, 링크 복사, DnD 드래그, 가격 통화 표시 등

- [ ] **Step 2: Vercel 배포 확인**

```bash
git push origin master
```

Vercel 자동 배포 후 프로덕션에서 위 체크리스트 재확인.

---

## Summary of Changes

| 파일 | 변경 내용 | Task |
|------|----------|------|
| `src/lib/queries.ts` | `getUnmappedSpecs()` product join, categories/products 반환 | 1 |
| `src/components/unmapped-specs-banner.tsx` | 타입 확장, 출처 UI, CategoryPicker 추천, 빠른 매핑 버튼 | 2 |
| `src/components/spec-row.tsx` | EditableCell ✓/✕ 버튼, blur→취소 | 3 |
