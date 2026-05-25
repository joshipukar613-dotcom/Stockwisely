const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'stock_wisely',
  password: 'Pukar321$',
  port: 5433,
});

async function checkRowCounts() {
  try {
    const queries = [
      { name: 'Invoices (sales_master)', q: 'SELECT COUNT(*) FROM sales_master' },
      { name: 'Sales Line Items (sales_items)', q: 'SELECT COUNT(*) FROM sales_items' },
      { name: 'Purchase Orders (purchase_master)', q: 'SELECT COUNT(*) FROM purchase_master' },
      { name: 'Purchase Line Items (purchase_items)', q: 'SELECT COUNT(*) FROM purchase_items' },
      { name: 'Stock Movements', q: 'SELECT COUNT(*) FROM stock_movements' },
      { name: 'Products Catalog', q: 'SELECT COUNT(*) FROM products' }
    ];

    console.log("Total Dataset Rows:");
    let totalRows = 0;
    
    for (const item of queries) {
      const res = await pool.query(item.q);
      const count = parseInt(res.rows[0].count, 10);
      totalRows += count;
      console.log(`- ${item.name}: ${count.toLocaleString()}`);
    }
    
    console.log(`\nGRAND TOTAL ROWS in DB: ~${totalRows.toLocaleString()}`);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkRowCounts();
