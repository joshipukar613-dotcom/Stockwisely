-- Migration: Approved Phase 3.1 Sales Returns Schema
-- Created: 2026-02-13
-- Specification: COMPLETE IMPLEMENTATION PLAN (APPROVED - 10/10)

-- 1. ALTER sales_master table
ALTER TABLE sales_master 
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'sale' 
  CHECK (transaction_type IN ('sale', 'return')),
ADD COLUMN IF NOT EXISTS original_sale_id BIGINT REFERENCES sales_master(id),
ADD COLUMN IF NOT EXISTS return_reason VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_return BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS return_status VARCHAR(20) DEFAULT 'none'
  CHECK (return_status IN ('none', 'partial', 'full'));

CREATE INDEX IF NOT EXISTS idx_sales_type ON sales_master(transaction_type);
CREATE INDEX IF NOT EXISTS idx_sales_return ON sales_master(is_return) WHERE is_return = TRUE;
CREATE INDEX IF NOT EXISTS idx_original_sale ON sales_master(original_sale_id);

-- 2. ALTER sales_items table
ALTER TABLE sales_items 
ADD COLUMN IF NOT EXISTS quantity_returned INT DEFAULT 0 CHECK (quantity_returned >= 0),
ADD COLUMN IF NOT EXISTS return_reason VARCHAR(100);

-- 3. CREATE customer_credits table
CREATE TABLE IF NOT EXISTS customer_credits (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) NOT NULL,
    source_type VARCHAR(50) DEFAULT 'sales_return',
    source_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    CONSTRAINT chk_credit_positive CHECK (amount >= 0 AND balance >= 0)
);

CREATE INDEX IF NOT EXISTS idx_customer_credits_name ON customer_credits(customer_name);

-- 4. CREATE credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
    id SERIAL PRIMARY KEY,
    credit_id INTEGER REFERENCES customer_credits(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('earned', 'used', 'expired')),
    amount DECIMAL(10,2) NOT NULL,
    sale_id BIGINT REFERENCES sales_master(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_credit_trans_credit ON credit_transactions(credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_trans_sale ON credit_transactions(sale_id);

-- 5. CREATE return number generation function
CREATE OR REPLACE FUNCTION generate_return_number(return_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    prefix VARCHAR(2);
    current_year VARCHAR(4);
    next_number INT;
    return_number VARCHAR(20);
BEGIN
    prefix := 'SR';
    current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INT)), 0) + 1
    INTO next_number
    FROM sales_master
    WHERE invoice_number LIKE prefix || '-' || current_year || '-%'
    AND is_return = TRUE;
    
    return_number := prefix || '-' || current_year || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN return_number;
END;
$$ LANGUAGE plpgsql;
