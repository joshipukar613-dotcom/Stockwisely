const { pool } = require('../config/database');

// Get dashboard summary with all key metrics
exports.getSummary = async (req, res) => {
  try {
    const client = await pool.connect();

    try {
      // Sales statistics for today
      const todaySalesQuery = `
        SELECT 
          COUNT(CASE WHEN is_return = FALSE THEN 1 END)::bigint AS count,
          COALESCE(SUM(total_amount), 0)::numeric AS revenue
        FROM sales_master
        WHERE sale_date >= DATE_TRUNC('day', CURRENT_DATE)
      `;
      const todaySales = await client.query(todaySalesQuery);

      // Sales statistics for this month
      const monthSalesQuery = `
        SELECT 
          COUNT(CASE WHEN is_return = FALSE THEN 1 END)::bigint AS count,
          COALESCE(SUM(total_amount), 0)::numeric AS revenue
        FROM sales_master
        WHERE sale_date >= DATE_TRUNC('month', CURRENT_DATE)
      `;
      const monthSales = await client.query(monthSalesQuery);

      // Stock alerts - low stock products (balance_qty <= min_stock_level)
      // FIX: min_stock_level is in products table, not stock_movements
      const stockAlertsQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE stock <= COALESCE(min_stock_level, 5) AND stock > 0)::bigint AS low_stock,
          COUNT(*) FILTER (WHERE COALESCE(stock, 0) <= 0)::bigint AS out_of_stock,
          COUNT(*)::bigint AS total_products
        FROM products 
        WHERE is_active = true
      `;
      const stockAlerts = await client.query(stockAlertsQuery);

      // Top products by revenue (since 2024-01-01)
      const topProductsQuery = `
        SELECT 
          si.product_name,
          SUM(si.amount)::numeric AS total_revenue,
          SUM(si.quantity)::bigint AS total_quantity
        FROM sales_items si
        INNER JOIN sales_master sm ON si.sale_id = sm.id
        WHERE sm.sale_date >= DATE '2024-01-01'
        GROUP BY si.product_name
        ORDER BY total_revenue DESC
        LIMIT 10
      `;
      const topProducts = await client.query(topProductsQuery);

      // Recent sales (last 10)
      const recentSalesQuery = `
        SELECT 
          invoice_number,
          customer_name,
          sale_date,
          total_amount,
          total_items,
          transaction_type,
          is_return,
          return_status
        FROM sales_master
        ORDER BY sale_date DESC
        LIMIT 10
      `;
      const recentSales = await client.query(recentSalesQuery);

      // Monthly trend since 2024-01-01
      const monthlyTrendQuery = `
        SELECT 
          DATE_TRUNC('month', sale_date)::date AS month,
          COUNT(CASE WHEN is_return = FALSE THEN 1 END)::bigint AS count,
          COALESCE(SUM(total_amount), 0)::numeric AS revenue
        FROM sales_master
        WHERE sale_date >= DATE '2024-01-01'
        GROUP BY DATE_TRUNC('month', sale_date)
        ORDER BY month ASC
      `;
      const monthlyTrend = await client.query(monthlyTrendQuery);

      // Return all data
      res.json({
        success: true,
        data: {
          salesStats: {
            todayCount: parseInt(todaySales.rows[0]?.count || 0, 10),
            todayRevenue: parseFloat(todaySales.rows[0]?.revenue || 0),
            monthCount: parseInt(monthSales.rows[0]?.count || 0, 10),
            monthRevenue: parseFloat(monthSales.rows[0]?.revenue || 0),
          },
          stockAlerts: {
            lowStock: parseInt(stockAlerts.rows[0]?.low_stock || 0, 10),
            outOfStock: parseInt(stockAlerts.rows[0]?.out_of_stock || 0, 10),
            totalProducts: parseInt(stockAlerts.rows[0]?.total_products || 0, 10),
          },
          topProducts: topProducts.rows.map(row => ({
            product_name: row.product_name,
            total_revenue: parseFloat(row.total_revenue || 0),
            total_quantity: parseInt(row.total_quantity || 0, 10),
          })),
          recentSales: recentSales.rows.map(row => ({
            invoice_number: row.invoice_number,
            customer_name: row.customer_name,
            sale_date: row.sale_date,
            total_amount: parseFloat(row.total_amount || 0),
            total_items: parseInt(row.total_items || 0, 10),
            transaction_type: row.transaction_type || 'sale',
            is_return: row.is_return || false,
            return_status: row.return_status || 'none'
          })),
          monthlyTrend: monthlyTrend.rows.map(row => ({
            month: row.month,
            count: parseInt(row.count || 0, 10),
            revenue: parseFloat(row.revenue || 0),
          })),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
