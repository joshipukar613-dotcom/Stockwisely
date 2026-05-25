
const { pool } = require('./config/database');

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'expiry_alerts'
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkSchema();
