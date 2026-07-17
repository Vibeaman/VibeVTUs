-- VibeVTU Database Schema
-- Version: 1.0.0
-- Description: Initial schema for VibeVTU VTU Reseller Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
    currency TEXT DEFAULT 'NGN',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('funding', 'purchase', 'withdrawal', 'refund', 'commission')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    reference TEXT UNIQUE NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data orders table
CREATE TABLE IF NOT EXISTS data_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    network TEXT NOT NULL CHECK (network IN ('mtn', 'airtel', 'glo', '9mobile')),
    phone_number TEXT NOT NULL,
    data_plan TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    provider_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Airtime orders table
CREATE TABLE IF NOT EXISTS airtime_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    network TEXT NOT NULL CHECK (network IN ('mtn', 'airtel', 'glo', '9mobile')),
    phone_number TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    provider_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'promo')),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bonus_paid BOOLEAN DEFAULT FALSE,
    bonus_amount DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_referral UNIQUE (referrer_id, referred_id),
    CONSTRAINT no_self_referral CHECK (referrer_id != referred_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Wallets indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Data orders indexes
CREATE INDEX IF NOT EXISTS idx_data_orders_user_id ON data_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_data_orders_transaction_id ON data_orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_data_orders_network ON data_orders(network);
CREATE INDEX IF NOT EXISTS idx_data_orders_status ON data_orders(status);
CREATE INDEX IF NOT EXISTS idx_data_orders_phone_number ON data_orders(phone_number);
CREATE INDEX IF NOT EXISTS idx_data_orders_created_at ON data_orders(created_at DESC);

-- Airtime orders indexes
CREATE INDEX IF NOT EXISTS idx_airtime_orders_user_id ON airtime_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_airtime_orders_transaction_id ON airtime_orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_airtime_orders_network ON airtime_orders(network);
CREATE INDEX IF NOT EXISTS idx_airtime_orders_status ON airtime_orders(status);
CREATE INDEX IF NOT EXISTS idx_airtime_orders_phone_number ON airtime_orders(phone_number);
CREATE INDEX IF NOT EXISTS idx_airtime_orders_created_at ON airtime_orders(created_at DESC);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- Referrals indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to handle new user wallet creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated_at triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_orders_updated_at
    BEFORE UPDATE ON data_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_airtime_orders_updated_at
    BEFORE UPDATE ON airtime_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create wallet for new users
CREATE TRIGGER on_new_user_create_wallet
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE airtime_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users RLS policies
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Service role can manage all users"
    ON users FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Wallets RLS policies
CREATE POLICY "Users can view their own wallet"
    ON wallets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all wallets"
    ON wallets FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Transactions RLS policies
CREATE POLICY "Users can view their own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all transactions"
    ON transactions FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Data orders RLS policies
CREATE POLICY "Users can view their own data orders"
    ON data_orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data orders"
    ON data_orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data orders"
    ON data_orders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all data orders"
    ON data_orders FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Airtime orders RLS policies
CREATE POLICY "Users can view their own airtime orders"
    ON airtime_orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own airtime orders"
    ON airtime_orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own airtime orders"
    ON airtime_orders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all airtime orders"
    ON airtime_orders FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Notifications RLS policies
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notifications"
    ON notifications FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Referrals RLS policies
CREATE POLICY "Users can view their referrals (as referrer)"
    ON referrals FOR SELECT
    USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view their referrals (as referred)"
    ON referrals FOR SELECT
    USING (auth.uid() = referred_id);

CREATE POLICY "Service role can manage all referrals"
    ON referrals FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- ADDITIONAL SECURITY MEASURES
-- ============================================

-- Prevent direct updates to balance (must go through transactions)
-- Comment out if you need direct wallet balance updates
-- CREATE POLICY "Prevent direct wallet balance updates"
--     ON wallets FOR UPDATE
--     USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'User accounts for VibeVTU platform';
COMMENT ON TABLE wallets IS 'User wallet balances for the VTU platform';
COMMENT ON TABLE transactions IS 'All financial transactions on the platform';
COMMENT ON TABLE data_orders IS 'Data purchase orders';
COMMENT ON TABLE airtime_orders IS 'Airtime purchase orders';
COMMENT ON TABLE notifications IS 'User notifications and alerts';
COMMENT ON TABLE referrals IS 'Referral tracking for user acquisition';
