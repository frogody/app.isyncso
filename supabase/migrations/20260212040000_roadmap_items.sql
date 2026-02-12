-- Roadmap Items table
-- Persistent feature request board with conversation support
-- Used by admin UI + Claude Code "roadmap mode"

CREATE TABLE IF NOT EXISTS roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core fields
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'planned', 'in_progress', 'review', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category TEXT DEFAULT 'other',

  -- Planning fields
  assignee TEXT DEFAULT NULL,           -- agent id (e.g., 'S1', 'S2') or user name
  effort TEXT DEFAULT NULL              -- t-shirt sizing
    CHECK (effort IN ('xs', 's', 'm', 'l', 'xl', NULL)),
  target_date DATE DEFAULT NULL,        -- when this should be done

  -- Subtasks (checklist)
  subtasks JSONB DEFAULT '[]'::jsonb,   -- [{text, done, added_by, completed_at}]

  -- File references
  files_affected TEXT[] DEFAULT '{}',   -- which files this will touch

  -- Dependencies
  depends_on UUID[] DEFAULT '{}',       -- other roadmap_item ids that must complete first
  blocks UUID[] DEFAULT '{}',           -- roadmap_item ids blocked by this

  -- Conversation
  comments JSONB DEFAULT '[]'::jsonb,   -- [{content, author, created_at}]

  -- Orchestra integration
  orchestra_task_id TEXT DEFAULT NULL,   -- link to .orchestra/ task id (e.g., 'T015')

  -- Metadata
  created_by TEXT DEFAULT 'user',       -- 'user' or 'claude'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_roadmap_status ON roadmap_items(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_priority ON roadmap_items(priority);
CREATE INDEX IF NOT EXISTS idx_roadmap_category ON roadmap_items(category);

-- RLS: admin-only access
ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roadmap_admin_all" ON roadmap_items
  FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_roadmap_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roadmap_items_updated_at
  BEFORE UPDATE ON roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION update_roadmap_updated_at();
