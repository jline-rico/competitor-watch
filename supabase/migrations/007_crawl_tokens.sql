-- Add tokens_used column to crawl_logs
ALTER TABLE crawl_logs ADD COLUMN IF NOT EXISTS tokens_used integer DEFAULT 0;
