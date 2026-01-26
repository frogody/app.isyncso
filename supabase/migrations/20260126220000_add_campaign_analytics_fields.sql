-- Migration: Add analytics fields for campaign performance tracking
-- Created: 2026-01-26
-- Description: Adds timestamp tracking and sentiment analysis for outreach tasks,
--              plus denormalized analytics on campaigns for performance dashboards

-- Add analytics fields to outreach_tasks
ALTER TABLE public.outreach_tasks
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS response_sentiment TEXT CHECK (response_sentiment IN ('positive', 'neutral', 'negative'));

-- Add campaign analytics summary (denormalized for performance)
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS analytics JSONB DEFAULT '{}'::jsonb;

-- Create index for analytics queries on outreach_tasks
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_campaign_status
ON public.outreach_tasks(campaign_id, status);

-- Create index for analytics queries by sent_at
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_sent_at
ON public.outreach_tasks(sent_at) WHERE sent_at IS NOT NULL;

-- Create index for analytics queries by responded_at
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_responded_at
ON public.outreach_tasks(responded_at) WHERE responded_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.outreach_tasks.sent_at IS 'Timestamp when the outreach message was actually sent';
COMMENT ON COLUMN public.outreach_tasks.responded_at IS 'Timestamp when the candidate responded';
COMMENT ON COLUMN public.outreach_tasks.response_sentiment IS 'AI-classified sentiment of candidate response: positive, neutral, or negative';
COMMENT ON COLUMN public.campaigns.analytics IS 'Denormalized analytics data for dashboard performance (response rates, timing metrics, etc.)';

-- Function to update sent_at when status changes to sent
CREATE OR REPLACE FUNCTION public.update_outreach_task_sent_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set sent_at when status changes to 'sent' and it wasn't already set
  IF NEW.status = 'sent' AND OLD.status != 'sent' AND NEW.sent_at IS NULL THEN
    NEW.sent_at = NOW();
  END IF;

  -- Set responded_at when status changes to 'replied' and it wasn't already set
  IF NEW.status = 'replied' AND OLD.status != 'replied' AND NEW.responded_at IS NULL THEN
    NEW.responded_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS outreach_task_timestamp_trigger ON public.outreach_tasks;
CREATE TRIGGER outreach_task_timestamp_trigger
  BEFORE UPDATE ON public.outreach_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_outreach_task_sent_at();

-- Function to update campaign analytics when outreach tasks change
CREATE OR REPLACE FUNCTION public.update_campaign_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id UUID;
  v_analytics JSONB;
  v_total_tasks INT;
  v_sent_tasks INT;
  v_replied_tasks INT;
  v_response_rate NUMERIC;
  v_avg_response_time INTERVAL;
  v_positive_responses INT;
  v_neutral_responses INT;
  v_negative_responses INT;
BEGIN
  -- Determine campaign_id from the changed row
  v_campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);

  IF v_campaign_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate analytics
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('sent', 'replied')),
    COUNT(*) FILTER (WHERE status = 'replied'),
    COUNT(*) FILTER (WHERE response_sentiment = 'positive'),
    COUNT(*) FILTER (WHERE response_sentiment = 'neutral'),
    COUNT(*) FILTER (WHERE response_sentiment = 'negative')
  INTO
    v_total_tasks,
    v_sent_tasks,
    v_replied_tasks,
    v_positive_responses,
    v_neutral_responses,
    v_negative_responses
  FROM public.outreach_tasks
  WHERE campaign_id = v_campaign_id;

  -- Calculate response rate
  v_response_rate := CASE
    WHEN v_sent_tasks > 0 THEN ROUND((v_replied_tasks::NUMERIC / v_sent_tasks) * 100, 1)
    ELSE 0
  END;

  -- Calculate average response time
  SELECT AVG(responded_at - sent_at)
  INTO v_avg_response_time
  FROM public.outreach_tasks
  WHERE campaign_id = v_campaign_id
    AND sent_at IS NOT NULL
    AND responded_at IS NOT NULL;

  -- Build analytics JSON
  v_analytics := jsonb_build_object(
    'total_tasks', v_total_tasks,
    'sent_tasks', v_sent_tasks,
    'replied_tasks', v_replied_tasks,
    'response_rate', v_response_rate,
    'avg_response_time_hours', EXTRACT(EPOCH FROM v_avg_response_time) / 3600,
    'sentiment', jsonb_build_object(
      'positive', v_positive_responses,
      'neutral', v_neutral_responses,
      'negative', v_negative_responses
    ),
    'last_updated', NOW()
  );

  -- Update campaign analytics
  UPDATE public.campaigns
  SET analytics = v_analytics
  WHERE id = v_campaign_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for automatic analytics updates
DROP TRIGGER IF EXISTS outreach_task_analytics_trigger ON public.outreach_tasks;
CREATE TRIGGER outreach_task_analytics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.outreach_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_analytics();
