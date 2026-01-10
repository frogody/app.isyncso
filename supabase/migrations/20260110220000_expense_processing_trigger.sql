-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create trigger function to process expenses asynchronously
CREATE OR REPLACE FUNCTION trigger_expense_processing()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
BEGIN
  -- Only trigger for new expenses with processing status
  IF (TG_OP = 'INSERT' AND NEW.status = 'processing') OR
     (TG_OP = 'UPDATE' AND OLD.status != 'processing' AND NEW.status = 'processing') THEN

    -- Get the Supabase URL and service role key from environment
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-invoice';
    service_role_key := current_setting('app.settings.service_role_key', true);

    -- If settings not available, try to construct from SUPABASE_URL env
    IF function_url IS NULL OR function_url = '' THEN
      function_url := 'https://' || current_setting('app.settings.project_ref', true) || '.supabase.co/functions/v1/process-invoice';
    END IF;

    -- Call process-invoice edge function asynchronously via pg_net
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        '_mode', 'process',
        '_expenseId', NEW.id,
        '_imageUrl', NEW.original_file_url,
        'companyId', NEW.company_id
      )
    ) INTO request_id;

    RAISE LOG 'Triggered async processing for expense % with request_id %', NEW.id, request_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on expenses table
DROP TRIGGER IF EXISTS expense_processing_trigger ON expenses;
CREATE TRIGGER expense_processing_trigger
  AFTER INSERT OR UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_expense_processing();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, service_role;
GRANT EXECUTE ON FUNCTION net.http_post TO postgres, service_role;

-- Store settings in a way accessible to the trigger
-- These will be set by environment variables or updated manually
DO $$
BEGIN
  -- Create settings table if it doesn't exist
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Insert default values (will need to be updated with actual values)
  INSERT INTO app_settings (key, value)
  VALUES
    ('supabase_url', 'https://sfxpmzicgpaxfntqleig.supabase.co'),
    ('project_ref', 'sfxpmzicgpaxfntqleig')
  ON CONFLICT (key) DO NOTHING;
END $$;

-- Function to get app settings
CREATE OR REPLACE FUNCTION get_app_setting(setting_key TEXT)
RETURNS TEXT AS $$
  SELECT value FROM app_settings WHERE key = setting_key;
$$ LANGUAGE SQL STABLE;

-- Update trigger function to use app_settings table
CREATE OR REPLACE FUNCTION trigger_expense_processing()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
  service_role_key TEXT;
  request_id BIGINT;
  project_ref TEXT;
BEGIN
  -- Only trigger for new expenses with processing status
  IF (TG_OP = 'INSERT' AND NEW.status = 'processing') OR
     (TG_OP = 'UPDATE' AND OLD.status != 'processing' AND NEW.status = 'processing') THEN

    -- Get settings from app_settings table
    SELECT value INTO project_ref FROM app_settings WHERE key = 'project_ref';
    SELECT value INTO service_role_key FROM app_settings WHERE key = 'service_role_key';

    -- Construct function URL
    function_url := 'https://' || project_ref || '.supabase.co/functions/v1/process-invoice';

    -- Call process-invoice edge function asynchronously via pg_net
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        '_mode', 'process',
        '_expenseId', NEW.id,
        '_imageUrl', NEW.original_file_url,
        'companyId', NEW.company_id
      ),
      timeout_milliseconds := 90000
    ) INTO request_id;

    RAISE LOG 'Triggered async processing for expense % with request_id %', NEW.id, request_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_expense_processing() IS 'Automatically triggers invoice processing edge function when expense status is set to processing';
COMMENT ON TRIGGER expense_processing_trigger ON expenses IS 'Calls process-invoice edge function for automatic invoice extraction and product creation';
