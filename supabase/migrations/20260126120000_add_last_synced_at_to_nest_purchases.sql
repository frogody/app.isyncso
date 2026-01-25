-- Add last_synced_at column to nest_purchases table
-- This tracks when the user last synced the nest data to their organization

ALTER TABLE public.nest_purchases
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing purchases to have last_synced_at equal to completed_at
UPDATE public.nest_purchases
SET last_synced_at = COALESCE(completed_at, purchased_at)
WHERE last_synced_at IS NULL;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_nest_purchases_last_synced
ON public.nest_purchases(nest_id, last_synced_at);

COMMENT ON COLUMN public.nest_purchases.last_synced_at IS
  'Timestamp of when the user last synced/refreshed the nest data to their organization';
