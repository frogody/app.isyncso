-- ============================================================
-- EMAIL POOL AUTO-SYNC SYSTEM
-- Tables: email_pool_accounts, email_pool_sync_log, supplier_email_patterns
-- Column additions to stock_purchases
-- RBAC permissions
-- ============================================================

-- ============================================================
-- 1. EMAIL POOL ACCOUNTS: Company-level email monitoring pool
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_pool_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

    -- Email identity
    email_address TEXT NOT NULL,
    display_name TEXT,
    label TEXT,

    -- Email provider
    provider TEXT NOT NULL DEFAULT 'gmail'
        CHECK (provider IN ('gmail', 'outlook')),

    -- Composio connection (OAuth)
    composio_connected_account_id TEXT,
    composio_trigger_subscription_id TEXT,
    toolkit_slug TEXT GENERATED ALWAYS AS (
        CASE provider WHEN 'gmail' THEN 'gmail' WHEN 'outlook' THEN 'outlook' END
    ) STORED,
    connection_status TEXT DEFAULT 'disconnected'
        CHECK (connection_status IN ('disconnected', 'connecting', 'connected', 'error', 'expired')),
    connection_error TEXT,

    -- Sync configuration
    is_active BOOLEAN DEFAULT true,
    auto_approve_orders BOOLEAN DEFAULT false,
    auto_approve_threshold DECIMAL(3,2) DEFAULT 0.90,
    sync_to_finance BOOLEAN DEFAULT false,
    default_sales_channel TEXT DEFAULT 'undecided'
        CHECK (default_sales_channel IN ('b2b', 'b2c', 'undecided')),

    -- Statistics
    total_emails_received INTEGER DEFAULT 0,
    total_orders_synced INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    last_email_at TIMESTAMPTZ,
    last_order_synced_at TIMESTAMPTZ,
    last_error_at TIMESTAMPTZ,

    -- Metadata
    connected_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, email_address)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_pool_company ON public.email_pool_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_email_pool_composio ON public.email_pool_accounts(composio_connected_account_id);
CREATE INDEX IF NOT EXISTS idx_email_pool_email ON public.email_pool_accounts(email_address);
CREATE INDEX IF NOT EXISTS idx_email_pool_active ON public.email_pool_accounts(company_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.email_pool_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_pool_accounts_select" ON public.email_pool_accounts
    FOR SELECT TO authenticated
    USING (company_id = public.auth_company_id());

CREATE POLICY "email_pool_accounts_insert" ON public.email_pool_accounts
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.auth_company_id());

CREATE POLICY "email_pool_accounts_update" ON public.email_pool_accounts
    FOR UPDATE TO authenticated
    USING (company_id = public.auth_company_id());

CREATE POLICY "email_pool_accounts_delete" ON public.email_pool_accounts
    FOR DELETE TO authenticated
    USING (company_id = public.auth_company_id());


