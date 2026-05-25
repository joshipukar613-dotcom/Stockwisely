-- Master-Detail Migration: Sales & Purchases
-- This script creates master-detail tables, triggers for totals and stock updates,
-- and migrates existing flat data where possible. Adjust grouping and column names
-- if your current schemas differ.

BEGIN;

-- 1) Products catalog (safe create)
CREATE TABLE IF NOT EXISTS public.products (
  id              BIGSERIAL PRIMARY KEY,
  product_code    TEXT NOT NULL UNIQUE,
  description     TEXT,
  category        TEXT,
  unit            TEXT,
  base_price      NUMERIC(12,2),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(product_code);

-- 2) Sales master-detail
CREATE TABLE IF NOT EXISTS public.sales_master (
  id              BIGSERIAL PRIMARY KEY,
  invoice_number  TEXT NOT NULL UNIQUE,
  customer_name   TEXT,
  sale_date       TIMESTAMPTZ DEFAULT NOW(),
  total_amount    NUMERIC(14,2) DEFAULT 0,
  total_items     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_master_date ON public.sales_master(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_master_invoice ON public.sales_master(invoice_number);

CREATE TABLE IF NOT EXISTS public.sales_items (
  id              BIGSERIAL PRIMARY KEY,
  sale_id         BIGINT NOT NULL REFERENCES public.sales_master(id) ON DELETE CASCADE,
  product_code    TEXT NOT NULL,
  product_name    TEXT,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  price           NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  amount          NUMERIC(14,2), -- maintained by trigger as quantity * price
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_items_sale ON public.sales_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_product ON public.sales_items(product_code);

-- 3) Purchases master-detail
CREATE TABLE IF NOT EXISTS public.purchase_master (
  id              BIGSERIAL PRIMARY KEY,
  invoice_number  TEXT NOT NULL UNIQUE,
  vendor_name     TEXT,
  purchase_date   TIMESTAMPTZ DEFAULT NOW(),
  total_amount    NUMERIC(14,2) DEFAULT 0,
  total_items     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_master_date ON public.purchase_master(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_master_invoice ON public.purchase_master(invoice_number);

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id              BIGSERIAL PRIMARY KEY,
  purchase_id     BIGINT NOT NULL REFERENCES public.purchase_master(id) ON DELETE CASCADE,
  product_code    TEXT NOT NULL,
  product_name    TEXT,
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  price           NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  amount          NUMERIC(14,2), -- maintained by trigger
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON public.purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON public.purchase_items(product_code);

-- 4) Stock movements (safe create if missing)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id             BIGSERIAL PRIMARY KEY,
  product_code   TEXT NOT NULL,
  description    TEXT,
  vat_pct        NUMERIC(5,2),
  inwards_qty    NUMERIC(14,3) DEFAULT 0,
  inwards_amt    NUMERIC(14,2) DEFAULT 0,
  outwards_qty   NUMERIC(14,3) DEFAULT 0,
  outwards_amt   NUMERIC(14,2) DEFAULT 0,
  balance_qty    NUMERIC(14,3) DEFAULT 0,
  balance_amt    NUMERIC(14,2) DEFAULT 0,
  last_cost      NUMERIC(14,2),
  source_file    TEXT,
  extracted_month INTEGER,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_month ON public.stock_movements(product_code, extracted_month);

-- 5) Analytics & predictions
CREATE TABLE IF NOT EXISTS public.sales_analytics (
  id                BIGSERIAL PRIMARY KEY,
  product_code      TEXT NOT NULL,
  feature_vector    JSONB,
  computed_on       TIMESTAMPTZ DEFAULT NOW(),
  notes             TEXT
);

CREATE INDEX IF NOT EXISTS idx_sales_analytics_product ON public.sales_analytics(product_code);

CREATE TABLE IF NOT EXISTS public.ml_predictions (
  id                BIGSERIAL PRIMARY KEY,
  product_code      TEXT NOT NULL,
  horizon_months    INTEGER NOT NULL,
  predicted_qty     NUMERIC(14,3),
  predicted_revenue NUMERIC(14,2),
  model_version     TEXT,
  computed_on       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_product ON public.ml_predictions(product_code);

CREATE TABLE IF NOT EXISTS public.dashboard_kpis (
  id                BIGSERIAL PRIMARY KEY,
  key               TEXT NOT NULL UNIQUE,
  value             JSONB NOT NULL,
  computed_on       TIMESTAMPTZ DEFAULT NOW()
);

-- 6) Trigger functions: maintain amounts, totals, and stock movements
-- 6a) Ensure item.amount = quantity * price
CREATE OR REPLACE FUNCTION public.trg_item_amount_compute() RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'sales_items' THEN
    NEW.amount := COALESCE(NEW.quantity,0) * COALESCE(NEW.price,0);
  ELSIF TG_TABLE_NAME = 'purchase_items' THEN
    NEW.amount := COALESCE(NEW.quantity,0) * COALESCE(NEW.price,0);
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_items_amount ON public.sales_items;
CREATE TRIGGER trg_sales_items_amount
BEFORE INSERT OR UPDATE ON public.sales_items
FOR EACH ROW EXECUTE PROCEDURE public.trg_item_amount_compute();

DROP TRIGGER IF EXISTS trg_purchase_items_amount ON public.purchase_items;
CREATE TRIGGER trg_purchase_items_amount
BEFORE INSERT OR UPDATE ON public.purchase_items
FOR EACH ROW EXECUTE PROCEDURE public.trg_item_amount_compute();

-- 6b) Recalculate master totals after item change
CREATE OR REPLACE FUNCTION public.trg_sales_items_recalc() RETURNS TRIGGER AS $$
DECLARE v_sale_id BIGINT;
BEGIN
  v_sale_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.sale_id ELSE NEW.sale_id END;
  UPDATE public.sales_master sm
    SET total_amount = COALESCE((SELECT SUM(si.quantity * si.price) FROM public.sales_items si WHERE si.sale_id = v_sale_id), 0),
        total_items  = COALESCE((SELECT SUM(si.quantity) FROM public.sales_items si WHERE si.sale_id = v_sale_id), 0),
        updated_at   = NOW()
  WHERE sm.id = v_sale_id;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_items_recalc ON public.sales_items;
