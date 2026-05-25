const { pool } = require('../config/database');

// Get daily stock summary for a specific date
// Uses existing products + stock_movements (product_code, balance_qty); no DB function required
exports.getDailyStockSummary = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `WITH latest_stock AS (
        SELECT DISTINCT ON (product_code)
          product_code,
          balance_qty
        FROM stock_movements
        ORDER BY product_code, extracted_month DESC NULLS LAST
      ),
      summary AS (
        SELECT
          p.id::bigint AS product_id,
          COALESCE(p.description, p.product_code)::varchar AS product_name,
          COALESCE(p.category, 'Uncategorized')::varchar AS category,
          COALESCE(ROUND(ls.balance_qty)::int, 0) AS opening_stock,
          0 AS sales,
          0 AS purchases,
          0 AS returns_in,
          0 AS returns_out,
          0 AS adjustments,
          0 AS losses,
          COALESCE(ROUND(ls.balance_qty)::int, 0) AS closing_stock,
          0 AS net_change
        FROM products p
        LEFT JOIN latest_stock ls ON p.product_code = ls.product_code
      )
      SELECT * FROM summary
      WHERE opening_stock > 0 OR closing_stock > 0 OR sales <> 0 OR purchases <> 0
        OR returns_in <> 0 OR returns_out <> 0 OR adjustments <> 0 OR losses <> 0 OR net_change <> 0
      ORDER BY product_name`
    );

    res.json({
      success: true,
      date: targetDate,
      summary: result.rows
    });
  } catch (error) {
    console.error('Error fetching daily stock summary:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get stock history for date range
exports.getStockHistory = async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }
    
    let query = `
      SELECT 
        snapshot_date,
        product_id,
        COALESCE(p.description, p.product_code) as product_name,
        opening_stock,
        total_in,
        total_out,
        closing_stock,
        net_change
      FROM daily_stock_snapshots dss
      JOIN products p ON dss.product_id = p.id
      WHERE snapshot_date BETWEEN $1 AND $2
    `;
    
    const params = [startDate, endDate];
    
    if (productId) {
      query += ' AND product_id = $3';
      params.push(productId);
    }
    
    query += ' ORDER BY snapshot_date DESC, product_name ASC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      history: result.rows
    });
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get product-specific stock changes
exports.getProductStockChanges = async (req, res) => {
  try {
    const { productId, date } = req.query;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'productId is required'
      });
    }
    
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const result = await pool.query(`
      SELECT 
        sm.*,
        COALESCE(p.description, p.product_code) as product_name,
        COALESCE(u.first_name || ' ' || u.last_name, 'System') as created_by_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE sm.product_id = $1 
        AND sm.movement_date = $2
      ORDER BY sm.created_at DESC
    `, [productId, targetDate]);
    
    res.json({
      success: true,
      movements: result.rows
    });
  } catch (error) {
    console.error('Error fetching product movements:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

module.exports = exports;
