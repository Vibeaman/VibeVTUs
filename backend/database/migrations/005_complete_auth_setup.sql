-- ============================================
-- COMPLETE AUTH SETUP FOR VIBEVTU
-- Run this AFTER dropping existing tables
-- ============================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Update wallets to use auth.users
DROP TABLE IF EXISTS wallets CASCADE;
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
  currency TEXT DEFAULT 'NGN',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update transactions to use auth.users
DROP TABLE IF EXISTS transactions CASCADE;
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('funding', 'purchase', 'airtime_purchase', 'data_purchase', 'withdrawal', 'refund', 'referral_bonus', 'commission')),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'failed-refunded', 'cancelled')),
  reference TEXT UNIQUE NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Update referrals table
DROP TABLE IF EXISTS referrals CASCADE;
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  referred_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  reward_credited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT unique_referral_pair UNIQUE (referrer_id, referred_id)
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- 6. Trigger: Auto-create profile + wallet on signup
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(20);
BEGIN
  new_code := 'VIBE' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 4));
  
  INSERT INTO profiles (user_id, referral_code)
  VALUES (NEW.id, new_code)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  IF NEW.raw_user_meta_data->>'referral_code_used' IS NOT NULL THEN
    INSERT INTO referrals (referrer_id, referred_id, referral_code, referred_email)
    SELECT p.user_id, NEW.id, NEW.raw_user_meta_data->>'referral_code_used', NEW.email
    FROM profiles p
    WHERE p.referral_code = NEW.raw_user_meta_data->>'referral_code_used'
    ON CONFLICT (referrer_id, referred_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

-- 7. Trigger: Update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 8. Function: Credit referral reward
CREATE OR REPLACE FUNCTION credit_referral_reward(p_referred_id UUID, p_reward_amount DECIMAL DEFAULT 100.00)
RETURNS BOOLEAN AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
BEGIN
  SELECT id, referrer_id INTO v_referral_id, v_referrer_id
  FROM referrals
  WHERE referred_id = p_referred_id AND status = 'pending' AND reward_credited = FALSE
  FOR UPDATE;
  
  IF v_referral_id IS NULL THEN RETURN FALSE; END IF;
  
  UPDATE wallets SET balance = balance + p_reward_amount WHERE user_id = v_referrer_id;
  
  UPDATE referrals SET status = 'completed', reward_credited = TRUE, completed_at = NOW()
  WHERE id = v_referral_id;
  
  INSERT INTO transactions (user_id, type, amount, status, reference, description)
  VALUES (v_referrer_id, 'referral_bonus', p_reward_amount, 'completed',
          'REF_' || v_referral_id, 'Referral bonus for successful signup');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function: Atomic credit wallet
CREATE OR REPLACE FUNCTION atomic_credit_wallet(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reference TEXT,
  p_type TEXT,
  p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_new_balance DECIMAL;
BEGIN
  UPDATE wallets SET balance = balance + p_amount WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS v_new_balance = ROW_COUNT;
  
  IF v_new_balance = 0 THEN
    INSERT INTO wallets (user_id, balance) VALUES (p_user_id, p_amount);
    v_new_balance := p_amount;
  ELSE
    SELECT balance INTO v_new_balance FROM wallets WHERE user_id = p_user_id;
  END IF;
  
  INSERT INTO transactions (user_id, type, amount, status, reference, description)
  VALUES (p_user_id, p_type, p_amount, 'completed', p_reference, p_description);
  
  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function: Atomic debit wallet
CREATE OR REPLACE FUNCTION atomic_debit_wallet(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reference TEXT,
  p_type TEXT,
  p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
BEGIN
  SELECT balance INTO v_current_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  UPDATE wallets SET balance = balance - p_amount WHERE user_id = p_user_id;
  SELECT balance INTO v_new_balance FROM wallets WHERE user_id = p_user_id;
  
  INSERT INTO transactions (user_id, type, amount, status, reference, description)
  VALUES (p_user_id, p_type, p_amount, 'completed', p_reference, p_description);
  
  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own referrals" ON referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
