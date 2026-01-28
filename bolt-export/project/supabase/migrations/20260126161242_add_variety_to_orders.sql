/*
  # Add Variety Column to Orders Table

  ## Overview
  Adds a variety field to track seed variety information for each order.

  ## Changes
  
  ### Modified Tables
  
  #### `orders`
  - Added `variety` (text) - Seed variety specification
    - Positioned after seed_type for logical field ordering
    - Not null with empty string default for consistency

  ## Notes
  - Uses IF NOT EXISTS pattern to safely add the column
  - Maintains compatibility with existing data
*/

-- Add variety column to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'variety'
  ) THEN
    ALTER TABLE orders ADD COLUMN variety text NOT NULL DEFAULT '';
  END IF;
END $$;