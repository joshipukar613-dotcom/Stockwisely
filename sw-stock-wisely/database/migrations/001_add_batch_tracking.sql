-- Migration: Add Batch and Expiry Tracking
-- Run this migration to add batch tracking capabilities to existing inventory

-- Add new columns to existing products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS average_price DECIMAL(10,2) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_batches INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS nearest_expiry_date DATE NULL;

-- Create product_batches table
CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    quantity_remaining INTEGER NOT NULL CHECK (quantity_remaining >= 0),
    purchase_price DECIMAL(10,2) NOT NULL CHECK (purchase_price >= 0),
    purchase_date DATE NOT NULL,
    expiry_date DATE NULL,
    is_expired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, batch_number)
);

-- Create expiry_alerts table
CREATE TABLE IF NOT EXISTS expiry_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES product_batches(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('expired', 'expiring_week', 'expiring_soon')),
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, batch_id, alert_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_batches_product_id ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry_date ON product_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_product_batches_is_expired ON product_batches(is_expired);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_user_id ON expiry_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_alert_type ON expiry_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_is_acknowledged ON expiry_alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_products_nearest_expiry_date ON products(nearest_expiry_date);

-- Migrate existing products to have initial batches
INSERT INTO product_batches (product_id, batch_number, quantity, quantity_remaining, purchase_price, purchase_date, expiry_date)
SELECT 
    id,
    'BATCH-001',
    stock,
    stock,
    price,
    CURRENT_DATE - INTERVAL '30 days',
    CASE 
        WHEN category IN ('Food & Beverages', 'Health & Beauty') THEN CURRENT_DATE + INTERVAL '365 days'
        ELSE NULL 
    END
FROM products
WHERE NOT EXISTS (
    SELECT 1 FROM product_batches WHERE product_id = products.id
);

-- Update products with initial average price and batch count
UPDATE products 
SET 
    average_price = price,
    total_batches = 1,
    nearest_expiry_date = (
        SELECT MIN(expiry_date) 
        FROM product_batches 
        WHERE product_id = products.id 
        AND expiry_date IS NOT NULL
    )
WHERE average_price IS NULL;
