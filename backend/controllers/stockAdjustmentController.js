const { pool } = require('../config/database');

// POST /api/adjustments
exports.createAdjustment = async (req, res) => {
    const client = await pool.connect();
    try {
        const { product_id, quantity_after, reason, notes, adjustment_date } = req.body || {};
        const userId = req.user?.userId; // From authenticateToken middleware

        if (!product_id || quantity_after === undefined || !reason) {
            return res.status(400).json({ success: false, message: 'product_id, quantity_after, and reason are required' });
        }

        const qtyAfter = parseFloat(quantity_after);
        if (isNaN(qtyAfter) || qtyAfter < 0) {
            return res.status(400).json({ success: false, message: 'quantity_after must be a non-negative number' });
        }

        await client.query('BEGIN');

        // 1. Get current stock and lock the product row
        // We use stock_quantity as the existing column
        const prodRes = await client.query(`SELECT stock, product_code, description, category FROM products WHERE id = $1 FOR UPDATE`, [product_id]);
        if (prodRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        const product = prodRes.rows[0];
        const qtyBefore = parseFloat(product.stock || 0);
        const qtyChange = qtyAfter - qtyBefore;

        if (Math.abs(qtyChange) < 0.001) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Adjusted stock is same as current stock. No change made.' });
        }

        const adjType = qtyChange > 0 ? 'increase' : 'decrease';

        // 2. Update product stock (we use 'stock' as the primary column)
        await client.query(`UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2`, [qtyAfter, product_id]);

        // 3. Insert adjustment record
        const adjRes = await client.query(
            `INSERT INTO stock_adjustments (
        product_id, adjustment_type, quantity_before, quantity_after, 
        quantity_change, reason, notes, adjusted_by, adjustment_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::date, CURRENT_DATE))
      RETURNING *`,
            [product_id, adjType, qtyBefore, qtyAfter, qtyChange, reason, notes || null, userId || null, adjustment_date || null]
        );

        // 4. Create a stock_movement record as well to keep the legacy balance system in sync
        const month = new Date().getMonth() + 1;
        await client.query(
            `INSERT INTO stock_movements (
        product_code, description, inwards_qty, outwards_qty, 
        balance_qty, source_file, extracted_month
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                product.product_code,
                product.description,
                qtyChange > 0 ? qtyChange : 0,
                qtyChange < 0 ? -qtyChange : 0,
                qtyAfter,
                'Manual Adjustment',
                month
            ]
        );

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Stock adjusted successfully',
            data: adjRes.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create adjustment error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create adjustment',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// GET /api/adjustments
exports.listAdjustments = async (req, res) => {
    try {
        const { startDate, endDate, productId, reason, type, page = 1, limit = 20 } = req.query || {};
        const offset = (Math.max(1, parseInt(page)) - 1) * Math.max(1, parseInt(limit));

        const params = [];
        const conditions = [];
        let pi = 1;

        if (startDate) {
            conditions.push(`adjustment_date >= $${pi++}`);
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(`adjustment_date <= $${pi++}`);
            params.push(endDate);
        }
        if (productId) {
            conditions.push(`product_id = $${pi++}`);
            params.push(productId);
        }
        if (reason) {
            conditions.push(`reason = $${pi++}`);
            params.push(reason);
        }
        if (type) {
            conditions.push(`adjustment_type = $${pi++}`);
            params.push(type);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        // Count query
        const countRes = await pool.query(`SELECT COUNT(*) FROM stock_adjustments ${whereClause}`, params);
        const total = parseInt(countRes.rows[0].count);

        // Data query
        const query = `
      SELECT 
        sa.*, 
        p.description as product_name, 
        p.product_code,
        u."firstName" || ' ' || u."lastName" as adjusted_by_name
      FROM stock_adjustments sa
      JOIN products p ON sa.product_id = p.id
      LEFT JOIN "User" u ON sa.adjusted_by = u.id
      ${whereClause}
      ORDER BY sa.adjustment_date DESC, sa.created_at DESC
      LIMIT $${pi++} OFFSET $${pi++}
    `;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('List adjustments error:', error);
        res.status(500).json({ success: false, message: 'Failed to list adjustments' });
    }
};

// GET /api/adjustments/summary
exports.getAdjustmentSummary = async (req, res) => {
    try {
        const statsRes = await pool.query(`
      SELECT 
        COUNT(*) filter (where adjustment_type = 'increase') as total_increases,
        COUNT(*) filter (where adjustment_type = 'decrease') as total_decreases,
        SUM(ABS(quantity_change)) as total_quantity_adjusted
      FROM stock_adjustments
    `);

        const topAdjusted = await pool.query(`
      SELECT 
        p.description as product_name,
        COUNT(sa.id) as adjustment_count,
        SUM(ABS(sa.quantity_change)) as total_change
      FROM stock_adjustments sa
      JOIN products p ON sa.product_id = p.id
      GROUP BY p.id, p.description
      ORDER BY total_change DESC
      LIMIT 5
    `);

        res.json({
            success: true,
            data: {
                summary: statsRes.rows[0],
                topProducts: topAdjusted.rows[0] ? topAdjusted.rows : [] // Ensure it's an array
            }
        });
    } catch (error) {
        console.error('Get adjustment summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch summary' });
    }
};

// GET /api/products/:productId/adjustments
exports.getProductAdjustments = async (req, res) => {
    try {
        const productId = req.params.productId;
        const result = await pool.query(`
      SELECT sa.*, u."firstName" || ' ' || u."lastName" as adjusted_by_name
      FROM stock_adjustments sa
      LEFT JOIN "User" u ON sa.adjusted_by = u.id
      WHERE sa.product_id = $1
      ORDER BY sa.adjustment_date DESC, sa.created_at DESC
    `, [productId]);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get product adjustments error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch product adjustments' });
    }
};
