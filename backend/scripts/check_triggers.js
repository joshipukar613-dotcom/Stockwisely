const { pool } = require('../config/database');

async function checkTriggers() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE event_object_table IN ('sales_master', 'sales_items');
    `);
    console.log('Triggers:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

checkTriggers();
