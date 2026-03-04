-- Activity Intelligence RPCs for DesktopActivity Intelligence tab charts
-- These power the pie chart (distribution) and area chart (timeline)

CREATE OR REPLACE FUNCTION public.get_activity_type_distribution(p_user_id UUID)
RETURNS TABLE(activity_type TEXT, count BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT activity_type, COUNT(*) AS count
  FROM semantic_activities
  WHERE user_id = p_user_id
  GROUP BY activity_type
  ORDER BY count DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_activity_hourly_timeline(p_user_id UUID)
RETURNS TABLE(hour INT, activity_type TEXT, count BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXTRACT(HOUR FROM created_at)::INT AS hour,
         activity_type,
         COUNT(*) AS count
  FROM semantic_activities
  WHERE user_id = p_user_id
  GROUP BY hour, activity_type
  ORDER BY hour, activity_type;
$$;
