const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'stock_wisely',
  password: 'Pukar321$',
  port: 5433,
});

async function checkProduct() {
  try {
    const productCode = 'PROD-00562';
    console.log(`Checking inventory state for ${productCode}`);

    // 1. Check products table
    const prodRes = await pool.query('SELECT * FROM products WHERE product_code = $1', [productCode]);
    console.log('\n--- PRODUCTS TABLE ---');
    console.log(prodRes.rows[0]);

    // 2. Check stock_batches
    const batchRes = await pool.query('SELECT * FROM stock_batches WHERE product_code = $1', [productCode]);
    console.log('\n--- STOCK BATCHES ---');
    console.table(batchRes.rows);

    // 3. Check purchase_items
    const purRes = await pool.query(`
      SELECT pi.* 
      FROM purchase_items pi 
      JOIN purchase_master pm ON pi.purchase_id = pm.id 
      WHERE pi.product_code = $1
    `, [productCode]);
    console.log('\n--- PURCHASE ITEMS ---');
    console.table(purRes.rows);

    // 4. Check sales_items
    const salesRes = await pool.query(`
      SELECT si.*, sm.is_return 
      FROM sales_items si 
      JOIN sales_master sm ON si.sale_id = sm.id 
      WHERE si.product_code = $1
    `, [productCode]);
    console.log('\n--- SALES ITEMS ---');
    console.table(salesRes.rows);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
checkProduct();
