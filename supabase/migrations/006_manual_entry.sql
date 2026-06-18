-- source_type CHECK 확장 (manual 추가)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_source_type_check;
ALTER TABLE products ADD CONSTRAINT products_source_type_check
  CHECK (source_type IN ('monitored', 'one_time', 'manual'));

-- AI 리서치 상태 추적
ALTER TABLE products
ADD COLUMN IF NOT EXISTS ai_research_status text DEFAULT NULL;

ALTER TABLE products ADD CONSTRAINT products_ai_research_status_check
  CHECK (ai_research_status IS NULL OR ai_research_status IN ('pending', 'running', 'done', 'failed'));
