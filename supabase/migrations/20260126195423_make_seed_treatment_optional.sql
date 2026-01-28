/*
  # Make seed treatment optional

  1. Changes
    - Make `seed_treatment` nullable in both `orders` and `order_items` tables
    - Seed treatment is only required for soybeans, not other seed types
  
  2. Tables Modified
    - `orders`: Change `seed_treatment` to allow NULL
    - `order_items`: Change `seed_treatment` to allow NULL
*/

-- Make seed_treatment nullable in orders table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'seed_treatment' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE orders ALTER COLUMN seed_treatment DROP NOT NULL;
  END IF;
END $$;

-- Make seed_treatment nullable in order_items table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'seed_treatment' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE order_items ALTER COLUMN seed_treatment DROP NOT NULL;
  END IF;
END $$;
