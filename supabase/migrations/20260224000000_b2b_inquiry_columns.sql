-- ---------------------------------------------------------------------------
-- Add missing columns to b2b_product_inquiries
-- The InquiryModal and B2BInquiryManager read/write these columns but they
-- weren't in the original CREATE TABLE migration.
-- ---------------------------------------------------------------------------

ALTER TABLE public.b2b_product_inquiries
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS preferred_contact TEXT DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS reply TEXT,
  ADD COLUMN IF NOT EXISTS replied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for admin search filters
CREATE INDEX IF NOT EXISTS idx_b2b_inquiries_client_name
  ON public.b2b_product_inquiries (client_name);
CREATE INDEX IF NOT EXISTS idx_b2b_inquiries_email
  ON public.b2b_product_inquiries (email);
