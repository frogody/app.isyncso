-- Add price entry mode to stock purchases
ALTER TABLE public.stock_purchases ADD COLUMN IF NOT EXISTS price_entry_mode TEXT DEFAULT 'excl' CHECK (price_entry_mode IN ('excl', 'incl'));

-- Add per-line tax tracking columns to line items
ALTER TABLE public.stock_purchase_line_items ADD COLUMN IF NOT EXISTS tax_rate_used DECIMAL(5,2);
ALTER TABLE public.stock_purchase_line_items ADD COLUMN IF NOT EXISTS unit_price_excl DECIMAL(12,4);
ALTER TABLE public.stock_purchase_line_items ADD COLUMN IF NOT EXISTS unit_price_incl DECIMAL(12,4);
ALTER TABLE public.stock_purchase_line_items ADD COLUMN IF NOT EXISTS line_total_excl DECIMAL(12,2);
ALTER TABLE public.stock_purchase_line_items ADD COLUMN IF NOT EXISTS line_total_incl DECIMAL(12,2);
ALTER TABLE public.stock_purchase_line_items ADD COLUMN IF NOT EXISTS remarks TEXT;
