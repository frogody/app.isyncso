-- =====================================================
-- ENRICHMENT CREDIT SYSTEM
-- Configurable pricing + transaction tracking
-- =====================================================

-- 1. Enrichment pricing configuration
CREATE TABLE IF NOT EXISTS enrichment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL,
  credits INTEGER NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing
INSERT INTO enrichment_config (key, credits, label, description, display_order) VALUES
  ('linkedin_enrich', 5, 'LinkedIn Enrichment', 'Contact info, skills, work history, education, certifications', 1),
  ('sync_intel', 10, 'SYNC Intelligence', 'Company intelligence + AI-powered candidate analysis', 2),
  ('full_package', 12, 'Full Package', 'All enrichments combined - LinkedIn + Company + AI Analysis', 3)
ON CONFLICT (key) DO UPDATE SET
  credits = EXCLUDED.credits,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

-- 2. Credit transaction history
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  organization_id UUID,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  enrichment_type VARCHAR(50),
  reference_type VARCHAR(50),
  reference_id UUID,
  reference_name VARCHAR(255),
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_date
  ON credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_org_date
  ON credit_transactions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type
  ON credit_transactions(transaction_type, created_at DESC);

-- 3. RLS Policies
ALTER TABLE enrichment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read enrichment config" ON enrichment_config;
CREATE POLICY "Anyone can read enrichment config"
  ON enrichment_config FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can modify enrichment config" ON enrichment_config;
CREATE POLICY "Admins can modify enrichment config"
  ON enrichment_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (role IN ('admin', 'super_admin') OR is_super_admin = true)
    )
  );

DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all transactions" ON credit_transactions;
CREATE POLICY "Admins can view all transactions"
  ON credit_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (role IN ('admin', 'super_admin') OR is_super_admin = true)
    )
  );

DROP POLICY IF EXISTS "System can insert transactions" ON credit_transactions;
CREATE POLICY "System can insert transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (true);

-- 4. Credit deduction function with transaction logging
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type VARCHAR(50),
  p_enrichment_type VARCHAR(50) DEFAULT NULL,
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_name VARCHAR(255) DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_org_id UUID;
BEGIN
  -- Get current balance and org with row lock
  SELECT credits, organization_id INTO v_current_balance, v_org_id
  FROM users WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT false, 0, 'User not found'::TEXT;
    RETURN;
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT false, v_current_balance,
      format('Insufficient credits. Required: %s, Available: %s', p_amount, v_current_balance)::TEXT;
    RETURN;
  END IF;

  v_new_balance := v_current_balance - p_amount;
  UPDATE users SET credits = v_new_balance, updated_at = NOW() WHERE id = p_user_id;

  INSERT INTO credit_transactions (
    user_id, organization_id, amount, balance_after,
    transaction_type, enrichment_type, reference_type, reference_id, reference_name, description
  ) VALUES (
    p_user_id, v_org_id, -p_amount, v_new_balance,
    p_transaction_type, p_enrichment_type, p_reference_type, p_reference_id, p_reference_name, p_description
  );

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$$;

-- 5. Add credits function (for top-ups and admin adjustments)
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type VARCHAR(50),
  p_description TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, error_message TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_org_id UUID;
BEGIN
  SELECT credits, organization_id INTO v_current_balance, v_org_id
  FROM users WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT false, 0, 'User not found'::TEXT;
    RETURN;
  END IF;

  v_new_balance := v_current_balance + p_amount;
  UPDATE users SET credits = v_new_balance, updated_at = NOW() WHERE id = p_user_id;

  INSERT INTO credit_transactions (
    user_id, organization_id, amount, balance_after,
    transaction_type, description, created_by
  ) VALUES (
    p_user_id, v_org_id, p_amount, v_new_balance,
    p_transaction_type, p_description, p_created_by
  );

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION deduct_credits TO authenticated;
GRANT EXECUTE ON FUNCTION add_credits TO authenticated;
