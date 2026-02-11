-- Fix receiving_log FK to receiving_sessions: add ON DELETE SET NULL
-- so that deleting a session doesn't cascade-delete receiving logs
ALTER TABLE receiving_log DROP CONSTRAINT IF EXISTS receiving_log_receiving_session_id_fkey;
ALTER TABLE receiving_log ADD CONSTRAINT receiving_log_receiving_session_id_fkey
  FOREIGN KEY (receiving_session_id) REFERENCES receiving_sessions(id) ON DELETE SET NULL;
