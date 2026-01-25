-- Fix nest deletion cascade and add unique constraint for platform candidates

-- 1. Update foreign key on nest_purchases to cascade on delete
-- This allows deleting a nest even if it has purchases
ALTER TABLE nest_purchases DROP CONSTRAINT IF EXISTS nest_purchases_nest_id_fkey;
ALTER TABLE nest_purchases ADD CONSTRAINT nest_purchases_nest_id_fkey
  FOREIGN KEY (nest_id) REFERENCES nests(id) ON DELETE CASCADE;

-- 2. Add unique constraint on nest_items to prevent duplicate entries
-- (Already added via separate migration, included here for completeness)
ALTER TABLE public.nest_items
  DROP CONSTRAINT IF EXISTS nest_items_unique_candidate;
ALTER TABLE public.nest_items
  ADD CONSTRAINT nest_items_unique_candidate UNIQUE (nest_id, candidate_id);

-- 3. Add unique index for platform-owned candidates by linkedin_profile
-- This prevents duplicate platform candidates with the same LinkedIn URL
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_unique_linkedin_platform
  ON candidates (linkedin_profile)
  WHERE organization_id IS NULL AND linkedin_profile IS NOT NULL;

-- 4. Similarly add unique index for email on platform candidates
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_unique_email_platform
  ON candidates (email)
  WHERE organization_id IS NULL AND email IS NOT NULL;
