-- =====================================================
-- FULL CREDIT SYSTEM - Expands existing enrichment_config
-- to cover ALL billable actions across the platform
-- =====================================================

-- 1. Create comprehensive credit_action_costs table
-- (enrichment_config stays for backward compatibility)
CREATE TABLE IF NOT EXISTS credit_action_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key VARCHAR(80) UNIQUE NOT NULL,
  credits_required INTEGER NOT NULL DEFAULT 1,
  label VARCHAR(150) NOT NULL,
  description TEXT,
  category VARCHAR(30) NOT NULL DEFAULT 'ai',
  tier VARCHAR(10) NOT NULL DEFAULT 'medium',  -- 'high', 'medium', 'low', 'free'
  is_active BOOLEAN DEFAULT true,
  is_per_unit BOOLEAN DEFAULT false,           -- true = credits x quantity (e.g. per image, per minute)
  unit_label VARCHAR(30),                       -- e.g. 'image', 'minute', 'message'
  min_credits INTEGER DEFAULT 0,                -- for dynamic pricing: floor
  max_credits INTEGER DEFAULT 0,                -- for dynamic pricing: ceiling (0 = no cap)
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_action_costs_key ON credit_action_costs(action_key);
CREATE INDEX IF NOT EXISTS idx_credit_action_costs_category ON credit_action_costs(category);

