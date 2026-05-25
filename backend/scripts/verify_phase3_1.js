const { pool } = require('../config/database');

async function verifyTables() {
    try {
        const query = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('sales_returns', 'sales_return_items', 'customer_credits', 'credit_transactions')
        `;
        const result = await pool.query(query);
        console.log('--- TABLE VERIFICATION ---');
        console.log('Tables found:', result.rows.map(r => r.table_name));

        if (result.rows.length === 4) {
            console.log('✅ All Phase 3.1 tables are present.');
        } else {
            console.log('❌ Missing tables. Found:', result.rows.length, 'expected: 4');
        }

        // Check for columns in sales_master
        const smCols = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'sales_master' 
            AND column_name IN ('return_status', 'transaction_type', 'is_return', 'original_sale_id')
        `);
        console.log('sales_master columns found:', smCols.rows.map(r => r.column_name));

        const salesItemsCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'sales_items' AND column_name = 'quantity_returned'`);
        console.log('sales_items.quantity_returned exists:', salesItemsCols.rows.length > 0);

        process.exit(0);
    } catch (err) {
        console.error('Verification failed:', err.message);
        process.exit(1);
    }
}

verifyTables();
