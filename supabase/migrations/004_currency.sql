-- 004_currency.sql
-- Add currency column to products
ALTER TABLE products ADD COLUMN currency TEXT NOT NULL DEFAULT 'KRW';
