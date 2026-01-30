-- Render Jobs table for video rendering queue
CREATE TABLE IF NOT EXISTS render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  user_id UUID REFERENCES auth.users(id),
  template_id TEXT NOT NULL,
  template_props JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'rendering', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  output_url TEXT,
  error_message TEXT,
  width INTEGER NOT NULL DEFAULT 1920,
  height INTEGER NOT NULL DEFAULT 1080,
  fps INTEGER NOT NULL DEFAULT 30,
  duration_frames INTEGER NOT NULL DEFAULT 150,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies using auth_company_id() helper
CREATE POLICY "render_jobs_select" ON render_jobs
  FOR SELECT TO authenticated
  USING (company_id = auth_company_id());

CREATE POLICY "render_jobs_insert" ON render_jobs
  FOR INSERT TO authenticated
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "render_jobs_update" ON render_jobs
  FOR UPDATE TO authenticated
  USING (company_id = auth_company_id());

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_render_jobs_company_status ON render_jobs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_render_jobs_user ON render_jobs(user_id);
