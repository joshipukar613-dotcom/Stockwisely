const { pool } = require('../config/database');
const notificationService = require('./NotificationService');

class ExpiryTrackerService {
  async getLatestStock() {
    const query = `
      SELECT DISTINCT ON (sm.product_code)
        sm.product_code,
        sm.description AS product,
        COALESCE(sm.balance_qty, 0) AS stock_quantity,
        COALESCE(sm.last_cost, 0) AS last_cost,
        sm.extracted_month
      FROM stock_movements sm
      ORDER BY sm.product_code, sm.extracted_month DESC NULLS LAST
    `;
    const { rows } = await pool.query(query);
    const byCode = new Map();
    for (const r of rows) byCode.set(r.product_code, r);
    return byCode;
  }

  async checkExpiringProducts() {
    // We use purchase_items to track batches since products table doesn't have expiry_date
    const today = new Date();
    const dateISO = (d) => d.toISOString().slice(0, 10);

    const users = await pool.query(`SELECT id, email FROM "User" WHERE "isActive" = TRUE`);
    const allUsers = users.rows;
    if (allUsers.length === 0) return;

    // Get items from purchase history that have expiry dates
    const productsRes = await pool.query(`
      SELECT 
        pi.id as purchase_item_id,
        pi.product_code, 
        pi.product_name, 
        pi.expiry_date, 
        pi.quantity,
        p.id as product_id
      FROM purchase_items pi
      LEFT JOIN products p ON pi.product_code = p.product_code
      WHERE pi.expiry_date IS NOT NULL AND pi.expiry_date > CURRENT_DATE
    `);
    
    console.log(`[ExpiryCheck] Found ${productsRes.rows.length} future expiring items.`);


    const items = [];
    for (const p of productsRes.rows) {
      // For stock quantity, we really should check if this specific purchase item is consumed.
      // But without batch tracking in sales, we can only warn that this batch exists.
      // We can display the original quantity or try to match with current total stock.
      // For now, we use the original purchase quantity as "batch size".
      
      const expiry = new Date(p.expiry_date);
      const diffMs = expiry.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      items.push({
        product_id: p.product_id, // Might be null if product deleted but purchase record exists
        product_code: p.product_code,
        product: p.product_name,
        batch: `PO-${p.purchase_item_id}`, // Pseudo batch number
        expiry_date: dateISO(expiry),
        days_left: daysLeft,
        stock: Number(p.quantity)
      });
    }

    const byWindow = {
      30: items.filter(i => i.days_left === 30),
      7: items.filter(i => i.days_left === 7),
      3: items.filter(i => i.days_left === 3),
      1: items.filter(i => i.days_left === 1),
    };

    for (const user of allUsers) {
      const settingsRes = await pool.query(
        `SELECT alert_type, enabled, expiry_days FROM notification_settings WHERE user_id = $1`,
        [user.id]
      );
      const sMap = new Map(settingsRes.rows.map(r => [r.alert_type, r]));
      const expirySetting = sMap.get('expiry_alert');
      const enabledDays = (expirySetting?.expiry_days || [30,7,3,1]).filter(Boolean);
      const aggregates = [];
      for (const d of enabledDays) {
        const list = byWindow[d] || [];
        if (list.length > 0) {
          aggregates.push({ window: d, items: list });
          // Insert alerts
          for (const it of list) {
            if (it.product_id) { // Only insert if linked to a valid product
                await pool.query(
                `INSERT INTO expiry_alerts (product_id, product_code, batch_number, alert_type, expiry_date, days_until_expiry, quantity, notification_sent)
                VALUES ($1,$2,$3,'expiring', $4, $5, $6, TRUE)
                ON CONFLICT DO NOTHING`,
                [it.product_id, it.product_code, it.batch, it.expiry_date, it.days_left, it.stock]
                );
            }
          }
        }
      }
      if (aggregates.length > 0 && expirySetting?.enabled !== false) {
        const flat = aggregates.flatMap(a => a.items);
        notificationService.sendExpiryAlert(user.id, user.email, {
          count: flat.length,
          items: flat,
          view_all_url: `${process.env.CLIENT_URL}/inventory`,
          download_url: `${process.env.CLIENT_URL}/reports`,
          markdown_url: `${process.env.CLIENT_URL}/inventory`,
        });
      }
    }
  }

  async checkExpiredProducts() {
    const todayISO = new Date().toISOString().slice(0,10);
    const users = await pool.query(`SELECT id, email FROM "User" WHERE "isActive" = TRUE`);
    const allUsers = users.rows;
    if (allUsers.length === 0) return;

    const { rows } = await pool.query(`
      SELECT 
        pi.id as purchase_item_id,
        pi.product_code, 
        pi.product_name, 
        pi.expiry_date, 
        pi.quantity,
        p.id as product_id
      FROM purchase_items pi
      LEFT JOIN products p ON pi.product_code = p.product_code
      WHERE pi.expiry_date IS NOT NULL AND pi.expiry_date < CURRENT_DATE
    `);

    const items = rows.map(p => ({
      product_id: p.product_id,
      product_code: p.product_code,
      product: p.product_name,
      batch: `PO-${p.purchase_item_id}`,
      expiry_date: new Date(p.expiry_date).toISOString().slice(0, 10),
      quantity: Number(p.quantity)
    }));

    // Log and notify
    for (const it of items) {
      if (it.product_id) {
        await pool.query(
            `INSERT INTO product_expiry_history (product_id, product_code, batch_number, expiry_date, quantity, action_taken)
            VALUES ($1,$2,$3,$4,$5,'expired')`,
            [it.product_id, it.product_code, it.batch, it.expiry_date, it.quantity]
        );
        await pool.query(
            `INSERT INTO expiry_alerts (product_id, product_code, batch_number, alert_type, expiry_date, days_until_expiry, quantity, notification_sent)
            VALUES ($1,$2,$3,'expired',$4, -1, $5, TRUE)
            ON CONFLICT DO NOTHING`,
            [it.product_id, it.product_code, it.batch, it.expiry_date, it.quantity]
        );
      }
    }

    for (const user of allUsers) {
      const settingsRes = await pool.query(
        `SELECT alert_type, enabled FROM notification_settings WHERE user_id = $1 AND alert_type = 'expired_products'`,
        [user.id]
      );
      const isEnabled = settingsRes.rows[0]?.enabled !== false; // Default to true if not found

      if (items.length > 0 && isEnabled) {
        notificationService.sendExpiredProducts(user.id, user.email, {
          count: items.length,
          items,
          remove_url: `${process.env.CLIENT_URL}/inventory`,
          dispose_url: `${process.env.CLIENT_URL}/inventory`,
          details_url: `${process.env.CLIENT_URL}/inventory`,
        });
      }
    }
  }
}

module.exports = new ExpiryTrackerService();
