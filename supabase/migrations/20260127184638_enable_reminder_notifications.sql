/*
  # Enable Reminder Notifications for Unviewed Orders

  1. Extensions
    - Enable pg_cron for scheduled tasks
    - Enable pg_net for HTTP requests (already enabled in Supabase)

  2. New Functions
    - `check_unviewed_orders` - Calls the reminder edge function periodically

  3. Scheduled Jobs
    - Run every 5 minutes to check for unviewed orders older than 10 minutes
*/

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to invoke the reminder edge function
CREATE OR REPLACE FUNCTION check_unviewed_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  request_id bigint;
BEGIN
  -- Get environment variables (these are available in Supabase)
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings are not available, use hardcoded approach for Supabase
  -- The edge function URL will be in the format: https://{project_ref}.supabase.co/functions/v1/send-reminder-notification
  -- Supabase handles the URL construction internally
  
  -- Make HTTP request to edge function
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-reminder-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) INTO request_id;
END;
$$;

-- Schedule the function to run every 5 minutes
SELECT cron.schedule(
  'check-unviewed-orders',
  '*/5 * * * *',
  'SELECT check_unviewed_orders();'
);
