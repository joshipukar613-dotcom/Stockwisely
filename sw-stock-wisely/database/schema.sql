-- Database Schema for SW Stock Wisely with Batch and Expiry Tracking

-- ProductBatch Table (new)
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

-- Product Table Updates (add new columns to existing table)
ALTER TABLE products ADD COLUMN IF NOT EXISTS average_price DECIMAL(10,2) NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_batches INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS nearest_expiry_date DATE NULL;

-- ExpiryAlert Table (new)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_batches_product_id ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry_date ON product_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_product_batches_is_expired ON product_batches(is_expired);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_user_id ON expiry_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_alert_type ON expiry_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_is_acknowledged ON expiry_alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_products_nearest_expiry_date ON products(nearest_expiry_date);

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_product_average_price()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products 
    SET 
        average_price = (
            SELECT COALESCE(
                SUM(purchase_price * quantity_remaining) / NULLIF(SUM(quantity_remaining), 0),
                0
            )
            FROM product_batches 
            WHERE product_id = NEW.product_id AND is_expired = FALSE
        ),
        total_batches = (
            SELECT COUNT(*) 
            FROM product_batches 
            WHERE product_id = NEW.product_id AND is_expired = FALSE
        ),
        nearest_expiry_date = (
            SELECT MIN(expiry_date) 
            FROM product_batches 
            WHERE product_id = NEW.product_id 
            AND expiry_date IS NOT NULL 
            AND is_expired = FALSE
        )
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_average_price
    AFTER INSERT OR UPDATE OR DELETE ON product_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_product_average_price();

-- Function to create expiry alerts
CREATE OR REPLACE FUNCTION create_expiry_alerts()
RETURNS void AS $$
BEGIN
    -- Expired products
    INSERT INTO expiry_alerts (user_id, product_id, batch_id, alert_type, expiry_date, quantity)
    SELECT 
        p.user_id,
        pb.product_id,
        pb.id,
        'expired',
        pb.expiry_date,
        pb.quantity_remaining
    FROM product_batches pb
    JOIN products p ON pb.product_id = p.id
    WHERE pb.expiry_date < CURRENT_DATE 
    AND pb.is_expired = FALSE
    AND pb.quantity_remaining > 0
    ON CONFLICT (product_id, batch_id, alert_type) DO NOTHING;
    
    -- Expiring this week
    INSERT INTO expiry_alerts (user_id, product_id, batch_id, alert_type, expiry_date, quantity)
    SELECT 
        p.user_id,
        pb.product_id,
        pb.id,
        'expiring_week',
        pb.expiry_date,
        pb.quantity_remaining
    FROM product_batches pb
    JOIN products p ON pb.product_id = p.id
    WHERE pb.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    AND pb.is_expired = FALSE
    AND pb.quantity_remaining > 0
    ON CONFLICT (product_id, batch_id, alert_type) DO NOTHING;
    
    -- Expiring within 30 days
    INSERT INTO expiry_alerts (user_id, product_id, batch_id, alert_type, expiry_date, quantity)
    SELECT 
        p.user_id,
        pb.product_id,
        pb.id,
        'expiring_soon',
        pb.expiry_date,
        pb.quantity_remaining
    FROM product_batches pb
    JOIN products p ON pb.product_id = p.id
    WHERE pb.expiry_date BETWEEN CURRENT_DATE + INTERVAL '8 days' AND CURRENT_DATE + INTERVAL '30 days'
    AND pb.is_expired = FALSE
    AND pb.quantity_remaining > 0
    ON CONFLICT (product_id, batch_id, alert_type) DO NOTHING;
    
    -- Mark expired batches
    UPDATE product_batches 
    SET is_expired = TRUE 
    WHERE expiry_date < CURRENT_DATE 
    AND is_expired = FALSE;
END;
$$ LANGUAGE plpgsql;