-- 2. Seed ALL action costs from the cost report
INSERT INTO credit_action_costs (action_key, credits_required, label, description, category, tier, is_per_unit, unit_label, display_order) VALUES
  -- AI Chat & Assistants
  ('sync-chat',                  1,  'SYNC Agent Chat',           'AI assistant message',                        'ai',           'medium',  false, NULL,      10),
  ('sync-voice-minute',          3,  'SYNC Voice Mode',           'AI voice conversation per minute',            'ai',           'medium',  true,  'minute',  11),
  ('commander-chat',             1,  'Commander Chat',            'Commander AI message',                        'ai',           'medium',  false, NULL,      12),
  ('smart-compose',              1,  'Smart Compose',             'AI reply suggestion',                         'ai',           'medium',  false, NULL,      13),
  ('raise-chat',                 1,  'Raise AI Chat',             'Growth AI assistant message',                 'ai',           'medium',  false, NULL,      14),
  ('growth-ai-execute',          1,  'Growth AI Execute',         'Growth AI action execution',                  'ai',           'medium',  false, NULL,      15),
  ('enhance-prompt',             1,  'Enhance Prompt',            'AI prompt improvement',                       'ai',           'medium',  false, NULL,      16),
  ('store-builder-ai',           1,  'Store Builder AI',          'AI store building action',                    'ai',           'medium',  false, NULL,      17),

  -- Image Generation
  ('generate-image-schnell',     1,  'Quick Draft Image',         'Fast FLUX Schnell image generation',          'image',        'medium',  false, NULL,      20),
  ('generate-image-pro',         3,  'Pro Image',                 'FLUX Pro image generation',                   'image',        'medium',  false, NULL,      21),
  ('generate-image-kontext',     3,  'Kontext Image',             'FLUX Kontext image edit/generation',          'image',        'medium',  false, NULL,      22),
  ('generate-image-kontext-max', 5,  'Kontext Max Image',         'FLUX Kontext Max premium generation',         'image',        'medium',  false, NULL,      23),
  ('fashion-booth',              5,  'Fashion Booth',             'AI fashion try-on pipeline',                  'image',        'high',    false, NULL,      24),
  ('outfit-extractor',           3,  'Outfit Extractor',          'Extract outfit from image',                   'image',        'medium',  false, NULL,      25),
  ('reach-generate-ad-image',    3,  'Ad Image',                  'Marketing ad image generation',               'image',        'medium',  false, NULL,      26),

  -- Video Generation
  ('generate-video',            50,  'AI Video (Veo)',            'Google Veo video generation (~10s)',           'video',        'high',    false, NULL,      30),
  ('generate-fashion-video',    30,  'Fashion Video',             'Fashion video generation (Veo)',               'video',        'high',    false, NULL,      31),
  ('generate-shot',              8,  'Video Shot',                'Single video shot (fal.ai)',                   'video',        'high',    false, NULL,      32),
  ('generate-storyboard',       1,  'Storyboard',                'AI storyboard generation',                    'video',        'medium',  false, NULL,      33),
  ('assemble-video',            5,  'Assemble Video',            'Combine shots into final video',               'video',        'high',    false, NULL,      34),
  ('generate-podcast',          5,  'Podcast',                   'AI podcast generation (LLM + TTS)',            'video',        'high',    false, NULL,      35),

  -- Studio
  ('studio-photoshoot-per-image', 3, 'Studio Photoshoot Image',  'Per image in photoshoot batch',               'studio',       'high',    true,  'image',   40),
  ('studio-regenerate-shot',      3, 'Studio Regenerate Shot',   'Regenerate a studio shot',                    'studio',       'medium',  false, NULL,      41),

  -- Content Generation
  ('generate-listing-copy',      2,  'Listing Copy',             'Product listing copywriting',                 'content',      'medium',  false, NULL,      50),
  ('generate-social-post',       1,  'Social Post',              'AI social media post generation',             'content',       'medium',  false, NULL,      51),
  ('generate-daily-journal',     1,  'Daily Journal',            'AI daily journal generation',                 'content',       'medium',  false, NULL,      52),
  ('reach-generate-copy',        2,  'Marketing Copy',           'Marketing copy generation',                   'content',       'medium',  false, NULL,      53),
  ('reach-generate-ad-copy',     2,  'Ad Copy',                  'Advertising copy generation',                 'content',       'medium',  false, NULL,      54),
  ('reach-generate-insights',    1,  'Marketing Insights',       'AI marketing insights',                       'content',       'medium',  false, NULL,      55),
  ('reach-seo-scan',             2,  'SEO Scan',                 'Website SEO analysis',                        'content',       'medium',  false, NULL,      56),
  ('reach-analyze-brand-voice',  3,  'Brand Voice Analysis',     'AI brand voice analysis (Claude)',             'content',       'medium',  false, NULL,      57),

  -- Enrichment & Intelligence
  ('explorium-enrich',           5,  'Contact Enrichment',       'Explorium prospect/contact enrichment',       'enrichment',    'high',    false, NULL,      60),
  ('company-intelligence',      15,  'Company Intelligence',     'Full company intelligence (9x Explorium)',    'enrichment',    'high',    false, NULL,      61),
  ('candidate-intelligence',     1,  'Candidate Intelligence',   'AI candidate analysis',                       'enrichment',    'medium',  false, NULL,      62),
  ('auto-enrich-company',        3,  'Auto Enrich Company',      'Automatic company enrichment',                'enrichment',    'medium',  false, NULL,      63),

  -- Research
  ('research-product',           2,  'Product Research',         'Tavily + AI product research',                'research',      'medium',  false, NULL,      70),
  ('research-supplier',          2,  'Supplier Research',        'Tavily + AI supplier research',               'research',      'medium',  false, NULL,      71),
  ('research-demo-prospect',     3,  'Prospect Research',        'Tavily + Explorium prospect research',        'research',      'medium',  false, NULL,      72),

  -- Talent & Recruitment
  ('analyze-campaign-match',     2,  'AI Matching',              'AI candidate-campaign matching',              'talent',        'medium',  false, NULL,      80),
  ('generate-outreach-message',  1,  'Outreach Message',         'AI outreach message generation',              'talent',        'medium',  false, NULL,      81),
  ('execute-talent-outreach',    1,  'Talent Outreach',          'Execute talent outreach action',              'talent',        'medium',  false, NULL,      82),

  -- Knowledge & Documents
  ('embed-document',             1,  'Embed Document',           'Document embedding for RAG',                  'knowledge',     'medium',  false, NULL,      90),
  ('scrape-embed',               2,  'Scrape & Embed',           'Scrape URL and create embeddings',            'knowledge',     'medium',  false, NULL,      91),
  ('scrape-product-url',         1,  'Scrape Product URL',       'Scrape product information from URL',         'knowledge',     'medium',  false, NULL,      92),

  -- Communication
  ('sms-send',                   1,  'Send SMS',                 'Send SMS via Twilio',                         'communication', 'low',     false, NULL,      100),
  ('sms-ai-respond',             1,  'AI SMS Response',          'AI-powered SMS auto-response',                'communication', 'low',     false, NULL,      101),
  ('voice-call-minute',          1,  'Voice Call',               'VoIP call per minute',                        'communication', 'low',     true,  'minute',  102),
  ('scheduling-call',            5,  'AI Scheduling Call',       'AI-powered scheduling phone call',            'communication', 'medium',  false, NULL,      103),
  ('transcribe-audio-minute',    1,  'Audio Transcription',      'Audio transcription per minute',              'communication', 'low',     true,  'minute',  104),
  ('reach-publish-post',         1,  'Publish Social Post',      'Publish post via Composio',                   'communication', 'low',     false, NULL,      105),

  -- Invoice & Finance
  ('process-invoice',            1,  'Process Invoice',          'AI invoice processing',                       'finance',       'medium',  false, NULL,      110),
  ('smart-import-invoice',       1,  'Smart Import Invoice',     'AI invoice import',                           'finance',       'medium',  false, NULL,      111),

  -- Compliance & Learning
  ('analyze-ai-system',          2,  'AI System Analysis',       'Sentinel AI system analysis',                 'compliance',    'medium',  false, NULL,      120),
  ('personalize-course',         1,  'Personalize Course',       'AI course personalization',                   'learning',      'medium',  false, NULL,      121),

  -- Data Import / Mapping
  ('map-import-columns',         1,  'Map Import Columns',       'AI column mapping for data import',           'data',          'low',     false, NULL,      130),
  ('map-contact-columns',        1,  'Map Contact Columns',      'AI contact column mapping',                   'data',          'low',     false, NULL,      131),

  -- Workflow Automation
  ('execute-ai-node',            1,  'AI Flow Node',             'Execute AI node in workflow',                 'automation',    'medium',  false, NULL,      140),

  -- Meeting & Digest
  ('sync-meeting-wrapup',        1,  'Meeting Wrap-up',          'AI meeting summary and action items',         'ai',            'medium',  false, NULL,      150),
  ('digest-channel',             1,  'Channel Digest',           'AI channel digest summary',                   'ai',            'medium',  false, NULL,      151),
  ('audit-listing',              1,  'Audit Listing',            'AI product listing audit',                    'content',       'medium',  false, NULL,      152),
  ('plan-listing-fix',           1,  'Plan Listing Fix',         'AI listing fix plan',                         'content',       'medium',  false, NULL,      153)

