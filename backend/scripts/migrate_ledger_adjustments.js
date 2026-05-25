const { pool } = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting Stock Management migration...');
    await client.query('BEGIN');

    // 1. Create vendor_ledger table
    console.log('📝 Creating vendor_ledger table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendor_ledger (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        transaction_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        transaction_type VARCHAR(50) NOT NULL, -- 'Purchase', 'Payment', 'Return', 'Adjustment', 'Void'
        reference_number VARCHAR(100),
        debit DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
        credit DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        
        -- Ensure debit and credit aren't both set in the same entry (except 0)
        CONSTRAINT chk_debit_credit CHECK (NOT (debit > 0 AND credit > 0))
      )
    `);

    // Indexes for ledger
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vendor_ledger_vendor_date ON vendor_ledger(vendor_id, transaction_date)`);

    // 2. Create stock_adjustments table
    console.log('📝 Creating stock_adjustments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id SERIAL PRIMARY KEY,
        product_id BIGINT NOT NULL REFERENCES products(id),
        adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('increase', 'decrease')),
        quantity_before INTEGER NOT NULL,
        quantity_after INTEGER NOT NULL CHECK (quantity_after >= 0),
        quantity_change INTEGER NOT NULL CHECK (quantity_change <> 0),
        reason VARCHAR(100) NOT NULL,
        notes TEXT,
        adjusted_by TEXT REFERENCES "User"(id),
        adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes for adjustments
    await client.query(`CREATE INDEX IF NOT EXISTS idx_stock_adj_product_date ON stock_adjustments(product_id, adjustment_date)`);

    // 3. Ensure products table has a stock column if it doesn't exist
    // Note: inventoryController.js uses stock_movements for balance, 
    // but the requirement specified updating products.stock. 
    // Let's add it as a cached value.
    console.log('📝 Ensuring products.stock column exists...');
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0`);

    await client.query('COMMIT');
    console.log('✅ Stock Management migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    // In production, the pool might be closed here or by a global handler
    process.exit();
  }
}

migrate();
