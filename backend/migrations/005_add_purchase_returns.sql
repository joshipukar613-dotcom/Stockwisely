-- Migration: Add Purchase Returns Schema
-- Based on User Improved Plan

-- 1. Add columns to purchase_master
ALTER TABLE purchase_master 
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'purchase' 
  CHECK (transaction_type IN ('purchase', 'return')),
ADD COLUMN IF NOT EXISTS original_purchase_id INTEGER REFERENCES purchase_master(id),
ADD COLUMN IF NOT EXISTS is_return BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS return_status VARCHAR(20) DEFAULT 'none'
  CHECK (return_status IN ('none', 'partial', 'full')),
ADD COLUMN IF NOT EXISTS return_type VARCHAR(50)
  CHECK (return_type IN ('refund', 'credit_note', 'replacement')),
ADD COLUMN IF NOT EXISTS credit_note_number VARCHAR(100);

-- 2. Add columns to purchase_items
ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS quantity_returned INTEGER DEFAULT 0 CHECK (quantity_returned >= 0),
ADD COLUMN IF NOT EXISTS return_reason VARCHAR(100)
  CHECK (return_reason IN (
    'Defective', 'Wrong Item', 'Damaged in Transit', 
    'Expired', 'Quality Issue', 'Other'
  ));

-- 3. Update return number generation function to be more generic
DROP FUNCTION IF EXISTS generate_return_number(VARCHAR);
CREATE OR REPLACE FUNCTION generate_return_number(return_type_val VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    prefix VARCHAR(3);
    current_year VARCHAR(4);
    next_number INT;
    return_number VARCHAR(20);
BEGIN
    prefix := CASE 
        WHEN return_type_val = 'sales_return' THEN 'SR'
        WHEN return_type_val = 'purchase_return' THEN 'PR'
        WHEN return_type_val = 'stock_loss' THEN 'SL'
        ELSE 'RT'
    END;
    
    current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    IF return_type_val = 'sales_return' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INT)), 0) + 1
        INTO next_number
        FROM sales_master
        WHERE invoice_number LIKE prefix || '-' || current_year || '-%'
        AND is_return = TRUE;
    ELSE
        SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INT)), 0) + 1
        INTO next_number
        FROM purchase_master
        WHERE invoice_number LIKE prefix || '-' || current_year || '-%'
        AND is_return = TRUE;
    END IF;
    
    return_number := prefix || '-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN return_number;
END;
$$ LANGUAGE plpgsql;

-- 4. Create vendor credits table (for credit note tracking)
CREATE TABLE IF NOT EXISTS vendor_credits (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id),
    credit_amount DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) NOT NULL,
    source_return_id INTEGER REFERENCES purchase_master(id),
    return_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_vendor_credits_vendor ON vendor_credits(vendor_id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_return ON purchase_master(is_return) WHERE is_return = TRUE;
CREATE INDEX IF NOT EXISTS idx_purchase_transaction_type ON purchase_master(transaction_type);
CREATE INDEX IF NOT EXISTS idx_original_purchase ON purchase_master(original_purchase_id);
