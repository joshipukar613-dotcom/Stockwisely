require('dotenv').config();
const { Client } = require('pg');

async function count(table) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`SELECT COUNT(*)::int AS count FROM public."${table}"`);
  await client.end();
  return res.rows[0].count;
}

async function main() {
  const tables = process.argv.slice(2);
  if (tables.length === 0) {
    console.error('Usage: node scripts/countRows.js <table1> [table2 ...]');
    process.exit(1);
  }
  for (const t of tables) {
    try {
      const c = await count(t);
      console.log(`${t}: ${c}`);
    } catch (e) {
      console.error(`Error counting ${t}:`, e.message);
    }
  }
}

main();