CREATE TRIGGER trg_sales_items_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.sales_items
FOR EACH ROW EXECUTE PROCEDURE public.trg_sales_items_recalc();

CREATE OR REPLACE FUNCTION public.trg_purchase_items_recalc() RETURNS TRIGGER AS $$
DECLARE v_purchase_id BIGINT;
BEGIN
  v_purchase_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.purchase_id ELSE NEW.purchase_id END;
  UPDATE public.purchase_master pm
    SET total_amount = COALESCE((SELECT SUM(pi.quantity * pi.price) FROM public.purchase_items pi WHERE pi.purchase_id = v_purchase_id), 0),
        total_items  = COALESCE((SELECT SUM(pi.quantity) FROM public.purchase_items pi WHERE pi.purchase_id = v_purchase_id), 0),
        updated_at   = NOW()
  WHERE pm.id = v_purchase_id;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_items_recalc ON public.purchase_items;
CREATE TRIGGER trg_purchase_items_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_items
FOR EACH ROW EXECUTE PROCEDURE public.trg_purchase_items_recalc();

-- 6c) Stock movements: create movement rows on item inserts
CREATE OR REPLACE FUNCTION public.trg_sales_items_stock() RETURNS TRIGGER AS $$
DECLARE prev_qty NUMERIC(14,3);
DECLARE prev_amt NUMERIC(14,2);
DECLARE month_int INTEGER;
BEGIN
  -- Determine previous balance
  SELECT COALESCE(balance_qty,0), COALESCE(balance_amt,0)
  INTO prev_qty, prev_amt
  FROM public.stock_movements
  WHERE product_code = NEW.product_code
  ORDER BY extracted_month DESC NULLS LAST
  LIMIT 1;

  month_int := EXTRACT(MONTH FROM NOW());
  INSERT INTO public.stock_movements(
    product_code, description, vat_pct,
    inwards_qty, inwards_amt, outwards_qty, outwards_amt,
    balance_qty, balance_amt, last_cost, source_file, extracted_month
  ) VALUES (
    NEW.product_code, NEW.product_name, NULL,
    0, 0, NEW.quantity, NEW.quantity * COALESCE(NEW.price,0),
    prev_qty - NEW.quantity,
    prev_amt - NEW.quantity * COALESCE(NEW.price,0),
    COALESCE(NEW.price, NULL),
    'api_sale', month_int
  );
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_items_stock ON public.sales_items;
CREATE TRIGGER trg_sales_items_stock
AFTER INSERT ON public.sales_items
FOR EACH ROW EXECUTE PROCEDURE public.trg_sales_items_stock();

