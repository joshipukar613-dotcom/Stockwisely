const { pool } = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting customers migration...');
    await client.query('BEGIN');

    // Create customers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(200),
        email VARCHAR(200),
        phone VARCHAR(100),
        address VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Unique index on lower(name) to prevent duplicates
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS customers_name_unique_idx ON customers (LOWER(name))
    `);

    // Extract unique customer names from sales_master and insert into customers table
    console.log('Extracting existing customers from sales_master...');
    const result = await client.query(`
      SELECT DISTINCT customer_name 
      FROM sales_master 
      WHERE customer_name IS NOT NULL AND TRIM(customer_name) != ''
    `);

    const existingNames = result.rows.map(r => r.customer_name.trim());
    
    let insertedCount = 0;
    for (const name of existingNames) {
      // Check if it already exists to avoid conflict
      const checkRes = await client.query('SELECT id FROM customers WHERE LOWER(name) = LOWER($1)', [name]);
      if (checkRes.rows.length === 0) {
        await client.query(`
          INSERT INTO customers (name, created_at, updated_at) 
          VALUES ($1, NOW(), NOW())
        `, [name]);
        insertedCount++;
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Customers migration completed. Inserted ${insertedCount} new customers from past sales.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Customers migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    process.exit(0);
  }
}

migrate();
