-- =============================================
-- GLAZED & SIPPED - Extended Features Schema
-- Run this AFTER the base schema.sql
-- =============================================

-- =============================================
-- STORES / LOCATIONS TABLE
-- Multi-location support
-- =============================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  phone TEXT,
  email TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  opening_hours JSONB DEFAULT '{"mon": "08:00-22:00", "tue": "08:00-22:00", "wed": "08:00-22:00", "thu": "08:00-22:00", "fri": "08:00-23:00", "sat": "09:00-23:00", "sun": "09:00-21:00"}',
  is_active BOOLEAN DEFAULT true,
  delivery_radius_km INTEGER DEFAULT 5,
  avg_preparation_time INTEGER DEFAULT 15, -- in minutes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STORE INVENTORY TABLE
-- Per-store stock management
-- =============================================
CREATE TABLE IF NOT EXISTS store_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  stock INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, product_id)
);

-- =============================================
-- LOYALTY POINTS TABLE
-- Points system for customers
-- =============================================
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  total_points INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0,
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')) DEFAULT 'bronze',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =============================================
-- POINTS TRANSACTIONS TABLE
-- History of points earned/redeemed
-- =============================================
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('earned', 'redeemed', 'expired', 'bonus', 'referral')) NOT NULL,
  points INTEGER NOT NULL, -- positive for earned, negative for redeemed
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- GIFT CARDS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  initial_balance DECIMAL(10, 2) NOT NULL,
  current_balance DECIMAL(10, 2) NOT NULL,
  purchaser_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  purchaser_email TEXT NOT NULL,
  recipient_email TEXT,
  recipient_name TEXT,
  message TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- =============================================
-- GIFT CARD TRANSACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gift_card_id UUID REFERENCES gift_cards(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL, -- negative for usage
  balance_after DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTIONS TABLE
-- Monthly donut subscription boxes
-- =============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan TEXT CHECK (plan IN ('starter', 'classic', 'premium', 'family')) NOT NULL,
  status TEXT CHECK (status IN ('active', 'paused', 'cancelled', 'expired')) DEFAULT 'active',
  donuts_per_month INTEGER NOT NULL,
  price_per_month DECIMAL(10, 2) NOT NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  preferred_store_id UUID REFERENCES stores(id),
  delivery_day TEXT CHECK (delivery_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  next_delivery_date DATE,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTION DELIVERIES TABLE
-- Track each delivery
-- =============================================
CREATE TABLE IF NOT EXISTS subscription_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'preparing', 'delivered', 'skipped', 'failed')) DEFAULT 'scheduled',
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- REVIEWS TABLE
-- Customer product reviews
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  title TEXT,
  content TEXT,
  image_urls TEXT[], -- Array of image URLs
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id, order_id)
);

-- =============================================
-- REVIEW HELPFUL VOTES
-- =============================================
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- =============================================
-- REFERRALS TABLE
-- Customer referral program
-- =============================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'expired')) DEFAULT 'pending',
  reward_given BOOLEAN DEFAULT false,
  reward_amount INTEGER DEFAULT 100, -- points
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- =============================================
-- REFERRAL CODES TABLE
-- Unique codes for each user
-- =============================================
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  uses_count INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 50,
  discount_percent INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =============================================
-- NOTIFICATIONS TABLE
-- For email/push notifications queue
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('order_confirmation', 'order_shipped', 'order_delivered', 'points_earned', 'subscription_reminder', 'gift_card_received', 'review_request', 'promotional')) NOT NULL,
  channel TEXT CHECK (channel IN ('email', 'sms', 'push')) NOT NULL,
  recipient TEXT NOT NULL, -- email or phone
  subject TEXT,
  content TEXT NOT NULL,
  metadata JSONB,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADMIN USERS TABLE
-- For admin dashboard access
-- =============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('super_admin', 'admin', 'manager', 'staff')) NOT NULL,
  permissions JSONB DEFAULT '{"orders": true, "products": true, "inventory": true, "analytics": true, "users": false}',
  store_id UUID REFERENCES stores(id), -- NULL means all stores
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =============================================
-- ANALYTICS EVENTS TABLE
-- For dashboard metrics
-- =============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL, -- 'page_view', 'product_view', 'add_to_cart', 'purchase', etc
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADD store_id TO ORDERS
-- =============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_card_id UUID REFERENCES gift_cards(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_card_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_subscription_order BOOLEAN DEFAULT false;

-- =============================================
-- ADD referral_code TO PROFILES
-- =============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);

-- =============================================
-- ADD rating fields TO PRODUCTS
-- =============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(2, 1) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- =============================================
-- INDEXES FOR NEW TABLES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_stores_city ON stores(city);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_store_inventory_store ON store_inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_product ON store_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_tier ON loyalty_points(tier);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);

