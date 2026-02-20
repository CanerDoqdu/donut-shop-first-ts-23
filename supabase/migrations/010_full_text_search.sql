-- Migration 010: Full-Text Search on products
-- Adds tsvector column + GIN index for fast FTS queries.
-- Uses both English and Turkish dictionaries for bilingual search.

-- ── tsvector column ─────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- ── Populate tsvector from name + description columns ───────
UPDATE products
SET search_vector =
  setweight(to_tsvector('english', COALESCE(name_en, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description_en, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(name_tr, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(description_tr, '')), 'B');

-- ── GIN index for fast FTS queries ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON products USING GIN (search_vector);

-- ── Auto-update trigger ─────────────────────────────────────
-- Keeps search_vector in sync when name or description changes.

CREATE OR REPLACE FUNCTION products_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name_en, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description_en, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.name_tr, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description_tr, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_search_vector ON products;

CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE OF name_en, name_tr, description_en, description_tr
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION products_search_vector_trigger();

-- ── RPC: fts_search_products ────────────────────────────────
-- Public-facing function that:
--   1. Converts the query string to a tsquery
--   2. Filters by search_vector match
--   3. Orders by ts_rank (name matches > description matches)
--   4. Returns paginated results

CREATE OR REPLACE FUNCTION fts_search_products(
  p_query TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name_en TEXT,
  name_tr TEXT,
  description_en TEXT,
  description_tr TEXT,
  price NUMERIC,
  image_url TEXT,
  category TEXT,
  stock INT,
  featured BOOLEAN,
  rank REAL
) AS $$
DECLARE
  tsquery_val tsquery;
BEGIN
  -- Convert plain text to tsquery with prefix matching
  tsquery_val := websearch_to_tsquery('english', p_query);
  
  RETURN QUERY
    SELECT
      p.id,
      p.slug,
      p.name_en,
      p.name_tr,
      p.description_en,
      p.description_tr,
      p.price,
      p.image_url,
      p.category,
      p.stock,
      p.featured,
      ts_rank(p.search_vector, tsquery_val) AS rank
    FROM products p
    WHERE p.search_vector @@ tsquery_val
      AND p.deleted_at IS NULL
    ORDER BY rank DESC, p.featured DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;
