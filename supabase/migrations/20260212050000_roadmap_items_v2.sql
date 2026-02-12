-- Roadmap Items v2: tags, history, realtime
-- Adds multi-tag labels and activity history tracking

ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;

-- GIN index for tag searches
CREATE INDEX IF NOT EXISTS idx_roadmap_tags ON roadmap_items USING gin(tags);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE roadmap_items;
