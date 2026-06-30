ALTER TABLE products
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE products SET created_at = discovered_at WHERE created_at = now();
