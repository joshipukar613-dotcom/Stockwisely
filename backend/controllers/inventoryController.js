const { pool } = require('../config/database');

// Utility: parse pagination
function parsePagination(query) {
  const size = Math.max(1, Math.min(1000, parseInt(query.size || '1000', 10)));
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const offset = (page - 1) * size;
  return { size, page, offset };
}

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT category 
       FROM products 
       WHERE category IS NOT NULL 
       ORDER BY category`
    );
    res.json({
      success: true,
      data: result.rows.map(r => r.category)
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

// Get current stock - latest stock movements per product
exports.getCurrentStock = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const { size, offset } = parsePagination(req.query);
      const query = `
        SELECT 
          p.product_code,
          p.description,
          p.stock as balance_qty,
          p.base_price as last_cost,
          EXTRACT(MONTH FROM p.updated_at) as extracted_month,
          p.category,
          p.is_active,
          p.created_at
        FROM products p
        ${req.query.category ? `WHERE p.category = '${req.query.category}'` : ''}
        ORDER BY p.product_code
        LIMIT $1 OFFSET $2
      `;
      const result = await client.query(query, [size, offset]);

      res.json({
        success: true,
        data: result.rows.map(row => ({
          product_code: row.product_code,
          description: row.description,
          balance_qty: parseFloat(row.balance_qty || 0),
          last_cost: parseFloat(row.last_cost || 0),
          extracted_month: row.extracted_month,
          category: row.category,
          is_active: row.is_active,
          created_at: row.created_at,
        })),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error && error.code === '42P01') {
      // Table missing: return empty dataset gracefully
      return res.json({ success: true, data: [] });
    }
    console.error('Get current stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current stock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get low stock products (balance_qty < 10)
exports.getLowStock = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          p.product_code,
          p.description,
          p.stock as balance_qty,
          p.base_price as last_cost,
          EXTRACT(MONTH FROM p.updated_at) as extracted_month,
          p.category,
          p.is_active
        FROM products p
        WHERE p.stock <= COALESCE(p.min_stock_level, 5) AND p.is_active = true
        ORDER BY p.stock ASC
      `;
      const result = await client.query(query);

      res.json({
        success: true,
        data: result.rows.map(row => ({
          product_code: row.product_code,
          description: row.description,
          balance_qty: parseFloat(row.balance_qty || 0),
          last_cost: parseFloat(row.last_cost || 0),
          extracted_month: row.extracted_month,
          category: row.category,
          is_active: row.is_active,
        })),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error && error.code === '42P01') {
      return res.json({ success: true, data: [] });
    }
    console.error('Get low stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Legacy functions for backward compatibility
exports.getRowCounts = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const [sales, purchases, stock] = await Promise.all([
        client.query('SELECT COUNT(*)::bigint AS count FROM sales_master'),
        client.query('SELECT COUNT(*)::bigint AS count FROM purchase_master'),
        client.query('SELECT COUNT(*)::bigint AS count FROM stock_movements'),
      ]);
      res.json({
        sales_records: Number(sales.rows[0]?.count || 0),
        purchase_records: Number(purchases.rows[0]?.count || 0),
        stock_movements: Number(stock.rows[0]?.count || 0),
      });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDashboardMetrics = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const [totalRevenue, totalProducts, outOfStock] = await Promise.all([
        client.query('SELECT COALESCE(SUM(total_amount), 0)::numeric AS total FROM sales_master'),
        client.query('SELECT COUNT(DISTINCT product_code)::bigint AS total FROM stock_movements'),
        client.query('SELECT COUNT(*)::bigint AS total FROM stock_movements WHERE COALESCE(balance_qty,0) <= 0'),
      ]);

      res.json({
        totalRevenue: Number(totalRevenue.rows[0]?.total || 0),
        totalProducts: Number(totalProducts.rows[0]?.total || 0),
        outOfStock: Number(outOfStock.rows[0]?.total || 0),
        totalPurchasesQty: 0, // Legacy field
      });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adjustInventory = async (req, res) => {
  const client = await pool.connect();
  try {
    const { product_code, description, qty_delta, cost } = req.body;
    const delta = Number(qty_delta);
    const lastCost = Number(cost);
    if (!product_code || !Number.isFinite(delta)) {
      return res.status(400).json({ error: 'product_code and qty_delta are required' });
    }

    const month = new Date().getMonth() + 1; // 1-12

    await client.query('BEGIN');

    // Get previous balance
    const prev = await client.query(
      `SELECT balance_qty, balance_amt
       FROM stock_movements
       WHERE product_code = $1
       ORDER BY extracted_month DESC NULLS LAST
       LIMIT 1`,
      [product_code]
    );

    const prevQty = Number(prev.rows[0]?.balance_qty || 0);
    const prevAmt = Number(prev.rows[0]?.balance_amt || 0);

    const inQty = delta > 0 ? delta : 0;
    const outQty = delta < 0 ? -delta : 0;
    const inAmt = inQty * (Number.isFinite(lastCost) ? lastCost : 0);
    const outAmt = outQty * (Number.isFinite(lastCost) ? lastCost : 0);

    const newBalanceQty = prevQty + delta;
    const newBalanceAmt = prevAmt + (delta * (Number.isFinite(lastCost) ? lastCost : 0));

    // Insert movement row
    const inserted = await client.query(
      `INSERT INTO stock_movements (
        product_code, description, vat_pct, inwards_qty, inwards_amt,
        outwards_qty, outwards_amt, balance_qty, balance_amt, last_cost,
        source_file, extracted_month
      ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, 'api_adjustment', $10)
      RETURNING *`,
      [
        product_code,
        description || '',
        inQty,
        inAmt,
        outQty,
        outAmt,
        newBalanceQty,
        newBalanceAmt,
        Number.isFinite(lastCost) ? lastCost : null,
        month
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({ movement: inserted.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// Create a new product
exports.createProduct = async (req, res) => {
  const client = await pool.connect();
  try {
    const { product_code, description, category } = req.body || {};
    if (!product_code || !description) {
      return res.status(400).json({ error: 'product_code and description are required' });
    }
    await client.query('BEGIN');
    // Upsert by product_code
    const insertQuery = `
      INSERT INTO products (product_code, description, category, base_price, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (product_code) DO UPDATE
      SET description = EXCLUDED.description,
          category = EXCLUDED.category,
          base_price = EXCLUDED.base_price,
          updated_at = NOW()
      RETURNING id, product_code, description, category, base_price, created_at
    `;
    const result = await client.query(insertQuery, [
      product_code, 
      description, 
      category || null,
      parseFloat(req.body.base_price || 0)
    ]);
    await client.query('COMMIT');
    return res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create product error:', error);
    return res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Get products with advanced filtering
exports.getProducts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Search filter
    if (req.query.search) {
      whereConditions.push(`(
        p.description ILIKE $${paramIndex} OR 
        p.product_code ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${req.query.search}%`);
      paramIndex++;
    }

    // Category filter
    if (req.query.category) {
      console.log('🔍 Filtering by category:', req.query.category); // DEBUG
      whereConditions.push(`p.category = $${paramIndex}`);
      queryParams.push(req.query.category);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Count query
    const countQuery = `SELECT COUNT(*)::int AS total FROM products p ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = countResult.rows[0]?.total || 0;

    // Data query
    // Use CTE to get active FIFO MRP for each product
    queryParams.push(limit, offset);
    const dataQuery = `
      WITH oldest_active_batch AS (
        SELECT DISTINCT ON (product_code)
          product_code,
          mrp
        FROM stock_batches
        WHERE is_exhausted = FALSE
        ORDER BY product_code, batch_date ASC, id ASC
      )
      SELECT 
        p.id,
        p.product_code,
        p.description,
        p.category,
        COALESCE(ob.mrp, NULLIF(p.base_price, 0), 0) as price,
        COALESCE(p.stock, 0) as stock_quantity,
        p.created_at
      FROM products p
      LEFT JOIN oldest_active_batch ob ON p.product_code = ob.product_code
      ${whereClause}
      ORDER BY p.description ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    console.log('📊 SQL Query:', dataQuery); // DEBUG
    console.log('📊 Params:', queryParams); // DEBUG

    const dataResult = await pool.query(dataQuery, queryParams);

    console.log('✅ Found products:', dataResult.rows.length); // DEBUG

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

// Get product batches
exports.getProductBatches = async (req, res) => {
  try {
    const productCode = req.params.code;
    
    // Get batches
    const batchesRes = await pool.query(`
      SELECT 
        sb.id, sb.batch_date, sb.quantity_added, sb.quantity_remaining, 
        sb.cost_price, sb.mrp, v.name as vendor_name,
        ((sb.mrp - sb.cost_price) / NULLIF(sb.cost_price, 0)) * 100 as profit_margin
      FROM stock_batches sb
      LEFT JOIN vendors v ON sb.vendor_id = v.id
      WHERE sb.product_code = $1 AND sb.is_exhausted = FALSE
      ORDER BY sb.batch_date ASC, sb.id ASC
    `, [productCode]);

    // Get weighted avg cost
    const avgRes = await pool.query(`
      SELECT weighted_avg_cost, total_remaining_qty
      FROM product_weighted_avg_cost
      WHERE product_code = $1
    `, [productCode]);

    res.json({
      success: true,
      data: {
        batches: batchesRes.rows,
        weighted_avg: avgRes.rows[0] ? parseFloat(avgRes.rows[0].weighted_avg_cost) : 0,
        total_remaining: avgRes.rows[0] ? parseFloat(avgRes.rows[0].total_remaining_qty) : 0
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// Get weighted average FIFO price for a given qty
exports.getFIFOPrice = async (req, res) => {
  try {
    const { code } = req.params;
    const qtyRequested = parseFloat(req.query.qty || 0);

    if (!code) return res.status(400).json({ success: false, message: 'Product code required' });
    if (qtyRequested <= 0) {
      // Return oldest batch MRP as default
      const oldestBatch = await pool.query(`
        SELECT mrp FROM stock_batches 
        WHERE product_code = $1 AND is_exhausted = FALSE 
        ORDER BY batch_date ASC, id ASC LIMIT 1
      `, [code]);
      return res.json({ success: true, price: oldestBatch.rows[0]?.mrp || 0 });
    }

    // Fetch active batches
    const batchesRes = await pool.query(`
      SELECT quantity_remaining, mrp, id 
      FROM stock_batches 
      WHERE product_code = $1 AND is_exhausted = FALSE 
      ORDER BY batch_date ASC, id ASC
    `, [code]);

    console.log(`[FIFO Debug] Found ${batchesRes.rows.length} batches for ${code}`);

    if (batchesRes.rows.length === 0) {
      // Fallback to product's last_cost if no batches
      const fallbackRes = await pool.query(`
        SELECT COALESCE(base_price, 0) as price 
        FROM products WHERE product_code = $1
      `, [code]);
      return res.json({ success: true, price: fallbackRes.rows[0]?.price || 0 });
    }

    let totalValue = 0;
    let qtyLeft = qtyRequested;
    let batchesUsed = [];

    for (const batch of batchesRes.rows) {
      if (qtyLeft <= 0) break;
      const rem = parseFloat(batch.quantity_remaining);
      const take = Math.min(rem, qtyLeft);
      const mrp = parseFloat(batch.mrp);
      console.log(`[FIFO Loop] Batch MRP: ${mrp}, Remaining: ${rem}, Taking: ${take}`);
      totalValue += take * mrp;
      qtyLeft -= take;
      batchesUsed.push({ qty: take, mrp: batch.mrp });
    }

    // If still have qtyLeft, use the MRP of the last batch found
    if (qtyLeft > 0 && batchesRes.rows.length > 0) {
      const lastMrp = parseFloat(batchesRes.rows[batchesRes.rows.length - 1].mrp);
      totalValue += qtyLeft * lastMrp;
    }

    const avgPrice = totalValue / qtyRequested;
    console.log(`[FIFO Debug] Product: ${code}, Qty: ${qtyRequested}, Result: ${avgPrice}, Batches:`, batchesUsed);

    res.json({
      success: true,
      price: parseFloat(avgPrice.toFixed(2)),
      details: batchesUsed
    });

  } catch (err) {
    console.error('getFIFOPrice error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
