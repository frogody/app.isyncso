-- Variable-amount subscriptions support
-- Adds columns to track subscriptions with varying amounts (e.g. telecom, utilities)

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS amount_type TEXT DEFAULT 'fixed' CHECK (amount_type IN ('fixed', 'variable')),
  ADD COLUMN IF NOT EXISTS estimated_amount NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS amount_history JSONB DEFAULT '[]'::jsonb;

-- amount_history stores: [{date: '2026-02-07', amount: 30.38}, {date: '2026-01-10', amount: 28.50}, ...]
-- estimated_amount is the rolling average of amount_history entries

COMMENT ON COLUMN public.subscriptions.amount_type IS 'fixed = same amount each cycle, variable = amount varies (telecom, utilities)';
COMMENT ON COLUMN public.subscriptions.estimated_amount IS 'Rolling average for variable subscriptions';
COMMENT ON COLUMN public.subscriptions.amount_history IS 'Array of {date, amount} for variable subscriptions (last 12 entries)';
