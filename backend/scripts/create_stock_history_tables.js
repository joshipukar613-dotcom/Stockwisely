const { pool } = require('../config/database');

async function createStockHistoryTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create stock_movements table (new schema for detailed tracking)
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        product_id BIGINT NOT NULL REFERENCES products(id),
        movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
        quantity INTEGER NOT NULL,
        quantity_before INTEGER NOT NULL,
        quantity_after INTEGER NOT NULL,
        reference_type VARCHAR(50) NOT NULL,
        -- Reference types: 'sale', 'purchase', 'sales_return', 'purchase_return', 
        --                  'adjustment', 'stock_loss', 'opening_stock'
        reference_id INTEGER,
        reference_number VARCHAR(100),
        notes TEXT,
        movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255) REFERENCES users(id)
      );
    `);

    // Create indexes for stock_movements
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
    `);

    // Create daily_stock_snapshots table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_stock_snapshots (
        id SERIAL PRIMARY KEY,
        product_id BIGINT NOT NULL REFERENCES products(id),
        snapshot_date DATE NOT NULL,
        opening_stock INTEGER NOT NULL,
        closing_stock INTEGER NOT NULL,
        total_in INTEGER DEFAULT 0,
        total_out INTEGER DEFAULT 0,
        net_change INTEGER GENERATED ALWAYS AS (total_in - total_out) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(product_id, snapshot_date)
      );
    `);

    // Create indexes for daily_stock_snapshots
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_snapshots_date ON daily_stock_snapshots(snapshot_date);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_snapshots_product ON daily_stock_snapshots(product_id);
    `);

    // Create function to calculate daily stock summary
    await client.query(`
      CREATE OR REPLACE FUNCTION get_daily_stock_summary(target_date DATE)
      RETURNS TABLE(
        product_id BIGINT,
        product_name VARCHAR,
        category VARCHAR,
        opening_stock INTEGER,
        sales INTEGER,
        purchases INTEGER,
        returns_in INTEGER,
        returns_out INTEGER,
        adjustments INTEGER,
        losses INTEGER,
        closing_stock INTEGER,
        net_change INTEGER
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          p.id,
          COALESCE(p.description, p.product_code)::VARCHAR as product_name,
          COALESCE(p.category, 'Uncategorized')::VARCHAR as category,
          COALESCE(prev.closing_stock, 0)::INTEGER as opening_stock,
          COALESCE(SUM(CASE 
            WHEN sm.movement_type = 'out' AND sm.reference_type = 'sale' 
            THEN sm.quantity ELSE 0 END), 0)::INTEGER as sales,
          COALESCE(SUM(CASE 
            WHEN sm.movement_type = 'in' AND sm.reference_type = 'purchase' 
            THEN sm.quantity ELSE 0 END), 0)::INTEGER as purchases,
          COALESCE(SUM(CASE 
            WHEN sm.movement_type = 'in' AND sm.reference_type = 'sales_return' 
            THEN sm.quantity ELSE 0 END), 0)::INTEGER as returns_in,
          COALESCE(SUM(CASE 
            WHEN sm.movement_type = 'out' AND sm.reference_type = 'purchase_return' 
            THEN sm.quantity ELSE 0 END), 0)::INTEGER as returns_out,
          COALESCE(SUM(CASE 
            WHEN sm.reference_type = 'adjustment' 
            THEN CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE -sm.quantity END
            ELSE 0 END), 0)::INTEGER as adjustments,
          COALESCE(SUM(CASE 
            WHEN sm.movement_type = 'out' AND sm.reference_type = 'stock_loss' 
            THEN sm.quantity ELSE 0 END), 0)::INTEGER as losses,
          (COALESCE(prev.closing_stock, 0) + 
          COALESCE(SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END), 0))::INTEGER 
          as closing_stock,
          (COALESCE(SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END), 0))::INTEGER
          as net_change
        FROM products p
        LEFT JOIN stock_movements sm ON p.id = sm.product_id 
          AND sm.movement_date = target_date
        LEFT JOIN daily_stock_snapshots prev ON p.id = prev.product_id 
          AND prev.snapshot_date = target_date - INTERVAL '1 day'
        GROUP BY p.id, p.description, p.product_code, p.category, prev.closing_stock
        ORDER BY COALESCE(p.description, p.product_code);
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query('COMMIT');
    console.log('✅ Stock history tables and function created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating stock history tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  createStockHistoryTables()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createStockHistoryTables };