-- ============================================================
-- 2. EMAIL POOL SYNC LOG: Every email processed by the pool
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_pool_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    email_pool_account_id UUID NOT NULL REFERENCES public.email_pool_accounts(id) ON DELETE CASCADE,

    -- Email metadata
    email_from TEXT,
    email_to TEXT,
    email_subject TEXT,
    email_snippet TEXT,
    email_body TEXT,
    email_date TIMESTAMPTZ,
    email_source_id TEXT,
    email_thread_id TEXT,

    -- Classification result
    classification TEXT
        CHECK (classification IN ('order_confirmation', 'shipping_update', 'return_notification', 'other', 'skipped', 'error')),
    classification_confidence DECIMAL(3,2),
    classification_method TEXT
        CHECK (classification_method IN ('pattern_match', 'ai', 'skipped')),

    -- Extraction result
    extracted_data JSONB,
    extraction_confidence DECIMAL(3,2),

    -- Link to created records
    stock_purchase_id UUID REFERENCES public.stock_purchases(id),
    expense_id UUID REFERENCES public.expenses(id),

    -- Processing status
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped', 'duplicate')),
    error_message TEXT,
    processing_time_ms INTEGER,

    -- Duplicate detection
    is_duplicate BOOLEAN DEFAULT false,
    duplicate_of_id UUID REFERENCES public.email_pool_sync_log(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_log_company ON public.email_pool_sync_log(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_account ON public.email_pool_sync_log(email_pool_account_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON public.email_pool_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_sync_log_classification ON public.email_pool_sync_log(classification);
CREATE INDEX IF NOT EXISTS idx_sync_log_created ON public.email_pool_sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_source ON public.email_pool_sync_log(email_source_id);

-- RLS
ALTER TABLE public.email_pool_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_pool_sync_log_select" ON public.email_pool_sync_log
    FOR SELECT TO authenticated
    USING (company_id = public.auth_company_id());

CREATE POLICY "email_pool_sync_log_insert" ON public.email_pool_sync_log
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.auth_company_id());

CREATE POLICY "email_pool_sync_log_update" ON public.email_pool_sync_log
    FOR UPDATE TO authenticated
    USING (company_id = public.auth_company_id());


-- ============================================================
-- 3. SUPPLIER EMAIL PATTERNS: Known sender patterns per supplier
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplier_email_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.vendors(id),

    -- Pattern matching
    supplier_name TEXT NOT NULL,
    sender_patterns TEXT[] NOT NULL DEFAULT '{}',
    subject_patterns TEXT[] NOT NULL DEFAULT '{}',
    country TEXT DEFAULT 'NL',
    default_sales_channel TEXT DEFAULT 'undecided'
        CHECK (default_sales_channel IN ('b2b', 'b2c', 'undecided')),

    -- AI extraction prompt override
    custom_extraction_hints TEXT,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, supplier_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplier_patterns_company ON public.supplier_email_patterns(company_id);

-- RLS
ALTER TABLE public.supplier_email_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_email_patterns_select" ON public.supplier_email_patterns
    FOR SELECT TO authenticated
    USING (company_id = public.auth_company_id());

CREATE POLICY "supplier_email_patterns_insert" ON public.supplier_email_patterns
    FOR INSERT TO authenticated
    WITH CHECK (company_id = public.auth_company_id());

CREATE POLICY "supplier_email_patterns_update" ON public.supplier_email_patterns
    FOR UPDATE TO authenticated
    USING (company_id = public.auth_company_id());

CREATE POLICY "supplier_email_patterns_delete" ON public.supplier_email_patterns
    FOR DELETE TO authenticated
    USING (company_id = public.auth_company_id());


-- ============================================================
-- 4. COLUMN ADDITIONS TO stock_purchases
-- ============================================================
ALTER TABLE public.stock_purchases ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'invoice', 'email_pool'));
ALTER TABLE public.stock_purchases ADD COLUMN IF NOT EXISTS email_pool_account_id UUID REFERENCES public.email_pool_accounts(id);
ALTER TABLE public.stock_purchases ADD COLUMN IF NOT EXISTS email_pool_sync_log_id UUID REFERENCES public.email_pool_sync_log(id);
ALTER TABLE public.stock_purchases ADD COLUMN IF NOT EXISTS order_url TEXT;
ALTER TABLE public.stock_purchases ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.stock_purchases ADD COLUMN IF NOT EXISTS country_of_purchase TEXT DEFAULT 'NL';


-- ============================================================
-- 5. RBAC PERMISSIONS
-- ============================================================
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
    ('email_pool.view', 'email_pool', 'view', 'View email pool settings and connected accounts'),
    ('email_pool.manage', 'email_pool', 'manage', 'Manage email pool connections and auto-sync settings')
ON CONFLICT (name) DO NOTHING;

-- Assign to super_admin and admin roles
DO $$
DECLARE
    v_super_admin_id UUID;
    v_admin_id UUID;
    v_perm_view_id UUID;
    v_perm_manage_id UUID;
BEGIN
    SELECT id INTO v_super_admin_id FROM public.rbac_roles WHERE name = 'super_admin' LIMIT 1;
    SELECT id INTO v_admin_id FROM public.rbac_roles WHERE name = 'admin' LIMIT 1;
    SELECT id INTO v_perm_view_id FROM public.rbac_permissions WHERE name = 'email_pool.view' LIMIT 1;
    SELECT id INTO v_perm_manage_id FROM public.rbac_permissions WHERE name = 'email_pool.manage' LIMIT 1;

    IF v_super_admin_id IS NOT NULL AND v_perm_view_id IS NOT NULL THEN
        INSERT INTO public.rbac_role_permissions (role_id, permission_id)
        VALUES (v_super_admin_id, v_perm_view_id), (v_super_admin_id, v_perm_manage_id)
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_admin_id IS NOT NULL AND v_perm_view_id IS NOT NULL THEN
        INSERT INTO public.rbac_role_permissions (role_id, permission_id)
        VALUES (v_admin_id, v_perm_view_id), (v_admin_id, v_perm_manage_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
