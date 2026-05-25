const { pool } = require('../config/database');

exports.searchVendors = async (req, res) => {
  try {
    const query = (req.query.query || '').trim();
    if (query.length < 2) {
      return res.json({ success: true, data: [] });
    }
    const like = `%${query.toLowerCase()}%`;
    const result = await pool.query(
      `SELECT id, name, contact_person, email, phone, address
       FROM vendors
       WHERE LOWER(name) LIKE $1
       ORDER BY name ASC
       LIMIT 20`,
      [like]
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    // If table doesn't exist or other error, return safe empty result
    if (error && error.code === '42P01') {
      return res.json({ success: true, data: [] });
    }
    console.error('Search vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search vendors',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.createVendor = async (req, res) => {
  try {
    const {
      name,
      contact_person,
      email,
      phone,
      address
    } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Vendor name is required' });
    }

    // Check for duplicate by name (case-insensitive)
    const dup = await pool.query(
      `SELECT id FROM vendors WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [name.trim()]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Vendor with this name already exists' });
    }

    const result = await pool.query(
      `INSERT INTO vendors (name, contact_person, email, phone, address, tax_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, contact_person, email, phone, address, tax_number`,
      [name.trim(), contact_person || null, email || null, phone || null, address || null, req.body.tax_number || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Vendor created',
      data: result.rows[0]
    });
  } catch (error) {
    // Handle missing table gracefully
    if (error && error.code === '42P01') {
      return res.status(500).json({
        success: false,
        message: 'Vendors table not found; please ensure database is migrated'
      });
    }
    console.error('Create vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vendor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// List vendors with summary stats
exports.listVendors = async (req, res) => {
  try {
    const { q = '', status = 'all', page = 1, limit = 20, sort = 'name', startDate, endDate } = req.query || {};
    const pageInt = Number.isFinite(parseInt(page, 10)) ? parseInt(page, 10) : 1;
    const limitInt = Number.isFinite(parseInt(limit, 10)) ? parseInt(limit, 10) : 20;
    const safePage = Math.max(1, pageInt);
    const safeLimit = Math.max(1, limitInt);
    const offset = (safePage - 1) * safeLimit;

    const search = (q || '').trim().toLowerCase();
    const whereVendor = [];
    const params = [];
    let pi = 1;

    if (search.length >= 2) {
      whereVendor.push(`(LOWER(v.name) LIKE $${pi} OR LOWER(v.contact_person) LIKE $${pi} OR LOWER(v.phone) LIKE $${pi})`);
      params.push(`%${search}%`);
      pi++;
    }
    if (status === 'active') {
      whereVendor.push(`COALESCE(v.is_active, TRUE) = TRUE`);
    } else if (status === 'inactive') {
      whereVendor.push(`COALESCE(v.is_active, TRUE) = FALSE`);
    }

    const whereVendorClause = whereVendor.length ? `WHERE ${whereVendor.join(' AND ')}` : '';

    // Date filters for purchases
    const wherePurchase = [];
    if (startDate) {
      wherePurchase.push(`pm.purchase_date >= $${pi}`);
      params.push(startDate);
      pi++;
    }
    if (endDate) {
      wherePurchase.push(`pm.purchase_date <= $${pi}`);
      params.push(endDate);
      pi++;
    }
    const wherePurchaseClause = wherePurchase.length ? `AND ${wherePurchase.join(' AND ')}` : '';

    const sortMap = {
      name: 'v.name ASC',
      total_spent: 'total_spent DESC',
      outstanding: 'outstanding DESC',
      last_purchase: 'last_purchase DESC NULLS LAST'
    };
    const sortClause = sortMap[sort] || sortMap.name;

    const query = `
      SELECT 
        v.id,
        v.name,
        v.contact_person,
        v.email,
        v.phone,
        v.address,
        COALESCE(v.is_active, TRUE) AS is_active,
        v.created_at,
        COUNT(pm.id) AS purchases_count,
        ROUND(COALESCE(SUM(pm.total_amount), 0)::numeric, 2) AS total_spent,
        ROUND(COALESCE(SUM(pm.current_due_amount), 0)::numeric, 2) AS outstanding,
        MAX(pm.purchase_date) AS last_purchase
      FROM vendors v
      LEFT JOIN purchase_master pm 
        ON (LOWER(pm.vendor_name) = LOWER(v.name))
        ${wherePurchaseClause}
      ${whereVendorClause}
      GROUP BY v.id
      ORDER BY ${sortClause}
      LIMIT $${pi} OFFSET $${pi + 1}
    `;
    params.push(safeLimit);
    params.push(offset);

    const rows = await pool.query(query, params);
    console.log('Vendors list params:', { q, status, page: safePage, limit: safeLimit, startDate, endDate });
    console.log('Vendors list count:', rows.rows.length);

    res.json({ success: true, data: rows.rows });
  } catch (error) {
    console.error('List vendors error:', error);
    res.status(500).json({ success: false, message: 'Failed to list vendors' });
  }
};

// Single vendor details with aggregates
exports.getVendor = async (req, res) => {
  try {
    const id = req.params.id;
    const vendorRes = await pool.query(
      `SELECT id, name, contact_person, email, phone, address, COALESCE(is_active, TRUE) AS is_active, created_at
       FROM vendors WHERE id = $1`,
      [id]
    );
    if (vendorRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    const vendor = vendorRes.rows[0];

    // Basic summary
    const aggRes = await pool.query(
      `SELECT 
         COUNT(pm.id) AS purchases_count,
         ROUND(COALESCE(SUM(pm.total_amount), 0)::numeric, 2) AS total_spent,
         ROUND(LEAST(
           COALESCE(SUM(pm.amount_paid), 0),
           COALESCE(SUM(pm.total_amount), 0)
         )::numeric, 2) AS total_paid,
         ROUND(COALESCE(SUM(pm.current_due_amount), 0)::numeric, 2) AS outstanding,
         ROUND(COALESCE(SUM(CASE WHEN pm.due_date < NOW() AND pm.current_due_amount > 0 THEN pm.current_due_amount ELSE 0 END), 0)::numeric, 2) AS overdue
       FROM purchase_master pm
       WHERE LOWER(pm.vendor_name) = LOWER($1)`,
      [vendor.name]
    );
    const agg = aggRes.rows[0];

    // FIFO Batch metrics: Realized profit and active stock
    const batchMetricsRes = await pool.query(
      `SELECT 
         COALESCE(SUM(sab.quantity_sold * (sab.mrp - sab.cost_price)), 0) as realized_profit,
         COALESCE(SUM(sb.quantity_remaining), 0) as remaining_batch_qty,
         COALESCE(SUM(sb.quantity_remaining * sb.cost_price), 0) as remaining_batch_value,
         COUNT(sb.id) as active_batches_count
       FROM stock_batches sb
       LEFT JOIN sale_batches sab ON sb.id = sab.batch_id
       WHERE sb.vendor_id = $1 AND sb.is_exhausted = FALSE`,
      [id]
    );
    const batchMetrics = batchMetricsRes.rows[0];

    res.json({ 
      success: true, 
      data: { 
        vendor, 
        summary: { ...agg, ...batchMetrics } 
      } 
    });

  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor' });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, contact_person, email, phone, address, tax_number, is_active } = req.body || {};
    const result = await pool.query(
      `UPDATE vendors
       SET 
         name = COALESCE($1, name),
         contact_person = COALESCE($2, contact_person),
         email = COALESCE($3, email),
         phone = COALESCE($4, phone),
         address = COALESCE($5, address),
         tax_number = COALESCE($6, tax_number),
         is_active = COALESCE($7, is_active)
       WHERE id = $8
       RETURNING id, name, contact_person, email, phone, address, tax_number, COALESCE(is_active, TRUE) AS is_active, created_at`,
      [name, contact_person, email, phone, address, tax_number, is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ success: false, message: 'Failed to update vendor' });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const id = req.params.id;

    // First fetch the vendor's name because purchase_master uses vendor_name
    const vendRes = await pool.query(`SELECT name FROM vendors WHERE id = $1`, [id]);
    if (vendRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }
    const vendorName = vendRes.rows[0].name;

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM purchase_master WHERE LOWER(vendor_name) = LOWER($1)`,
      [vendorName]
    );
    const hasPurchases = (countRes.rows[0]?.cnt || 0) > 0;
    if (hasPurchases) {
      try {
        await pool.query(`UPDATE vendors SET is_active = FALSE WHERE id = $1`, [id]);
        return res.json({ success: true, message: 'Vendor soft-deleted (set inactive)' });
      } catch (e) {
        // Fallback if is_active column missing
        return res.status(409).json({
          success: false,
          message: 'Soft delete requires is_active column. Please add is_active boolean to vendors.'
        });
      }
    } else {
      try {
        await pool.query(`DELETE FROM vendors WHERE id = $1`, [id]);
        return res.json({ success: true, message: 'Vendor deleted' });
      } catch (deleteErr) {
        if (deleteErr.code === '23503') {
          // Foreign key constraint violation (e.g., from vendor_ledger or payment_transactions)
          try {
            await pool.query(`UPDATE vendors SET is_active = FALSE WHERE id = $1`, [id]);
            return res.json({ success: true, message: 'Vendor soft-deleted (set inactive) due to existing financial records' });
          } catch (e) {
            return res.status(409).json({
              success: false,
              message: 'Cannot delete vendor due to related records, and soft delete failed.'
            });
          }
        } else {
          throw deleteErr;
        }
      }
    }
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete vendor' });
  }
};

exports.getVendorPurchases = async (req, res) => {
  try {
    const id = req.params.id;
    const vendRes = await pool.query(`SELECT name FROM vendors WHERE id = $1`, [id]);
    const name = vendRes.rows[0]?.name || '';
    const result = await pool.query(
      `SELECT id, invoice_number,
         total_amount,
         LEAST(COALESCE(amount_paid, 0), total_amount) AS amount_paid,
         current_due_amount as due_amount,
         due_date, purchase_date, payment_status, payment_method, notes,
         is_return, transaction_type
       FROM purchase_master
       WHERE LOWER(vendor_name) = LOWER($1)
       ORDER BY purchase_date DESC`,
      [name]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get vendor purchases error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch purchases' });
  }
};

exports.getVendorProducts = async (req, res) => {
  try {
    const id = req.params.id;
    const vendRes = await pool.query(`SELECT name FROM vendors WHERE id = $1`, [id]);
    const name = vendRes.rows[0]?.name || '';
    const result = await pool.query(
      `SELECT 
         pi.product_name,
         pi.product_code,
         SUM(pi.quantity)::int AS total_quantity,
         SUM(pi.amount)::numeric AS total_value,
         COALESCE(SUM(sab.quantity_sold * (sab.mrp - sab.cost_price)), 0) as realized_profit,
         COALESCE(SUM(sb.quantity_remaining), 0) as remaining_qty
       FROM purchase_items pi
       JOIN purchase_master pm ON pm.id = pi.purchase_id
       LEFT JOIN stock_batches sb ON sb.product_code = pi.product_code AND sb.vendor_id = $1
       LEFT JOIN sale_batches sab ON sb.id = sab.batch_id
       WHERE LOWER(pm.vendor_name) = LOWER($2)
       GROUP BY pi.product_name, pi.product_code
       ORDER BY total_quantity DESC, total_value DESC`,
      [id, name]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get vendor products error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor products' });
  }
};

exports.getVendorPayments = async (req, res) => {
  try {
    const id = req.params.id;
    // Modified to use payment_transactions
    const result = await pool.query(
      `SELECT id, purchase_id, payment_date, payment_amount as amount, payment_method as method, reference_number as reference, notes, created_at
       FROM payment_transactions
       WHERE vendor_id = $1
       ORDER BY payment_date DESC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    if (error && error.code === '42P01') {
      return res.json({ success: true, data: [] });
    }
    console.error('Get vendor payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
};

exports.recordPayment = async (req, res) => {
  const client = await pool.connect();
  try {
    const vendorId = req.params.id;
    const { purchase_id, amount, method, payment_date, reference, notes } = req.body || {};

    if (!purchase_id || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'purchase_id and positive amount are required' });
    }

    await client.query('BEGIN');

    // 1. Get Purchase to validate amount AND lock it
    const pr = await client.query(`SELECT total_amount, amount_paid, current_due_amount, payment_status FROM purchase_master WHERE id = $1 FOR UPDATE`, [purchase_id]);
    if (pr.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }
    const purchase = pr.rows[0];
    const currentDue = Number(purchase.current_due_amount || 0);
    const payAmount = Number(amount);

    // Validation: Check if paying more than due
    if (payAmount > currentDue + 0.01) { // allowance for float epsilon
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Amount ${payAmount} exceeds current due amount ${currentDue}`
      });
    }

    // 2. Insert into payment_transactions
    await client.query(
      `INSERT INTO payment_transactions (purchase_id, vendor_id, payment_date, payment_amount, payment_method, notes, reference_number)
       VALUES ($1, $2, COALESCE($3::timestamptz, NOW()), $4, $5, $6, $7)`,
      [purchase_id, vendorId, payment_date || null, payAmount, method || null, notes || null, reference || null]
    );

    // 2.5 ADDED: Insert into vendor_ledger
    await client.query(
      `INSERT INTO vendor_ledger (
        vendor_id, transaction_date, transaction_type, reference_number, 
        credit, description
      ) VALUES ($1, COALESCE($2::timestamptz, NOW()), 'Payment', $3, $4, $5)`,
      [
        vendorId,
        payment_date || null,
        reference || `PMT-${purchase_id}`,
        payAmount,
        notes || `Payment for Purchase Invoice #${purchase.invoice_number || purchase_id}`
      ]
    );

    // 3. Update purchase_master (cap amount_paid at total_amount to avoid rounding mismatch with ledger)
    const totalAmount = Number(purchase.total_amount || 0);
    const newPaid = Math.min(Number(purchase.amount_paid || 0) + payAmount, totalAmount);
    const newDue = Math.max(0, totalAmount - newPaid);

    let status = 'Partial Payment';
    if (newDue <= 0.01) status = 'Paid';
    else if (newPaid === 0) status = 'Pending';

    await client.query(
      `UPDATE purchase_master
       SET amount_paid = $1, current_due_amount = $2, due_amount = $2, payment_status = $3, last_payment_date = NOW()
       WHERE id = $4`,
      [newPaid, newDue, status, purchase_id]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Payment recorded', data: { purchase_id, amount, method, due_amount: newDue, payment_status: status } });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error && error.code === '42P01') {
      return res.status(500).json({ success: false, message: 'payment_transactions table not found; please run migration' });
    }
    console.error('Record payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  } finally {
    client.release();
  }
};

exports.getStatistics = async (req, res) => {
  try {
    const statsRes = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM vendors WHERE COALESCE(is_active, TRUE) = TRUE) AS active_vendors,
        (SELECT COUNT(*)::int FROM vendors) AS total_vendors,
        COALESCE((SELECT SUM(current_due_amount) FROM purchase_master), 0) AS total_payables,
        COALESCE((SELECT SUM(current_due_amount) FROM purchase_master WHERE due_date < NOW() AND current_due_amount > 0), 0) AS overdue
    `);
    res.json({ success: true, data: statsRes.rows[0] });
  } catch (error) {
    console.error('Get vendor stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
};

exports.getVendorLedger = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const { startDate, endDate } = req.query || {};

    const params = [vendorId];
    let pi = 2;
    let dateFilter = '';

    if (startDate) {
      dateFilter += ` AND transaction_date >= $${pi++}`;
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ` AND transaction_date <= $${pi++}`;
      params.push(endDate);
    }

    const query = `
      SELECT 
        id,
        transaction_date,
        transaction_type,
        reference_number,
        debit,
        credit,
        description
      FROM vendor_ledger
      WHERE vendor_id = $1
      ORDER BY transaction_date ASC, id ASC
    `;

    const result = await pool.query(query, [vendorId]);
    let rawTransactions = result.rows;

    // Calculate running balance in JS to avoid SQL float precision issues
    let runningBalance = 0;
    const allWithBalance = rawTransactions.map(txn => {
      // Use integer math (paisa/cents) for precision
      const debitCents = Math.round(Number(txn.debit) * 100);
      const creditCents = Math.round(Number(txn.credit) * 100);
      runningBalance = runningBalance + debitCents - creditCents;

      return {
        ...txn,
        balance: runningBalance / 100
      };
    });

    // Apply date filters manually in JS after calculating balance
    let filteredTransactions = allWithBalance;
    if (startDate) {
      const start = new Date(startDate);
      filteredTransactions = filteredTransactions.filter(t => new Date(t.transaction_date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filteredTransactions = filteredTransactions.filter(t => new Date(t.transaction_date) <= end);
    }

    // Return in descending order for display
    filteredTransactions.sort((a, b) => {
      const dateA = new Date(a.transaction_date);
      const dateB = new Date(b.transaction_date);
      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;
      return b.id - a.id;
    });

    res.json({
      success: true,
      data: filteredTransactions
    });
  } catch (error) {
    console.error('Get vendor ledger error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor ledger' });
  }
};

// GET /api/vendors/:id/batches -- Fetch active and exhausted batches for this vendor
exports.getVendorBatches = async (req, res) => {
  try {
    const vendorId = req.params.id;
    
    // Active batches
    const activeRes = await pool.query(`
      SELECT sb.id, sb.product_code, p.description as product_name, sb.batch_date, sb.quantity_added, sb.quantity_remaining, sb.cost_price, sb.mrp
      FROM stock_batches sb
      LEFT JOIN products p ON sb.product_code = p.product_code
      WHERE sb.vendor_id = $1 AND sb.is_exhausted = FALSE
      ORDER BY sb.batch_date DESC
    `, [vendorId]);

    // Exhausted batches (with realized profit from sale_batches)
    const exhaustedRes = await pool.query(`
      SELECT sb.id, sb.product_code, p.description as product_name, sb.batch_date, sb.quantity_added, sb.cost_price, sb.mrp,
             COALESCE(SUM(saleb.quantity_sold), 0) as quantity_sold,
             COALESCE(SUM(saleb.quantity_sold * (saleb.mrp - saleb.cost_price)), 0) as realized_profit
      FROM stock_batches sb
      LEFT JOIN products p ON sb.product_code = p.product_code
      LEFT JOIN sale_batches saleb ON sb.id = saleb.batch_id
      WHERE sb.vendor_id = $1 AND sb.is_exhausted = TRUE
      GROUP BY sb.id, p.description
      ORDER BY sb.batch_date DESC
    `, [vendorId]);

    res.json({
      success: true,
      data: {
        active: activeRes.rows,
        exhausted: exhaustedRes.rows
      }
    });

  } catch (error) {
    console.error('Get vendor batches error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor batches' });
  }
};
