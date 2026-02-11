-- ============================================================================
-- Phase 4: bol.com Retailer API Integration — Foundation
-- P4-1: bolcom_credentials
-- P4-2: bolcom_offer_mappings
-- P4-3: bolcom_pending_process_statuses
-- P4-8: shipments bol.com columns
-- ============================================================================

-- Ensure pgcrypto is available for credential encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- P4-1: bolcom_credentials — OAuth tokens per company
-- ============================================================================

CREATE TABLE IF NOT EXISTS bolcom_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id_encrypted TEXT NOT NULL,
    client_secret_encrypted TEXT NOT NULL,
    access_token TEXT,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    environment TEXT DEFAULT 'production' CHECK (environment IN ('production', 'test')),
    last_token_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, environment)
);

ALTER TABLE bolcom_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bolcom_credentials_select" ON bolcom_credentials
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "bolcom_credentials_insert" ON bolcom_credentials
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "bolcom_credentials_update" ON bolcom_credentials
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "bolcom_credentials_delete" ON bolcom_credentials
    FOR DELETE TO authenticated
    USING (company_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_bolcom_credentials_company ON bolcom_credentials(company_id);
CREATE INDEX IF NOT EXISTS idx_bolcom_credentials_active ON bolcom_credentials(company_id) WHERE is_active = true;

-- ============================================================================
-- Encryption helpers for bol.com credentials
-- The edge function sets app.bolcom_encryption_key via SET LOCAL before calling
-- ============================================================================

CREATE OR REPLACE FUNCTION encrypt_bolcom_credential(plaintext TEXT, encryption_key TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT encode(pgp_sym_encrypt(plaintext, encryption_key)::bytea, 'base64');
$$;

CREATE OR REPLACE FUNCTION decrypt_bolcom_credential(ciphertext TEXT, encryption_key TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT pgp_sym_decrypt(decode(ciphertext, 'base64')::bytea, encryption_key);
$$;

-- ============================================================================
-- P4-2: bolcom_offer_mappings — product-to-offer mapping
-- ============================================================================

CREATE TABLE IF NOT EXISTS bolcom_offer_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ean TEXT NOT NULL,
    bolcom_offer_id TEXT,
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    bolcom_stock_amount INTEGER,
    bolcom_stock_managed_by_retailer BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, ean)
);

ALTER TABLE bolcom_offer_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bolcom_offer_mappings_select" ON bolcom_offer_mappings
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "bolcom_offer_mappings_insert" ON bolcom_offer_mappings
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "bolcom_offer_mappings_update" ON bolcom_offer_mappings
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "bolcom_offer_mappings_delete" ON bolcom_offer_mappings
    FOR DELETE TO authenticated
    USING (company_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_bolcom_offer_company ON bolcom_offer_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_bolcom_offer_ean ON bolcom_offer_mappings(company_id, ean);
CREATE INDEX IF NOT EXISTS idx_bolcom_offer_product ON bolcom_offer_mappings(product_id);
CREATE INDEX IF NOT EXISTS idx_bolcom_offer_active ON bolcom_offer_mappings(company_id) WHERE is_active = true;

-- ============================================================================
-- P4-3: bolcom_pending_process_statuses — async process tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS bolcom_pending_process_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    process_status_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('replenishment', 'offer', 'stock_update', 'other')),
    entity_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failure', 'timeout')),
    result_data JSONB,
    error_message TEXT,
    poll_count INTEGER DEFAULT 0,
    max_polls INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    UNIQUE(company_id, process_status_id)
);

ALTER TABLE bolcom_pending_process_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bolcom_process_statuses_select" ON bolcom_pending_process_statuses
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "bolcom_process_statuses_insert" ON bolcom_pending_process_statuses
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "bolcom_process_statuses_update" ON bolcom_pending_process_statuses
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "bolcom_process_statuses_delete" ON bolcom_pending_process_statuses
    FOR DELETE TO authenticated
    USING (company_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_bolcom_process_company ON bolcom_pending_process_statuses(company_id);
CREATE INDEX IF NOT EXISTS idx_bolcom_process_pending ON bolcom_pending_process_statuses(company_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_bolcom_process_entity ON bolcom_pending_process_statuses(entity_type, entity_id);

-- ============================================================================
-- P4-8: Add bol.com replenishment columns to shipments
-- ============================================================================

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS bol_replenishment_id TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS bol_replenishment_state TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS bol_labels_url TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS bol_received_quantities JSONB;

CREATE INDEX IF NOT EXISTS idx_shipments_bol_replenishment ON shipments(bol_replenishment_id) WHERE bol_replenishment_id IS NOT NULL;
