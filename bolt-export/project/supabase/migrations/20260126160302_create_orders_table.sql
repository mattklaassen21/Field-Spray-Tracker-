/*
  # Create Orders Table for Warehouse Management

  ## Overview
  Creates a warehouse orders system where mobile users can create orders that sync 
  in real-time to warehouse laptops and employee devices.

  ## Tables Created
  
  ### `orders`
  Main table for storing warehouse orders with the following columns:
  - `id` (uuid, primary key) - Unique identifier for each order
  - `operation` (text) - Type of operation to be performed
  - `account_description` (text) - Description of the account/customer
  - `seed_type` (text) - Type of seed: Corn or Soybeans
  - `seed_treatment` (text) - Treatment specifications for the seed
  - `notes` (text) - Additional notes or instructions
  - `status` (text) - Order status: pending, in_progress, completed
  - `created_by` (uuid) - ID of user who created the order
  - `created_at` (timestamptz) - Timestamp when order was created
  - `updated_at` (timestamptz) - Timestamp when order was last updated

  ## Security
  
  ### Row Level Security (RLS)
  - RLS is enabled on the orders table
  - All authenticated users can view all orders (warehouse needs to see everything)
  - Authenticated users can create new orders
  - Users can update orders they created or any order (for warehouse updates)
  - Users can delete orders they created
  
  ## Notes
  - Uses `auth.uid()` for user identification
  - Timestamps automatically track creation and updates
  - Default status is 'pending' for new orders
*/

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL DEFAULT '',
  account_description text NOT NULL DEFAULT '',
  seed_type text NOT NULL DEFAULT '',
  seed_treatment text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view all orders
CREATE POLICY "Authenticated users can view all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can create orders
CREATE POLICY "Authenticated users can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Authenticated users can update any order (warehouse needs this)
CREATE POLICY "Authenticated users can update orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Users can delete their own orders
CREATE POLICY "Users can delete own orders"
  ON orders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();