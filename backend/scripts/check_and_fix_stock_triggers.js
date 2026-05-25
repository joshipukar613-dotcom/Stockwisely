const { pool } = require('../config/database');

async function ensureTables() {
  await pool.query(`
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
  `);
}

async function triggerExists(tableName, triggerName) {
  const { rows } = await pool.query(
    `SELECT tgname FROM pg_trigger WHERE tgrelid = $1::regclass AND tgname = $2`,
    [`public.${tableName}`, triggerName]
  );
  return rows.length > 0;
}

async function createFunctionsAndTriggers() {
  await pool.query(`
    CREATE OR REPLACE FUNCTION public.trg_sales_items_stock() RETURNS TRIGGER AS $$
    DECLARE prev_qty NUMERIC(14,3);
    DECLARE prev_amt NUMERIC(14,2);
    DECLARE month_int INTEGER;
    BEGIN
      -- SKIP trigger for returns (negative amount)
      IF NEW.amount < 0 THEN
        RETURN NEW;
      END IF;

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
  `);

  await pool.query(`
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
  `);

  if (!(await triggerExists('sales_items', 'trg_sales_items_stock'))) {
    await pool.query(`
      DROP TRIGGER IF EXISTS trg_sales_items_stock ON public.sales_items;
      CREATE TRIGGER trg_sales_items_stock
      AFTER INSERT ON public.sales_items
      FOR EACH ROW EXECUTE PROCEDURE public.trg_sales_items_stock();
    `);
  }

  if (!(await triggerExists('purchase_items', 'trg_purchase_items_stock'))) {
    await pool.query(`
      DROP TRIGGER IF EXISTS trg_purchase_items_stock ON public.purchase_items;
      CREATE TRIGGER trg_purchase_items_stock
      AFTER INSERT ON public.purchase_items
      FOR EACH ROW EXECUTE PROCEDURE public.trg_purchase_items_stock();
    `);
  }
}

async function run() {
  console.log('Checking stock triggers...');
  await ensureTables();
  await createFunctionsAndTriggers();
  console.log('Stock triggers ensured.');
  process.exit(0);
}

run().catch(async (e) => {
  console.error('Failed to ensure stock triggers:', e);
  try { await pool.end(); } catch (err) { }
  process.exit(1);
});

