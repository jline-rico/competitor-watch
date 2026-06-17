# CompetitorWatch v2 Phase 2: Feed UX 개선

> **Context:** 사용자가 조사 대상 추가 탭에서 느낀 4가지 UX 문제. 모니터링 시작 후 다음 액션 불명확, 제품 리스트 검색 없음, 국가 정보 미표시, 상세 페이지 이미지 누락.

## 2-A. 모니터링 시작 후 피드백 (#2)

### 요구사항
- "모니터링 시작" / "스펙 수집 시작" 후 모달 내에서 완료 확인 화면 표시
- 사용자가 "확인" 버튼으로 직접 닫기

### UI 변경

`add-url-modal.tsx`에서 submit 후 입력 폼을 확인 화면으로 교체:

- ✅ 체크 아이콘 + "등록 완료!"
- 경쟁사 모드: "크롤링이 백그라운드에서 진행됩니다. 1-2분 후 조사 대상 목록에 제품이 표시됩니다."
- 제품 모드: "스펙 수집이 진행 중입니다. 1-2분 후 조사 대상 목록에 표시됩니다."
- "확인" 버튼 → 모달 닫기 + 상태 초기화

현재 `status` 텍스트 메시지 방식을 `submitted: boolean` 상태로 교체. submitted가 true이면 폼 대신 확인 화면 렌더링.

### 파일 변경
- `src/components/add-url-modal.tsx` — submit 후 확인 화면 추가

---

## 2-B. 제품 리스트 검색 + 국가 필터 (#8, #9)

### 요구사항
- 메인 페이지 상단에 검색 + 국가 + 카테고리 필터 바
- 검색: 제품명, 모델번호, 업체명, 카테고리, 국가 전체 텍스트 매치
- 국가: 드롭다운으로 필터 (전체 + COUNTRIES)
- 카테고리: 드롭다운으로 필터 (전체 + CATEGORIES)
- ProductCard에 국가 정보 표시

### UI 변경

#### 필터 바 (page.tsx)
제목 영역과 ProductFeed 사이에 필터 바 삽입:

```
[🔍 검색...                    ] [국가 ▾] [카테고리 ▾]
```

- 검색: `<input>` 텍스트, 300ms debounce로 클라이언트 필터링
- 국가: `<select>` — "전체 국가" + COUNTRIES
- 카테고리: `<select>` — "전체 카테고리" + CATEGORIES

#### 필터 로직
- `page.tsx`에서 `useProducts()` 호출 (카테고리 파라미터 없이 전체 로드)
- 클라이언트에서 3개 필터 적용: search → country → category
- 검색은 `product.name`, `product.model_number`, `product.competitor.name`, `product.category`, `product.country` 모두 매치 (case-insensitive, includes)
- 국가 필터: `product.country` 기준. null이면 "미분류"로 취급.
- 카테고리 필터: `product.category` 기준.
- 필터된 결과를 `ProductFeed`에 props로 전달.

#### ProductFeed 변경
- 기존: 내부에서 `useProducts()` 호출 + 자체 렌더링
- 변경: `products` prop을 받아 렌더링만 담당. 로딩/빈 상태도 prop으로 전달.

#### ProductCard 변경
- 카테고리 옆에 국가 표시: `도어락 · 한국` 형태
- product.country가 없으면 국가 부분 생략

### 파일 변경
- `src/app/page.tsx` — 필터 바 + 필터 로직 + useProducts 호출
- `src/components/product-feed.tsx` — props로 products/loading 받게 변경
- `src/components/product-card.tsx` — 국가 표시 추가

---

## 2-C. 상세 페이지 이미지 (#10)

### 요구사항
- 제품 상세 페이지 상단에 이미지 크게 표시
- 이미지 없으면 플레이스홀더

### UI 변경

`product-detail.tsx`에서 뒤로가기 버튼과 제품명 사이에 이미지 영역 삽입:

- `image_url` 있을 때: `<img>` 가로 100%, 높이 250px, `object-contain`, 배경 `--bg-warm`, `border-radius: var(--radius-lg)`, `border: 1px solid var(--border)`
- `image_url` 없을 때: 같은 크기 영역에 📦 아이콘 + "이미지 없음" 텍스트, 배경 `--bg-warm`

### 파일 변경
- `src/components/product-detail.tsx` — 이미지 헤더 영역 추가

---

## 범위 외
- 피드 자동 새로고침 / 실시간 업데이트 (polling, WebSocket 등)
- 서버 사이드 검색 (Supabase full-text search)
- 페이지네이션 / 무한 스크롤
- Phase 1, 3, 4 항목들
