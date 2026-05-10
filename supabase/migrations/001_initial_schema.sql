-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Competitors table
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  catalog_url TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model_number TEXT,
  category TEXT NOT NULL DEFAULT '기타',
  product_url TEXT,
  image_url TEXT,
  price INTEGER,
  is_new BOOLEAN NOT NULL DEFAULT true,
  source_type TEXT NOT NULL DEFAULT 'monitored' CHECK (source_type IN ('monitored', 'one_time')),
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Specs table
CREATE TABLE specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'official' CHECK (source IN ('official', 'researched')),
  source_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spec fields (per-category comparison field management)
CREATE TABLE spec_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(category, field_key)
);

-- Indexes
CREATE INDEX idx_products_competitor ON products(competitor_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_specs_product ON specs(product_id);
CREATE INDEX idx_specs_field_key ON specs(field_key);
CREATE INDEX idx_spec_fields_category ON spec_fields(category);

-- Enable Row Level Security (open for now, small team)
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_fields ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (no auth for small team)
CREATE POLICY "Public access" ON competitors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON specs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON spec_fields FOR ALL USING (true) WITH CHECK (true);
