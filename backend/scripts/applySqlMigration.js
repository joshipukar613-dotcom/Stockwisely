require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  try {
    const fileArg = process.argv[2];
    if (!fileArg) {
      console.error('Usage: node scripts/applySqlMigration.js <path-to-sql-file>');
      process.exit(1);
    }

    const sqlPath = path.resolve(fileArg);
    if (!fs.existsSync(sqlPath)) {
      console.error('SQL file not found:', sqlPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('DATABASE_URL not set in backend/.env');
      process.exit(1);
    }

    const client = new Client({ connectionString });
    await client.connect();
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    await client.end();
    console.log('Migration applied successfully:', path.basename(sqlPath));
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

main();

