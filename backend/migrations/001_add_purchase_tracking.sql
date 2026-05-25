
-- Migration to add purchase tracking and inline editing support

BEGIN;

-- 1. Alter purchase_master table
-- Add columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_master' AND column_name = 'original_amount') THEN
        ALTER TABLE purchase_master ADD COLUMN original_amount DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_master' AND column_name = 'current_due_amount') THEN
        ALTER TABLE purchase_master ADD COLUMN current_due_amount DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_master' AND column_name = 'last_payment_date') THEN
        ALTER TABLE purchase_master ADD COLUMN last_payment_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_master' AND column_name = 'payment_status') THEN
        ALTER TABLE purchase_master ADD COLUMN payment_status VARCHAR(50);
    END IF;
END $$;

-- 2. Initialize new columns for existing records
-- If due_amount exists, use it. Otherwise assume unpaid (total_amount).
-- We'll use a safe approach assuming due_amount column exists based on user input.
UPDATE purchase_master 
SET 
    original_amount = total_amount,
    current_due_amount = COALESCE(due_amount, total_amount),
    payment_status = CASE 
        WHEN COALESCE(due_amount, total_amount) <= 0 THEN 'Paid'
        WHEN COALESCE(due_amount, total_amount) < total_amount THEN 'Partial'
        ELSE 'Pending'
    END
WHERE original_amount IS NULL;

-- 3. Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER REFERENCES purchase_master(id),
  vendor_id INTEGER REFERENCES vendors(id),
  payment_date DATE NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_purchase_id ON payment_transactions(purchase_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_vendor_id ON payment_transactions(vendor_id);

COMMIT;
