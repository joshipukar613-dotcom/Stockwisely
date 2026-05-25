-- 006_add_fifo_batches.sql

CREATE TABLE IF NOT EXISTS stock_batches (
  id BIGSERIAL PRIMARY KEY,
  product_code TEXT NOT NULL,
  batch_date DATE NOT NULL,
  vendor_id BIGINT,
  quantity_added DECIMAL(10,2) NOT NULL,
  quantity_remaining DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  is_exhausted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_batches_product_code ON stock_batches(product_code);

CREATE TABLE IF NOT EXISTS sale_batches (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL,
  batch_id BIGINT NOT NULL,
  quantity_sold DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL,
  mrp DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales_master(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES stock_batches(id) ON DELETE CASCADE
);

-- Drop the view if it exists so we can recreate it
DROP VIEW IF EXISTS product_weighted_avg_cost;

CREATE VIEW product_weighted_avg_cost AS
SELECT
  product_code,
  COALESCE(SUM(quantity_remaining * cost_price) / NULLIF(SUM(quantity_remaining), 0), 0) AS weighted_avg_cost,
  COALESCE(SUM(quantity_remaining), 0) AS total_remaining_qty
FROM stock_batches
WHERE is_exhausted = FALSE
GROUP BY product_code;

-- Drop the view if it exists so we can recreate it
DROP VIEW IF EXISTS product_weighted_avg_cost;

CREATE VIEW product_weighted_avg_cost AS
SELECT
  product_code,
  COALESCE(SUM(quantity_remaining * cost_price) / NULLIF(SUM(quantity_remaining), 0), 0) AS weighted_avg_cost,
  COALESCE(SUM(quantity_remaining), 0) AS total_remaining_qty
FROM stock_batches
WHERE is_exhausted = FALSE
GROUP BY product_code;
