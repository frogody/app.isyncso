-- ============================================
-- Subscriptions Tracker - Add missing columns
-- Table existed but was missing category, website_url, tax fields
-- ============================================

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 21;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tax_mechanism TEXT DEFAULT 'standard_btw';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id ON public.subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
