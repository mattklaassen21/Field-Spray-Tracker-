/*
  # Add Project Configuration Table

  1. New Tables
    - `project_config` - Stores project-level configuration like URLs

  2. Security
    - Enable RLS
    - Only service role can read/write

  3. Initial Data
    - Insert default configuration
*/

-- Create config table
CREATE TABLE IF NOT EXISTS project_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_config ENABLE ROW LEVEL SECURITY;

-- Create policies (restrictive - only service role can access)
CREATE POLICY "Service role can read config"
  ON project_config
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage config"
  ON project_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert the edge function URL config
-- This will need to be updated with the actual project URL
INSERT INTO project_config (key, value)
VALUES ('edge_function_base_url', 'https://placeholder.supabase.co/functions/v1')
ON CONFLICT (key) DO NOTHING;

-- Update the check function to use the config table
CREATE OR REPLACE FUNCTION check_unviewed_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
  base_url text;
  function_url text;
BEGIN
  -- Get the base URL from config
  SELECT value INTO base_url
  FROM project_config
  WHERE key = 'edge_function_base_url';
  
  IF base_url IS NULL OR base_url = 'https://placeholder.supabase.co/functions/v1' THEN
    -- Skip if not configured yet
    RAISE NOTICE 'Edge function URL not configured. Skipping reminder check.';
    RETURN;
  END IF;
  
  function_url := base_url || '/send-reminder-notification';
  
  -- Make HTTP request to edge function
  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) INTO request_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send reminder notifications: %', SQLERRM;
END;
$$;
