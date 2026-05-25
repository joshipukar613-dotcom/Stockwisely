const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Pukar321$',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'stock_wisely'
});

async function checkConstraint() {
    try {
        const res = await pool.query(`
      SELECT pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'purchase_master' AND c.conname = 'purchase_master_return_type_check';
    `);
        console.log("Constraint definition:");
        if (res.rows.length > 0) {
            console.log(res.rows[0].def);
        } else {
            console.log("Constraint not found by that name.");
        }
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        pool.end();
    }
}

checkConstraint();
