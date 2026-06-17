# CompetitorWatch v2 Phase 1: 삭제 안전장치 + 경쟁사 정보 편집

> **Context:** 사용자가 실사용 중 경쟁사 삭제 시 CASCADE로 모든 제품/스펙이 소실된 경험. 팀 오픈 전 안전장치 필수. 동시에 경쟁사 정보(이름, URL, 국가) 수정 불가 버그 해결.

## 1-A. 경쟁사 삭제 안전장치

### 요구사항
- 경쟁사 삭제 시 PIN 4자리 확인 필수
- 삭제 후 24시간 이내 복원 가능 (soft-delete)
- 24시간 이후 자동 영구 삭제

### DB 변경

#### `competitors` 테이블 수정
```sql
ALTER TABLE competitors ADD COLUMN deleted_at TIMESTAMPTZ NULL;
```

#### `app_settings` 테이블 신규
```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON app_settings FOR ALL USING (true) WITH CHECK (true);
```

PIN은 `key = 'delete_pin'`, `value = '1234'` (평문 — 소규모 팀용, 보안 인증 아님) 형태로 저장.

#### 자동 영구 삭제
Supabase pg_cron extension 또는 Edge Function scheduled trigger:
```sql
-- 24시간 지난 soft-deleted 경쟁사 영구 삭제
DELETE FROM competitors
WHERE deleted_at IS NOT NULL
  AND deleted_at < now() - interval '24 hours';
```
pg_cron이 불가능하면 앱 로드 시 클라이언트에서 cleanup 호출 (fallback).

### UI 변경

#### 삭제 흐름
1. 경쟁사 "삭제" 버튼 클릭
2. PIN 입력 모달 팝업
   - PIN 미설정 시: "삭제 보호 PIN을 먼저 설정해주세요" + PIN 설정 입력란
   - PIN 설정됨: 4자리 입력란 + 확인/취소
3. PIN 일치 → `deleted_at = now()` 업데이트
4. 리스트에서 즉시 사라짐 + 토스트: "경쟁사가 삭제되었습니다. 24시간 이내 복원 가능합니다."

#### 복원 UI
- `CompetitorList` 하단에 "최근 삭제" 접이식 섹션
- soft-deleted 경쟁사 목록 (deleted_at 기준 남은 시간 표시)
- "복원" 버튼 → `deleted_at = NULL` 업데이트

#### PIN 관리
- 설정 페이지에 "삭제 보호 PIN" 섹션 추가
- 현재 PIN 변경: 기존 PIN 입력 → 새 PIN 입력
- 초기 설정: 새 PIN 입력 + 확인

### 쿼리 변경
- `getCompetitors()`: `WHERE deleted_at IS NULL` 필터 추가
- `deleteCompetitor()` → `softDeleteCompetitor()`: `UPDATE SET deleted_at = now()`
- `getDeletedCompetitors()`: 신규 — `WHERE deleted_at IS NOT NULL AND deleted_at > now() - interval '24 hours'`
- `restoreCompetitor(id)`: 신규 — `UPDATE SET deleted_at = NULL`
- `getDeletePin()` / `setDeletePin()`: 신규

### 파일 변경 목록
- `supabase/migrations/003_soft_delete.sql` — 신규
- `src/lib/queries.ts` — 쿼리 추가/수정
- `src/lib/types.ts` — Competitor에 `deleted_at` 추가
- `src/components/competitor-list.tsx` — 인라인 편집 + 삭제 흐름 변경 + 복원 섹션
- `src/components/pin-modal.tsx` — 신규: PIN 입력/설정 모달
- `src/components/pin-settings.tsx` — 신규: PIN 관리 UI
- `src/app/settings/page.tsx` — PIN 설정 섹션 추가

---

## 1-B. 경쟁사 정보 인라인 편집

### 요구사항
- 경쟁사명, URL, 국가 모두 클릭 → 인라인 편집 가능
- 편집 시 확인(✓) / 취소(✕) 버튼 바로 옆에 표시
- Enter로 저장, Escape로 취소

### UI 변경

#### CompetitorList 테이블 셀별 편집
- **경쟁사명**: 클릭 → `<input type="text">` + ✓✕ 버튼
- **URL**: 클릭 → `<input type="text">` + ✓✕ 버튼
- **국가**: 클릭 → `<select>` (COUNTRIES 드롭다운) + ✓✕ 버튼

각 셀은 독립적으로 편집 가능. 한 셀 편집 중 다른 셀 클릭 시 현재 편집 취소.

### 쿼리
- `updateCompetitor(id, updates)` — 타입 시그니처 확장 필요: 현재 `Partial<Pick<Competitor, "name" | "catalog_url" | "is_active">>` → `"country"` 추가

### 파일 변경 목록
- `src/lib/queries.ts` — `updateCompetitor` 타입에 `country` 추가
- `src/components/competitor-list.tsx` — 셀별 인라인 편집 구현

---

## 인라인 편집 확인 버튼 패턴 (전체 적용 방향)

현재 codebase에서 인라인 편집 시 blur 저장, 명시적 버튼 등 패턴이 혼재. 사용자 피드백: **"수정하면 그 블랭크 옆에 바로 확인버튼 좀 줘"**.

Phase 1에서는 `CompetitorList`에만 적용. Phase 2~3에서 `EditablePrice`, `EditableBrandName`, `EditableProductImage`, `EditableSpecRow` 등에 점진적으로 동일 패턴 적용 예정.

**표준 패턴:**
```
[input/select] [✓ 저장] [✕ 취소]
```
- ✓: 저장 실행 (Enter와 동일)
- ✕: 편집 취소 (Escape와 동일)
- blur 시 자동 저장 안 함 (blur = 취소)

---

## 범위 외
- 제품 삭제 보호 (현재 개별 제품 단위라 피해 제한적 — 필요 시 Phase 2에서)
- 전체 인라인 편집 패턴 통일 (Phase 2~3)
- 다른 Phase 항목들 (#1,2,4,6,7,8,9,10,11,12)
