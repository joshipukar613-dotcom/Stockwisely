const { pool } = require('../config/database');
const notificationService = require('./NotificationService');
const expiryTracker = require('./ExpiryTrackerService');

function scheduleAt(hour, minute, fn) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const initialDelay = next.getTime() - now.getTime();
  setTimeout(() => {
    fn();
    setInterval(fn, 24 * 60 * 60 * 1000);
  }, initialDelay);
}

function scheduleWeekly(weekday, hour, minute, fn) {
  const now = new Date();
  const next = new Date(now);
  const currentDow = now.getDay(); // 0=Sun
  const targetDow = weekday; // e.g., 1=Mon
  const daysAhead = (targetDow + 7 - currentDow) % 7 || 7;
  next.setDate(now.getDate() + daysAhead);
  next.setHours(hour, minute, 0, 0);
  const initialDelay = next.getTime() - now.getTime();
  setTimeout(() => {
    fn();
    setInterval(fn, 7 * 24 * 60 * 60 * 1000);
  }, initialDelay);
}

async function hourlyLowStockCheck() {
  try {
    const { rows } = await pool.query(`
      WITH latest_stock AS (
        SELECT DISTINCT ON (product_code)
          product_code, description, balance_qty, last_cost, extracted_month
        FROM stock_movements
        ORDER BY product_code, extracted_month DESC NULLS LAST
      )
      SELECT 
        ls.product_code, 
        ls.description, 
        ls.balance_qty,
        COALESCE(p.min_stock_level, 5) as min_stock_level
      FROM latest_stock ls
      JOIN products p ON ls.product_code = p.product_code
      WHERE ls.balance_qty <= COALESCE(p.min_stock_level, 5)
      ORDER BY ls.balance_qty ASC
      LIMIT 50
    `);
    console.log(`[HourlyCheck] Found ${rows.length} low stock items across all users.`);
    if (rows.length === 0) return;

    const users = await pool.query(`SELECT id, email FROM "User" WHERE "isActive" = TRUE`);
    for (const u of users.rows) {
      const sRes = await pool.query(
        `SELECT alert_type, enabled FROM notification_settings WHERE user_id = $1 AND alert_type IN ('low_stock', 'out_of_stock')`,
        [u.id]
      );
      const sMap = new Map(sRes.rows.map(r => [r.alert_type, r.enabled]));

      for (const r of rows) {
        const isOut = Number(r.balance_qty || 0) <= 0;
        const type = isOut ? 'out_of_stock' : 'low_stock';
        const enabled = sMap.get(type) !== false; // Default true if not set

        if (enabled) {
          notificationService.sendLowStock(u.id, u.email, {
            product: r.description,
            current_stock: Number(r.balance_qty || 0),
            threshold: r.min_stock_level,
            vendor: '',
            restock_url: `${process.env.CLIENT_URL}/purchases`
          });
        }
      }
    }
  } catch (err) {
    console.error('Hourly low stock check error', err.message);
  }
}

