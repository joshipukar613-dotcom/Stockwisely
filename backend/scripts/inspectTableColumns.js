require('dotenv').config();
const { Client } = require('pg');

async function inspect(table) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [table]
  );
  await client.end();
  return res.rows;
}

async function main() {
  const tables = process.argv.slice(2);
  if (tables.length === 0) {
    console.error('Usage: node scripts/inspectTableColumns.js <table1> [table2 ...]');
    process.exit(1);
  }
  for (const t of tables) {
    try {
      const cols = await inspect(t);
      console.log(`\nTable: ${t}`);
      for (const c of cols) {
        console.log(`- ${c.column_name} (${c.data_type})`);
      }
    } catch (e) {
      console.error(`Error inspecting ${t}:`, e.message);
    }
  }
}

main();

