const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const { sendEmail } = require('./emailService');
const { EmailQueue } = require('../queues/EmailQueue');

class NotificationService {
  constructor() {
    this.queue = new EmailQueue({ ratePerMinute: 10, maxRetries: 3, backoffMs: 2000 });
    this.templatesDir = path.join(__dirname, '..', 'templates', 'emails');
  }

  render(templateName, data) {
    const file = path.join(this.templatesDir, `${templateName}.html`);
    const html = fs.readFileSync(file, 'utf-8');
    return html.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? ''));
  }

  async log(userId, alertType, to, subject, payload, status, error) {
    await pool.query(
      `INSERT INTO notification_log (user_id, alert_type, email, subject, payload, status, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, alertType, to, subject, payload ? JSON.stringify(payload) : null, status, error || null]
    );
  }

  enqueue(userId, alertType, to, subject, html, payload) {
    this.queue.add(async () => {
      try {
        await sendEmail(to, subject, html);
        await this.log(userId, alertType, to, subject, payload, 'sent', null);
      } catch (err) {
        await this.log(userId, alertType, to, subject, payload, 'failed', err.message || String(err));
        throw err;
      }
    });
  }

  sendLowStock(userId, to, data) {
    const subject = `Low Stock Alert: ${data.product}`;
    const html = this.render('low_stock', data);
    this.enqueue(userId, 'low_stock', to, subject, html, data);
  }

  sendOutOfStock(userId, to, data) {
    const subject = `URGENT: ${data.product} Out of Stock`;
    const html = this.render('out_of_stock', data);
    this.enqueue(userId, 'out_of_stock', to, subject, html, data);
  }

  sendExpiryAlert(userId, to, data) {
    const subject = `${data.count} Products Expiring Soon`;
    const rows = (data.items || []).map(r =>
      `<tr><td>${r.product}</td><td>${r.batch}</td><td>${r.expiry_date}</td><td>${r.days_left}</td><td>${r.stock}</td></tr>`
    ).join('');
    const html = this.render('expiry_alert', { ...data, rows });
    this.enqueue(userId, 'expiry_alert', to, subject, html, data);
  }

  sendExpiredProducts(userId, to, data) {
    const subject = `CRITICAL: ${data.count} Products Expired`;
    const items = (data.items || []).map(i => `• ${i.product} (${i.batch}) — ${i.expiry_date} — ${i.quantity}`).join('<br>');
    const html = this.render('expired_products', { ...data, items });
    this.enqueue(userId, 'expired_products', to, subject, html, data);
  }

  sendPaymentDue(userId, to, data) {
    const subject = `Payment Due: ${data.vendor} - Rs. ${data.amount}`;
    const html = this.render('payment_due', data);
    this.enqueue(userId, 'payment_due', to, subject, html, data);
  }

  sendPaymentOverdue(userId, to, data) {
    const subject = `OVERDUE: ${data.vendor}`;
    const html = this.render('payment_overdue', data);
    this.enqueue(userId, 'payment_overdue', to, subject, html, data);
  }

  sendSalesTarget(userId, to, data) {
    const subject = `Monthly Target Exceeded`;
    const html = this.render('sales_target', data);
    this.enqueue(userId, 'sales_target', to, subject, html, data);
  }

  sendDailyDigest(userId, to, data) {
    const subject = `Daily Summary - ${data.date}`;
    const html = this.render('daily_digest', data);
    this.enqueue(userId, 'daily_digest', to, subject, html, data);
  }

  sendWeeklySummary(userId, to, data) {
    const subject = `Weekly Report`;
    const html = this.render('weekly_summary', data);
    this.enqueue(userId, 'weekly_summary', to, subject, html, data);
  }
}

module.exports = new NotificationService();
