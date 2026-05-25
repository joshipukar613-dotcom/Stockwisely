BEGIN;

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id BIGSERIAL PRIMARY KEY,
  product_code TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  unit TEXT,
  base_price NUMERIC(12,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales master-detail
CREATE TABLE IF NOT EXISTS public.sales_master (
  id BIGSERIAL PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  total_amount NUMERIC(14,2) DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES public.sales_master(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL,
  product_name TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  amount NUMERIC(14,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase master-detail
CREATE TABLE IF NOT EXISTS public.purchase_master (
  id BIGSERIAL PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  vendor_name TEXT,
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  total_amount NUMERIC(14,2) DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_id BIGINT NOT NULL REFERENCES public.purchase_master(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL,
  product_name TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  amount NUMERIC(14,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers: compute amounts and totals
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

COMMIT;

