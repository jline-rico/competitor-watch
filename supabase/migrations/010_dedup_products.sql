-- 중복 제품 병합: 같은 competitor_id + product_url 기준
-- 1) 가장 먼저 등록된 제품을 keeper로 지정
-- 2) 나머지 제품의 스펙을 keeper로 이동 (중복 키는 무시)
-- 3) 나머지 제품 삭제

-- Step 1: 중복 스펙을 keeper 제품으로 이동
WITH duplicates AS (
  SELECT
    id,
    competitor_id,
    product_url,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY competitor_id, product_url
      ORDER BY created_at ASC
    ) AS rn
  FROM products
  WHERE product_url IS NOT NULL
),
keepers AS (
  SELECT id AS keeper_id, competitor_id, product_url
  FROM duplicates WHERE rn = 1
),
to_remove AS (
  SELECT d.id AS dup_id, k.keeper_id
  FROM duplicates d
  JOIN keepers k ON d.competitor_id = k.competitor_id AND d.product_url = k.product_url
  WHERE d.rn > 1
)
-- Move specs from duplicates to keeper (skip if key already exists)
INSERT INTO specs (product_id, field_key, field_label, value, source)
SELECT tr.keeper_id, s.field_key, s.field_label, s.value, s.source
FROM specs s
JOIN to_remove tr ON s.product_id = tr.dup_id
WHERE NOT EXISTS (
  SELECT 1 FROM specs existing
  WHERE existing.product_id = tr.keeper_id
  AND existing.field_key = s.field_key
)
ON CONFLICT DO NOTHING;

-- Step 2: 중복 제품의 스펙 삭제
DELETE FROM specs
WHERE product_id IN (
  SELECT d.id
  FROM (
    SELECT id, competitor_id, product_url,
      ROW_NUMBER() OVER (PARTITION BY competitor_id, product_url ORDER BY created_at ASC) AS rn
    FROM products WHERE product_url IS NOT NULL
  ) d
  WHERE d.rn > 1
);

-- Step 3: 중복 제품 삭제
DELETE FROM products
WHERE id IN (
  SELECT d.id
  FROM (
    SELECT id, competitor_id, product_url,
      ROW_NUMBER() OVER (PARTITION BY competitor_id, product_url ORDER BY created_at ASC) AS rn
    FROM products WHERE product_url IS NOT NULL
  ) d
  WHERE d.rn > 1
);