async function dailyDigest() {
  try {
    const users = await pool.query(`SELECT id, email FROM "User" WHERE "isActive" = TRUE`);
    if (users.rows.length === 0) return;

    // 1. Gather Data (Global for now, can be per-user if scoping needed later)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    // A. Today's Sales
    console.log('Querying Sales...');
    const salesRes = await pool.query(`
      SELECT 
        COUNT(*)::int as orders,
        COALESCE(SUM(total_amount), 0)::numeric(10,2) as revenue
      FROM sales_master
      WHERE sale_date >= CURRENT_DATE
    `);
    const { orders, revenue } = salesRes.rows[0];
    console.log('Sales Done:', orders, revenue);

    // B. Top Products (Today)
    console.log('Querying Top Products...');
    const topProdRes = await pool.query(`
      SELECT si.product_name, SUM(si.quantity)::int as qty, SUM(si.amount)::numeric(10,2) as amt
      FROM sales_items si
      JOIN sales_master sm ON si.sale_id = sm.id
      WHERE sm.sale_date >= CURRENT_DATE
      GROUP BY si.product_name
      ORDER BY amt DESC
      LIMIT 5
    `);
    console.log('Top Products Done:', topProdRes.rows.length);

    // C. Alerts Counts
    // Low Stock (using our fixed logic)
    console.log('Querying Low Stock...');
    const lowStockRes = await pool.query(`
      WITH latest_stock AS (
        SELECT DISTINCT ON (product_code)
          product_code, balance_qty
        FROM stock_movements
        ORDER BY product_code, extracted_month DESC NULLS LAST
      )
      SELECT COUNT(*)::int as count
      FROM latest_stock ls
      JOIN products p ON ls.product_code = p.product_code
      WHERE ls.balance_qty <= COALESCE(p.min_stock_level, 5)
    `);
    console.log('Low Stock Done:', lowStockRes.rows[0].count);

    // Expiring Soon (Next 7 days)
    console.log('Querying Expiry...');
    const expiryRes = await pool.query(`
      SELECT COUNT(*)::int as count
      FROM expiry_alerts ea
      WHERE ea.resolved = FALSE AND ea.days_until_expiry <= 7
    `);
    console.log('Expiry Done:', expiryRes.rows[0].count);

    // Overdue Payments
    console.log('Querying Payments...');
    const payRes = await pool.query(`
      SELECT COUNT(*)::int as count, COALESCE(SUM(current_due_amount), 0)::numeric(10,2) as total
      FROM purchase_master
      WHERE payment_status IN ('Pending', 'Partial') AND due_date < CURRENT_DATE
    `);
    console.log('Payments Done:', payRes.rows[0].count);

    // Prepare Template Data
    const templateData = {
      date: dateStr,
      generated_time: today.toLocaleTimeString(),
      action_url: clientUrl,
      today_revenue: revenue,
      today_orders: orders,
      has_alerts: (lowStockRes.rows[0].count > 0 || expiryRes.rows[0].count > 0 || payRes.rows[0].count > 0),
      low_stock_count: lowStockRes.rows[0].count,
      expiring_count: expiryRes.rows[0].count,
      overdue_payments_count: payRes.rows[0].count,
      overdue_amount: payRes.rows[0].total,
      top_products_rows: topProdRes.rows.map(r =>
        `<tr><td>${r.product_name}</td><td class="text-right">${r.qty}</td><td class="text-right">Rs. ${r.amt}</td></tr>`
      ).join('')
    };

    // Send to enabled users
    for (const u of users.rows) {
      const sRes = await pool.query(`SELECT enabled FROM notification_settings WHERE user_id = $1 AND alert_type = 'daily_digest'`, [u.id]);
      // Default to TRUE if no setting exists (or strictly check if FALSE)
      if (sRes.rows.length === 0 || sRes.rows[0].enabled !== false) {
        // We need to support manual template replacement since our NotificationService.render is simple
        // But NotificationService.js uses simple regex replace. 
        // We need to handle the conditional blocks {{#if}} which the simple service DOES NOT support.
        // Wait, the Reviewer didn't check NotificationService capabilities.
        // It has `html.replace(/\{\{(\w+)\}\}/g...`
        // It DOES NOT support handlebars/mustache logic like {{#if}}.

        // CRITICAL FIX: We must pre-process the HTML or update NotificationService to support basic conditionals.
        // Updating NotificationService is risky.
        // Better approach: Simplify the specific template logic or do the conditional rendering logic here in JS
        // and pass the final HTML string for sections.

        // Let's modify the template data to pass PRE-RENDERED HTML sections or empty strings.
        // But the template I just wrote uses {{#if}}. This will fail.

        // I will re-write the template to NOT use {{#if}} and instead rely on variables that are either empty string or content.
        // Actually, since I just wrote the template, I should fix the logic HERE to match a simpler template 
        // OR update NotificationService.js to support handlebars (not available easily without package).

        // I'll update NotificationService.js to standard Handlebars-like or just use a simple hack? 
        // No, I'll update the `render` method in `NotificationService.js` to be slightly smarter or just use a library if available?
        // `package.json` doesn't show handlebars/ejs.
        // I will stick to simple replacement in Service, but I'll make the template rely on simple variables.
        // So I'll inject the entire "Alerts Section" HTML as a variable `alerts_section_html`.

        // So, I need to update the service to build these HTML strings.

        let alertsHtml = '';
        if (templateData.has_alerts) {
          alertsHtml += '<div class="section"><div class="section-title">Attention Needed</div>';
          if (templateData.low_stock_count > 0) {
            alertsHtml += `<div class="alert-box"><div class="alert-title">${templateData.low_stock_count} Items Low on Stock</div><p class="alert-desc">Some products are below minimum levels. <a href="${clientUrl}/dashboard" style="color: #b91c1c;">View details</a></p></div>`;
          }
          if (templateData.expiring_count > 0) {
            alertsHtml += `<div class="alert-box" style="background-color: #ffedd5; border-left-color: #ea580c;"><div class="alert-title" style="color: #9a3412;">${templateData.expiring_count} Items Expiring Soon</div><p class="alert-desc" style="color: #c2410c;">Products expiring within 7 days. <a href="${clientUrl}/inventory" style="color: #c2410c;">Check inventory</a></p></div>`;
          }
          if (templateData.overdue_payments_count > 0) {
            alertsHtml += `<div class="alert-box" style="background-color: #fef2f2; border-left-color: #ef4444;"><div class="alert-title" style="color: #b91c1c;">${templateData.overdue_payments_count} Overdue Payments</div><p class="alert-desc" style="color: #b91c1c;">Total Amount: Rs. ${templateData.overdue_amount}</p></div>`;
          }
          alertsHtml += '</div>';
        }

        const dataToSend = {
          ...templateData,
          alerts_section: alertsHtml
        };
        console.log('Daily Digest Data for User:', u.email, JSON.stringify(dataToSend, null, 2));

        // Call the service (which expects 'daily_digest' template name)
        // I need to update the HTML template again to use only {{alerts_section}} instead of logic.
        notificationService.sendDailyDigest(u.id, u.email, dataToSend);
      }
    }
  } catch (err) {
    console.error('Daily digest error', err.message);
  }
}

