-- Add module column to enrich_workspaces to separate Raise from Growth workspaces
ALTER TABLE public.enrich_workspaces 
ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'raise' CHECK (module IN ('raise', 'growth'));

-- Create index for filtering by module
CREATE INDEX IF NOT EXISTS idx_enrich_workspaces_module ON public.enrich_workspaces(module);

-- Update existing workspaces to 'raise' (they were all created by Raise)
UPDATE public.enrich_workspaces SET module = 'raise' WHERE module IS NULL;
