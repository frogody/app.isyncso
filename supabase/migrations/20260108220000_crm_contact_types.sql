-- CRM Contact Types Enhancement
-- Adds contact_type field and additional fields for different contact categories

-- =============================================================================
-- EXTEND PROSPECTS TABLE WITH CONTACT TYPE
-- =============================================================================

-- Add contact_type column to categorize contacts
ALTER TABLE public.prospects
ADD COLUMN IF NOT EXISTS contact_type VARCHAR(20) DEFAULT 'prospect'
CHECK (contact_type IN ('lead', 'prospect', 'customer', 'partner', 'candidate', 'target'));

-- Add additional fields for different contact types
ALTER TABLE public.prospects
ADD COLUMN IF NOT EXISTS lifetime_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS contract_date DATE,
ADD COLUMN IF NOT EXISTS renewal_date DATE,
ADD COLUMN IF NOT EXISTS partnership_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS candidate_status VARCHAR(30) CHECK (candidate_status IN ('new', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn')),
ADD COLUMN IF NOT EXISTS target_priority VARCHAR(20) CHECK (target_priority IN ('high', 'medium', 'low'));

-- Index for filtering by contact type
CREATE INDEX IF NOT EXISTS idx_prospects_contact_type ON public.prospects(contact_type);
CREATE INDEX IF NOT EXISTS idx_prospects_owner_contact_type ON public.prospects(owner_id, contact_type);

-- =============================================================================
-- CONTACT IMPORT QUEUE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contact_import_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Import session tracking
  import_session_id UUID NOT NULL,
  row_index INTEGER NOT NULL,

  -- Raw data from CSV/XLSX
  raw_data JSONB NOT NULL,

  -- Mapped fields
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  company_name VARCHAR(255),
  job_title VARCHAR(100),
  location VARCHAR(255),
  contact_type VARCHAR(20) DEFAULT 'lead',
  source VARCHAR(50),
  notes TEXT,
  deal_value DECIMAL(12,2),
  website VARCHAR(255),
  linkedin_url VARCHAR(255),
  custom_fields JSONB,

  -- Processing status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'duplicate', 'skipped')),
  created_contact_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  duplicate_of_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  error_message TEXT,
  validation_errors JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_import_queue_session ON public.contact_import_queue(import_session_id);
CREATE INDEX IF NOT EXISTS idx_contact_import_queue_status ON public.contact_import_queue(status);
CREATE INDEX IF NOT EXISTS idx_contact_import_queue_company ON public.contact_import_queue(company_id);

-- RLS policies
ALTER TABLE public.contact_import_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contact import queue for their company"
ON public.contact_import_queue FOR SELECT
USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage contact import queue for their company"
ON public.contact_import_queue FOR ALL
USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================================================
-- FUNCTION: Process contact import row
-- =============================================================================

CREATE OR REPLACE FUNCTION process_contact_import_row(
  p_queue_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_queue_record RECORD;
  v_existing_contact_id UUID;
  v_new_contact_id UUID;
  v_owner_id UUID;
BEGIN
  -- Get queue record
  SELECT * INTO v_queue_record FROM contact_import_queue WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Queue record not found');
  END IF;

  -- Get owner_id from company (use first admin/user)
  SELECT u.id INTO v_owner_id
  FROM users u
  WHERE u.company_id = v_queue_record.company_id
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    UPDATE contact_import_queue SET
      status = 'failed',
      error_message = 'No user found for company',
      processed_at = NOW()
    WHERE id = p_queue_id;
    RETURN jsonb_build_object('success', false, 'error', 'No user found for company');
  END IF;

  -- Check for duplicate by email
  IF v_queue_record.email IS NOT NULL THEN
    SELECT id INTO v_existing_contact_id
    FROM prospects
    WHERE email = v_queue_record.email
    AND owner_id = v_owner_id;
  END IF;

  IF v_existing_contact_id IS NOT NULL THEN
    -- Mark as duplicate
    UPDATE contact_import_queue SET
      status = 'duplicate',
      duplicate_of_id = v_existing_contact_id,
      processed_at = NOW()
    WHERE id = p_queue_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'duplicate',
      'existing_id', v_existing_contact_id
    );
  END IF;

  -- Create new contact
  INSERT INTO prospects (
    owner_id,
    first_name,
    last_name,
    email,
    phone,
    company,
    job_title,
    location,
    contact_type,
    source,
    notes,
    deal_value,
    website,
    linkedin_url,
    stage,
    created_date
  ) VALUES (
    v_owner_id,
    v_queue_record.first_name,
    v_queue_record.last_name,
    v_queue_record.email,
    v_queue_record.phone,
    v_queue_record.company_name,
    v_queue_record.job_title,
    v_queue_record.location,
    COALESCE(v_queue_record.contact_type, 'lead'),
    COALESCE(v_queue_record.source, 'import'),
    v_queue_record.notes,
    v_queue_record.deal_value,
    v_queue_record.website,
    v_queue_record.linkedin_url,
    'new',
    NOW()
  ) RETURNING id INTO v_new_contact_id;

  -- Update queue record
  UPDATE contact_import_queue SET
    status = 'completed',
    created_contact_id = v_new_contact_id,
    processed_at = NOW()
  WHERE id = p_queue_id;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'created',
    'contact_id', v_new_contact_id
  );

EXCEPTION WHEN OTHERS THEN
  UPDATE contact_import_queue SET
    status = 'failed',
    error_message = SQLERRM,
    processed_at = NOW()
  WHERE id = p_queue_id;

  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_contact_import_row TO authenticated;
GRANT EXECUTE ON FUNCTION process_contact_import_row TO service_role;

-- =============================================================================
-- CONTACT TYPE STATISTICS VIEW
-- =============================================================================

CREATE OR REPLACE VIEW contact_type_stats AS
SELECT
  p.owner_id,
  p.contact_type,
  COUNT(*) as count,
  COUNT(CASE WHEN p.stage = 'won' THEN 1 END) as won_count,
  SUM(COALESCE(p.deal_value, 0)) as total_deal_value,
  AVG(COALESCE(p.probability, 50)) as avg_score
FROM prospects p
GROUP BY p.owner_id, p.contact_type;
