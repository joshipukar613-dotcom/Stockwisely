const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'stock_wisely',
  password: 'Pukar321$',
  port: 5433,
});

async function checkData() {
  try {
    console.log("Checking sales details...");
    
    // Total invoices and total amount for ALL time
    const totalsRes = await pool.query(`
      SELECT 
        COUNT(*) as total_invoices, 
        SUM(total_amount) as grand_total_sales,
        MIN(sale_date) as earliest_sale,
        MAX(sale_date) as latest_sale
      FROM sales_master 
      WHERE is_return = FALSE
    `);
    
    console.log(totalsRes.rows[0]);
    
    // Group by year to see distribution
    const yearlyRes = await pool.query(`
      SELECT 
        EXTRACT(YEAR FROM sale_date) as year, 
        COUNT(*) as invoice_count,
        SUM(total_amount) as yearly_sales
      FROM sales_master 
      WHERE is_return = FALSE
      GROUP BY year
      ORDER BY year
    `);
    
    console.log("Yearly breakdown:", yearlyRes.rows);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkData();