CREATE OR REPLACE FUNCTION public.trg_purchase_items_stock() RETURNS TRIGGER AS $$
DECLARE prev_qty NUMERIC(14,3);
DECLARE prev_amt NUMERIC(14,2);
DECLARE month_int INTEGER;
BEGIN
  SELECT COALESCE(balance_qty,0), COALESCE(balance_amt,0)
  INTO prev_qty, prev_amt
  FROM public.stock_movements
  WHERE product_code = NEW.product_code
  ORDER BY extracted_month DESC NULLS LAST
  LIMIT 1;

  month_int := EXTRACT(MONTH FROM NOW());
  INSERT INTO public.stock_movements(
    product_code, description, vat_pct,
    inwards_qty, inwards_amt, outwards_qty, outwards_amt,
    balance_qty, balance_amt, last_cost, source_file, extracted_month
  ) VALUES (
    NEW.product_code, NEW.product_name, NULL,
    NEW.quantity, NEW.quantity * COALESCE(NEW.price,0), 0, 0,
    prev_qty + NEW.quantity,
    prev_amt + NEW.quantity * COALESCE(NEW.price,0),
    COALESCE(NEW.price, NULL),
    'api_purchase', month_int
  );
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_items_stock ON public.purchase_items;
CREATE TRIGGER trg_purchase_items_stock
AFTER INSERT ON public.purchase_items
FOR EACH ROW EXECUTE PROCEDURE public.trg_purchase_items_stock();

-- 7) Data migration from flat tables (best-effort, adjust if schemas differ)
-- Assumptions:
-- sales_records(product_code, product_name, quantity, sales_rate, net_amt, extracted_month, source_file)
-- purchase_records(product_code, product_name, purchases_qty, avg_rate, fiscal_year, month)

-- 7a) Seed products from existing data (if not already present)
INSERT INTO public.products(product_code, description, category)
SELECT DISTINCT sr.code::text AS product_code, sr.description AS description, NULL AS category
FROM public.sales_records sr
ON CONFLICT (product_code) DO NOTHING;

INSERT INTO public.products(product_code, description, category)
SELECT DISTINCT pr.product_code::text AS product_code, pr.product_name AS description, pr.category AS category
FROM public.purchase_records pr
ON CONFLICT (product_code) DO NOTHING;

-- 7b) Create sales_master grouping by source_file + extracted_month (heuristic)
WITH groups AS (
  SELECT COALESCE(source_file,'unknown') AS source_file, COALESCE(extracted_month,0) AS extracted_month
  FROM public.sales_records
  GROUP BY COALESCE(source_file,'unknown'), COALESCE(extracted_month,0)
)
INSERT INTO public.sales_master(invoice_number, customer_name, sale_date)
SELECT 'S-' || md5(g.source_file || '-' || g.extracted_month::text), 'Unknown Customer',
       NOW() -- replace with actual date if available
FROM groups g
ON CONFLICT (invoice_number) DO NOTHING;

-- 7c) Insert sales_items linked via the same invoice heuristic
INSERT INTO public.sales_items(sale_id, product_code, product_name, quantity, price)
SELECT sm.id,
       sr.code::text AS product_code,
       sr.description AS product_name,
       ROUND(sr.quantity)::int AS quantity,
       sr.sales_rate AS price
FROM public.sales_records sr
JOIN public.sales_master sm
  ON sm.invoice_number = 'S-' || md5(COALESCE(sr.source_file,'unknown') || '-' || COALESCE(sr.extracted_month,0)::text)
WHERE ROUND(sr.quantity)::int > 0;

-- 7d) Create purchase_master grouping by fiscal_year + month (heuristic)
WITH groups AS (
  SELECT COALESCE(fiscal_year, EXTRACT(YEAR FROM NOW())::int) AS fy,
         COALESCE(month, EXTRACT(MONTH FROM NOW())::int) AS mo
  FROM public.purchase_records
  GROUP BY COALESCE(fiscal_year, EXTRACT(YEAR FROM NOW())::int), COALESCE(month, EXTRACT(MONTH FROM NOW())::int)
)
INSERT INTO public.purchase_master(invoice_number, vendor_name, purchase_date)
SELECT 'P-' || g.fy::text || '-' || g.mo::text,
       'Unknown Vendor',
       make_timestamp(g.fy, g.mo, 1, 0, 0, 0)
FROM groups g
ON CONFLICT (invoice_number) DO NOTHING;

-- 7e) Insert purchase_items
INSERT INTO public.purchase_items(purchase_id, product_code, product_name, quantity, price)
SELECT pm.id,
       pr.product_code::text AS product_code,
       pr.product_name AS product_name,
       ROUND(pr.purchases_qty)::int AS quantity,
       pr.avg_rate AS price
FROM public.purchase_records pr
JOIN public.purchase_master pm
  ON pm.invoice_number = 'P-' || COALESCE(pr.fiscal_year, EXTRACT(YEAR FROM NOW())::int)::text || '-' || COALESCE(pr.month, EXTRACT(MONTH FROM NOW())::int)::text
WHERE ROUND(pr.purchases_qty)::int > 0;

COMMIT;

-- Notes:
-- - If your flat tables have explicit invoice numbers or customer/vendor fields,
--   replace the grouping heuristics with those columns to preserve true invoices.
-- - Triggers automatically recompute totals and write stock movements for new inserts.
-- - Consider backfilling sale_date/purchase_date from actual timestamps in your data.
