CREATE TABLE IF NOT EXISTS public.business_pulse_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID NOT NULL,
  pulse_date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency INTEGER NOT NULL DEFAULT 5 CHECK (urgency BETWEEN 1 AND 10),
  impact INTEGER NOT NULL DEFAULT 5 CHECK (impact BETWEEN 1 AND 10),
  priority_score NUMERIC(5,2) GENERATED ALWAYS AS (urgency * impact / 10.0) STORED,
  source_modules TEXT[] NOT NULL DEFAULT '{}',
  action_label TEXT,
  action_url TEXT,
  action_data JSONB DEFAULT '{}',
  related_entity_ids UUID[] DEFAULT '{}',
  dismissed BOOLEAN DEFAULT false,
  acted_on BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pulse_date, item_type, title)
);

ALTER TABLE public.business_pulse_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pulse_select" ON public.business_pulse_items
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "pulse_update" ON public.business_pulse_items
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_pulse_user_date ON public.business_pulse_items(user_id, pulse_date DESC);
CREATE INDEX idx_pulse_priority ON public.business_pulse_items(priority_score DESC);
