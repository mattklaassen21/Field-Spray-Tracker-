/*
  # Add order creator tracking

  1. Changes
    - Add `created_by` column to orders table to track who created each order
    - Add `viewed_by` column to track who has viewed the order
    - Add `view_notified` column to prevent duplicate notifications

  2. Security
    - No RLS changes needed as existing policies cover this
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE orders ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'viewed_by'
  ) THEN
    ALTER TABLE orders ADD COLUMN viewed_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'view_notified'
  ) THEN
    ALTER TABLE orders ADD COLUMN view_notified boolean DEFAULT false;
  END IF;
END $$;
