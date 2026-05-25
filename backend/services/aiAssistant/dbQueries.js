const { pool } = require('../../config/database');
const { cache } = require('./cache');

const DEFAULT_TTL_MS = parseInt(process.env.AI_DB_CACHE_TTL_MS || '60000', 10); // 60s

function toNumber(value) {
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

function localDateISO(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function getCached(key, ttlMs, fn) {
  const cached = cache.get(key);
  if (cached) return cached;
  const value = await fn();
  cache.set(key, value, ttlMs);
  return value;
}

// ═══════════════════════════════════════════════════════════
// DATE HELPERS
// ═══════════════════════════════════════════════════════════
function getTodayDateRange() {
  return {
    start: `DATE(CURRENT_DATE)`,
    end: `DATE(CURRENT_DATE + INTERVAL '1 day')`
  };
}

function getYesterdayDate() {
  return `DATE(CURRENT_DATE - INTERVAL '1 day')`;
}

function getCurrentMonthRange() {
  return {
    start: `DATE_TRUNC('month', CURRENT_DATE)`,
    end: `DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`
  };
}

// ═══════════════════════════════════════════════════════════
// SALES QUERIES
// ═══════════════════════════════════════════════════════════

async function getSalesToday() {
  const key = `sales_today:${localDateISO()}`;
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT
        COALESCE(SUM(total_amount), 0)::numeric AS total,
        COUNT(*)::bigint AS count
      FROM sales_master
      WHERE DATE(sale_date) = CURRENT_DATE
        AND is_return = FALSE
    `;
    console.log('[AI Assistant][SQL][getSalesToday]', q);
    const { rows } = await pool.query(q);
    const r = rows[0] || {};
    return {
      total: toNumber(r.total),
      count: parseInt(r.count || 0, 10),
    };
  });
}

async function getSalesYesterday() {
  const todayISO = localDateISO();
  const key = `sales_yesterday:${todayISO}`;
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT
        COALESCE(SUM(total_amount), 0)::numeric AS total,
        COUNT(*)::bigint AS count
      FROM sales_master
      WHERE DATE(sale_date) = (CURRENT_DATE - INTERVAL '1 day')::date
        AND is_return = FALSE
    `;
    console.log('[AI Assistant][SQL][getSalesYesterday]', q);
    const { rows } = await pool.query(q);
    const r = rows[0] || {};
    return {
      total: toNumber(r.total),
      count: parseInt(r.count || 0, 10),
    };
  });
}

async function getSalesWeek() {
  const d = new Date();
  const year = d.getFullYear();
  const weekApprox = Math.ceil(d.getDate() / 7);
  const key = `sales_week:${year}-${weekApprox}`;

  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT
        COALESCE(SUM(total_amount), 0)::numeric AS total,
        COUNT(*)::bigint AS count
      FROM sales_master
      WHERE DATE(sale_date) >= date_trunc('week', CURRENT_DATE)::date
        AND DATE(sale_date) < (date_trunc('week', CURRENT_DATE) + INTERVAL '7 days')::date
        AND is_return = FALSE
    `;
    console.log('[AI Assistant][SQL][getSalesWeek]', q);
    const { rows } = await pool.query(q);
    const r = rows[0] || {};
    return {
      total: toNumber(r.total),
      count: parseInt(r.count || 0, 10),
    };
  });
}

async function getSalesMonth() {
  const d = new Date();
  const key = `sales_month:${d.getFullYear()}-${d.getMonth() + 1}`;
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT
        COALESCE(SUM(total_amount), 0)::numeric AS total,
        COUNT(*)::bigint AS count
      FROM sales_master
      WHERE DATE(sale_date) >= date_trunc('month', CURRENT_DATE)::date
        AND DATE(sale_date) < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
        AND is_return = FALSE
    `;
    console.log('[AI Assistant][SQL][getSalesMonth]', q);
    const { rows } = await pool.query(q);
    const r = rows[0] || {};
    return {
      total: toNumber(r.total),
      count: parseInt(r.count || 0, 10),
    };
  });
}

