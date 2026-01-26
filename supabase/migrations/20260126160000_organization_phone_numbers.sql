-- Organization Phone Numbers - Purchased through iSyncSO
-- Numbers are owned by iSyncSO's master Twilio account, allocated to organizations

CREATE TABLE IF NOT EXISTS public.organization_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Phone number details
  phone_number TEXT NOT NULL UNIQUE, -- E.164 format: +1234567890
  friendly_name TEXT, -- User-assigned name like "Sales Line"

  -- Twilio identifiers (from iSyncSO's master account)
  twilio_sid TEXT NOT NULL, -- PN SID from Twilio
  twilio_account_sid TEXT NOT NULL, -- iSyncSO's master account

  -- Number capabilities
  capabilities JSONB DEFAULT '{"sms": true, "mms": false, "voice": false}'::jsonb,

  -- Location info
  country_code TEXT DEFAULT 'US',
  region TEXT, -- State/province
  locality TEXT, -- City

  -- Pricing (what we charge the org)
  monthly_cost_cents INTEGER DEFAULT 200, -- $2.00/month default
  setup_cost_cents INTEGER DEFAULT 100, -- $1.00 setup fee

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'released')),

  -- Usage tracking
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Billing
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  next_billing_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE public.organization_phone_numbers IS 'Phone numbers purchased by organizations through iSyncSO';
COMMENT ON COLUMN public.organization_phone_numbers.twilio_sid IS 'Twilio Phone Number SID (PN...) from master account';
COMMENT ON COLUMN public.organization_phone_numbers.monthly_cost_cents IS 'Monthly cost charged to organization in cents';

-- Enable RLS
ALTER TABLE public.organization_phone_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "org_phone_numbers_select" ON public.organization_phone_numbers
  FOR SELECT TO authenticated
  USING (organization_id = auth_company_id());

CREATE POLICY "org_phone_numbers_insert" ON public.organization_phone_numbers
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = auth_company_id());

CREATE POLICY "org_phone_numbers_update" ON public.organization_phone_numbers
  FOR UPDATE TO authenticated
  USING (organization_id = auth_company_id());

-- Note: Delete is not allowed via RLS - numbers must be released via edge function

-- Indexes
CREATE INDEX idx_org_phone_numbers_org ON public.organization_phone_numbers(organization_id);
CREATE INDEX idx_org_phone_numbers_status ON public.organization_phone_numbers(status);
CREATE INDEX idx_org_phone_numbers_number ON public.organization_phone_numbers(phone_number);

-- Trigger for updated_at
CREATE TRIGGER org_phone_numbers_updated_at
  BEFORE UPDATE ON public.organization_phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.organization_phone_numbers TO authenticated;
GRANT ALL ON public.organization_phone_numbers TO service_role;
