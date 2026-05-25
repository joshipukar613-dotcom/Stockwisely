const { pool } = require('../config/database');
const NepaliDate = require('nepali-date-converter').default || require('nepali-date-converter');

// Get sales summary with date range
exports.getSalesSummary = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const startDate = req.query.startDate || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
      const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

      const query = `
        SELECT 
          SUM(CASE WHEN is_return = FALSE THEN total_amount ELSE 0 END)::numeric as gross_sales,
          SUM(CASE WHEN is_return = TRUE THEN total_amount ELSE 0 END)::numeric as total_returns,
          SUM(total_amount)::numeric as net_revenue,
          COUNT(CASE WHEN is_return = FALSE THEN 1 END)::bigint as sales_count,
          COUNT(CASE WHEN is_return = TRUE THEN 1 END)::bigint as returns_count,
          COALESCE(SUM(CASE WHEN is_return = FALSE THEN total_items ELSE -total_items END), 0)::bigint AS total_items_sold
        FROM sales_master
        WHERE sale_date BETWEEN $1 AND $2
      `;
      const result = await client.query(query, [startDate, endDate]);

      const row = result.rows[0];
      const netRevenue = parseFloat(row.net_revenue || 0);
      const salesCount = parseInt(row.sales_count || 0, 10);

      // Legacy compatibility: maintain original field names
      res.json({
        success: true,
        data: {
          total_sales: salesCount,
          total_revenue: netRevenue,
          avg_order_value: salesCount > 0 ? parseFloat((netRevenue / salesCount).toFixed(2)) : 0,
          total_items_sold: parseInt(row.total_items_sold || 0, 10),

          // Enhanced fields
          gross_sales: parseFloat(row.gross_sales || 0),
          total_returns: parseFloat(row.total_returns || 0),
          returns_count: parseInt(row.returns_count || 0, 10),

          date_range: {
            start_date: startDate,
            end_date: endDate,
          },
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get sales summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get top performing products
exports.getTopPerformers = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const limit = Math.min(20, parseInt(req.query.limit || '20', 10));
      const startDate = req.query.startDate || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
      const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

      const query = `
        WITH aggregated AS (
          SELECT 
            si.product_name,
            si.product_code as original_code,
            SUM(si.amount)::numeric AS total_revenue,
            SUM(si.quantity)::bigint AS total_quantity,
            COUNT(DISTINCT si.sale_id)::bigint AS order_count
          FROM sales_items si
          INNER JOIN sales_master sm ON si.sale_id = sm.id
          WHERE sm.sale_date >= $1 AND sm.sale_date <= $2
          GROUP BY si.product_name, si.product_code
        )
        SELECT 
          a.product_name,
          COALESCE((SELECT p.product_code FROM products p WHERE LOWER(p.description) = LOWER(a.product_name) LIMIT 1), a.original_code) AS product_code,
          a.total_revenue,
          a.total_quantity,
          a.order_count
        FROM aggregated a
        ORDER BY a.total_revenue DESC
        LIMIT $3
      `;
      const result = await client.query(query, [startDate, endDate, limit]);

      res.json({
        success: true,
        data: result.rows.map(row => ({
          product_name: row.product_name,
          product_code: row.product_code,
          total_revenue: parseFloat(row.total_revenue || 0),
          total_quantity: parseInt(row.total_quantity || 0, 10),
          order_count: parseInt(row.order_count || 0, 10),
        })),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get top performers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top performers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get slow moving products
exports.getSlowMovers = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const limit = Math.min(20, parseInt(req.query.limit || '20', 10));
      const startDate = req.query.startDate || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
      const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

      const query = `
        WITH aggregated AS (
          SELECT 
            si.product_name,
            si.product_code as original_code,
            SUM(si.amount)::numeric AS total_revenue,
            SUM(si.quantity)::bigint AS total_quantity,
            COUNT(DISTINCT si.sale_id)::bigint AS order_count
          FROM sales_items si
          INNER JOIN sales_master sm ON si.sale_id = sm.id
          WHERE sm.sale_date >= $1 AND sm.sale_date <= $2
          GROUP BY si.product_name, si.product_code
        )
        SELECT 
          a.product_name,
          COALESCE((SELECT p.product_code FROM products p WHERE LOWER(p.description) = LOWER(a.product_name) LIMIT 1), a.original_code) AS product_code,
          COALESCE(a.total_revenue, 0) AS total_revenue,
          COALESCE(a.total_quantity, 0) AS total_quantity,
          COALESCE(a.order_count, 0) AS order_count
        FROM aggregated a
        ORDER BY a.total_revenue ASC
        LIMIT $3
      `;
      const result = await client.query(query, [startDate, endDate, limit]);

      res.json({
        success: true,
        data: result.rows.map(row => ({
          product_name: row.product_name,
          product_code: row.product_code,
          total_revenue: parseFloat(row.total_revenue || 0),
          total_quantity: parseInt(row.total_quantity || 0, 10),
          order_count: parseInt(row.order_count || 0, 10),
        })),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get slow movers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch slow movers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get inventory report by category
exports.getInventoryReport = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          COALESCE(category, 'Uncategorized') AS category,
          COUNT(*)::bigint AS product_count,
          COALESCE(SUM(stock), 0)::numeric AS total_quantity,
          COALESCE(SUM(stock * COALESCE(base_price, 0)), 0)::numeric AS total_value
        FROM products
        WHERE is_active = true
        GROUP BY COALESCE(category, 'Uncategorized')
        ORDER BY total_value DESC
      `;
      const result = await client.query(query);

      res.json({
        success: true,
        data: result.rows.map(row => ({
          category: row.category,
          product_count: parseInt(row.product_count || 0, 10),
          total_quantity: parseFloat(row.total_quantity || 0),
          total_value: parseFloat(row.total_value || 0),
        })),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get inventory report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.getPurchaseReturnsReport = async (req, res) => {
  try {
    const { startDate, endDate, vendor_id } = req.query;

    let query = `
      SELECT 
        pm.*,
        v.name as vendor_name,
        (SELECT json_agg(
          json_build_object(
            'product_name', pi.product_name,
            'quantity', ABS(pi.quantity),
            'price', pi.price,
            'amount', ABS(pi.amount)
          )
        ) FROM purchase_items pi WHERE pi.purchase_id = pm.id) as items
      FROM purchase_master pm
      LEFT JOIN vendors v ON pm.vendor_id = v.id
      WHERE pm.is_return = TRUE
    `;

    const params = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND pm.purchase_date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND pm.purchase_date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    if (vendor_id) {
      query += ` AND pm.vendor_id = $${paramCount}`;
      params.push(vendor_id);
      paramCount++;
    }

    query += ` ORDER BY pm.purchase_date DESC`;

    const result = await pool.query(query, params);

    // Calculate summary
    const totalReturns = result.rows.length;
    const totalValue = result.rows.reduce((sum, r) => sum + Math.abs(parseFloat(r.total_amount) || 0), 0);

    // Count by return method
    const byMethod = result.rows.reduce((acc, r) => {
      const method = r.return_type || 'Unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      returns: result.rows,
      summary: {
        total_returns: totalReturns,
        total_value: totalValue,
        by_method: byMethod
      }
    });
  } catch (error) {
    console.error('Error fetching purchase returns report:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getSalesVatReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    console.log('Fetching Sales VAT report for:', { from, to });
    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'From and To dates are required' });
    }

    // Convert BS to AD for query
    let fromDateAD, toDateAD;
    try {
      const fromDateBS = new NepaliDate(from.replace(/\//g, '-'));
      const toDateBS = new NepaliDate(to.replace(/\//g, '-'));
      fromDateAD = fromDateBS.toJsDate();
      fromDateAD.setHours(0, 0, 0, 0);
      
      toDateAD = toDateBS.toJsDate();
      toDateAD.setHours(23, 59, 59, 999);
      
      console.log('Converted AD range:', { fromDateAD, toDateAD });
    } catch (dateErr) {
      console.error('Date conversion error:', dateErr);
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    // Sales VAT logic:
    // We join with a unique list of products and their VAT percentage from stock_movements
    const query = `
        WITH product_vat AS (
          SELECT DISTINCT ON (product_code) product_code, vat_pct
          FROM stock_movements
          WHERE vat_pct IS NOT NULL
          ORDER BY product_code, extracted_month DESC
        )
        SELECT 
          sm.sale_date,
          sm.invoice_number,
          sm.customer_name,
          '' as customer_pan, -- Customers table lacks PAN/tax_number field
          COALESCE((SELECT p.product_code FROM products p WHERE LOWER(p.description) = LOWER(si.product_name) LIMIT 1), si.product_code) as product_code,
          si.product_name,
          si.quantity,
          si.amount as total_sales,
          sm.tax as master_tax,
          COALESCE(pv.vat_pct, 0) as item_vat_pct
        FROM sales_items si
        JOIN sales_master sm ON si.sale_id = sm.id
        LEFT JOIN product_vat pv ON si.product_code = pv.product_code
        LEFT JOIN customers c ON (sm.customer_phone = c.phone AND sm.customer_phone IS NOT NULL AND sm.customer_phone != '')
        WHERE sm.sale_date >= $1 AND sm.sale_date <= $2
        ORDER BY sm.sale_date ASC, sm.invoice_number ASC
      `;
    
    console.log('Running query:', query, [fromDateAD, toDateAD]);
    const result = await pool.query(query, [fromDateAD, toDateAD]);
    console.log('Query result count:', result.rows.length);
    
    // Log first 5 items to verify VAT picking
    if (result.rows.length > 0) {
      console.log('Sample VAT results:', result.rows.slice(0, 5).map(r => ({
        code: r.product_code,
        name: r.product_name,
        vat_pct: r.item_vat_pct
      })));
    }
    
    const reportData = result.rows.map((row, index) => {
      const bsDate = new NepaliDate(row.sale_date).format('YYYY/MM/DD');
      const totalSales = parseFloat(row.total_sales || 0);
      const vatPct = parseFloat(row.item_vat_pct || 0);
      
      let taxable = 0;
      let vat = 0;
      let exempt = 0;
      
      if (vatPct > 0) {
        // Calculation: Taxable = Total / (1 + VAT%)
        // E.g. for 13% VAT: Taxable = Total / 1.13
        const divisor = 1 + (vatPct / 100);
        taxable = parseFloat((totalSales / divisor).toFixed(2));
        vat = parseFloat((totalSales - taxable).toFixed(2));
      } else {
        exempt = totalSales;
      }

      return {
        miti: bsDate,
        bill_no: row.invoice_number,
        buyer_name: row.customer_name || 'Cash Sales',
        buyer_pan: row.customer_pan || '',
        item_description: row.product_name,
        qty: parseFloat(row.quantity || 0),
        uom: 'PCS', 
        total_sales: totalSales,
        non_taxable: exempt,
        taxable_amt: taxable,
        vat_amt: vat,
        export: 0.0,
        export_country: '',
        export_number: '',
        date: bsDate,
        store: 'MAIN',
        seq: row.invoice_number.match(/\d+$/)?.[0] || (index + 1)
      };
    });

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Get Sales VAT report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch Sales VAT report',
      error: error.message
    });
  }
};

exports.getPurchaseVatReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    console.log('Fetching Purchase VAT report for:', { from, to });
    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'From and To dates are required' });
    }

    // Convert BS to AD for query
    let fromDateAD, toDateAD;
    try {
      const fromDateBS = new NepaliDate(from.replace(/\./g, '-').replace(/\//g, '-'));
      const toDateBS = new NepaliDate(to.replace(/\./g, '-').replace(/\//g, '-'));
      fromDateAD = fromDateBS.toJsDate();
      fromDateAD.setHours(0, 0, 0, 0);
      
      toDateAD = toDateBS.toJsDate();
      toDateAD.setHours(23, 59, 59, 999);
      
      console.log('Converted AD range:', { fromDateAD, toDateAD });
    } catch (dateErr) {
      console.error('Date conversion error:', dateErr);
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    // Purchase VAT logic:
    const query = `
      WITH product_vat AS (
        SELECT DISTINCT ON (product_code) product_code, vat_pct
        FROM stock_movements
        WHERE vat_pct IS NOT NULL
        ORDER BY product_code, extracted_month DESC
      )
      SELECT 
        pm.purchase_date,
        pm.vendor_invoice_number as party_bill_no,
        pm.invoice_number as received_no,
        pm.vendor_name,
        v.tax_number as vendor_pan,
        COALESCE((SELECT p.product_code FROM products p WHERE LOWER(p.description) = LOWER(pi.product_name) LIMIT 1), pi.product_code) as product_code,
        pi.product_name,
        pi.quantity,
        pi.amount as total_purchase,
        pm.tax as master_tax,
        COALESCE(pv.vat_pct, 0) as item_vat_pct
      FROM purchase_items pi
      JOIN purchase_master pm ON pi.purchase_id = pm.id
      LEFT JOIN product_vat pv ON pi.product_code = pv.product_code
      LEFT JOIN vendors v ON LOWER(pm.vendor_name) = LOWER(v.name)
      WHERE pm.purchase_date >= $1 AND pm.purchase_date <= $2
      ORDER BY pm.purchase_date ASC, pm.invoice_number ASC
    `;
    
    console.log('Running query:', query, [fromDateAD, toDateAD]);
    const result = await pool.query(query, [fromDateAD, toDateAD]);
    console.log('Query result count:', result.rows.length);
    
    const reportData = result.rows.map(row => {
      const bsDate = new NepaliDate(row.purchase_date).format('YYYY/MM/DD').replace(/\//g, '.');
      const totalPurchase = parseFloat(row.total_purchase || 0);
      const vatPct = parseFloat(row.item_vat_pct || 0);
      
      let taxable = 0;
      let vat = 0;
      let exempt = 0;
      
      if (vatPct > 0) {
        const divisor = 1 + (vatPct / 100);
        taxable = parseFloat((totalPurchase / divisor).toFixed(2));
        vat = parseFloat((totalPurchase - taxable).toFixed(2));
      } else {
        exempt = totalPurchase;
      }

      return {
        miti: bsDate,
        party_bill_no: row.party_bill_no || '',
        received_no: row.received_no,
        supplier: row.vendor_name,
        pan: row.vendor_pan || '',
        item_description: row.product_name,
        qty: parseFloat(row.quantity || 0),
        uom: 'PCS', 
        total_purchase_amount: totalPurchase,
        exempted_purchase_amount: exempt,
        taxable_purchase: taxable,
        vat: vat,
        purchase_import_value: 0.0,
        purchase_import_tax: 0.0,
        capital_goods_value: 0.0,
        capital_goods_tax: 0
      };
    });

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Get Purchase VAT report error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch Purchase VAT report',
      error: error.message
    });
  }
};

// --- FIFO BATCH REPORTING ---

// Get profit summary from batches
exports.getBatchProfits = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = `
      SELECT 
        p.product_code,
        p.description as product_name,
        SUM(sb.quantity_sold) as total_qty_sold,
        SUM(sb.quantity_sold * sb.mrp) as total_revenue,
        SUM(sb.quantity_sold * sb.cost_price) as total_cost,
        SUM(sb.quantity_sold * (sb.mrp - sb.cost_price)) as total_profit,
        CASE 
          WHEN SUM(sb.quantity_sold * sb.cost_price) > 0 
          THEN (SUM(sb.quantity_sold * (sb.mrp - sb.cost_price)) / SUM(sb.quantity_sold * sb.cost_price)) * 100
          ELSE 0 
        END as profit_margin_pct
      FROM sale_batches sb
      JOIN sales_master sm ON sb.sale_id = sm.id
      JOIN stock_batches stb ON sb.batch_id = stb.id
      JOIN products p ON stb.product_code = p.product_code
      WHERE sm.sale_date BETWEEN $1 AND $2
      GROUP BY p.product_code, p.description
      ORDER BY total_profit DESC
    `;
    const params = [
      startDate || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
      endDate || new Date().toISOString().split('T')[0]
    ];
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Compare vendor prices for products
exports.getVendorPriceComparison = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.product_code,
        p.description as product_name,
        v.name as vendor_name,
        AVG(sb.cost_price) as avg_cost_price,
        MIN(sb.cost_price) as min_cost_price,
        MAX(sb.cost_price) as max_cost_price,
        COUNT(sb.id) as batch_count
      FROM stock_batches sb
      JOIN vendors v ON sb.vendor_id = v.id
      JOIN products p ON sb.product_code = p.product_code
      GROUP BY p.product_code, p.description, v.name
      ORDER BY p.description, avg_cost_price ASC
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get weighted average cost trend
exports.getWeightedAvgCostTrends = async (req, res) => {
  try {
    const { product_code } = req.query;
    if (!product_code) {
      return res.status(400).json({ success: false, message: 'product_code is required' });
    }
    
    // This is an approximation based on purchase history (batches)
    const query = `
      SELECT 
        TO_CHAR(batch_date, 'YYYY-MM') as month,
        AVG(cost_price) as avg_cost,
        SUM(quantity_added * cost_price) / NULLIF(SUM(quantity_added), 0) as weighted_avg_cost
      FROM stock_batches
      WHERE product_code = $1
      GROUP BY TO_CHAR(batch_date, 'YYYY-MM')
      ORDER BY month ASC
    `;
    const result = await pool.query(query, [product_code]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