async function weeklySummary() {
  try {
    const users = await pool.query(`SELECT id, email FROM "User" WHERE "isActive" = TRUE`);
    for (const u of users.rows) {
      const sRes = await pool.query(`SELECT enabled FROM notification_settings WHERE user_id = $1 AND alert_type = 'weekly_summary'`, [u.id]);
      if (sRes.rows[0]?.enabled !== false) {
        notificationService.sendWeeklySummary(u.id, u.email, {
          weekly_sales: 'Summary not implemented',
          top_products: 'See reports',
          expiry_alerts: 'See inventory',
          payment_status: 'See vendors'
        });
      }
    }
  } catch (err) {
    console.error('Weekly summary error', err.message);
  }
}

function init() {
  setTimeout(() => {
    hourlyLowStockCheck(); // Execute immediately on startup (after tiny delay)
    expiryTracker.checkExpiringProducts();
  }, 5000);
  setInterval(hourlyLowStockCheck, 60 * 60 * 1000);
  scheduleAt(8, 0, () => expiryTracker.checkExpiringProducts());
  scheduleAt(0, 0, () => expiryTracker.checkExpiredProducts());
  scheduleAt(20, 0, () => dailyDigest());
  scheduleWeekly(1, 8, 0, () => weeklySummary()); // Monday 8AM
}

module.exports = {
  init,
  hourlyLowStockCheck,
  dailyDigest,
  weeklySummary
};
