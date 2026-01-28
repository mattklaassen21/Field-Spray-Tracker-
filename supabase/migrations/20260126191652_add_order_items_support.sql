/*
  # Add support for multiple varieties and seed treatments

  1. Changes
    - Create new `order_items` table to store multiple variety/treatment combinations per order
    - Each order can have multiple items (one-to-many relationship)
    - Keep original fields for backward compatibility during transition
  
  2. New Tables
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key to orders)
      - `variety` (text)
      - `seed_treatment` (text)
      - `quantity` (integer, optional for future use)
      - `created_at` (timestamp)
  
  3. Security
    - Enable RLS on `order_items` table
    - Add policies for authenticated users to manage their order items
*/

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  variety text NOT NULL,
  seed_treatment text NOT NULL,
  quantity integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all order items
CREATE POLICY "Users can view all order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert order items
CREATE POLICY "Users can create order items"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update order items
CREATE POLICY "Users can update order items"
  ON order_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete order items
CREATE POLICY "Users can delete order items"
  ON order_items
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);
