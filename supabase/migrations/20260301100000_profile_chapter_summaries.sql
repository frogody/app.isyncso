-- Add chapter narrative summary columns to user_profile_biography
-- These fields store LLM-generated rich narratives for each profile chapter

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profile_biography' AND column_name = 'social_circle_summary') THEN
    ALTER TABLE public.user_profile_biography ADD COLUMN social_circle_summary TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profile_biography' AND column_name = 'digital_life_summary') THEN
    ALTER TABLE public.user_profile_biography ADD COLUMN digital_life_summary TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profile_biography' AND column_name = 'client_world_summary') THEN
    ALTER TABLE public.user_profile_biography ADD COLUMN client_world_summary TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profile_biography' AND column_name = 'interests_summary') THEN
    ALTER TABLE public.user_profile_biography ADD COLUMN interests_summary TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profile_biography' AND column_name = 'daily_rhythms_summary') THEN
    ALTER TABLE public.user_profile_biography ADD COLUMN daily_rhythms_summary TEXT;
  END IF;
END $$;
