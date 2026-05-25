const { pool } = require('../config/database');

exports.getExpiring = async (req, res) => {
  try {
    const days = [30, 7, 3, 1];
    const { rows } = await pool.query(
      `SELECT ea.id, ea.product_id, ea.product_code, ea.batch_number, ea.expiry_date, ea.days_until_expiry, ea.quantity
       FROM expiry_alerts ea
       WHERE ea.alert_type = 'expiring' AND ea.days_until_expiry = ANY($1)
       ORDER BY ea.days_until_expiry ASC, ea.expiry_date ASC`,
      [days]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch expiring products', error: err.message });
  }
};

exports.acknowledgeExpiry = async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    await pool.query(`UPDATE expiry_alerts SET acknowledged = TRUE WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Acknowledged' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to acknowledge', error: err.message });
  }
};

exports.getExpired = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ea.id, ea.product_id, ea.product_code, ea.batch_number, ea.expiry_date, ea.quantity
       FROM expiry_alerts ea
       WHERE ea.alert_type = 'expired'
       ORDER BY ea.expiry_date DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch expired products', error: err.message });
  }
};

exports.disposeExpired = async (req, res) => {
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    const alertRes = await pool.query(`SELECT product_id, product_code, batch_number, expiry_date, quantity FROM expiry_alerts WHERE id = $1`, [id]);
    const a = alertRes.rows[0];
    if (!a) return res.status(404).json({ success: false, message: 'Alert not found' });
    await pool.query(
      `INSERT INTO product_expiry_history (product_id, product_code, batch_number, expiry_date, quantity, action_taken, disposed_at)
       VALUES ($1,$2,$3,$4,$5,'disposed', NOW())`,
      [a.product_id, a.product_code, a.batch_number, a.expiry_date, a.quantity]
    );
    res.json({ success: true, message: 'Disposal record created' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to dispose', error: err.message });
  }
};
