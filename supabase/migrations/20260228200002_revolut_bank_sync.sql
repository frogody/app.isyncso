-- Revolut Business API bank sync
-- Stores connection credentials and sync state for auto-fetching transactions

CREATE TABLE IF NOT EXISTS public.bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts(id),
  provider TEXT NOT NULL DEFAULT 'revolut',
  -- Revolut OAuth
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  client_id TEXT,
  -- Sync state
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  sync_frequency TEXT DEFAULT 'daily',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, provider)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_connections_company ON public.bank_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_active ON public.bank_connections(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company bank connections"
  ON public.bank_connections
  FOR ALL TO authenticated
  USING (company_id = public.auth_company_id())
  WITH CHECK (company_id = public.auth_company_id());

-- Add import_source column to bank_transactions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bank_transactions' AND column_name = 'import_source'
  ) THEN
    ALTER TABLE public.bank_transactions ADD COLUMN import_source TEXT DEFAULT 'csv';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bank_transactions' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE public.bank_transactions ADD COLUMN external_id TEXT;
  END IF;
END $$;

-- Unique constraint on external_id to prevent duplicate imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transactions_external_id
  ON public.bank_transactions(external_id) WHERE external_id IS NOT NULL;
