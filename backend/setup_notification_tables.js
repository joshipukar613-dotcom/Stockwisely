
const { pool } = require('./config/database');

async function setupTables() {
  try {
    console.log('Creating notification_settings table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES "User"(id),
        alert_type VARCHAR(50) NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        expiry_days INTEGER[] DEFAULT '{30, 7, 3, 1}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, alert_type)
      );
    `);

    console.log('Creating notification_log table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_log (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES "User"(id),
        alert_type VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        payload JSONB,
        status VARCHAR(20),
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating expiry_alerts table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expiry_alerts (
        id SERIAL PRIMARY KEY,
        product_id INTEGER, -- nullable if product deleted
        product_code VARCHAR(50),
        batch_number VARCHAR(50),
        alert_type VARCHAR(20), -- 'expiring', 'expired'
        expiry_date DATE,
        days_until_expiry INTEGER,
        quantity INTEGER,
        notification_sent BOOLEAN DEFAULT FALSE,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_code, batch_number, alert_type, expiry_date)
      );
    `);

    console.log('Creating product_expiry_history table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_expiry_history (
        id SERIAL PRIMARY KEY,
        product_id INTEGER,
        product_code VARCHAR(50),
        batch_number VARCHAR(50),
        expiry_date DATE,
        quantity INTEGER,
        action_taken VARCHAR(50), -- 'expired', 'disposed', 'sold_discounted'
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Seed default settings for existing users
    console.log('Seeding default settings...');
    const users = await pool.query('SELECT id FROM "User"');
    for (const user of users.rows) {
      await pool.query(`
        INSERT INTO notification_settings (user_id, alert_type, enabled, expiry_days)
        VALUES ($1, 'expiry_alert', TRUE, '{30, 7, 3, 1}')
        ON CONFLICT (user_id, alert_type) DO NOTHING
      `, [user.id]);
       await pool.query(`
        INSERT INTO notification_settings (user_id, alert_type, enabled)
        VALUES ($1, 'low_stock', TRUE)
        ON CONFLICT (user_id, alert_type) DO NOTHING
      `, [user.id]);
    }

    console.log('Tables setup completed successfully.');
  } catch (err) {
    console.error('Error setting up tables:', err);
  } finally {
    // Check if pool is already ended to avoid error
    try {
        await pool.end();
    } catch(e) {
        // ignore
    }
  }
}

setupTables();
