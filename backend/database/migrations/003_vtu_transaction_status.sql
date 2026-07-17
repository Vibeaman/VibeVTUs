-- VibeVTU VTU Transaction Status
-- Version: 1.0.2
-- Description: Add failed-refunded status for VTU transactions

-- Add failed-refunded as a valid status
-- Note: If you're using an enum, you'll need to alter it
-- If using text type, this is just for documentation

-- Example: Add to your transactions table if using enum:
-- ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'failed-refunded';

-- Create index for VTU transactions
CREATE INDEX IF NOT EXISTS idx_transactions_type_status 
ON transactions(type, status);

-- Index for quick lookup of pending transactions
CREATE INDEX IF NOT EXISTS idx_transactions_pending 
ON transactions(status) 
WHERE status = 'pending';

-- Index for VTU operation logs
CREATE INDEX IF NOT EXISTS idx_transactions_vtu_reference 
ON transactions(reference) 
WHERE type IN ('airtime_purchase', 'data_purchase');

-- Function to get failed transactions that need manual review
CREATE OR REPLACE FUNCTION get_transactions_needing_review()
RETURNS SETOF transactions AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM transactions
  WHERE metadata->>'needs_manual_review' = 'true'
    OR (status = 'pending' AND created_at < NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_transactions_needing_review IS 'Returns transactions that failed refund or have been pending for over an hour';
