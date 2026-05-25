const { pool } = require('../config/database');

const normalizePhone = (phone) => {
  if (!phone) return null;
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  // If it starts with 977 and is 13 digits, or just generally strip the country code if it's for Nepal
  if (digits.startsWith('977') && digits.length > 10) {
    digits = digits.substring(3);
  }
  return digits;
};

// GET /api/customers
exports.getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    
    // Base query: join customers with sales_master
    // Fallback: If sales_master has no customer_phone (old data), join on name!
    let query = `
      SELECT 
        c.*,
        COALESCE(SUM(sm.total_amount), 0) AS total_purchase_amount,
        COALESCE(COUNT(sm.id), 0) AS purchase_count,
        MAX(sm.sale_date) AS last_purchase_date
      FROM customers c
      LEFT JOIN sales_master sm ON 
        (c.phone = sm.customer_phone AND sm.customer_phone IS NOT NULL AND sm.customer_phone != '') 
        OR (
          (sm.customer_phone IS NULL OR sm.customer_phone = '') 
          AND c.name = sm.customer_name
        )
    `;

    const queryParams = [];

    if (search) {
      query += ` WHERE c.name ILIKE $1 OR c.phone ILIKE $1 OR c.email ILIKE $1`;
      queryParams.push(`%${search}%`);
    }

    query += ` GROUP BY c.id ORDER BY c.created_at DESC`;

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customers', error: error.message });
  }
};

// GET /api/customers/phone/:phone
exports.getCustomerByPhone = async (req, res) => {
  try {
    const phone = normalizePhone(req.params.phone);
    if (!phone) return res.status(400).json({ success: false, message: 'Invalid phone' });

    const query = `SELECT * FROM customers WHERE phone = $1 LIMIT 1`;
    const result = await pool.query(query, [phone]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch customer by phone', error: error.message });
  }
};

// GET /api/customers/:id
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        c.*,
        COALESCE(SUM(sm.total_amount), 0) AS total_purchase_amount,
        COALESCE(COUNT(sm.id), 0) AS purchase_count,
        MAX(sm.sale_date) AS last_purchase_date
      FROM customers c
      LEFT JOIN sales_master sm ON 
        (c.phone = sm.customer_phone AND sm.customer_phone IS NOT NULL AND sm.customer_phone != '') 
        OR (
          (sm.customer_phone IS NULL OR sm.customer_phone = '') 
          AND c.name = sm.customer_name
        )
      WHERE c.id = $1
      GROUP BY c.id
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching customer by ID:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer details', error: error.message });
  }
};

// POST /api/customers
exports.createCustomer = async (req, res) => {
  try {
    const { name, contact_person, email, phone, address, age_range, gender, is_active, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }
    
    let normPhone = normalizePhone(phone);

    const query = `
      INSERT INTO customers (name, contact_person, email, phone, address, age_range, gender, is_active, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;
    const values = [name, contact_person, email, normPhone, address, age_range, gender, is_active !== undefined ? is_active : true, notes];
    
    const result = await pool.query(query, values);

    const newCustomer = { ...result.rows[0], total_purchase_amount: 0 };

    res.status(201).json({
      success: true,
      data: newCustomer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    if (error.code === '23505') { 
      return res.status(400).json({ success: false, message: 'Customer with this phone already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create customer', error: error.message });
  }
};

// PUT /api/customers/:id
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, email, phone, address, age_range, gender, is_active, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    let normPhone = normalizePhone(phone);

    const query = `
      UPDATE customers 
      SET name = $1, contact_person = $2, email = $3, phone = $4, address = $5, age_range = $6, gender = $7, is_active = $8, notes = $9, updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `;
    const values = [name, contact_person, email, normPhone, address, age_range, gender, is_active, notes, id];
    
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Customer updated successfully'
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Customer with this phone already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to update customer', error: error.message });
  }
};

  exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ success: false, message: 'Failed to delete customer', error: error.message });
  }
};

// GET /api/customers/report/stats — Customer growth analytics
exports.getCustomerStats = async (req, res) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const [totalRes, newThisMonthRes, newLastMonthRes, genderRes, topBuyersRes, monthlyGrowthRes, activeRes] = await Promise.all([
      // Total customers
      pool.query(`SELECT COUNT(*)::int AS total FROM customers`),

      // New this month
      pool.query(`SELECT COUNT(*)::int AS count FROM customers WHERE DATE(created_at) >= $1`, [thisMonthStart]),

      // New last month
      pool.query(`SELECT COUNT(*)::int AS count FROM customers WHERE DATE(created_at) BETWEEN $1 AND $2`, [lastMonthStart, lastMonthEnd]),

      // Gender breakdown
      pool.query(`SELECT COALESCE(gender::text, 'Unknown') AS gender, COUNT(*)::int AS count FROM customers GROUP BY gender::text ORDER BY count DESC`),

      // Top buyers (most purchase amount)
      pool.query(`
        WITH customer_sales AS (
          SELECT 
            COALESCE(NULLIF(customer_phone, ''), customer_name) as match_key,
            SUM(total_amount)::numeric AS total_spent,
            COUNT(id)::int AS order_count,
            MAX(sale_date) AS last_purchase
          FROM sales_master
          WHERE is_return = FALSE
          GROUP BY COALESCE(NULLIF(customer_phone, ''), customer_name)
        )
        SELECT 
          c.name, c.phone, c.email,
          COALESCE(cs.total_spent, 0) AS total_spent,
          COALESCE(cs.order_count, 0) AS order_count,
          cs.last_purchase
        FROM customers c
        LEFT JOIN customer_sales cs ON (cs.match_key = c.phone AND c.phone IS NOT NULL AND c.phone != '') OR (cs.match_key = c.name)
        ORDER BY total_spent DESC
        LIMIT 10
      `),

      // Monthly growth (last 12 months)
      pool.query(`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
          COUNT(*)::int AS new_customers
        FROM customers
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month ASC
      `),

      // Active customers (purchased in last 90 days)
      pool.query(`
        SELECT COUNT(c.id)::int AS count
        FROM customers c
        WHERE EXISTS (
          SELECT 1 FROM sales_master sm
          WHERE sm.sale_date >= NOW() - INTERVAL '90 days' AND (sm.is_return = FALSE OR sm.is_return IS NULL)
          AND (
            (c.phone = sm.customer_phone AND sm.customer_phone IS NOT NULL AND sm.customer_phone != '')
            OR ((sm.customer_phone IS NULL OR sm.customer_phone = '') AND c.name = sm.customer_name)
          )
        )
      `)
    ]);

    const total        = totalRes.rows[0].total;
    const newThisMonth = newThisMonthRes.rows[0].count;
    const newLastMonth = newLastMonthRes.rows[0].count;
    const growthRate   = newLastMonth > 0 ? (((newThisMonth - newLastMonth) / newLastMonth) * 100).toFixed(1) : null;

    res.json({
      success: true,
      data: {
        total_customers: total,
        new_this_month: newThisMonth,
        new_last_month: newLastMonth,
        growth_rate: growthRate ? parseFloat(growthRate) : 0,
        active_customers: activeRes.rows[0].count,
        gender_breakdown: genderRes.rows,
        top_buyers: topBuyersRes.rows.map(r => ({
          name: r.name,
          phone: r.phone,
          email: r.email,
          total_spent: parseFloat(r.total_spent || 0),
          order_count: r.order_count,
          last_purchase: r.last_purchase
        })),
        monthly_growth: monthlyGrowthRes.rows
      }
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer stats', error: error.message });
  }
};