async function getMonthlyComparison() {
  const d = new Date();
  const thisMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const key = `sales_month_comparison:${thisMonthKey}`;

  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT
        COALESCE(SUM(
          CASE
            WHEN DATE(sale_date) >= date_trunc('month', CURRENT_DATE)::date
             AND DATE(sale_date) < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
            THEN total_amount
            ELSE 0
          END
        ), 0)::numeric AS this_month_sales,
        COALESCE(SUM(
          CASE
            WHEN DATE(sale_date) >= (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date
             AND DATE(sale_date) < date_trunc('month', CURRENT_DATE)::date
            THEN total_amount
            ELSE 0
          END
        ), 0)::numeric AS last_month_sales
      FROM sales_master
      WHERE DATE(sale_date) >= (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date
        AND DATE(sale_date) < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
        AND is_return = FALSE
    `;

    console.log('[AI Assistant][SQL][getMonthlyComparison]', q);
    const { rows } = await pool.query(q);
    const r = rows[0] || {};
    const thisMonthSales = toNumber(r.this_month_sales);
    const lastMonthSales = toNumber(r.last_month_sales);

    const growthPercent =
      lastMonthSales > 0 ? ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100 : null;

    return {
      thisMonthSales,
      lastMonthSales,
      growthPercent,
    };
  });
}

// ═══════════════════════════════════════════════════════════
// SALES RETURNS
// ═══════════════════════════════════════════════════════════

async function getSalesReturnsToday() {
  const key = `sales_returns_today:${localDateISO()}`;
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT
        COALESCE(SUM(ABS(total_amount)), 0)::numeric AS total,
        COUNT(*)::bigint AS count
      FROM sales_master
      WHERE DATE(sale_date) = CURRENT_DATE
        AND is_return = TRUE
    `;
    console.log('[AI Assistant][SQL][getSalesReturnsToday]', q);
    const { rows } = await pool.query(q);
    const r = rows[0] || {};
    return {
      total: toNumber(r.total),
      count: parseInt(r.count || 0, 10),
    };
  });
}

async function getSalesReturnsYesterday() {
  const todayISO = localDateISO();
  const key = `sales_returns_yesterday:${todayISO}`;
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT
        COALESCE(SUM(ABS(total_amount)), 0)::numeric AS total,
        COUNT(*)::bigint AS count
      FROM sales_master
      WHERE DATE(sale_date) = (CURRENT_DATE - INTERVAL '1 day')::date
        AND is_return = TRUE
    `;
    console.log('[AI Assistant][SQL][getSalesReturnsYesterday]', q);
    const { rows } = await pool.query(q);
    const r = rows[0] || {};
    return {
      total: toNumber(r.total),
      count: parseInt(r.count || 0, 10),
    };
  });
}

async function getSalesReturnsMonth() {
  const d = new Date();
  const thisMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const key = `sales_returns_month:${thisMonthKey}`;

  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT
        COALESCE(SUM(ABS(total_amount)), 0)::numeric AS total,
        COUNT(*)::bigint AS count
      FROM sales_master
      WHERE DATE(sale_date) >= date_trunc('month', CURRENT_DATE)::date
        AND DATE(sale_date) < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
        AND is_return = TRUE
    `;
    console.log('[AI Assistant][SQL][getSalesReturnsMonth]', q);
    const { rows } = await pool.query(q);
    const r = rows[0] || {};
    return {
      total: toNumber(r.total),
      count: parseInt(r.count || 0, 10),
    };
  });
}

async function getSalesReturnsWeek() {
  const d = new Date();
  const year = d.getFullYear();
  const weekApprox = Math.ceil(d.getDate() / 7);
  const key = `sales_returns_week:${year}-${weekApprox}`;

  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT
        COALESCE(SUM(ABS(total_amount)), 0)::numeric AS total,
        COUNT(*)::bigint AS count
      FROM sales_master
      WHERE DATE(sale_date) >= date_trunc('week', CURRENT_DATE)::date
        AND DATE(sale_date) < (date_trunc('week', CURRENT_DATE) + INTERVAL '7 days')::date
        AND is_return = TRUE
    `;
    console.log('[AI Assistant][SQL][getSalesReturnsWeek]', q);
    const { rows } = await pool.query(q);
    const r = rows[0] || {};
    return {
      total: toNumber(r.total),
      count: parseInt(r.count || 0, 10),
    };
  });
}

async function getSalesReturnsByDate(dateStr) {
  // dateStr should be 'YYYY-MM-DD' format
  const key = `sales_returns_date:${dateStr}`;
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT
        COALESCE(SUM(ABS(total_amount)), 0)::numeric AS total,
        COUNT(*)::bigint AS count
      FROM sales_master
      WHERE DATE(sale_date) = $1::date
        AND is_return = TRUE
    `;
    console.log(`[AI Assistant][SQL][getSalesReturnsByDate] date=${dateStr}`);
    const { rows } = await pool.query(q, [dateStr]);
    const r = rows[0] || {};
    return {
      total: toNumber(r.total),
      count: parseInt(r.count || 0, 10),
      date: dateStr
    };
  });
}

