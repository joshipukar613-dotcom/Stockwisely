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
