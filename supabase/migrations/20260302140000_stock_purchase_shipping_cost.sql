-- Add shipping_cost column to stock_purchases for AI invoice extraction
-- Previously, shipping costs were misidentified as VAT because there was no field for them
ALTER TABLE public.stock_purchases ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(12,2) DEFAULT 0;