// ═══════════════════════════════════════════════════════════
// PRODUCTS & INVENTORY
// ═══════════════════════════════════════════════════════════

async function getTopProducts() {
  const key = `top_products:${localDateISO()}`;
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT
        si.product_code,
        COALESCE(si.product_name, p.description, '') AS product_name,
        COALESCE(SUM(si.quantity), 0)::bigint AS total_qty,
        COALESCE(SUM(si.amount), 0)::numeric AS revenue
      FROM sales_items si
      INNER JOIN sales_master sm ON sm.id = si.sale_id
      LEFT JOIN products p ON p.product_code = si.product_code
      WHERE DATE(sm.sale_date) >= (CURRENT_DATE - INTERVAL '30 days')::date
        AND sm.is_return = FALSE
      GROUP BY si.product_code, COALESCE(si.product_name, p.description, '')
      ORDER BY revenue DESC
      LIMIT 10
    `;
    console.log('[AI Assistant][SQL][getTopProducts]', q);
    const { rows } = await pool.query(q);
    return rows.map((r) => ({
      productCode: r.product_code,
      productName: r.product_name,
      totalQty: parseInt(r.total_qty || 0, 10),
      revenue: toNumber(r.revenue),
    }));
  });
}

async function getLowStockItems() {
  const key = 'low_stock_items';
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      WITH latest_stock AS (
        SELECT DISTINCT ON (product_code)
          product_code,
          description,
          balance_qty,
          last_cost,
          extracted_month
        FROM stock_movements
        ORDER BY product_code, extracted_month DESC NULLS LAST
      )
      SELECT
        ls.product_code,
        ls.description,
        COALESCE(ls.balance_qty, 0)::numeric AS current_stock,
        COALESCE(p.min_stock_level, 0)::int AS minimum_stock_level,
        COALESCE(ls.last_cost, 0)::numeric AS unit_cost
      FROM latest_stock ls
      INNER JOIN products p ON p.product_code = ls.product_code
      WHERE COALESCE(p.min_stock_level, 0) > 0
        AND COALESCE(ls.balance_qty, 0) < COALESCE(p.min_stock_level, 0)
      ORDER BY (COALESCE(p.min_stock_level, 0) - COALESCE(ls.balance_qty, 0)) DESC
      LIMIT 20
    `;
    console.log('[AI Assistant][SQL][getLowStockItems]', q);
    const { rows } = await pool.query(q);

    return rows.map((r) => ({
      productCode: r.product_code,
      description: r.description,
      currentStock: toNumber(r.current_stock),
      minimumStockLevel: parseInt(r.minimum_stock_level || 0, 10),
      unitCost: toNumber(r.unit_cost),
    }));
  });
}

async function getReorderRecommendations() {
  return await getLowStockItems();
}

async function getBusinessSummary() {
  // Simple summary for now
  const sales = await getSalesToday();
  const returns = await getSalesReturnsToday();
  const lowStock = await getLowStockItems();
  
  return {
    todaySales: sales,
    todayReturns: returns,
    lowStockCount: lowStock.length
  };
}

// ═══════════════════════════════════════════════════════════
// ADVICE SUMMARY — aggregates key data for the advice prompt
// ═══════════════════════════════════════════════════════════

async function getAdviceSummary() {
  const key = `advice_summary:${localDateISO()}`;
  return getCached(key, DEFAULT_TTL_MS * 2, async () => {
    // Run all queries in parallel for speed  
    const [
      salesToday,
      salesMonth,
      returnsToday,
      returnsMonth,
      monthComparison,
      topProducts,
      lowStockItems
    ] = await Promise.all([
      getSalesToday(),
      getSalesMonth(),
      getSalesReturnsToday(),
      getSalesReturnsMonth(),
      getMonthlyComparison(),
      getTopProducts(),
      getLowStockItems()
    ]);

    return {
      salesToday,
      salesMonth,
      returnsToday,
      returnsMonth,
      monthComparison,
      topProducts: topProducts.slice(0, 5),
      lowStockItems: lowStockItems.slice(0, 5),
      lowStockCount: lowStockItems.length
    };
  });
}

