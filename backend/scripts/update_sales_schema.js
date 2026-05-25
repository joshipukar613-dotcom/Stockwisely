const { pool } = require('../config/database');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration...');
    await client.query('BEGIN');

    // Add columns to sales_master
    const columns = [
      'subtotal DECIMAL(10,2) DEFAULT 0',
      'discount DECIMAL(10,2) DEFAULT 0',
      'tax DECIMAL(10,2) DEFAULT 0',
      'payment_method VARCHAR(50)',
      'amount_paid DECIMAL(10,2) DEFAULT 0',
      'change_amount DECIMAL(10,2) DEFAULT 0'
    ];

    for (const col of columns) {
      try {
        await client.query(`ALTER TABLE sales_master ADD COLUMN IF NOT EXISTS ${col}`);
        console.log(`Added column: ${col}`);
      } catch (e) {
        // Ignore "column already exists" error if IF NOT EXISTS doesn't catch it (Postgres 9.6+ supports it)
        console.log(`Note on column ${col}:`, e.message);
      }
    }
    
    // Also ensure sales_items has amount column if not already
    try {
        await client.query(`ALTER TABLE sales_items ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) DEFAULT 0`);
        console.log(`Added column: amount to sales_items`);
    } catch (e) {
        console.log(`Note on sales_items amount:`, e.message);
    }

    // Add columns to purchase_master
    const purchaseMasterColumns = [
      'vendor_invoice_number VARCHAR(100)',
      'vendor_contact VARCHAR(100)',
      'subtotal DECIMAL(10,2) DEFAULT 0',
      'shipping_cost DECIMAL(10,2) DEFAULT 0',
      'tax DECIMAL(10,2) DEFAULT 0',
      'payment_status VARCHAR(50)',
      'payment_method VARCHAR(50)',
      'amount_paid DECIMAL(10,2) DEFAULT 0',
      'due_amount DECIMAL(10,2) DEFAULT 0',
      'due_date DATE',
      'notes TEXT',
      'reference VARCHAR(100)'
    ];
    for (const col of purchaseMasterColumns) {
      try {
        await client.query(`ALTER TABLE purchase_master ADD COLUMN IF NOT EXISTS ${col}`);
        console.log(`Added column to purchase_master: ${col}`);
      } catch (e) {
        console.log(`Note on purchase_master ${col}:`, e.message);
      }
    }
    // Ensure purchase_items has amount column
    try {
      await client.query(`ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) DEFAULT 0`);
      console.log(`Ensured amount column on purchase_items`);
    } catch (e) {
      console.log(`Note on purchase_items amount:`, e.message);
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end(); 
  }
}

runMigration();
