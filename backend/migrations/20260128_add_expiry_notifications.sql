-- Products: add expiry-related columns
ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS manufacturing_date DATE;

-- Notification settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  frequency VARCHAR(20) NOT NULL DEFAULT 'Immediate',
  threshold INT,
  expiry_days INT[],
  quiet_hours_from TIME,
  quiet_hours_to TIME,
  severity VARCHAR(20) DEFAULT 'High',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_settings_user_idx ON notification_settings (user_id);
CREATE INDEX IF NOT EXISTS notification_settings_type_idx ON notification_settings (alert_type);

-- Notification log
CREATE TABLE IF NOT EXISTS notification_log (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  payload JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  error TEXT
);

CREATE INDEX IF NOT EXISTS notification_log_user_idx ON notification_log (user_id);
CREATE INDEX IF NOT EXISTS notification_log_type_idx ON notification_log (alert_type);
CREATE INDEX IF NOT EXISTS notification_log_sent_idx ON notification_log (sent_at);

-- Expiry alerts
CREATE TABLE IF NOT EXISTS expiry_alerts (
  id SERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL,
  product_code VARCHAR(100),
  batch_number VARCHAR(50),
  alert_type VARCHAR(50) NOT NULL,
  expiry_date DATE,
  days_until_expiry INT,
  quantity INT,
  notification_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expiry_alerts_product_idx ON expiry_alerts (product_id);
CREATE INDEX IF NOT EXISTS expiry_alerts_expiry_idx ON expiry_alerts (expiry_date);
CREATE INDEX IF NOT EXISTS expiry_alerts_type_idx ON expiry_alerts (alert_type);

-- Product expiry history
CREATE TABLE IF NOT EXISTS product_expiry_history (
  id SERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL,
  product_code VARCHAR(100),
  batch_number VARCHAR(50),
  expiry_date DATE,
  quantity INT,
  action_taken VARCHAR(50),
  disposed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_expiry_history_product_idx ON product_expiry_history (product_id);
CREATE INDEX IF NOT EXISTS product_expiry_history_batch_idx ON product_expiry_history (batch_number);
CREATE INDEX IF NOT EXISTS product_expiry_history_expiry_idx ON product_expiry_history (expiry_date);
