const { pool } = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting vendors migration...');
    await client.query('BEGIN');

    // Create vendors table (base columns)
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(200),
        email VARCHAR(200),
        phone VARCHAR(100),
        address VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Additional professional fields
    const addCols = [
      "vendor_type VARCHAR(50)",
      "payment_terms VARCHAR(50)",
      "credit_limit NUMERIC(12,2) DEFAULT 0",
      "preferred_payment_method VARCHAR(50)",
      "tax_number VARCHAR(100)",
      "opening_balance NUMERIC(12,2) DEFAULT 0",
      "notes TEXT",
      "bank_name VARCHAR(100)",
      "account_name VARCHAR(100)",
      "account_number VARCHAR(100)",
      "bank_branch VARCHAR(100)",
      "swift_code VARCHAR(50)"
    ];
    for (const col of addCols) {
      await client.query(`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ${col}`);
    }

    // Unique index on lower(name)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS vendors_name_unique_idx ON vendors (LOWER(name))
    `);

    // Create vendor_payments table used by payment recording
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendor_payments (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        purchase_id INTEGER,
        payment_date TIMESTAMPTZ DEFAULT NOW(),
        amount NUMERIC(12,2) NOT NULL,
        method VARCHAR(50),
        reference VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS vendor_payments_vendor_idx ON vendor_payments (vendor_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS vendor_payments_purchase_idx ON vendor_payments (purchase_id)`);

    await client.query('COMMIT');
    console.log('✅ Vendors migration completed');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Vendors migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    // pool will be closed by global beforeExit handler in config/database.js
  }
}

migrate();
