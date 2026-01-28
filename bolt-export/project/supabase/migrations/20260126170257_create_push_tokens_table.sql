/*
  # Create Push Tokens Table

  1. New Tables
    - `push_tokens`
      - `id` (uuid, primary key) - Unique identifier for the token
      - `user_id` (uuid, foreign key) - References auth.users
      - `token` (text) - Expo push token
      - `device_info` (text) - Optional device information
      - `created_at` (timestamp) - When the token was registered
      - `updated_at` (timestamp) - When the token was last updated

  2. Security
    - Enable RLS on `push_tokens` table
    - Add policy for authenticated users to manage their own tokens
    
  3. Indexes
    - Add index on user_id for faster lookups
    - Add unique constraint on token to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  device_info text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own push tokens"
  ON push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own push tokens"
  ON push_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens"
  ON push_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens"
  ON push_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens(user_id);