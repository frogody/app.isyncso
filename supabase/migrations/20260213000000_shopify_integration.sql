-- ============================================================================
-- Shopify Admin API Integration
-- SH-1: shopify_credentials
-- SH-2: shopify_product_mappings
-- SH-3: sales_orders Shopify columns
-- SH-4: inventory + products Shopify columns
-- ============================================================================

-- ============================================================================
-- SH-1: shopify_credentials — OAuth tokens per company
-- Shopify tokens are permanent (no refresh needed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS shopify_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Store identity
    shop_domain TEXT NOT NULL,
    shop_name TEXT,

    -- OAuth token (permanent, encrypted)
    access_token_encrypted TEXT,
    scopes TEXT[],

    -- Configuration
    primary_location_id TEXT,
    auto_sync_orders BOOLEAN DEFAULT true,
    auto_sync_inventory BOOLEAN DEFAULT true,
    auto_fulfill BOOLEAN DEFAULT false,
    sync_frequency_minutes INTEGER DEFAULT 15,

    -- Status
    status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
    last_sync_at TIMESTAMPTZ,
    last_order_sync_at TIMESTAMPTZ,
    last_inventory_sync_at TIMESTAMPTZ,
    last_error TEXT,

    -- Webhook management
    webhook_ids JSONB DEFAULT '[]'::jsonb,

    -- OAuth state (temporary, used during connection flow)
    oauth_state TEXT,

    -- Metadata
    connected_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, shop_domain)
);

ALTER TABLE shopify_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopify_credentials_select" ON shopify_credentials
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "shopify_credentials_insert" ON shopify_credentials
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "shopify_credentials_update" ON shopify_credentials
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "shopify_credentials_delete" ON shopify_credentials
    FOR DELETE TO authenticated
    USING (company_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_shopify_credentials_company ON shopify_credentials(company_id);
CREATE INDEX IF NOT EXISTS idx_shopify_credentials_active ON shopify_credentials(company_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shopify_credentials_domain ON shopify_credentials(shop_domain);

-- ============================================================================
-- Encryption helpers for Shopify token
-- Reuses pgcrypto extension (already created by bolcom migration)
-- ============================================================================

CREATE OR REPLACE FUNCTION encrypt_shopify_credential(plaintext TEXT, encryption_key TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public, extensions AS $$
    SELECT encode(pgp_sym_encrypt(plaintext, encryption_key)::bytea, 'base64');
$$;

CREATE OR REPLACE FUNCTION decrypt_shopify_credential(ciphertext TEXT, encryption_key TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public, extensions AS $$
    SELECT pgp_sym_decrypt(decode(ciphertext, 'base64')::bytea, encryption_key);
$$;

-- ============================================================================
-- SH-2: shopify_product_mappings — product-to-Shopify-variant mapping
-- ============================================================================

CREATE TABLE IF NOT EXISTS shopify_product_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Shopify IDs
    shopify_product_id BIGINT NOT NULL,
    shopify_variant_id BIGINT,
    shopify_inventory_item_id BIGINT,

    -- Mapping metadata
    matched_by TEXT DEFAULT 'ean' CHECK (matched_by IN ('ean', 'sku', 'manual', 'auto_created')),
    shopify_product_title TEXT,
    shopify_variant_title TEXT,
    shopify_sku TEXT,

    -- Sync state
    is_active BOOLEAN DEFAULT true,
    sync_inventory BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    shopify_stock_level INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, shopify_variant_id)
);

ALTER TABLE shopify_product_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopify_mappings_select" ON shopify_product_mappings
    FOR SELECT TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "shopify_mappings_insert" ON shopify_product_mappings
    FOR INSERT TO authenticated
    WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "shopify_mappings_update" ON shopify_product_mappings
    FOR UPDATE TO authenticated
    USING (company_id = get_user_company_id());

CREATE POLICY "shopify_mappings_delete" ON shopify_product_mappings
    FOR DELETE TO authenticated
    USING (company_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_shopify_mappings_company ON shopify_product_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_shopify_mappings_product ON shopify_product_mappings(product_id);
CREATE INDEX IF NOT EXISTS idx_shopify_mappings_shopify_product ON shopify_product_mappings(shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_shopify_mappings_shopify_variant ON shopify_product_mappings(company_id, shopify_variant_id);
CREATE INDEX IF NOT EXISTS idx_shopify_mappings_active ON shopify_product_mappings(company_id) WHERE is_active = true;

-- ============================================================================
-- SH-3: Add Shopify columns to sales_orders
-- ============================================================================

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS shopify_order_id BIGINT;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS shopify_order_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_orders_shopify_order
    ON sales_orders(company_id, shopify_order_id) WHERE shopify_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_orders_source ON sales_orders(company_id, source);

-- ============================================================================
-- SH-4: Add Shopify columns to inventory and products
-- ============================================================================

ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity_external_shopify INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shopify_listed BOOLEAN DEFAULT false;

-- ============================================================================
-- RBAC PERMISSIONS
-- ============================================================================

INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES
    ('shopify.view', 'shopify', 'view', 'View Shopify integration settings and product mappings'),
    ('shopify.manage', 'shopify', 'manage', 'Manage Shopify connection, sync products, and configure settings')
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
    SELECT id INTO v_perm_view_id FROM public.rbac_permissions WHERE name = 'shopify.view' LIMIT 1;
    SELECT id INTO v_perm_manage_id FROM public.rbac_permissions WHERE name = 'shopify.manage' LIMIT 1;

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
