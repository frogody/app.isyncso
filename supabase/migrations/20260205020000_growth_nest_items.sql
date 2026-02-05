-- Growth nest items linking table
-- Separate from nest_items because nest_items.nest_id FK references nests table,
-- but growth nests are in the growth_nests table.

CREATE TABLE IF NOT EXISTS public.growth_nest_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  growth_nest_id UUID NOT NULL REFERENCES public.growth_nests(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  item_order INTEGER DEFAULT 0,
  is_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gni_growth_nest ON public.growth_nest_items(growth_nest_id);
CREATE INDEX IF NOT EXISTS idx_gni_prospect ON public.growth_nest_items(prospect_id);

ALTER TABLE public.growth_nest_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.growth_nest_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read" ON public.growth_nest_items
  FOR SELECT TO authenticated USING (true);
