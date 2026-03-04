-- Add web-originated action support to pending_actions
-- Allows the web app to insert suggestions that the desktop receives via Realtime

ALTER TABLE pending_actions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'desktop';
ALTER TABLE pending_actions ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE pending_actions ADD COLUMN IF NOT EXISTS entity_type TEXT;

COMMENT ON COLUMN pending_actions.source IS 'Origin: desktop (MLX detection) or web_intelligence (cloud-side detection)';
COMMENT ON COLUMN pending_actions.entity_id IS 'Reference to related business object (invoice ID, deal ID, task ID)';
COMMENT ON COLUMN pending_actions.entity_type IS 'Type of business object: invoice, deal, task, email, calendar_event';