ON CONFLICT (action_key) DO UPDATE SET
  credits_required = EXCLUDED.credits_required,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  tier = EXCLUDED.tier,
  is_per_unit = EXCLUDED.is_per_unit,
  unit_label = EXCLUDED.unit_label,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- 3. Add category + tier index on credit_transactions for analytics
CREATE INDEX IF NOT EXISTS idx_credit_transactions_edge_fn
  ON credit_transactions(edge_function);

-- 4. Add edge_function column to credit_transactions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_transactions' AND column_name = 'edge_function'
  ) THEN
    ALTER TABLE credit_transactions ADD COLUMN edge_function VARCHAR(80);
  END IF;
END $$;

-- 5. Add action_key column to credit_transactions for linking to credit_action_costs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_transactions' AND column_name = 'action_key'
  ) THEN
    ALTER TABLE credit_transactions ADD COLUMN action_key VARCHAR(80);
  END IF;
END $$;

-- 6. Add metadata jsonb column to credit_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_transactions' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE credit_transactions ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- 7. RLS for credit_action_costs
ALTER TABLE credit_action_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read action costs" ON credit_action_costs;
CREATE POLICY "Anyone can read action costs"
  ON credit_action_costs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can modify action costs" ON credit_action_costs;
CREATE POLICY "Admins can modify action costs"
  ON credit_action_costs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (role IN ('admin', 'super_admin') OR is_super_admin = true)
    )
  );

-- 8. Enhanced deduct_credits function with action_key tracking
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type VARCHAR(50),
  p_enrichment_type VARCHAR(50) DEFAULT NULL,
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_name VARCHAR(255) DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_action_key VARCHAR(80) DEFAULT NULL,
  p_edge_function VARCHAR(80) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
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
    transaction_type, enrichment_type, reference_type, reference_id,
    reference_name, description, action_key, edge_function, metadata
  ) VALUES (
    p_user_id, v_org_id, -p_amount, v_new_balance,
    p_transaction_type, p_enrichment_type, p_reference_type, p_reference_id,
    p_reference_name, p_description, p_action_key, p_edge_function, p_metadata
  );

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$$;

-- 9. Helper function: check credits without deducting (for pre-flight checks)
CREATE OR REPLACE FUNCTION check_credits(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS TABLE(has_enough BOOLEAN, current_balance INTEGER, required INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT credits INTO v_balance FROM users WHERE id = p_user_id;

  IF v_balance IS NULL THEN
    RETURN QUERY SELECT false, 0, p_amount;
    RETURN;
  END IF;

  RETURN QUERY SELECT (v_balance >= p_amount), v_balance, p_amount;
END;
$$;

-- 10. Helper function: get action cost by key
CREATE OR REPLACE FUNCTION get_action_cost(p_action_key VARCHAR(80))
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost INTEGER;
BEGIN
  SELECT credits_required INTO v_cost
  FROM credit_action_costs
  WHERE action_key = p_action_key AND is_active = true;

  RETURN COALESCE(v_cost, 0);
END;
$$;

-- 11. Grant permissions
GRANT EXECUTE ON FUNCTION check_credits TO authenticated;
GRANT EXECUTE ON FUNCTION get_action_cost TO authenticated;
GRANT SELECT ON credit_action_costs TO authenticated;
GRANT SELECT ON credit_action_costs TO anon;
