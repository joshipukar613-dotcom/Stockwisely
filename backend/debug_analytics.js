const { pool } = require('./config/database');

async function run() {
    console.log('Testing Analytics Queries One by One...');

    try {
        const res1 = await pool.query(`SELECT 1 as test`);
        console.log('DB Connection OK');

        // Test InventoyHealth Turnover
        try {
            await pool.query(`
        WITH latest AS (
          SELECT DISTINCT ON (product_code)
            product_code, description, balance_qty, last_cost
          FROM stock_movements
          ORDER BY product_code, extracted_month DESC NULLS LAST
        ),
        sold AS (
          SELECT si.product_code,
                 SUM(si.quantity)::bigint AS sold_qty
          FROM sales_items si
          JOIN sales_master sm ON si.sale_id = sm.id
          WHERE sm.sale_date >= CURRENT_DATE - INTERVAL '90 days'
            AND sm.is_return = FALSE AND si.amount > 0
          GROUP BY si.product_code
        )
        SELECT l.product_code, l.description AS product_name,
               COALESCE(l.balance_qty, 0)::numeric AS current_stock,
               COALESCE(s.sold_qty, 0)::bigint AS sold_last_90d,
               CASE WHEN COALESCE(l.balance_qty, 0) > 0
                    THEN ROUND(COALESCE(s.sold_qty,0)::numeric / l.balance_qty, 2)
                    ELSE 0 END AS turnover_rate,
               COALESCE(p.category, 'OTHER') AS category
        FROM latest l
        LEFT JOIN sold s ON l.product_code = s.product_code
        LEFT JOIN products p ON l.product_code = p.product_code
        WHERE l.balance_qty > 0
        ORDER BY turnover_rate DESC
        LIMIT 5
      `);
            console.log('✅ InventoryHealth Turnover OK');
        } catch (e) { console.log('❌ InventoryHealth Turnover FAILED:', e.message); }

        // Test StockMovement Flow
        try {
            await pool.query(`
        SELECT DATE_TRUNC('month', created_at)::date AS month,
               COALESCE(SUM(inwards_qty), 0)::numeric  AS total_inflow,
               COALESCE(SUM(outwards_qty), 0)::numeric AS total_outflow
        FROM stock_movements
        GROUP BY DATE_TRUNC('month', created_at)
        LIMIT 5
      `);
            console.log('✅ StockMovement Flow OK');
        } catch (e) { console.log('❌ StockMovement Flow FAILED:', e.message); }

    } catch (e) {
        console.log('Global Error:', e.message);
    } finally {
        await pool.end();
    }
}

run();
