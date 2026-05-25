const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'stock_wisely',
    password: process.env.DB_PASSWORD || 'Pukar321$',
    port: process.env.DB_PORT || 5433,
});

async function runQueries() {
    const queries = [
        "ALTER TABLE purchase_master ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'purchase';",
        "ALTER TABLE purchase_master ADD COLUMN IF NOT EXISTS original_purchase_id INTEGER REFERENCES purchase_master(id);",
        "ALTER TABLE purchase_master ADD COLUMN IF NOT EXISTS is_return BOOLEAN DEFAULT false;",
        "ALTER TABLE purchase_master ADD COLUMN IF NOT EXISTS return_status VARCHAR(20) DEFAULT 'none';",
        "ALTER TABLE purchase_master ADD COLUMN IF NOT EXISTS return_type VARCHAR(20);",
        "ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS quantity_returned NUMERIC(10,2) DEFAULT 0;",
        "CREATE TABLE IF NOT EXISTS vendor_credits (id SERIAL PRIMARY KEY, vendor_id INTEGER NOT NULL REFERENCES vendors(id), vendor_name VARCHAR(100) NOT NULL, credit_note_number VARCHAR(50) UNIQUE, amount NUMERIC(15,2) NOT NULL, status VARCHAR(20) DEFAULT 'active', reference_type VARCHAR(50) NOT NULL, reference_id INTEGER NOT NULL, notes TEXT, created_by INTEGER, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);",
        "CREATE INDEX IF NOT EXISTS idx_purchase_return ON purchase_master(is_return);"
    ];

    for (let q of queries) {
        console.log('Running query:', q);
        try {
            await pool.query(q);
            console.log('Success');
        } catch (err) {
            console.error('Error running query:', err.message);
        }
    }
    pool.end();
}

runQueries();
