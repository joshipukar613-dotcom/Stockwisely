const { pool } = require('../config/database');

// POST /api/sales
// {
//   customer_name: "Ram Sharma",
//   items: [ {product_code, product_name, quantity, price}, ... ]
// }
exports.createSale = async (req, res) => {
  console.log('Processing transaction with body:', JSON.stringify(req.body, null, 2));
  const client = await pool.connect();
  try {
    const {
      transaction_type = 'sale',
      original_sale_id,
      customer_name,
      items,
      discount = 0,
      tax = 0,
      payment_method,
      amount_paid = 0,
      change_amount = 0,
      notes
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required and cannot be empty' });
    }

    await client.query('BEGIN');

    // ========================================
    // SALES RETURN LOGIC
    // ========================================
    if (transaction_type === 'return') {
      if (!original_sale_id) {
        throw new Error('original_sale_id is required for returns');
      }

      // 1. Validate original sale
      const origRes = await client.query('SELECT * FROM sales_master WHERE id = $1', [original_sale_id]);
      if (origRes.rows.length === 0) {
        throw new Error('Original sale not found');
      }
      const originalSale = origRes.rows[0];

      // 2. Generate return invoice number
      const numRes = await client.query("SELECT generate_return_number('sales_return') as num");
      const invoice_number = numRes.rows[0].num;

      let total_refund = 0;
      const insertedItems = [];
      const month = new Date().getMonth() + 1;

      for (const item of items) {
        const qtyToReturn = Number(item.quantity);
        const refundPrice = Number(item.price);

        // Get original item details
        const itemRes = await client.query(
          'SELECT * FROM sales_items WHERE sale_id = $1 AND product_code = $2',
          [original_sale_id, item.product_code]
        );

        if (itemRes.rows.length === 0) {
          throw new Error(`Product ${item.product_code} not found in original sale`);
        }

        const origItem = itemRes.rows[0];
        const available = Number(origItem.quantity) - Number(origItem.quantity_returned || 0);

        if (qtyToReturn > available) {
          throw new Error(`Cannot return ${qtyToReturn} units of ${item.product_code}. Only ${available} available.`);
        }

        const refundAmt = qtyToReturn * refundPrice;
        total_refund += refundAmt;

        // 3. Update quantity_returned in original sale_items
        await client.query(
          'UPDATE sales_items SET quantity_returned = COALESCE(quantity_returned, 0) + $1 WHERE id = $2',
          [qtyToReturn, origItem.id]
        );

        // 4. Restock inventory (Stock Movement)
        const prevStock = await client.query(
          'SELECT balance_qty, balance_amt FROM stock_movements WHERE product_code = $1 ORDER BY extracted_month DESC NULLS LAST LIMIT 1',
          [item.product_code]
        );

        const prevQty = Number(prevStock.rows[0]?.balance_qty || 0);
        const prevAmt = Number(prevStock.rows[0]?.balance_amt || 0);
        const newQty = prevQty + qtyToReturn;
        // Approximate new amount since we don't have weighted average logic yet
        const newAmt = prevAmt + refundAmt;

        await client.query(
          `INSERT INTO stock_movements (
            product_code, description, inwards_qty, inwards_amt,
            outwards_qty, outwards_amt, balance_qty, balance_amt, last_cost,
            source_file, extracted_month
          ) VALUES ($1, $2, $3, $4, 0, 0, $5, $6, $7, $8, $9)`,
          [
            item.product_code,
            item.product_name,
            qtyToReturn,
            refundAmt,
            newQty,
            newAmt,
            refundPrice,
            `Return-${invoice_number}`,
            month
          ]
        );

        // Update products master stock
        await client.query(
          'UPDATE products SET stock = COALESCE(stock, 0) + $1 WHERE product_code = $2',
          [qtyToReturn, item.product_code]
        );

        // Track inserted return item
        insertedItems.push({
          product_code: item.product_code,
          product_name: item.product_name,
          quantity: qtyToReturn,
          price: refundPrice,
          amount: refundAmt
        });
      }

      // 5. Create return record in sales_master (negative total_amount)
      const negative_amount = -Math.abs(total_refund);

      const returnMaster = await client.query(
        `INSERT INTO sales_master (
          invoice_number, customer_name, sale_date, total_amount, total_items, 
          transaction_type, original_sale_id, is_return, payment_method, notes
        ) VALUES ($1, $2, NOW(), $3, $4, 'return', $5, TRUE, $6, $7)
        RETURNING id, invoice_number, sale_date, total_amount`,
        [invoice_number, customer_name || originalSale.customer_name, negative_amount, items.length, original_sale_id, payment_method, notes]
      );

      const returnId = returnMaster.rows[0].id;

      // 6. Insert return items (with negative amounts)
      for (const ritm of insertedItems) {
        await client.query(
          `INSERT INTO sales_items (sale_id, product_code, product_name, quantity, price, amount, return_reason)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [returnId, ritm.product_code, ritm.product_name, ritm.quantity, -ritm.price, -ritm.amount, notes]
        );
      }

      // 7. Handle Store Credit
      if (payment_method === 'Store Credit' || payment_method === 'store_credit') {
        const creditRes = await client.query(
          'INSERT INTO customer_credits (customer_name, amount, balance, source_type, source_id, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [customer_name || originalSale.customer_name, total_refund, total_refund, 'sales_return', returnId, `Return ${invoice_number}`]
        );
        const creditId = creditRes.rows[0].id;

        await client.query(
          'INSERT INTO credit_transactions (credit_id, transaction_type, amount, sale_id, notes) VALUES ($1, $2, $3, $4, $5)',
          [creditId, 'earned', total_refund, returnId, `Refund for ${invoice_number}`]
        );
      }

      // 8. Update original sale status
      const itemsStatus = await client.query('SELECT quantity, quantity_returned FROM sales_items WHERE sale_id = $1', [original_sale_id]);
      const allFully = itemsStatus.rows.every(i => Number(i.quantity) === Number(i.quantity_returned));
      const anyPart = itemsStatus.rows.some(i => Number(i.quantity_returned) > 0);
      const newStatus = allFully ? 'full' : (anyPart ? 'partial' : 'none');

      await client.query('UPDATE sales_master SET return_status = $1 WHERE id = $2', [newStatus, original_sale_id]);

      await client.query('COMMIT');
      return res.status(201).json({
        success: true,
        message: 'Return processed successfully',
        data: {
          id: returnId,
          invoice_number: invoice_number,
          total_amount: -total_refund,
          items: insertedItems
        }
      });
    }

    // ========================================
    // NORMAL SALE LOGIC
    // ========================================
    // Generate invoice number
    const tsRes = await client.query(`SELECT to_char(NOW(), 'YYYYMMDDHH24MISS') AS ts`);
    const ts = tsRes.rows[0]?.ts || String(Date.now());
    const rnd = Math.floor(Math.random() * 9000) + 1000;
    const invoice_number = `S-${ts}-${rnd}`;

    const normalizePhone = (p) => {
      if (!p) return null;
      let d = p.replace(/\D/g, '');
      if (d.startsWith('977') && d.length > 10) d = d.substring(3);
      return d;
    };

    const normPhone = normalizePhone(req.body.customer_phone);

    // Sync customer to CRM if phone exists
    if (normPhone) {
      const checkRes = await client.query('SELECT id, name FROM customers WHERE phone = $1', [normPhone]);
      if (checkRes.rows.length === 0) {
        await client.query(`
          INSERT INTO customers (name, phone, age_range, gender, created_at, updated_at) 
          VALUES ($1, $2, $3, $4, NOW(), NOW())
        `, [
          customer_name || 'Unknown', 
          normPhone, 
          req.body.age_range || null, 
          req.body.gender || null
        ]);
      }
    }

    const masterRes = await client.query(
      `INSERT INTO sales_master (invoice_number, customer_name, customer_phone, sale_date, discount, tax, payment_method, amount_paid, change_amount)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)
       RETURNING id, invoice_number, sale_date`,
      [invoice_number, customer_name || null, normPhone, discount, tax, payment_method, amount_paid, change_amount]
    );
    const saleId = masterRes.rows[0]?.id;

    let subtotal = 0;
    const insertedItems = [];
    for (const it of items) {
      const quantity = Number(it.quantity);
      const price = Number(it.price);
      const amount = quantity * price;
      subtotal += amount;

      const ir = await client.query(
        `INSERT INTO sales_items (sale_id, product_code, product_name, quantity, price, amount)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, product_code, product_name, quantity, price, amount`,
        [saleId, it.product_code, it.product_name || null, quantity, price, amount]
      );
      if (ir.rows[0]) insertedItems.push(ir.rows[0]);

      // FIFO: Deduct from active batches
      const activeBatchesRes = await client.query(`
        SELECT * FROM stock_batches 
        WHERE product_code = $1 AND is_exhausted = FALSE 
        ORDER BY batch_date ASC, id ASC FOR UPDATE
      `, [it.product_code]);
      
      let qtyToDeduct = quantity;
      
      for (const batch of activeBatchesRes.rows) {
        if (qtyToDeduct <= 0) break;
        
        const rem = Number(batch.quantity_remaining);
        if (rem >= qtyToDeduct) {
          // deduct full current qty
          await client.query(`UPDATE stock_batches SET quantity_remaining = $1, is_exhausted = $2 WHERE id = $3`, 
            [rem - qtyToDeduct, (rem === qtyToDeduct), batch.id]
          );
          await client.query(`
            INSERT INTO sale_batches (sale_id, batch_id, quantity_sold, cost_price, mrp)
            VALUES ($1, $2, $3, $4, $5)
          `, [saleId, batch.id, qtyToDeduct, batch.cost_price, batch.mrp]);
          qtyToDeduct = 0;
        } else {
          // exhaust this batch and continue
          await client.query(`UPDATE stock_batches SET quantity_remaining = 0, is_exhausted = TRUE WHERE id = $1`, [batch.id]);
          await client.query(`
            INSERT INTO sale_batches (sale_id, batch_id, quantity_sold, cost_price, mrp)
            VALUES ($1, $2, $3, $4, $5)
          `, [saleId, batch.id, rem, batch.cost_price, batch.mrp]);
          qtyToDeduct -= rem;
        }
      }
      
      if (qtyToDeduct > 0) {
        // Log warning for negative theoretical stock 
        console.warn(`[FIFO WARNING] Sold ${qtyToDeduct} of ${it.product_code} beyond recorded active batches.`);
      }

      // Update stock: decrease balance_qty after sale
      const prevStock = await client.query(
        'SELECT balance_qty, balance_amt FROM stock_movements WHERE product_code = $1 ORDER BY extracted_month DESC NULLS LAST LIMIT 1',
        [it.product_code]
      );
      const prevQty = Number(prevStock.rows[0]?.balance_qty || 0);
      const prevAmt = Number(prevStock.rows[0]?.balance_amt || 0);
      const newQty = prevQty - quantity;
      const newAmt = prevAmt - amount;
      const month = new Date().getMonth() + 1;

      await client.query(
        `INSERT INTO stock_movements (
          product_code, description, inwards_qty, inwards_amt,
          outwards_qty, outwards_amt, balance_qty, balance_amt, last_cost,
          source_file, extracted_month
        ) VALUES ($1, $2, 0, 0, $3, $4, $5, $6, $7, $8, $9)`,
        [
          it.product_code,
          it.product_name || null,
          quantity,
          amount,
          newQty,
          newAmt,
          price,
          `Sale-${invoice_number}`,
          month
        ]
      );
    }

    const total_amount = subtotal - Number(discount) + Number(tax);
    await client.query(
      `UPDATE sales_master SET subtotal = $1, total_amount = $2, total_items = $3 WHERE id = $4`,
      [subtotal, total_amount, items.length, saleId]
    );

    await client.query('COMMIT');
    return res.status(201).json({
      success: true,
      data: {
        id: saleId,
        invoice_number: invoice_number,
        customer_name: customer_name,
        sale_date: masterRes.rows[0].sale_date,
        total_amount: total_amount,
        items: insertedItems
      }
    });

  } catch (err) {
    console.error('Transaction Error:', err);
    require('fs').writeFileSync('c:/Users/ACER/Desktop/stock wisely fyp/backend/last_sale_error.json', JSON.stringify({
      message: err.message,
      stack: err.stack,
      body: req.body
    }, null, 2));
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// ... existing updateSaleItem, getSales, getSaleDetails, getSaleById ...

// GET /api/sales/returns/list
exports.getReturns = async (req, res) => {
  try {
    const { startDate, endDate, customer } = req.query;
    let query = `
      SELECT sm.*, 
             orig.invoice_number as original_sale_invoice,
             (SELECT json_agg(si) FROM sales_items si WHERE si.sale_id = sm.id) as items
      FROM sales_master sm
      LEFT JOIN sales_master orig ON sm.original_sale_id = orig.id
      WHERE sm.is_return = TRUE
    `;
    const params = [];
    if (startDate) {
      params.push(startDate);
      query += ` AND sm.sale_date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND sm.sale_date <= $${params.length}`;
    }
    if (customer) {
      params.push(`%${customer}%`);
      query += ` AND sm.customer_name ILIKE $${params.length}`;
    }
    query += ` ORDER BY sm.sale_date DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/sales/returns/summary
exports.getReturnsSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const params = [];
    let dateFilter = '';

    if (startDate && endDate) {
      params.push(startDate, endDate);
      dateFilter = ' AND sale_date BETWEEN $1 AND $2';
    }

    const summary = await pool.query(`
      SELECT 
        COUNT(id)::int as total_returns,
        COALESCE(ABS(SUM(total_amount)), 0)::numeric as total_amount
      FROM sales_master
      WHERE is_return = TRUE ${dateFilter}
    `, params);

    // Top returned products
    const topProducts = await pool.query(`
      SELECT 
        product_name, 
        product_code, 
        COUNT(*)::int as return_count, 
        SUM(quantity)::int as total_qty
      FROM sales_items
      WHERE sale_id IN (SELECT id FROM sales_master WHERE is_return = TRUE ${dateFilter})
      GROUP BY product_name, product_code
      ORDER BY return_count DESC
      LIMIT 10
    `, params);

    // Returns by reason
    const reasons = await pool.query(`
      SELECT 
        COALESCE(return_reason, 'Other') as reason, 
        COUNT(*)::int as count
      FROM sales_items
      WHERE sale_id IN (SELECT id FROM sales_master WHERE is_return = TRUE ${dateFilter})
      GROUP BY reason
      ORDER BY count DESC
    `, params);

    res.json({
      success: true,
      data: {
        total_returns: summary.rows[0].total_returns,
        total_amount: parseFloat(summary.rows[0].total_amount),
        returned_products: topProducts.rows,
        top_reasons: reasons.rows
      }
    });
  } catch (error) {
    console.error('Error fetching returns summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/sales/customers/:customerName/credits
exports.getCustomerCredits = async (req, res) => {
  try {
    const { customerName } = req.params;
    const credits = await pool.query(`
      SELECT cc.*, 
             (SELECT json_agg(ct) FROM credit_transactions ct WHERE ct.credit_id = cc.id) as transactions
      FROM customer_credits cc
      WHERE cc.customer_name = $1
      ORDER BY cc.created_at DESC
    `, [customerName]);

    const balance = credits.rows.reduce((sum, c) => sum + parseFloat(c.balance), 0);
    res.json({ success: true, total_balance: balance, credits: credits.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// PUT /api/sales/items/:id
// { quantity: 5, price: 100 }
exports.updateSaleItem = async (req, res) => {
  const client = await pool.connect();
  try {
    const itemId = parseInt(req.params.id, 10);
    const { quantity, price } = req.body;

    if (!itemId || !Number.isFinite(Number(quantity)) || !Number.isFinite(Number(price))) {
      return res.status(400).json({ error: 'Invalid item ID, quantity, or price' });
    }
    if (Number(quantity) <= 0 || Number(price) < 0) {
      return res.status(400).json({ error: 'Quantity must be > 0 and Price must be >= 0' });
    }

    await client.query('BEGIN');

    // 1. Check if item exists and lock rows
    const itemRes = await client.query(`SELECT * FROM sales_items WHERE id = $1 FOR UPDATE`, [itemId]);
    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item not found' });
    }
    const oldItem = itemRes.rows[0];
    const saleId = oldItem.sale_id;

    // 2. Update the item
    const newAmount = Number(quantity) * Number(price);
    const updateRes = await client.query(
      `UPDATE sales_items 
       SET quantity = $1, price = $2, amount = $3 
       WHERE id = $4 
       RETURNING *`,
      [quantity, price, newAmount, itemId]
    );
    const updatedItem = updateRes.rows[0];

    // 3. Recalculate Sale Totals
    // Get all items for this sale to sum up
    const allItemsRes = await client.query(`SELECT amount FROM sales_items WHERE sale_id = $1`, [saleId]);
    const newSubtotal = allItemsRes.rows.reduce((sum, row) => sum + Number(row.amount), 0);

    // Get master to apply discount/tax
    const masterRes = await client.query(`SELECT discount, tax FROM sales_master WHERE id = $1`, [saleId]);
    const { discount, tax } = masterRes.rows[0];
    const newTotal = newSubtotal - Number(discount) + Number(tax);

    // 4. Update Master
    await client.query(
      `UPDATE sales_master 
       SET subtotal = $1, total_amount = $2 
       WHERE id = $3`,
      [newSubtotal, newTotal, saleId]
    );

    await client.query('COMMIT');

    // 5. Return updated data (item + new sale totals)
    return res.json({
      success: true,
      message: 'Item updated',
      data: {
        item: updatedItem,
        sale: {
          id: saleId,
          subtotal: newSubtotal,
          total_amount: newTotal
        }
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update Sale Item Error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// GET /api/sales - Get paginated sales with filters
exports.getSales = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      // Build WHERE clause for filters
      const whereConditions = [];
      const queryParams = [];
      let paramIndex = 1;

      // Date range filter
      if (req.query.startDate) {
        whereConditions.push(`sale_date >= $${paramIndex}`);
        queryParams.push(req.query.startDate);
        paramIndex++;
      }
      if (req.query.endDate) {
        whereConditions.push(`sale_date <= $${paramIndex}`);
        queryParams.push(req.query.endDate);
        paramIndex++;
      }

      if (req.query.customer) {
        whereConditions.push(`(customer_name ILIKE $${paramIndex} OR invoice_number ILIKE $${paramIndex})`);
        queryParams.push(`%${req.query.customer}%`);
        paramIndex++;
      }

      // Category filter
      if (req.query.category) {
        console.log('🔍 Filtering sales by category:', req.query.category); // DEBUG
        whereConditions.push(`
          EXISTS (
            SELECT 1 FROM sales_items si
            JOIN products p ON si.product_name = p.description
            WHERE si.sale_id = sales_master.id 
            AND p.category = $${paramIndex}
          )
        `);
        queryParams.push(req.query.category);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Get total count
      const countQuery = `SELECT COUNT(*)::bigint AS total FROM sales_master ${whereClause}`;
      const countResult = await client.query(
        whereConditions.length > 0 ? countQuery : countQuery,
        whereConditions.length > 0 ? queryParams : []
      );
      const total = parseInt(countResult.rows[0]?.total || 0, 10);

      // Get paginated sales
      queryParams.push(limit, offset);
      const salesQuery = `
        SELECT 
          id,
          invoice_number,
          customer_name,
          sale_date,
          total_amount,
          total_items,
          transaction_type,
          is_return,
          return_status
        FROM sales_master
        ${whereClause}
        ORDER BY sale_date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      const salesResult = await client.query(salesQuery, queryParams);

      res.json({
        success: true,
        data: salesResult.rows.map(row => ({
          id: row.id,
          invoice_number: row.invoice_number,
          customer_name: row.customer_name,
          sale_date: row.sale_date,
          total_amount: parseFloat(row.total_amount || 0),
          total_items: parseInt(row.total_items || 0, 10),
          transaction_type: row.transaction_type || 'sale',
          is_return: row.is_return || false,
          return_status: row.return_status || 'none'
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// GET /api/sales/details/:invoiceNumber - Get sale details by invoice number
exports.getSaleDetails = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const invoiceNumber = req.params.invoiceNumber;

      // Get master record
      const masterResult = await client.query(
        `SELECT id, invoice_number, customer_name, sale_date, total_amount, total_items, transaction_type, is_return, return_status
         FROM sales_master
         WHERE invoice_number = $1`,
        [invoiceNumber]
      );

      if (masterResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found',
        });
      }

      const master = masterResult.rows[0];

      // Get items
      const itemsResult = await client.query(
        `SELECT id, COALESCE((SELECT p.product_code FROM products p WHERE LOWER(p.description) = LOWER(si.product_name) LIMIT 1), si.product_code) AS product_code, product_name, quantity, price, amount
         FROM sales_items si
         WHERE si.sale_id = $1
         ORDER BY si.id ASC`,
        [master.id]
      );

      res.json({
        success: true,
        data: {
          id: master.id,
          invoice_number: master.invoice_number,
          customer_name: master.customer_name,
          sale_date: master.sale_date,
          total_amount: parseFloat(master.total_amount || 0),
          total_items: parseInt(master.total_items || 0, 10),
          transaction_type: master.transaction_type || 'sale',
          is_return: master.is_return || false,
          return_status: master.return_status || 'none',
          items: itemsResult.rows.map(row => ({
            id: row.id,
            product_code: row.product_code,
            product_name: row.product_name,
            quantity: parseInt(row.quantity || 0, 10),
            price: parseFloat(row.price || 0),
            amount: parseFloat(row.amount || 0),
          })),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get sale details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sale details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// GET /api/sales/:id
exports.getSaleById = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: 'invalid id' });
      }

      const masterRes = await client.query(
        `SELECT id, invoice_number, customer_name, sale_date, total_amount, total_items, transaction_type, is_return, return_status
         FROM sales_master WHERE id = $1`,
        [id]
      );

      if (masterRes.rows.length === 0) {
        return res.status(404).json({ error: 'sale not found' });
      }

      const itemsRes = await client.query(
        `SELECT id, COALESCE((SELECT p.product_code FROM products p WHERE LOWER(p.description) = LOWER(si.product_name) LIMIT 1), si.product_code) AS product_code, product_name, quantity, price, amount
         FROM sales_items si WHERE si.sale_id = $1
         ORDER BY si.id ASC`,
        [id]
      );

      return res.json({
        success: true,
        data: {
          ...masterRes.rows[0],
          items: itemsRes.rows,
        },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

