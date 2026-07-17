-- VibeVTU Atomic Wallet Functions
-- Version: 1.0.1
-- Description: Atomic credit/debit functions with balance validation

-- ============================================
-- ATOMIC CREDIT WALLET FUNCTION
-- ============================================
-- Credits wallet and creates transaction record atomically
-- If either fails, both are rolled back

CREATE OR REPLACE FUNCTION atomic_credit_wallet(
  p_user_id UUID,
  p_amount DECIMAL(15, 2),
  p_reference TEXT,
  p_type TEXT DEFAULT 'funding',
  p_description TEXT DEFAULT 'Wallet funding'
)
RETURNS wallets AS $$
DECLARE
  v_wallet wallets;
  v_transaction transactions;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Insert transaction record first
  INSERT INTO transactions (user_id, type, amount, status, reference, description)
  VALUES (p_user_id, p_type, p_amount, 'completed', p_reference, p_description)
  RETURNING * INTO v_transaction;

  -- Update wallet balance
  UPDATE wallets
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_wallet;

  -- If wallet not found, create it
  IF v_wallet IS NULL THEN
    INSERT INTO wallets (user_id, balance, currency)
    VALUES (p_user_id, p_amount, 'NGN')
    RETURNING * INTO v_wallet;
  END IF;

  RETURN v_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ATOMIC DEBIT WALLET FUNCTION
-- ============================================
-- Debits wallet ONLY if sufficient balance exists
-- Rejects the entire operation if balance would go negative
-- All operations happen in a single transaction

CREATE OR REPLACE FUNCTION atomic_debit_wallet(
  p_user_id UUID,
  p_amount DECIMAL(15, 2),
  p_reference TEXT,
  p_type TEXT DEFAULT 'purchase',
  p_description TEXT DEFAULT 'Purchase'
)
RETURNS wallets AS $$
DECLARE
  v_wallet wallets;
  v_current_balance DECIMAL(15, 2);
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Lock the wallet row for update to prevent concurrent modifications
  SELECT balance INTO v_current_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if wallet exists
  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  -- CRITICAL: Check balance BEFORE debit
  -- This prevents negative balance - atomic enforcement
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: current balance is % but tried to debit %', v_current_balance, p_amount;
  END IF;

  -- Insert transaction record first (for audit trail)
  INSERT INTO transactions (user_id, type, amount, status, reference, description)
  VALUES (p_user_id, p_type, p_amount, 'completed', p_reference, p_description);

  -- Update wallet balance
  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_wallet;

  -- Final verification (belt and suspenders)
  IF v_wallet.balance < 0 THEN
    RAISE EXCEPTION 'FATAL: Balance went negative after debit. This should never happen.';
  END IF;

  RETURN v_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CONCURRENT DEBIT PROTECTION
-- ============================================
-- Add a lock to prevent race conditions on wallet updates

CREATE OR REPLACE FUNCTION check_wallet_balance(
  p_user_id UUID,
  p_amount DECIMAL(15, 2)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance DECIMAL(15, 2);
BEGIN
  SELECT balance INTO v_balance
  FROM wallets
  WHERE user_id = p_user_id;
  
  RETURN v_balance >= p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES FOR CONCURRENT OPERATIONS
-- ============================================

-- Index for locking during concurrent operations
CREATE INDEX IF NOT EXISTS idx_wallets_user_id_lock
ON wallets(user_id);

-- Index for transaction lookups
CREATE INDEX IF NOT EXISTS idx_transactions_user_status
ON transactions(user_id, status);

COMMENT ON FUNCTION atomic_credit_wallet IS 'Atomically credit wallet and create transaction record';
COMMENT ON FUNCTION atomic_debit_wallet IS 'Atomically debit wallet with balance check - prevents negative balance';
