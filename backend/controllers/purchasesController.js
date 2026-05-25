const { pool } = require('../config/database');

// Create a new purchase
exports.createPurchase = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      transaction_type = 'purchase',
      original_purchase_id,
      vendor_id,
      vendor_name,
      contact_person,
      vendor_contact,
      email,
      phone,
      address,
      items,
      return_method,
      return_type,
      return_date,
      subtotal,
      shipping_freight = 0,
      tax_vat = 0,
      total_amount,
      payment_status,
      payment_method,
      amount_paid = 0,
      due_amount,
      due_date,
      credit_note_number,
      notes,
      reference
    } = req.body || {};

    // Validation
    if (!vendor_name || !vendor_name.trim()) {
      return res.status(400).json({ error: 'Vendor name is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required and cannot be empty' });
    }

    for (const it of items) {
      const unitCost = Number(it.cost_price ?? it.cost ?? it.price);
      if (!it || !it.product_code || !Number.isFinite(Number(it.quantity)) || !Number.isFinite(unitCost)) {
        return res.status(400).json({ error: 'Each item requires product_code, quantity (number), and cost (number)' });
      }
      if (Number(it.quantity) <= 0 || unitCost < 0) {
        return res.status(400).json({ error: 'Quantity must be > 0 and cost must be >= 0' });
      }
    }

    await client.query('BEGIN');

    // ========================================
    // PURCHASE RETURN LOGIC
    // ========================================
    if (transaction_type === 'return') {
      console.log('[Purchase Return] Starting return process...');
      if (!original_purchase_id) {
        throw new Error('original_purchase_id is required for returns');
      }

      // 1. Validate original purchase exists
      const origRes = await client.query('SELECT * FROM purchase_master WHERE id = $1', [original_purchase_id]);
      if (origRes.rows.length === 0) {
        throw new Error('Original purchase not found');
      }
      const originalPurchase = origRes.rows[0];

      if (originalPurchase.return_status === 'full') {
        throw new Error('This purchase has already been fully returned');
      }

      // 2. Generate return invoice number
      const returnNumberResult = await client.query(`
        SELECT 'PR-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
               LPAD((COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INT)), 0) + 1)::TEXT, 4, '0')
        FROM purchase_master
        WHERE invoice_number LIKE 'PR-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%'
        AND is_return = TRUE
      `);

      const invoice_number = returnNumberResult.rows[0] ? returnNumberResult.rows[0]['?column?'] : 'PR-2026-0001';
      console.log('[Purchase Return] Generated invoice:', invoice_number);

      // 3. Use selected items from the request (user-selected items to return)
      // The frontend sends only the items the user selected with their return quantities
      let total_return_value = 0;

      for (const item of items) {
        const unitPrice = Number(item.price);
        const qty = Number(item.quantity);
        total_return_value += unitPrice * qty;
      }

      console.log('[Purchase Return] Total return value:', total_return_value);
      console.log('[Purchase Return] Items to return:', items.length);

      // 4. Create return master record (NEGATIVE amount)
      const returnMasterResult = await client.query(`
        INSERT INTO purchase_master 
        (invoice_number, transaction_type, is_return, original_purchase_id, 
         vendor_name, vendor_contact, 
         total_amount, return_type, payment_status, payment_method, 
         amount_paid, current_due_amount, due_amount, due_date, notes, purchase_date)
        VALUES ($1, 'return', TRUE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11, $12, $13)
        RETURNING *
      `, [
        invoice_number,
        original_purchase_id,
        vendor_name || originalPurchase.vendor_name,
        contact_person || vendor_contact || originalPurchase.vendor_contact || null,
        -Math.abs(total_return_value), // NEGATIVE
        return_method || return_type || 'refund',
        payment_status || 'Pending',
        payment_method || 'Cash',
        amount_paid,
        due_amount || total_return_value,
        due_date,
        notes || `Return from purchase ${originalPurchase.invoice_number}`,
        return_date || new Date()
      ]);

      const return_id = returnMasterResult.rows[0].id;
      console.log('[Purchase Return] Created return master ID:', return_id);

      // 5. Process each selected item
      const insertedItems = [];
      const month = new Date().getMonth() + 1;

      for (const item of items) {
        const returnQty = Number(item.quantity);
        const unitPrice = Number(item.price);
        const returnAmount = returnQty * unitPrice;

        // Insert return item with POSITIVE quantity (to satisfy CHECK constraint)
        await client.query(`
          INSERT INTO purchase_items 
          (purchase_id, product_code, product_name, quantity, price, amount)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          return_id,
          item.product_code,
          item.product_name,
          returnQty,       // Positive quantity (satisfies CHECK > 0)
          unitPrice,
          returnAmount
        ]);

        // Update quantity_returned in original purchase items
        await client.query(`
          UPDATE purchase_items 
          SET quantity_returned = COALESCE(quantity_returned,0) + $1
          WHERE purchase_id = $2 AND product_code = $3
        `, [returnQty, original_purchase_id, item.product_code]);

        // Get current stock
        const stockResult = await client.query(
          'SELECT stock FROM products WHERE product_code = $1',
          [item.product_code]
        );

        if (stockResult.rows.length === 0) {
          throw new Error(`Product ${item.product_name} not found in inventory`);
        }

        const current_stock = stockResult.rows[0].stock;

        // Decrease stock (we're returning to vendor)
        await client.query(
          'UPDATE products SET stock = COALESCE(stock, 0) - $1 WHERE product_code = $2',
          [returnQty, item.product_code]
        );

        console.log(`[Purchase Return] Stock updated for ${item.product_name}: ${current_stock} -> ${current_stock - returnQty}`);

        // Record stock movement (OUTWARDS)
        const prevStock = await client.query(
          'SELECT balance_qty, balance_amt FROM stock_movements WHERE product_code = $1 ORDER BY extracted_month DESC NULLS LAST LIMIT 1',
          [item.product_code]
        );

        const prevQty = Number(prevStock.rows[0]?.balance_qty || 0);
        const prevAmt = Number(prevStock.rows[0]?.balance_amt || 0);
        const newQty = prevQty - returnQty;
        const newAmt = prevAmt - returnAmount;

        await client.query(`
          INSERT INTO stock_movements 
          (product_code, description, inwards_qty, inwards_amt,
           outwards_qty, outwards_amt, balance_qty, balance_amt, last_cost,
           source_file, extracted_month)
          VALUES ($1, $2, 0, 0, $3, $4, $5, $6, $7, $8, $9)
        `, [
          item.product_code,
          item.product_name,
          returnQty,
          returnAmount,
          newQty,
          newAmt,
          unitPrice,
          `PReturn-${invoice_number}`,
          month
        ]);

        insertedItems.push({
          product_code: item.product_code,
          product_name: item.product_name,
          quantity: returnQty,
          price: unitPrice,
          amount: returnAmount
        });
      }

      // Correct the total on the return master to be negative (triggers may have overwritten it)
      await client.query(
        'UPDATE purchase_master SET total_amount = $1, total_items = $2 WHERE id = $3',
        [-Math.abs(total_return_value), items.length, return_id]
      );

      // 6. Update vendor ledger based on return method
      const vendorIdent = vendor_id || originalPurchase.vendor_id;
      const r_type = return_method || return_type || 'refund';
      const returnMethodLower = (r_type).toLowerCase();

      const vendRes = await client.query(`SELECT id FROM vendors WHERE LOWER(name) = LOWER($1)`, [vendor_name || originalPurchase.vendor_name]);
      const actualVendorId = vendRes.rows[0]?.id || vendorIdent;

      if (actualVendorId) {
        if (returnMethodLower.includes('refund') || returnMethodLower.includes('reduce')) {
          // Credit entry (reduces what we owe vendor)
          await client.query(`
            INSERT INTO vendor_ledger 
            (vendor_id, transaction_date, transaction_type, reference_number, 
             debit, credit, description)
            VALUES ($1, $2, 'Purchase Return', $3, 0, $4, $5)
          `, [
            actualVendorId,
            return_date || new Date(),
            invoice_number,
            total_return_value,
            `Purchase Return ${invoice_number} - Refund`
          ]);
          console.log('[Purchase Return] Vendor ledger credit entry added');
        } else if (returnMethodLower.includes('credit') || returnMethodLower.includes('note')) {
          // Create vendor credit for future use
          await client.query(`
            INSERT INTO vendor_credits 
            (vendor_id, credit_amount, balance, source_return_id, return_number, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            actualVendorId,
            total_return_value,
            total_return_value,
            return_id,
            invoice_number,
            credit_note_number || `Credit Note from return ${invoice_number}`
          ]);

          await client.query(`
            INSERT INTO vendor_ledger 
            (vendor_id, transaction_date, transaction_type, reference_number, 
             debit, credit, description)
            VALUES ($1, $2, 'Purchase Return', $3, 0, $4, $5)
          `, [
            actualVendorId,
            return_date || new Date(),
            invoice_number,
            total_return_value,
            `Purchase Return ${invoice_number} - Credit Note`
          ]);
          console.log('[Purchase Return] Vendor credit created');
        } else if (returnMethodLower.includes('replacement') || returnMethodLower.includes('exchange')) {
          // No financial impact, just record for tracking
          await client.query(`
            INSERT INTO vendor_ledger 
            (vendor_id, transaction_date, transaction_type, reference_number, 
             debit, credit, description)
            VALUES ($1, $2, 'Purchase Return', $3, 0, 0, $4)
          `, [
            actualVendorId,
            return_date || new Date(),
            invoice_number,
            `Purchase Return ${invoice_number} - Replacement (No Financial Impact)`
          ]);
          console.log('[Purchase Return] Replacement recorded (no financial impact)');
        }
      }

      // 7. Update return_status on original purchase
      const updatedItemsResult = await client.query(
        'SELECT quantity, quantity_returned FROM purchase_items WHERE purchase_id = $1',
        [original_purchase_id]
      );

      const allFullyReturned = updatedItemsResult.rows.every(
        item => Number(item.quantity) === Number(item.quantity_returned)
      );

      const anyPartiallyReturned = updatedItemsResult.rows.some(
        item => Number(item.quantity_returned) > 0
      );

      const new_return_status = allFullyReturned ? 'full' :
        (anyPartiallyReturned ? 'partial' : 'none');

      await client.query(
        'UPDATE purchase_master SET return_status = $1 WHERE id = $2',
        [new_return_status, original_purchase_id]
      );

      console.log(`[Purchase Return] Original purchase status updated to: ${new_return_status}`);

      await client.query('COMMIT');

      return res.status(201).json({
        success: true,
        message: 'Purchase return processed successfully',
        return_invoice: invoice_number,
        return_value: total_return_value,
        original_purchase_id: original_purchase_id,
        new_return_status: new_return_status,
        data: {
          id: return_id,
          invoice_number: invoice_number,
          total_amount: -Math.abs(total_return_value),
          items: insertedItems
        }
      });
    }

    // ========================================
    // NORMAL PURCHASE LOGIC
    // ========================================

    // 1. Generate Invoice Number
    const invoiceNumberResult = await client.query(`
      SELECT 'PUR-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || 
             LPAD((COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 10) AS INT)), 0) + 1)::TEXT, 4, '0')
      FROM purchase_master
      WHERE invoice_number LIKE 'PUR-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%'
      AND is_return = FALSE
    `);
    const invoice_number = invoiceNumberResult.rows[0] && invoiceNumberResult.rows[0]['?column?'] ? invoiceNumberResult.rows[0]['?column?'] : 'PUR-' + new Date().getFullYear() + '-0001';

    // 2. Insert into purchase_master
    const masterResult = await client.query(`
      INSERT INTO purchase_master 
      (invoice_number, vendor_name, vendor_contact,
       subtotal, shipping_cost, tax, total_amount, total_items,
       payment_status, payment_method, amount_paid, current_due_amount, due_amount, due_date, notes, reference, is_return, transaction_type, purchase_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $13, $14, $15, FALSE, 'purchase', CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      invoice_number, vendor_name, contact_person || null,
      subtotal || 0, shipping_freight || 0, tax_vat || 0, total_amount || 0, items.length || 0,
      payment_status || 'Pending', payment_method || 'Cash', amount_paid || 0, due_amount || total_amount || 0, due_date || null, notes || null, reference || null
    ]);
    const purchaseId = masterResult.rows[0].id;

    // 2.5 Resolve Vendor ID for batches
    const vendRes = await client.query(`SELECT id FROM vendors WHERE LOWER(name) = LOWER($1)`, [vendor_name]);
    const actualVendorId = vendRes.rows[0]?.id || vendor_id || null;

    // 3. Process each item
    const insertedItems = [];
    const month = new Date().getMonth() + 1;

    for (const item of items) {
      const qty = Number(item.quantity);
      // decouple cost and mrp as requested
      const cost = Number(item.cost_price || item.cost || item.price);
      const mrp = Number(item.mrp || cost); // fallback
      const amount = qty * cost;

      const itemResult = await client.query(`
        INSERT INTO purchase_items 
        (purchase_id, product_code, product_name, quantity, price, amount)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [purchaseId, item.product_code, item.product_name, qty, cost, amount]);

      insertedItems.push(itemResult.rows[0]);

      await client.query(
        'UPDATE products SET stock = COALESCE(stock, 0) + $1 WHERE product_code = $2',
        [qty, item.product_code]
      );

      // FIFO: Insert into stock_batches
      await client.query(`
        INSERT INTO stock_batches 
        (product_code, batch_date, vendor_id, quantity_added, quantity_remaining, cost_price, mrp, is_exhausted)
        VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, FALSE)
      `, [item.product_code, actualVendorId, qty, qty, cost, mrp]);

      const prevStock = await client.query(
        'SELECT balance_qty, balance_amt FROM stock_movements WHERE product_code = $1 ORDER BY extracted_month DESC NULLS LAST LIMIT 1',
        [item.product_code]
      );

      const prevQty = Number(prevStock.rows[0]?.balance_qty || 0);
      const prevAmt = Number(prevStock.rows[0]?.balance_amt || 0);
      const newQty = prevQty + qty;
      const newAmt = prevAmt + amount;

      await client.query(`
        INSERT INTO stock_movements 
        (product_code, description, inwards_qty, inwards_amt,
         outwards_qty, outwards_amt, balance_qty, balance_amt, last_cost,
         source_file, extracted_month)
        VALUES ($1, $2, $3, $4, 0, 0, $5, $6, $7, $8, $9)
      `, [
        item.product_code,
        'Purchase',
        qty,
        amount,
        newQty,
        newAmt,
        cost,
        `Purchase-${invoice_number}`,
        month
      ]);
    }

    // 4. Update vendor ledger
    if (actualVendorId) {
      await client.query(`
        INSERT INTO vendor_ledger 
        (vendor_id, transaction_date, transaction_type, reference_number, 
         debit, credit, description)
        VALUES ($1, CURRENT_TIMESTAMP, 'Purchase', $2, 0, $3, $4)
      `, [
        actualVendorId,
        invoice_number,
        total_amount,
        `Purchase Invoice #${invoice_number}`
      ]);

      if (Number(amount_paid) > 0) {
        await client.query(`
          INSERT INTO vendor_ledger 
          (vendor_id, transaction_date, transaction_type, reference_number, 
           debit, credit, description)
          VALUES ($1, CURRENT_TIMESTAMP, 'Payment', $2, $3, 0, $4)
        `, [
          actualVendorId,
          invoice_number,
          amount_paid,
          `Payment for Purchase #${invoice_number}`
        ]);
      }
    }

    // Fetch final master
    const totalsRes = await client.query(
      `SELECT id, invoice_number, vendor_name, vendor_contact, vendor_invoice_number, purchase_date,
              subtotal, shipping_cost, tax, total_amount, total_items,
              payment_status, payment_method, amount_paid, current_due_amount, due_date, notes, reference
       FROM purchase_master
       WHERE id = $1`,
      [purchaseId]
    );
    const master = totalsRes.rows[0];

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Purchase created successfully',
      data: {
        id: master.id,
        invoice_number: master.invoice_number,
        vendor_name: master.vendor_name,
        vendor_contact: master.vendor_contact,
        vendor_invoice_number: master.vendor_invoice_number,
        purchase_date: master.purchase_date,
        subtotal: Number(master.subtotal || 0),
        shipping_cost: Number(master.shipping_cost || 0),
        tax: Number(master.tax || 0),
        total_amount: Number(master.total_amount || 0),
        total_items: Number(master.total_items || 0),
        payment_status: master.payment_status,
        payment_method: master.payment_method,
        amount_paid: Number(master.amount_paid || 0),
        due_amount: Number(master.current_due_amount || 0),
        due_date: master.due_date,
        notes: master.notes,
        reference: master.reference,
        items: insertedItems
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// PUT /api/purchases/items/:id
exports.updatePurchaseItem = async (req, res) => {
  const client = await pool.connect();
  try {
    const itemId = parseInt(req.params.id, 10);
    const { quantity, cost_price } = req.body;

    if (!itemId || !Number.isFinite(Number(quantity)) || !Number.isFinite(Number(cost_price))) {
      return res.status(400).json({ error: 'Invalid item ID, quantity, or cost_price' });
    }
    if (Number(quantity) <= 0 || Number(cost_price) < 0) {
      return res.status(400).json({ error: 'Quantity must be > 0 and Cost must be >= 0' });
    }

    await client.query('BEGIN');

    // 1. Get Item and Purchase Master (Locked)
    const itemRes = await client.query(`SELECT * FROM purchase_items WHERE id = $1 FOR UPDATE`, [itemId]);
    if (itemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item not found' });
    }
    const oldItem = itemRes.rows[0];
    const purchaseId = oldItem.purchase_id;

    const masterRes = await client.query(`SELECT * FROM purchase_master WHERE id = $1 FOR UPDATE`, [purchaseId]);
    const master = masterRes.rows[0];

    // 2. Calculate New Item Amount
    const newAmount = Number(quantity) * Number(cost_price);

    // 3. Recalculate Subtotal
    // We need to sum all OTHER items + this new amount
    const otherItemsRes = await client.query(`SELECT SUM(amount) as sum_others FROM purchase_items WHERE purchase_id = $1 AND id != $2`, [purchaseId, itemId]);
    const sumOthers = Number(otherItemsRes.rows[0]?.sum_others || 0);
    const newSubtotal = sumOthers + newAmount;

    // 4. Calculate New Total Amount
    const shipping = Number(master.shipping_cost || 0);
    const tax = Number(master.tax || 0);
    const newTotalAmount = newSubtotal + shipping + tax;

    // 5. Validation: Cannot reduce total below already paid amount
    // Amount Paid = original_amount - current_due_amount (or directly amount_paid if reliable)
    const amountPaid = Number(master.amount_paid || 0);

    if (newTotalAmount < amountPaid) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Cannot reduce total amount (Rs. ${newTotalAmount}) below amount already paid (Rs. ${amountPaid}).`
      });
    }

    // 6. Update Item
    const updateItemRes = await client.query(
      `UPDATE purchase_items 
       SET quantity = $1, price = $2, amount = $3 
       WHERE id = $4
       RETURNING *`,
      [quantity, cost_price, newAmount, itemId]
    );

    // 7. Update Master
    const newDueAmount = newTotalAmount - amountPaid;
    let newStatus = 'Pending';
    if (newDueAmount <= 0) newStatus = 'Paid';
    else if (amountPaid > 0) newStatus = 'Partial Payment';

    await client.query(
      `UPDATE purchase_master 
       SET subtotal = $1, total_amount = $2, current_due_amount = $3, due_amount = $3, payment_status = $4
       WHERE id = $5`,
      [newSubtotal, newTotalAmount, newDueAmount, newStatus, purchaseId]
    );

    // 8. Update Vendor Ledger to match new total
    // The invoice_number is available in the 'master' we fetched earlier
    await client.query(
      `UPDATE vendor_ledger 
       SET debit = $1, description = $2
       WHERE reference_number = $3 AND transaction_type = 'Purchase'`,
      [newTotalAmount, `Purchase Invoice #${master.invoice_number} (Updated)`, master.invoice_number]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Item updated successfully',
      data: {
        item: updateItemRes.rows[0],
        purchase: {
          id: purchaseId,
          subtotal: newSubtotal,
          total_amount: newTotalAmount,
          due_amount: newDueAmount,
          payment_status: newStatus
        }
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update Purchase Item Error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// Get paginated purchases
exports.getPurchases = async (req, res) => {
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
        whereConditions.push(`purchase_date >= $${paramIndex}`);
        queryParams.push(req.query.startDate);
        paramIndex++;
      }
      if (req.query.endDate) {
        whereConditions.push(`purchase_date <= $${paramIndex}`);
        queryParams.push(req.query.endDate);
        paramIndex++;
      }

      if (req.query.vendor) {
        whereConditions.push(`vendor_name ILIKE $${paramIndex}`);
        queryParams.push(`%${req.query.vendor}%`);
        paramIndex++;
      }

      // Category filter
      if (req.query.category) {
        console.log('🔍 Filtering purchases by category:', req.query.category); // DEBUG
        whereConditions.push(`
          EXISTS (
            SELECT 1 FROM purchase_items pi
            JOIN products p ON pi.product_name = p.description
            WHERE pi.purchase_id = purchase_master.id 
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
      const countQuery = `SELECT COUNT(*)::bigint AS total FROM purchase_master ${whereClause}`;
      const countResult = await client.query(
        whereConditions.length > 0 ? countQuery : countQuery,
        whereConditions.length > 0 ? queryParams : []
      );
      const total = parseInt(countResult.rows[0]?.total || 0, 10);

      // Get paginated purchases
      queryParams.push(limit, offset);
      const purchasesQuery = `
        SELECT 
          id,
          invoice_number,
          vendor_name,
          purchase_date,
          total_amount,
          total_items
        FROM purchase_master
        ${whereClause}
        ORDER BY purchase_date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      const purchasesResult = await client.query(purchasesQuery, queryParams);

      res.json({
        success: true,
        data: purchasesResult.rows.map(row => ({
          id: row.id,
          invoice_number: row.invoice_number,
          vendor_name: row.vendor_name,
          purchase_date: row.purchase_date,
          total_amount: parseFloat(row.total_amount || 0),
          total_items: parseInt(row.total_items || 0, 10),
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
    console.error('Get purchases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchases',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get purchase details by invoice number
exports.getPurchaseDetails = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const invoiceNumber = req.params.invoiceNumber;

      // Get master record
      // Added new columns to SELECT
      const masterResult = await client.query(
        `SELECT id, invoice_number, vendor_name, purchase_date, total_amount, total_items, 
                amount_paid, current_due_amount, payment_status, payment_method, due_date
         FROM purchase_master
         WHERE invoice_number = $1`,
        [invoiceNumber]
      );

      if (masterResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Purchase not found',
        });
      }

      const master = masterResult.rows[0];

      // Get items
      const itemsResult = await client.query(
        `SELECT id, product_code, product_name, quantity, price, amount
         FROM purchase_items
         WHERE purchase_id = $1
         ORDER BY id ASC`,
        [master.id]
      );

      res.json({
        success: true,
        data: {
          id: master.id,
          invoice_number: master.invoice_number,
          vendor_name: master.vendor_name,
          purchase_date: master.purchase_date,
          total_amount: parseFloat(master.total_amount || 0),
          total_items: parseInt(master.total_items || 0, 10),
          amount_paid: parseFloat(master.amount_paid || 0),
          due_amount: parseFloat(master.current_due_amount || 0), // Use current_due_amount from DB
          payment_status: master.payment_status,
          payment_method: master.payment_method,
          due_date: master.due_date,
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
    console.error('Get purchase details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// GET /api/purchases/returns
exports.getPurchaseReturns = async (req, res) => {
  try {
    const { startDate, endDate, vendor } = req.query;
    let query = `
      SELECT pm.*, 
             orig.invoice_number as original_purchase_invoice,
             (SELECT json_agg(pi) FROM purchase_items pi WHERE pi.purchase_id = pm.id) as items
      FROM purchase_master pm
      LEFT JOIN purchase_master orig ON pm.original_purchase_id = orig.id
      WHERE pm.is_return = TRUE
    `;
    const params = [];
    if (startDate) {
      params.push(startDate);
      query += ` AND DATE(pm.purchase_date) >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND DATE(pm.purchase_date) <= $${params.length}`;
    }
    if (vendor) {
      params.push(`%${vendor}%`);
      query += ` AND pm.vendor_name ILIKE $${params.length}`;
    }
    query += ` ORDER BY pm.purchase_date DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/purchases/returns/summary
exports.getPurchaseReturnsSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const params = [];
    let dateFilter = '';

    if (startDate && endDate) {
      params.push(startDate, endDate);
      dateFilter = ' AND DATE(purchase_date) BETWEEN $1 AND $2';
    }

    const summary = await pool.query(`
      SELECT 
        COUNT(id)::int as total_returns,
        COALESCE(ABS(SUM(total_amount)), 0)::numeric as total_amount
      FROM purchase_master
      WHERE is_return = TRUE ${dateFilter}
    `, params);

    // Top returned products
    const topProducts = await pool.query(`
      SELECT 
        product_name, 
        product_code, 
        COUNT(*)::int as return_count, 
        SUM(quantity)::int as total_qty
      FROM purchase_items
      WHERE purchase_id IN (SELECT id FROM purchase_master WHERE is_return = TRUE ${dateFilter})
      GROUP BY product_name, product_code
      ORDER BY return_count DESC
      LIMIT 10
    `, params);

    // Returns by reason
    const reasons = await pool.query(`
      SELECT 
        COALESCE(return_reason, 'Other') as reason, 
        COUNT(*)::int as count
      FROM purchase_items
      WHERE purchase_id IN (SELECT id FROM purchase_master WHERE is_return = TRUE ${dateFilter})
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
    console.error('Error fetching purchase returns summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/purchases/search
exports.searchPurchaseByInvoice = async (req, res) => {
  try {
    const { invoice } = req.query;

    if (!invoice) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number is required'
      });
    }

    const result = await pool.query(`
      SELECT 
        pm.*,
        (SELECT json_agg(
          json_build_object(
            'id', pi.id,
            'product_code', pi.product_code,
            'product_name', pi.product_name,
            'quantity', pi.quantity,
            'price', pi.price,
            'amount', pi.amount,
            'quantity_returned', COALESCE(pi.quantity_returned, 0)
          )
        ) FROM purchase_items pi WHERE pi.purchase_id = pm.id) as items
      FROM purchase_master pm
      WHERE pm.invoice_number = $1
    `, [invoice]);

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: 'Purchase not found'
      });
    }

    res.json({
      success: true,
      purchase: result.rows[0]
    });
  } catch (error) {
    console.error('Error searching purchase:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
