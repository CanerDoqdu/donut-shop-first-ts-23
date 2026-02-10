-- =============================================
-- FIX: Create missing tables for Auth flow
-- Run this in Supabase SQL Editor
-- =============================================

-- Create loyalty_points table if not exists
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  total_points INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0,
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')) DEFAULT 'bronze',
  tier_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create referral_codes table if not exists
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  uses_count INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 50,
  reward_points INTEGER DEFAULT 100,
  discount_percent INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create referrals table for tracking referral relationships
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'expired')) DEFAULT 'pending',
  reward_given BOOLEAN DEFAULT false,
  reward_amount INTEGER DEFAULT 100,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- Create points_transactions table for history
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('earned', 'redeemed', 'expired', 'bonus', 'referral')) NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Enable RLS on new tables
-- =============================================
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies for loyalty_points
-- =============================================
DROP POLICY IF EXISTS "Users can view own loyalty points" ON loyalty_points;
CREATE POLICY "Users can view own loyalty points" 
  ON loyalty_points FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage loyalty points" ON loyalty_points;
CREATE POLICY "Service role can manage loyalty points" 
  ON loyalty_points FOR ALL 
  USING (true);

-- =============================================
-- RLS Policies for referral_codes
-- =============================================
DROP POLICY IF EXISTS "Users can view own referral code" ON referral_codes;
CREATE POLICY "Users can view own referral code" 
  ON referral_codes FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view active referral codes" ON referral_codes;
CREATE POLICY "Anyone can view active referral codes" 
  ON referral_codes FOR SELECT 
  USING (is_active = true);

DROP POLICY IF EXISTS "Service role can manage referral codes" ON referral_codes;
CREATE POLICY "Service role can manage referral codes" 
  ON referral_codes FOR ALL 
  USING (true);

-- =============================================
-- RLS Policies for referrals
-- =============================================
DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
CREATE POLICY "Users can view own referrals" 
  ON referrals FOR SELECT 
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- =============================================
-- RLS Policies for points_transactions
-- =============================================
DROP POLICY IF EXISTS "Users can view own transactions" ON points_transactions;
CREATE POLICY "Users can view own transactions" 
  ON points_transactions FOR SELECT 
  USING (auth.uid() = user_id);

-- =============================================
-- Fix RLS for profiles table (allow insert during signup)
-- =============================================
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Service role full access to profiles" ON profiles;
CREATE POLICY "Service role full access to profiles" 
  ON profiles FOR ALL 
  USING (true);

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_id ON loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions(user_id);
