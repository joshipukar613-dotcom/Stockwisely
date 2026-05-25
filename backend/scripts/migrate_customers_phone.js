const { pool } = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting phone identifier migration...');
    await client.query('BEGIN');

    // 1. Add customer_phone to sales_master
    await client.query(`ALTER TABLE sales_master ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(100)`);
    
    // 2. Index the new customer_phone column to keep join performance high
    await client.query(`CREATE INDEX IF NOT EXISTS sm_customer_phone_idx ON sales_master (customer_phone)`);

    // 3. Drop the unique constraint on customer name
    await client.query(`DROP INDEX IF EXISTS customers_name_unique_idx`);

    // 4. Create a unique partial index on customer phone
    // We use a partial index because existing historical data might not have a phone (null)
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique_idx ON customers (phone) WHERE phone IS NOT NULL AND phone != ''`);

    await client.query('COMMIT');
    console.log(`✅ Phone identifier migration completed successfully.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