-- =============================================
-- RLS FOR NEW TABLES
-- =============================================

-- Stores: Public read
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stores are viewable by everyone" ON stores FOR SELECT USING (true);

-- Store Inventory: Public read
ALTER TABLE store_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store inventory viewable by everyone" ON store_inventory FOR SELECT USING (true);

-- Loyalty Points: Own data only
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own points" ON loyalty_points FOR SELECT USING (auth.uid() = user_id);

-- Points Transactions: Own data only
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON points_transactions FOR SELECT USING (auth.uid() = user_id);

-- Gift Cards: Own cards only
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own gift cards" ON gift_cards FOR SELECT USING (auth.uid() = purchaser_id OR recipient_email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Subscriptions: Own subscriptions only  
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Reviews: Public read, own write
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (is_approved = true OR auth.uid() = user_id);
CREATE POLICY "Users can create own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);

-- Referrals: Own data only
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Notifications: Own data only
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Calculate loyalty tier based on lifetime points
CREATE OR REPLACE FUNCTION calculate_loyalty_tier(lifetime_pts INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF lifetime_pts >= 10000 THEN
    RETURN 'platinum';
  ELSIF lifetime_pts >= 5000 THEN
    RETURN 'gold';
  ELSIF lifetime_pts >= 2000 THEN
    RETURN 'silver';
  ELSE
    RETURN 'bronze';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update product rating when review is added
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products 
  SET 
    avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = NEW.product_id AND is_approved = true),
    review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id AND is_approved = true)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_rating_trigger
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_rating();

-- Award points after order is paid
CREATE OR REPLACE FUNCTION award_order_points()
RETURNS TRIGGER AS $$
DECLARE
  points_to_award INTEGER;
  user_loyalty loyalty_points%ROWTYPE;
BEGIN
  IF NEW.status = 'paid' AND OLD.status = 'pending' AND NEW.user_id IS NOT NULL THEN
    -- 1 point per 10 TL spent
    points_to_award := FLOOR(NEW.total / 10);
    
    -- Get or create loyalty record
    INSERT INTO loyalty_points (user_id, total_points, lifetime_points)
    VALUES (NEW.user_id, points_to_award, points_to_award)
    ON CONFLICT (user_id) DO UPDATE SET
      total_points = loyalty_points.total_points + points_to_award,
      lifetime_points = loyalty_points.lifetime_points + points_to_award,
      tier = calculate_loyalty_tier(loyalty_points.lifetime_points + points_to_award),
      updated_at = NOW();
    
    -- Record transaction
    INSERT INTO points_transactions (user_id, order_id, type, points, description)
    VALUES (NEW.user_id, NEW.id, 'earned', points_to_award, 'Sipariş: ' || NEW.id);
    
    -- Update order with points earned
    NEW.points_earned := points_to_award;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER award_points_on_order_paid
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION award_order_points();

-- Generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN 'GS' || result;
END;
$$ LANGUAGE plpgsql;

-- Auto-create referral code for new users
CREATE OR REPLACE FUNCTION create_user_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET referral_code = generate_referral_code()
  WHERE id = NEW.id AND referral_code IS NULL;
  
  INSERT INTO referral_codes (user_id, code)
  VALUES (NEW.id, (SELECT referral_code FROM profiles WHERE id = NEW.id));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE STORES DATA
-- =============================================
INSERT INTO stores (slug, name, address, city, district, phone, latitude, longitude, avg_preparation_time) VALUES
  ('kadikoy', 'Glazed & Sipped Kadıköy', 'Bağdat Caddesi No:123', 'İstanbul', 'Kadıköy', '+90 216 123 4567', 40.9869, 29.0292, 15),
  ('besiktas', 'Glazed & Sipped Beşiktaş', 'Barbaros Bulvarı No:45', 'İstanbul', 'Beşiktaş', '+90 212 234 5678', 41.0434, 29.0073, 12),
  ('sisli', 'Glazed & Sipped Şişli', 'Abide-i Hürriyet Cad. No:78', 'İstanbul', 'Şişli', '+90 212 345 6789', 41.0604, 28.9877, 18),
  ('ankara-kizilay', 'Glazed & Sipped Kızılay', 'Atatürk Bulvarı No:200', 'Ankara', 'Çankaya', '+90 312 456 7890', 39.9207, 32.8541, 20)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- SUBSCRIPTION PLANS (For reference in app)
-- starter: 6 donuts/month - 180 TL
-- classic: 12 donuts/month - 320 TL  
-- premium: 24 donuts/month - 580 TL
-- family: 48 donuts/month - 1000 TL
-- =============================================
