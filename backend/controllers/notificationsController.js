const { pool } = require('../config/database');
const notificationService = require('../services/NotificationService');
const userRepository = require('../repositories/userRepository');

exports.getSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { rows } = await pool.query(
      `SELECT alert_type, enabled, frequency, threshold, expiry_days, quiet_hours_from, quiet_hours_to, severity
       FROM notification_settings WHERE user_id = $1`, [userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to get settings', error: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const settings = Array.isArray(req.body?.settings) ? req.body.settings : [];
    await pool.query('BEGIN');
    for (const s of settings) {
      await pool.query(
        `INSERT INTO notification_settings (user_id, alert_type, enabled, frequency, threshold, expiry_days, quiet_hours_from, quiet_hours_to, severity, updated_at)
         VALUES ($1, $2, COALESCE($3, TRUE), COALESCE($4, 'Immediate'), $5, $6, $7, $8, COALESCE($9, 'High'), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [userId, s.alert_type, s.enabled, s.frequency, s.threshold || null, s.expiry_days || null, s.quiet_hours_from || null, s.quiet_hours_to || null, s.severity || null]
      );
      await pool.query(
        `UPDATE notification_settings
         SET enabled = COALESCE($3, enabled),
             frequency = COALESCE($4, frequency),
             threshold = COALESCE($5, threshold),
             expiry_days = COALESCE($6, expiry_days),
             quiet_hours_from = COALESCE($7, quiet_hours_from),
             quiet_hours_to = COALESCE($8, quiet_hours_to),
             severity = COALESCE($9, severity),
             updated_at = NOW()
         WHERE user_id = $1 AND alert_type = $2`,
        [userId, s.alert_type, s.enabled, s.frequency, s.threshold || null, s.expiry_days || null, s.quiet_hours_from || null, s.quiet_hours_to || null, s.severity || null]
      );
    }
    await pool.query('COMMIT');
    const { rows } = await pool.query(
      `SELECT alert_type, enabled, frequency, threshold, expiry_days, quiet_hours_from, quiet_hours_to, severity
       FROM notification_settings WHERE user_id = $1`, [userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Failed to update settings', error: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;
    const count = await pool.query('SELECT COUNT(*)::int AS total FROM notification_log WHERE user_id = $1', [userId]);
    const { rows } = await pool.query(
      `SELECT id, alert_type, email, subject, sent_at, status, error, payload
       FROM notification_log
       WHERE user_id = $1
       ORDER BY sent_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    res.json({ success: true, data: rows, pagination: { page, limit, total: count.rows[0]?.total || 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notification history', error: err.message });
  }
};

exports.sendTest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await userRepository.findById(userId);
    const to = user?.email || req.user.email;
    const product = req.body?.product || 'Sample Product';
    const current_stock = 3;
    const threshold = 5;
    const vendor = 'Sample Vendor';
    const restock_url = `${process.env.CLIENT_URL}/purchases`;
    notificationService.sendLowStock(userId, to, { product, current_stock, threshold, vendor, restock_url });
    res.json({ success: true, message: 'Test email enqueued' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to enqueue test email', error: err.message });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const alerts = [];

    // 1. Low Stock Alerts
    const lowStockRes = await pool.query(`
      WITH latest_stock AS (
        SELECT DISTINCT ON (product_code)
          product_code, description, balance_qty
        FROM stock_movements
        ORDER BY product_code, extracted_month DESC NULLS LAST
      )
      SELECT 
        ls.product_code, 
        ls.description, 
        ls.balance_qty,
        COALESCE(p.min_stock_level, 5) as min_stock_level,
        p.id as product_id
      FROM latest_stock ls
      JOIN products p ON ls.product_code = p.product_code
      WHERE ls.balance_qty <= COALESCE(p.min_stock_level, 5)
    `);

    for (const row of lowStockRes.rows) {
      const isCritical = row.balance_qty === 0;
      alerts.push({
        id: `low-stock-${row.product_code}`,
        type: isCritical ? 'out_of_stock' : 'low_stock',
        priority: isCritical ? 'critical' : 'high',
        title: isCritical ? 'Out of Stock' : 'Low Stock Alert',
        message: `${row.description} is ${isCritical ? 'out of stock' : 'running low'}`,
        details: `Current: ${row.balance_qty} | Min: ${row.min_stock_level}`,
        timestamp: new Date().toISOString(),
        status: 'active',
        category: 'stock',
        metadata: {
          product_id: row.product_id,
          product_code: row.product_code
        }
      });
    }

    // 2. Batch Exhaustion Alerts (New FIFO System)
    const batchRes = await pool.query(`
      SELECT sb.id, sb.product_code, p.description as product_name, sb.batch_date, sb.quantity_added, sb.quantity_remaining
      FROM stock_batches sb
      JOIN products p ON sb.product_code = p.product_code
      WHERE sb.is_exhausted = FALSE AND sb.quantity_remaining < (sb.quantity_added * 0.1)
    `);

    for (const row of batchRes.rows) {
      alerts.push({
        id: `batch-${row.id}`,
        type: 'low_stock',
        priority: 'high',
        title: 'Batch Running Low',
        message: `${row.product_name} — Batch from ${new Date(row.batch_date).toISOString().slice(0,10)} running low, restock soon.`,
        details: `Remaining: ${row.quantity_remaining} out of ${row.quantity_added}`,
        timestamp: new Date().toISOString(),
        status: 'active',
        category: 'stock',
        metadata: {
          product_code: row.product_code,
          batch_id: row.id
        }
      });
    }

    // 3. Expiry Alerts
    const expiryRes = await pool.query(`
      SELECT 
        ea.id,
        ea.product_code,
        p.description as product_name,
        ea.batch_number,
        ea.expiry_date,
        ea.days_until_expiry,
        ea.quantity,
        ea.created_at,
        p.id as product_id
      FROM expiry_alerts ea
      LEFT JOIN products p ON ea.product_code = p.product_code
      WHERE ea.resolved = FALSE
      ORDER BY ea.days_until_expiry ASC
    `);

    for (const row of expiryRes.rows) {
      const days = row.days_until_expiry;
      let type = 'expiring_soon';
      let priority = 'medium';
      let title = 'Expiring Soon';

      if (days <= 0) {
        type = 'expired';
        priority = 'critical';
        title = 'Product Expired';
      } else if (days <= 7) {
        priority = 'high';
      }

      alerts.push({
        id: `expiry-${row.id}`,
        type: type,
        priority: priority,
        title: title,
        message: `${row.product_name} (${row.batch_number})`,
        details: `Expires in ${days} days (${new Date(row.expiry_date).toISOString().slice(0, 10)})`,
        timestamp: row.created_at,
        status: 'active',
        category: 'expiry',
        metadata: {
          product_id: row.product_id,
          product_code: row.product_code,
          batch: row.batch_number
        }
      });
    }

    res.json({ success: true, data: alerts });
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
  }
};
