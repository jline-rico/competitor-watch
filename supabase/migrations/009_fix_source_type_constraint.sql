-- source_type CHECK 재설정: 'single' 추가 (기존 Worker 데이터 호환)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_source_type_check;
ALTER TABLE products ADD CONSTRAINT products_source_type_check
  CHECK (source_type IN ('monitored', 'one_time', 'manual', 'single'));
