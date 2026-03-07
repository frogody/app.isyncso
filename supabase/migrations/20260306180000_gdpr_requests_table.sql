-- ============================================
-- GDPR Requests Audit Log
-- ============================================
-- Tracks all GDPR compliance requests from Shopify (and potentially other sources).
-- Required for audit trail and proving compliance within 30-day deadline.

CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('data_request', 'customer_redact', 'shop_redact')),
  source TEXT NOT NULL DEFAULT 'shopify',
  subject_email TEXT,
  subject_phone TEXT,
  external_request_id TEXT,
  shop_domain TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  due_by TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_company_id ON public.gdpr_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON public.gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_source ON public.gdpr_requests(source);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_due_by ON public.gdpr_requests(due_by) WHERE status = 'pending';

-- RLS
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;

-- Only service_role (edge functions) can write to this table.
-- Admins can read for audit purposes.
CREATE POLICY "Admins can view GDPR requests"
  ON public.gdpr_requests
  FOR SELECT
  TO authenticated
  USING (company_id = public.auth_company_id());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_gdpr_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gdpr_requests_updated_at
  BEFORE UPDATE ON public.gdpr_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gdpr_requests_updated_at();

COMMENT ON TABLE public.gdpr_requests IS 'Audit log for GDPR compliance requests from Shopify and other integrations';
