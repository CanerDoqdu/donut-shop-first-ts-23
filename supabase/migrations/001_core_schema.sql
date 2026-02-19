-- =============================================
-- 001: Core Schema — Products, Profiles, Orders, Order Items
-- Idempotent: safe to re-run at any time
-- =============================================
BEGIN;

-- ─── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tables ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name_tr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_tr TEXT,
  description_en TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  category TEXT CHECK (category IN ('glazed', 'filled', 'specialty', 'seasonal', 'beverage')) NOT NULL,
  stock INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT NOT NULL,
  user_address TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled')) DEFAULT 'pending',
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_products_category       ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured        ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_slug            ON products(slug);
CREATE INDEX IF NOT EXISTS idx_orders_user_id           ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status            ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session    ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id     ON order_items(order_id);

-- ─── RLS ────────────────────────────────────────────────────

ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Products
DROP POLICY IF EXISTS "Products are viewable by everyone"   ON products;
DROP POLICY IF EXISTS "Products are editable by admin only"  ON products;

CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT USING (true);

CREATE POLICY "Products are editable by admin only"
  ON products FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"  ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Orders
DROP POLICY IF EXISTS "Users can view own orders"  ON orders;
DROP POLICY IF EXISTS "Anyone can create orders"    ON orders;
DROP POLICY IF EXISTS "Admin can update orders"     ON orders;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can update orders"
  ON orders FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- Order Items
DROP POLICY IF EXISTS "Users can view own order items"  ON order_items;
DROP POLICY IF EXISTS "Anyone can create order items"    ON order_items;

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin')
    )
  );

CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT WITH CHECK (true);

-- ─── Triggers ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Seed Data ──────────────────────────────────────────────

INSERT INTO products (slug, name_tr, name_en, description_tr, description_en, price, image_url, category, stock, featured) VALUES
  ('strawberry-glazed', 'Çilekli Glazürlü', 'Strawberry Glazed', 'Taze çilek glazürü ile kaplı', 'Covered with fresh strawberry glaze', 45.00, '/donut 4.png', 'glazed', 25, true),
  ('chocolate-dream', 'Çikolata Rüyası', 'Chocolate Dream', 'İçi çikolata kreması dolu', 'Filled with chocolate cream', 50.00, '/donut 5.png', 'filled', 20, true),
  ('classic-sugar', 'Klasik Şekerli', 'Classic Sugar', 'Geleneksel şeker tozlu', 'Traditional sugar coated', 40.00, '/donut 6.png', 'glazed', 30, false),
  ('berry-bliss-smoothie', 'Berry Bliss Smoothie', 'Berry Bliss Smoothie', 'Taze meyveli smoothie', 'Fresh fruit smoothie', 65.00, '/beverage 1.png', 'beverage', 50, true),
  ('vanilla-iced-latte', 'Vanilyalı Buzlu Latte', 'Vanilla Iced Latte', 'Soğuk vanilyalı latte', 'Cold vanilla latte', 62.00, '/beverage 5.png', 'beverage', 45, true)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
