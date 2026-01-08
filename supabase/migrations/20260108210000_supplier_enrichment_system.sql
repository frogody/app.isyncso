-- Supplier Enrichment System
-- Automatically research and enrich supplier information from just a name

-- =============================================================================
-- EXTEND SUPPLIERS TABLE
-- =============================================================================

ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) CHECK (business_type IN ('retailer', 'wholesaler', 'marketplace', 'manufacturer', 'distributor', 'other')),
ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS kvk_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS country VARCHAR(2),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending_review'));

-- =============================================================================
-- SUPPLIER RESEARCH QUEUE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_research_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,

  -- Input data
  supplier_name VARCHAR(255) NOT NULL,
  hint_email VARCHAR(255),           -- Email from CSV can help identify domain
  hint_country VARCHAR(2),           -- Country hint for search

  -- Research status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'researching', 'completed', 'failed', 'manual_review')),
  research_attempts INTEGER DEFAULT 0,
  last_research_at TIMESTAMPTZ,
  error_message TEXT,

  -- Research results
  researched_website VARCHAR(255),
  researched_logo_url TEXT,
  researched_description TEXT,
  researched_business_type VARCHAR(50),
  researched_email VARCHAR(255),
  researched_phone VARCHAR(50),
  researched_address JSONB,
  researched_vat_number VARCHAR(50),
  researched_kvk_number VARCHAR(20),
  researched_country VARCHAR(2),
  research_confidence DECIMAL(3,2),
  research_source_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_research_queue_company ON public.supplier_research_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_research_queue_status ON public.supplier_research_queue(status);
CREATE INDEX IF NOT EXISTS idx_supplier_research_queue_supplier ON public.supplier_research_queue(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_research_queue_pending ON public.supplier_research_queue(status, created_at)
  WHERE status = 'pending';

-- RLS policies
ALTER TABLE public.supplier_research_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view supplier research queue for their company"
ON public.supplier_research_queue FOR SELECT
USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage supplier research queue for their company"
ON public.supplier_research_queue FOR ALL
USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- =============================================================================
-- FUNCTION: Process supplier research result
-- =============================================================================

CREATE OR REPLACE FUNCTION process_supplier_research_result(
  p_queue_id UUID,
  p_website VARCHAR DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_business_type VARCHAR DEFAULT NULL,
  p_email VARCHAR DEFAULT NULL,
  p_phone VARCHAR DEFAULT NULL,
  p_address JSONB DEFAULT NULL,
  p_vat_number VARCHAR DEFAULT NULL,
  p_kvk_number VARCHAR DEFAULT NULL,
  p_country VARCHAR DEFAULT NULL,
  p_confidence DECIMAL DEFAULT 0.8,
  p_source_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_queue_record RECORD;
  v_supplier_id UUID;
  v_contact JSONB;
BEGIN
  -- Get queue record
  SELECT * INTO v_queue_record FROM supplier_research_queue WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Queue record not found');
  END IF;

  v_supplier_id := v_queue_record.supplier_id;

  IF v_supplier_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No supplier_id linked to queue record');
  END IF;

  -- Build contact JSONB from email and phone
  v_contact := '{}'::jsonb;
  IF p_email IS NOT NULL THEN
    v_contact := v_contact || jsonb_build_object('email', p_email);
  END IF;
  IF p_phone IS NOT NULL THEN
    v_contact := v_contact || jsonb_build_object('phone', p_phone);
  END IF;

  -- Update supplier with enriched data (only fill in missing fields)
  UPDATE suppliers SET
    website = COALESCE(website, p_website),
    logo_url = COALESCE(logo_url, p_logo_url),
    description = COALESCE(description, p_description),
    business_type = COALESCE(business_type, p_business_type),
    vat_number = COALESCE(vat_number, p_vat_number),
    kvk_number = COALESCE(kvk_number, p_kvk_number),
    country = COALESCE(country, p_country),
    contact = CASE
      WHEN contact IS NULL OR contact = '{}'::jsonb THEN v_contact
      ELSE contact || v_contact
    END,
    address = CASE
      WHEN address IS NULL OR address = '{}'::jsonb THEN p_address
      ELSE address
    END,
    updated_at = NOW()
  WHERE id = v_supplier_id;

  -- Update queue record with research results
  UPDATE supplier_research_queue SET
    status = 'completed',
    researched_website = p_website,
    researched_logo_url = p_logo_url,
    researched_description = p_description,
    researched_business_type = p_business_type,
    researched_email = p_email,
    researched_phone = p_phone,
    researched_address = p_address,
    researched_vat_number = p_vat_number,
    researched_kvk_number = p_kvk_number,
    researched_country = p_country,
    research_confidence = p_confidence,
    research_source_url = p_source_url,
    updated_at = NOW()
  WHERE id = p_queue_id;

  RETURN jsonb_build_object(
    'success', true,
    'supplier_id', v_supplier_id,
    'confidence', p_confidence
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_supplier_research_result TO authenticated;
GRANT EXECUTE ON FUNCTION process_supplier_research_result TO service_role;

-- =============================================================================
-- TRIGGER: Update timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION update_supplier_research_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_supplier_research_queue_timestamp ON public.supplier_research_queue;
CREATE TRIGGER trigger_update_supplier_research_queue_timestamp
BEFORE UPDATE ON public.supplier_research_queue
FOR EACH ROW
EXECUTE FUNCTION update_supplier_research_queue_timestamp();
