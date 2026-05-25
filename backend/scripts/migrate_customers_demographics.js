const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'stock_wisely',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting customers demographic migration...');
    await client.query('BEGIN');

    // Add ENUM types if they don't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'age_range_enum') THEN
          CREATE TYPE age_range_enum AS ENUM ('Under 18', '18-34', '35-54', '55+');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
          CREATE TYPE gender_enum AS ENUM ('Male', 'Female', 'Other', 'Prefer not to say');
        END IF;
      END
      $$;
    `);

    // Add columns to customers
    console.log('Adding age_range and gender columns to customers table...');
    await client.query(`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS age_range age_range_enum,
      ADD COLUMN IF NOT EXISTS gender gender_enum;
    `);

    await client.query('COMMIT');
    console.log('✅ Demographics migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
