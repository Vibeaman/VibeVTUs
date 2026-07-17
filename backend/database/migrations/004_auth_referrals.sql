-- VibeVTU Auth & Referrals
-- Version: 1.0.3
-- Description: Add profiles table for user data and referrals table for referral tracking

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Stores additional user profile data linked to auth.users

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick referral code lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- ============================================
-- REFERRALS TABLE
-- ============================================
-- Tracks referral relationships between users

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  referred_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  reward_credited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Prevent duplicate referrals
  CONSTRAINT unique_referral_pair UNIQUE (referrer_id, referred_id)
);

-- Indexes for referral queries
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- ============================================
-- TRIGGER: Auto-create profile on user signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  referral_code_text VARCHAR(20);
BEGIN
  -- Generate referral code from user ID
  referral_code_text := 'VIBE' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 4));
  
  -- Create profile
  INSERT INTO profiles (user_id, referral_code)
  VALUES (NEW.id, referral_code_text)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create wallet with zero balance
  INSERT INTO wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Record referral if code was used
  IF NEW.raw_user_meta_data->>'referral_code_used' IS NOT NULL THEN
    INSERT INTO referrals (referrer_id, referred_id, referral_code, referred_email)
    SELECT 
      p.user_id,
      NEW.id,
      NEW.raw_user_meta_data->>'referral_code_used',
      NEW.email
    FROM profiles p
    WHERE p.referral_code = NEW.raw_user_meta_data->>'referral_code_used'
    ON CONFLICT (referrer_id, referred_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_profile();

-- ============================================
-- TRIGGER: Update updated_at on profile changes
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Credit referral reward
-- ============================================
-- Called when a referred user makes their first successful purchase

CREATE OR REPLACE FUNCTION credit_referral_reward(
  p_referred_id UUID,
  p_reward_amount DECIMAL DEFAULT 100.00
)
RETURNS BOOLEAN AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
BEGIN
  -- Find the pending referral
  SELECT id, referrer_id INTO v_referral_id, v_referrer_id
  FROM referrals
  WHERE referred_id = p_referred_id 
    AND status = 'pending'
    AND reward_credited = FALSE
  FOR UPDATE;
  
  -- If no pending referral, exit
  IF v_referral_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Credit referrer's wallet
  UPDATE wallets 
  SET balance = balance + p_reward_amount
  WHERE user_id = v_referrer_id;
  
  -- Update referral status
  UPDATE referrals
  SET 
    status = 'completed',
    reward_credited = TRUE,
    completed_at = NOW()
  WHERE id = v_referral_id;
  
  -- Log the transaction
  INSERT INTO transactions (user_id, type, amount, status, reference, description)
  VALUES (
    v_referrer_id,
    'referral_bonus',
    p_reward_amount,
    'completed',
    'REF_' || v_referral_id,
    'Referral bonus for successful signup'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Referrals: Users can only see their own referrals
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id);

COMMENT ON TABLE profiles IS 'Extended user profile data';
COMMENT ON TABLE referrals IS 'Referral tracking and rewards';
COMMENT ON FUNCTION credit_referral_reward IS 'Credits referral bonus to referrer when referred user completes first purchase';
