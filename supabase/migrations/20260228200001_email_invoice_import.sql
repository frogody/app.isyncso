-- Email invoice auto-import tables
-- Supports Gmail (and future Outlook) auto-detection of invoice attachments

-- Email import configuration per company
CREATE TABLE IF NOT EXISTS public.email_import_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  provider TEXT NOT NULL DEFAULT 'gmail',
  connected_account_id TEXT,
  is_active BOOLEAN DEFAULT true,
  filter_senders TEXT[] DEFAULT '{}',
  filter_keywords TEXT[] DEFAULT '{invoice,factuur,rekening,nota,receipt,bon}',
  auto_process BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, provider)
);

-- Imported email invoices (tracks what we've already processed)
CREATE TABLE IF NOT EXISTS public.email_invoice_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email_message_id TEXT NOT NULL,
  email_subject TEXT,
  email_from TEXT,
  email_date TIMESTAMPTZ,
  attachment_filename TEXT,
  attachment_storage_path TEXT,
  status TEXT DEFAULT 'pending',
  expense_id UUID REFERENCES expenses(id),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, email_message_id, attachment_filename)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_import_settings_company ON public.email_import_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_email_invoice_imports_company ON public.email_invoice_imports(company_id);
CREATE INDEX IF NOT EXISTS idx_email_invoice_imports_status ON public.email_invoice_imports(status);
CREATE INDEX IF NOT EXISTS idx_email_invoice_imports_message_id ON public.email_invoice_imports(email_message_id);

-- RLS
ALTER TABLE public.email_import_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_invoice_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company email settings"
  ON public.email_import_settings
  FOR ALL TO authenticated
  USING (company_id = public.auth_company_id())
  WITH CHECK (company_id = public.auth_company_id());

CREATE POLICY "Users can view own company email imports"
  ON public.email_invoice_imports
  FOR ALL TO authenticated
  USING (company_id = public.auth_company_id())
  WITH CHECK (company_id = public.auth_company_id());
