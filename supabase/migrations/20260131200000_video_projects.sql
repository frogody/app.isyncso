-- Video Projects & Shots for AI Video Studio
-- Multi-shot cinematic video generation with storyboard planning

CREATE TABLE IF NOT EXISTS public.video_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  brief TEXT,
  storyboard JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','storyboarding','generating','assembling','completed','failed')),
  settings JSONB DEFAULT '{}'::jsonb,
  product_id UUID,
  brand_context JSONB,
  final_video_url TEXT,
  final_thumbnail_url TEXT,
  shotstack_render_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.video_projects(id) ON DELETE CASCADE,
  shot_number INT NOT NULL DEFAULT 0,
  description TEXT,
  prompt TEXT,
  model TEXT DEFAULT 'kling',
  duration_seconds FLOAT DEFAULT 5,
  camera_direction TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','generating','completed','failed','retrying')),
  video_url TEXT,
  thumbnail_url TEXT,
  fal_request_id TEXT,
  generation_config JSONB DEFAULT '{}'::jsonb,
  retry_count INT DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_video_projects_company ON public.video_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_video_projects_created_by ON public.video_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_video_projects_status ON public.video_projects(status);
CREATE INDEX IF NOT EXISTS idx_video_shots_project ON public.video_shots(project_id);
CREATE INDEX IF NOT EXISTS idx_video_shots_status ON public.video_shots(status);

-- RLS
ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_shots ENABLE ROW LEVEL SECURITY;

-- video_projects policies
CREATE POLICY "video_projects_select" ON public.video_projects
  FOR SELECT TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "video_projects_insert" ON public.video_projects
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.auth_company_id());

CREATE POLICY "video_projects_update" ON public.video_projects
  FOR UPDATE TO authenticated
  USING (company_id = public.auth_company_id());

CREATE POLICY "video_projects_delete" ON public.video_projects
  FOR DELETE TO authenticated
  USING (company_id = public.auth_company_id());

-- video_shots policies (via project company)
CREATE POLICY "video_shots_select" ON public.video_shots
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.video_projects vp
    WHERE vp.id = video_shots.project_id
    AND vp.company_id = public.auth_company_id()
  ));

CREATE POLICY "video_shots_insert" ON public.video_shots
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.video_projects vp
    WHERE vp.id = video_shots.project_id
    AND vp.company_id = public.auth_company_id()
  ));

CREATE POLICY "video_shots_update" ON public.video_shots
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.video_projects vp
    WHERE vp.id = video_shots.project_id
    AND vp.company_id = public.auth_company_id()
  ));

CREATE POLICY "video_shots_delete" ON public.video_shots
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.video_projects vp
    WHERE vp.id = video_shots.project_id
    AND vp.company_id = public.auth_company_id()
  ));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_video_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_video_projects_updated
  BEFORE UPDATE ON public.video_projects
  FOR EACH ROW EXECUTE FUNCTION update_video_updated_at();

CREATE TRIGGER trg_video_shots_updated
  BEFORE UPDATE ON public.video_shots
  FOR EACH ROW EXECUTE FUNCTION update_video_updated_at();