// ═══════════════════════════════════════════════════════════
// PURCHASES QUERIES
// ═══════════════════════════════════════════════════════════

async function getPurchaseToday() {
  const key = `purchase_today:${localDateISO()}`;
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT COALESCE(SUM(total_amount), 0)::numeric AS total, COUNT(*)::bigint AS count
      FROM purchase_master WHERE DATE(purchase_date) = CURRENT_DATE
    `;
    const { rows } = await pool.query(q);
    return { total: toNumber(rows[0]?.total), count: parseInt(rows[0]?.count || 0, 10) };
  });
}

async function getPurchaseMonth() {
  const key = `purchase_month:${localDateISO()}`;
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT COALESCE(SUM(total_amount), 0)::numeric AS total, COUNT(*)::bigint AS count
      FROM purchase_master 
      WHERE DATE(purchase_date) >= date_trunc('month', CURRENT_DATE)::date
      AND DATE(purchase_date) < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
    `;
    const { rows } = await pool.query(q);
    return { total: toNumber(rows[0]?.total), count: parseInt(rows[0]?.count || 0, 10) };
  });
}

// ═══════════════════════════════════════════════════════════
// CUSTOMER QUERIES
// ═══════════════════════════════════════════════════════════

async function getTopCustomers() {
  const key = `top_customers:${localDateISO()}`;
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT COALESCE(customer_name, 'Unknown') AS customer_name, COALESCE(SUM(total_amount), 0)::numeric AS revenue
      FROM sales_master WHERE is_return = FALSE AND customer_name IS NOT NULL AND customer_name != ''
      GROUP BY customer_name ORDER BY revenue DESC LIMIT 10
    `;
    const { rows } = await pool.query(q);
    return { items: rows };
  });
}

async function getCustomerCount() {
  const key = `customer_count:${localDateISO()}`;
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT COUNT(DISTINCT customer_name)::bigint AS count
      FROM sales_master WHERE customer_name IS NOT NULL AND customer_name != ''
    `;
    const { rows } = await pool.query(q);
    return { count: parseInt(rows[0]?.count || 0, 10) };
  });
}

// ═══════════════════════════════════════════════════════════
// PROFIT QUERIES
// ═══════════════════════════════════════════════════════════

async function getProfitToday() {
  const key = `profit_today:${localDateISO()}`;
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const sales = await getSalesToday();
    const purchases = await getPurchaseToday();
    return { total: sales.total - purchases.total };
  });
}

async function getProfitMonth() {
  const key = `profit_month:${localDateISO()}`;
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const sales = await getSalesMonth();
    const purchases = await getPurchaseMonth();
    return { total: sales.total - purchases.total };
  });
}

// ═══════════════════════════════════════════════════════════
// INVENTORY EXTENSIONS
// ═══════════════════════════════════════════════════════════

async function getExpiringStock() {
  const key = `expiring_stock:${localDateISO()}`;
  return getCached(key, DEFAULT_TTL_MS, async () => {
    const q = `
      SELECT pi.product_name, pi.expiry_date, pi.quantity
      FROM purchase_items pi
      WHERE pi.expiry_date IS NOT NULL AND pi.expiry_date > CURRENT_DATE
      ORDER BY pi.expiry_date ASC LIMIT 15
    `;
    const { rows } = await pool.query(q);
    return { items: rows };
  });
}

module.exports = {
  getSalesToday,
  getSalesYesterday,
  getSalesWeek,
  getSalesMonth,
  getMonthlyComparison,
  getSalesReturnsToday,
  getSalesReturnsYesterday,
  getSalesReturnsWeek,
  getSalesReturnsMonth,
  getSalesReturnsByDate,
  getTopProducts,
  getLowStockItems,
  getReorderRecommendations,
  getBusinessSummary,
  getAdviceSummary,
  getPurchaseToday,
  getPurchaseMonth,
  getTopCustomers,
  getCustomerCount,
  getProfitToday,
  getProfitMonth,
  getExpiringStock
};
