-- competitors 테이블에 crawl_config 추가
ALTER TABLE competitors
ADD COLUMN IF NOT EXISTS crawl_config jsonb DEFAULT NULL;

-- products 테이블에 specs_source 추가
ALTER TABLE products
ADD COLUMN IF NOT EXISTS specs_source text DEFAULT 'manual';

-- crawl_logs 테이블 생성
CREATE TABLE IF NOT EXISTS crawl_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid REFERENCES competitors(id),
  run_at timestamptz DEFAULT now(),
  catalog_crawl_ok boolean,
  products_found integer DEFAULT 0,
  new_products integer DEFAULT 0,
  specs_extracted integer DEFAULT 0,
  specs_from_image integer DEFAULT 0,
  specs_failed integer DEFAULT 0,
  error_message text,
  duration_ms integer
);

-- crawl_logs RLS
ALTER TABLE crawl_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY crawl_logs_auth ON crawl_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
