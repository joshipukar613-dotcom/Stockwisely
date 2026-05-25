const { pool } = require('../config/database');

// ────────────────────────────────────────────────────────────
// GET /api/analytics/sales-demand
// ────────────────────────────────────────────────────────────
exports.getSalesDemand = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const startDateStr =
        req.query.startDate ||
        new Date(new Date().setMonth(new Date().getMonth() - 6))
          .toISOString()
          .split('T')[0];
      const endDateStr =
        req.query.endDate || new Date().toISOString().split('T')[0];

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      const periodDays = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));

      // Calculate previous period
      const prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - periodDays);

      const startDateFmt = startDate.toISOString().split('T')[0];
      const endDateFmt = endDate.toISOString().split('T')[0];
      const prevStartDateFmt = prevStartDate.toISOString().split('T')[0];
      const prevEndDateFmt = prevEndDate.toISOString().split('T')[0];

      // Total overall revenue for this period (for percentage contribution)
      const totalRevQ = `
        SELECT SUM(amount)::numeric AS total_revenue
        FROM sales_items si
        JOIN sales_master sm ON si.sale_id = sm.id
        WHERE sm.sale_date BETWEEN $1 AND $2
          AND sm.is_return = FALSE AND si.amount > 0
      `;
      const totalRevRes = await client.query(totalRevQ, [startDateFmt, endDateFmt]);
      const overallTotalRevenue = Number(totalRevRes.rows[0].total_revenue) || 1;

      // 1. Best sellers (top 10 by revenue)
      const bestSellersQ = `
        SELECT si.product_name, si.product_code,
               SUM(si.amount)::numeric   AS total_revenue,
               SUM(si.quantity)::bigint   AS total_quantity,
               COUNT(DISTINCT si.sale_id)::bigint AS order_count
        FROM sales_items si
        JOIN sales_master sm ON si.sale_id = sm.id
        WHERE sm.sale_date BETWEEN $1 AND $2
          AND sm.is_return = FALSE AND si.amount > 0
        GROUP BY si.product_name, si.product_code
        ORDER BY total_revenue DESC
        LIMIT 10
      `;
      let bestSellers = await client.query(bestSellersQ, [startDateFmt, endDateFmt]);
      
      const topSellerRevenue = bestSellers.rows.length > 0 ? Number(bestSellers.rows[0].total_revenue) : 1;
      
      bestSellers.rows = bestSellers.rows.map(r => ({
        ...r,
        percentage_contribution: (Number(r.total_revenue) / overallTotalRevenue) * 100,
        relative_to_top_seller: (Number(r.total_revenue) / topSellerRevenue) * 100
      }));

      // 2. Worst sellers (bottom 10 by revenue, min 1 sale)
      const worstSellersQ = `
        SELECT si.product_name, si.product_code,
               SUM(si.amount)::numeric   AS total_revenue,
               SUM(si.quantity)::bigint   AS total_quantity,
               COUNT(DISTINCT si.sale_id)::bigint AS order_count
        FROM sales_items si
        JOIN sales_master sm ON si.sale_id = sm.id
        WHERE sm.sale_date BETWEEN $1 AND $2
          AND sm.is_return = FALSE AND si.amount > 0
        GROUP BY si.product_name, si.product_code
        ORDER BY total_revenue ASC
        LIMIT 10
      `;
      const worstSellers = await client.query(worstSellersQ, [startDateFmt, endDateFmt]);

      // 3. Dynamic Trend grouping based on period length
      let groupBy = 'day';
      if (periodDays > 93) groupBy = 'month';
      else if (periodDays > 31) groupBy = 'week';

      const buildTrendQuery = (start, end) => `
        SELECT DATE_TRUNC('${groupBy}', sale_date)::date AS date_group,
               COUNT(CASE WHEN is_return = FALSE THEN 1 END)::bigint AS orders,
               COALESCE(SUM(CASE WHEN is_return = FALSE THEN total_amount ELSE 0 END), 0)::numeric AS revenue,
               COALESCE(SUM(CASE WHEN is_return = FALSE THEN total_items ELSE 0 END), 0)::bigint AS items_sold
        FROM sales_master
        WHERE sale_date BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC('${groupBy}', sale_date)
        ORDER BY date_group ASC
      `;

      const currentTrendQuery = buildTrendQuery(startDateFmt, endDateFmt);
      const currentPeriodTrend = await client.query(currentTrendQuery, [startDateFmt, endDateFmt]);

      const previousTrendQuery = buildTrendQuery(prevStartDateFmt, prevEndDateFmt);
      const previousPeriodTrend = await client.query(previousTrendQuery, [prevStartDateFmt, prevEndDateFmt]);

      // 5. Category performance
      const categoryPerfQ = `
        SELECT COALESCE(p.category, 'OTHER') AS category,
               SUM(si.amount)::numeric       AS total_revenue,
               SUM(si.quantity)::bigint       AS total_quantity,
               COUNT(DISTINCT si.sale_id)::bigint AS order_count
        FROM sales_items si
        JOIN sales_master sm ON si.sale_id = sm.id
        LEFT JOIN products p ON si.product_code = p.product_code
        WHERE sm.sale_date BETWEEN $1 AND $2
          AND sm.is_return = FALSE AND si.amount > 0
        GROUP BY COALESCE(p.category, 'OTHER')
        ORDER BY total_revenue DESC
      `;
      let categoryPerf = await client.query(categoryPerfQ, [startDateFmt, endDateFmt]);
      categoryPerf.rows = categoryPerf.rows.map(r => ({
        ...r,
        percentage_contribution: (Number(r.total_revenue) / overallTotalRevenue) * 100
      }));

      // 6. Seasonal demand (still all-time monthly flow context)
      const seasonalQ = `
        SELECT EXTRACT(MONTH FROM sale_date)::int AS month_num,
               TO_CHAR(DATE_TRUNC('month', DATE '2000-01-01' + (EXTRACT(MONTH FROM sale_date)-1) * INTERVAL '1 month'), 'Mon') AS month_name,
               COALESCE(SUM(CASE WHEN is_return = FALSE THEN total_amount ELSE 0 END), 0)::numeric AS avg_revenue,
               COUNT(CASE WHEN is_return = FALSE THEN 1 END)::bigint AS total_orders
        FROM sales_master
        GROUP BY EXTRACT(MONTH FROM sale_date)
        ORDER BY month_num ASC
      `;
      const seasonal = await client.query(seasonalQ);

      const fmt = (rows) =>
        rows.map((r) => {
          const out = {};
          for (const [k, v] of Object.entries(r)) {
            if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) {
              out[k] = Number(v);
            } else if (typeof v === 'bigint') {
              out[k] = Number(v);
            } else {
              out[k] = v;
            }
          }
          return out;
        });

      res.json({
        success: true,
        data: {
          bestSellers: fmt(bestSellers.rows),
          worstSellers: fmt(worstSellers.rows),
          currentPeriodTrend: fmt(currentPeriodTrend.rows),
          previousPeriodTrend: fmt(previousPeriodTrend.rows),
          categoryPerformance: fmt(categoryPerf.rows),
          seasonalDemand: fmt(seasonal.rows),
          groupBy,
          overallTotalRevenue,
          dateRange: { startDate: startDateFmt, endDate: endDateFmt },
          prevDateRange: { startDate: prevStartDateFmt, endDate: prevEndDateFmt }
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Analytics sales-demand error:', error);
    if (error.stack) console.error(error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales & demand analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ────────────────────────────────────────────────────────────
// GET /api/analytics/inventory-health
// ────────────────────────────────────────────────────────────
exports.getInventoryHealth = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      // 1. Get current stock for all products
      const latestStockQ = `
        SELECT 
          p.product_code, 
          p.description AS product_name,
          COALESCE(p.stock, 0)::numeric AS current_stock,
          COALESCE(p.base_price, 0)::numeric AS unit_cost,
          COALESCE(p.min_stock_level, 5)::numeric AS min_level,
          COALESCE(p.category, 'OTHER') AS category
        FROM products p
        WHERE p.is_active = true
      `;
      const stockRes = await client.query(latestStockQ);
      
      // 2. Get recent sales velocity (last 30 days) to calculate supply days and lost sales
      const velocityQ = `
        SELECT si.product_code, SUM(si.quantity)::numeric AS sold_last_30d
        FROM sales_items si
        JOIN sales_master sm ON si.sale_id = sm.id
        WHERE sm.sale_date >= CURRENT_DATE - INTERVAL '30 days'
          AND sm.is_return = FALSE
        GROUP BY si.product_code
      `;
      const velocityRes = await client.query(velocityQ);
      const velocityMap = {};
      velocityRes.rows.forEach(r => velocityMap[r.product_code] = Number(r.sold_last_30d) || 0);

      // 3. Get last purchase date to estimate Stock Age Distribution and Overstock days unsold
      const lastPurchaseQ = `
        SELECT pi.product_code, MAX(pm.purchase_date)::date as last_purchase_date
        FROM purchase_items pi
        JOIN purchase_master pm ON pi.purchase_id = pm.id
        WHERE pm.is_return = FALSE
        GROUP BY pi.product_code
      `;
      const purchaseRes = await client.query(lastPurchaseQ);
      const purchaseMap = {};
      purchaseRes.rows.forEach(r => purchaseMap[r.product_code] = r.last_purchase_date);

      let total_inventory_value = 0;
      let out_of_stock_count = 0;
      let low_stock_count = 0;
      let overstock_count = 0;
      let total_overstock_capital = 0;

      let ageDistribution = { fresh: 0, aging: 0, stale: 0 };
      const now = new Date();
      
      let categoryCapitalMap = {};
      let categoryVelocityMap = {};
      let allItems = [];

      stockRes.rows.forEach(r => {
        const qty = Number(r.current_stock);
        const cost = Number(r.unit_cost);
        const minLvl = Number(r.min_level);
        const sold30d = velocityMap[r.product_code] || 0;
        const dailyVelocity = sold30d / 30;
        const category = r.category || 'OTHER';
        
        // Calculate inventory value
        const itemValue = qty > 0 ? (qty * cost) : 0;
        if (qty > 0) {
          total_inventory_value += itemValue;
        }

        if (!categoryCapitalMap[category]) categoryCapitalMap[category] = 0;
        if (!categoryVelocityMap[category]) categoryVelocityMap[category] = { stockValue: 0, cogs30d: 0 };

        categoryCapitalMap[category] += itemValue;
        categoryVelocityMap[category].stockValue += itemValue;
        categoryVelocityMap[category].cogs30d += (sold30d * cost);

        allItems.push({
          product_code: r.product_code,
          product_name: r.product_name,
          category,
          current_stock: qty,
          unit_cost: cost,
          total_value: itemValue
        });

        // Age Distribution (only for items in stock)
        if (qty > 0) {
          const lastPurchase = purchaseMap[r.product_code] ? new Date(purchaseMap[r.product_code]) : null;
          if (lastPurchase) {
            const diffDays = Math.floor((now - lastPurchase) / (1000 * 60 * 60 * 24));
            if (diffDays <= 7) ageDistribution.fresh++;
            else if (diffDays <= 30) ageDistribution.aging++;
            else ageDistribution.stale++;
          } else {
            ageDistribution.stale++; // Unknown purchase date means old stock
          }
        }

        // Health Counts
        if (qty <= 0) {
          out_of_stock_count++;
        } 
        else if (qty <= minLvl) {
          low_stock_count++;
        }
        else {
          let days_of_supply = dailyVelocity > 0 ? (qty / dailyVelocity) : 999;
          if (qty > minLvl * 5 && days_of_supply > 60) {
            overstock_count++;
            const excess_qty = qty - (minLvl * 2);
            total_overstock_capital += (excess_qty * cost);
          }
        }
      });

      // Capital Efficiency Summary
      const opportunity_cost_annual = total_overstock_capital * 0.10; 

      // Business Intelligence Metrics
      const topValueItems = allItems.sort((a,b) => b.total_value - a.total_value).slice(0, 10);
      const categoryValueDistribution = Object.entries(categoryCapitalMap)
          .map(([category, value]) => ({ category, value }))
          .sort((a,b) => b.value - a.value);
      
      const categoryTurnover = Object.entries(categoryVelocityMap).map(([category, data]) => {
          const annualizedCOGS = data.cogs30d * 12;
          const turnoverRatio = data.stockValue > 0 ? (annualizedCOGS / data.stockValue) : 0;
          return { category, turnoverRatio: Number(turnoverRatio.toFixed(2)) };
      }).sort((a,b) => b.turnoverRatio - a.turnoverRatio);

      res.json({
        success: true,
        data: {
          overview: {
            total_inventory_value,
            low_stock_count,
            out_of_stock_count,
            overstock_count,
            total_overstock_capital
          },
          businessMetrics: {
            topValueItems,
            categoryValueDistribution,
            categoryTurnover
          },
          ageDistribution: [
            { id: 'fresh', label: 'Fresh (0-7 days)', value: ageDistribution.fresh, color: 'bg-green-500' },
            { id: 'aging', label: 'Aging (8-30 days)', value: ageDistribution.aging, color: 'bg-amber-500' },
            { id: 'stale', label: 'Stale (31+ days)', value: ageDistribution.stale, color: 'bg-red-500' }
          ],
          efficiencySummary: {
            opportunity_cost_annual
          }
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Analytics inventory-health error:', error);
    if (error.stack) console.error(error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory health analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ────────────────────────────────────────────────────────────
// GET /api/analytics/stock-movement
// ────────────────────────────────────────────────────────────
exports.getStockMovement = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const startDate =
        req.query.startDate ||
        new Date(new Date().setMonth(new Date().getMonth() - 6))
          .toISOString()
          .split('T')[0];
      const endDate =
        req.query.endDate || new Date().toISOString().split('T')[0];

      // 1. Monthly inflow vs outflow
      // Fallback for missing created_at: Use current date as placeholder or skip
      const flowQ = `
        SELECT (CURRENT_DATE)::date AS month,
               COALESCE(SUM(inwards_qty), 0)::numeric  AS total_inflow,
               COALESCE(SUM(outwards_qty), 0)::numeric AS total_outflow,
               (COALESCE(SUM(inwards_qty), 0) - COALESCE(SUM(outwards_qty), 0))::numeric AS net_change
        FROM stock_movements
        LIMIT 1
      `;
      const flow = await client.query(flowQ);

      // 2. Top restocked products (by purchase frequency)
      const restockQ = `
        SELECT pi.product_name, pi.product_code,
               COUNT(DISTINCT pm.id)::bigint AS restock_count,
               SUM(pi.quantity)::bigint      AS total_restocked,
               MAX(pm.purchase_date)::date   AS last_restock_date
        FROM purchase_items pi
        JOIN purchase_master pm ON pi.purchase_id = pm.id
        WHERE pm.purchase_date BETWEEN $1 AND $2
          AND pm.is_return = FALSE
        GROUP BY pi.product_name, pi.product_code
        ORDER BY restock_count DESC
        LIMIT 15
      `;
      const restock = await client.query(restockQ, [startDate, endDate]);

      // 3. Supplier lead time (avg days between purchases per vendor)
      const leadTimeQ = `
        WITH ordered AS (
          SELECT vendor_name,
                 purchase_date,
                 LAG(purchase_date) OVER (PARTITION BY vendor_name ORDER BY purchase_date) AS prev_date
          FROM purchase_master
          WHERE is_return = FALSE
        )
        SELECT vendor_name,
               COUNT(*)::bigint AS total_purchases,
               ROUND(AVG(EXTRACT(EPOCH FROM (purchase_date - prev_date)) / 86400)::numeric)::int AS avg_days_between_orders
        FROM ordered
        WHERE prev_date IS NOT NULL
        GROUP BY vendor_name
        HAVING COUNT(*) >= 2
        ORDER BY avg_days_between_orders ASC
        LIMIT 15
      `;
      const leadTime = await client.query(leadTimeQ);

      // 4. Shrinkage / loss tracking (from stock_adjustments)
      const shrinkageQ = `
        SELECT
          COALESCE(sa.reason, 'Unknown') AS reason,
          COUNT(*)::bigint AS adjustment_count,
          SUM(ABS(sa.quantity_change))::bigint AS total_units,
          0::numeric AS total_value
        FROM stock_adjustments sa
        WHERE sa.created_at >= $1::date AND sa.created_at <= ($2::date + INTERVAL '1 day')
        GROUP BY COALESCE(sa.reason, 'Unknown')
        ORDER BY total_units DESC
      `;
      let shrinkage;
      try {
        shrinkage = await client.query(shrinkageQ, [startDate, endDate]);
      } catch {
        // stock_adjustments table might not exist or have different columns
        shrinkage = { rows: [] };
      }

      // 5. Movement summary totals
      const summaryQ = `
        SELECT
          COALESCE(SUM(inwards_qty), 0)::numeric  AS total_inflow,
          COALESCE(SUM(outwards_qty), 0)::numeric AS total_outflow,
          COUNT(*)::bigint AS total_movements
        FROM stock_movements
      `;
      const summary = await client.query(summaryQ);

      // ────────────────────────────────────────────────────────────
      // Phase 4 additions: Velocity Classification
      // ────────────────────────────────────────────────────────────
      const velocityQ = `
        WITH sales_last_90 AS (
            SELECT si.product_code, SUM(si.quantity)::numeric AS qty_sold_90d
            FROM sales_items si
            JOIN sales_master sm ON si.sale_id = sm.id
            WHERE sm.sale_date >= CURRENT_DATE - INTERVAL '90 days'
              AND sm.is_return = FALSE
            GROUP BY si.product_code
        ),
        current_stock AS (
            SELECT product_code, description, COALESCE(stock, 0) as balance_qty, COALESCE(base_price, 0) as last_cost
            FROM products
            WHERE is_active = true
        ),
        class_mapping AS (
            SELECT c.product_code, c.description AS product_name, 
                   COALESCE(c.balance_qty, 0) AS balance_qty, 
                   COALESCE(c.last_cost, 0) AS last_cost,
                   COALESCE(s.qty_sold_90d, 0) AS qty_sold_90d,
                   (COALESCE(c.balance_qty, 0) * COALESCE(c.last_cost, 0)) AS total_value,
                   CASE 
                       WHEN COALESCE(s.qty_sold_90d, 0) > COALESCE(c.balance_qty, 0) THEN 'Fast'
                       WHEN COALESCE(s.qty_sold_90d, 0) > 0 AND COALESCE(s.qty_sold_90d, 0) < (COALESCE(c.balance_qty, 0) * 0.25) THEN 'Slow'
                       WHEN COALESCE(s.qty_sold_90d, 0) = 0 AND COALESCE(c.balance_qty, 0) > 0 THEN 'Slow'
                       ELSE 'Medium'
                   END AS velocity_class
            FROM current_stock c
            LEFT JOIN sales_last_90 s ON c.product_code = s.product_code
        ),
        monthly_sales AS (
           SELECT DATE_TRUNC('month', sm.sale_date)::date AS month_date,
                  c.velocity_class,
                  SUM(si.amount)::numeric AS sum_revenue
           FROM sales_items si
           JOIN sales_master sm ON si.sale_id = sm.id
           JOIN class_mapping c ON si.product_code = c.product_code
           WHERE sm.sale_date >= CURRENT_DATE - INTERVAL '6 months'
             AND sm.is_return = FALSE
           GROUP BY DATE_TRUNC('month', sm.sale_date), c.velocity_class
        )
        SELECT 'class_mapping' AS type, product_code, product_name, balance_qty, last_cost, qty_sold_90d, total_value, velocity_class, NULL AS month_date, NULL AS sum_revenue
        FROM class_mapping
        UNION ALL
        SELECT 'monthly_sales' AS type, NULL, NULL, NULL, NULL, NULL, NULL, velocity_class, month_date, sum_revenue
        FROM monthly_sales
      `;
      const velocityData = await client.query(velocityQ);

      // Process velocity response
      let fastMovers = [];
      let slowMovers = [];
      let distMap = { Fast: 0, Medium: 0, Slow: 0 };
      let trendMap = {};

      velocityData.rows.forEach(r => {
          if (r.type === 'class_mapping') {
              distMap[r.velocity_class] += Number(r.total_value) || 0;
              if (r.velocity_class === 'Fast') {
                  fastMovers.push({
                      ...r,
                      recommended_scale_up: Math.ceil(Number(r.qty_sold_90d) * 1.5 - Number(r.balance_qty)),
                      total_value: Number(r.total_value),
                      qty_sold_90d: Number(r.qty_sold_90d)
                  });
              } else if (r.velocity_class === 'Slow' && Number(r.balance_qty) > 0) {
                  slowMovers.push({
                      ...r,
                      recommended_discount: Number(r.qty_sold_90d) === 0 ? 30 : 15,
                      total_value: Number(r.total_value),
                      qty_sold_90d: Number(r.qty_sold_90d)
                  });
              }
          } else if (r.type === 'monthly_sales') {
              const mStr = new Date(r.month_date).toISOString().split('T')[0];
              if (!trendMap[mStr]) trendMap[mStr] = { month: mStr, Fast: 0, Medium: 0, Slow: 0 };
              trendMap[mStr][r.velocity_class] = Number(r.sum_revenue) || 0;
          }
      });

      fastMovers = fastMovers.sort((a,b) => b.qty_sold_90d - a.qty_sold_90d).slice(0, 10);
      slowMovers = slowMovers.sort((a,b) => b.total_value - a.total_value).slice(0, 10);
      const velocityTrend = Object.values(trendMap).sort((a,b) => new Date(a.month) - new Date(b.month));

      const fmt = (rows) =>
        rows.map((r) => {
          const out = {};
          for (const [k, v] of Object.entries(r)) {
            if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) {
              out[k] = Number(v);
            } else if (typeof v === 'bigint') {
              out[k] = Number(v);
            } else {
              out[k] = v;
            }
          }
          return out;
        });

      res.json({
        success: true,
        data: {
          monthlyFlow: fmt(flow.rows),
          topRestocked: fmt(restock.rows),
          supplierLeadTime: fmt(leadTime.rows),
          shrinkageByReason: fmt(shrinkage.rows),
          movementSummary: {
            total_inflow: parseFloat(summary.rows[0]?.total_inflow || 0),
            total_outflow: parseFloat(summary.rows[0]?.total_outflow || 0),
            total_movements: parseInt(summary.rows[0]?.total_movements || 0, 10),
            net_change: parseFloat(summary.rows[0]?.total_inflow || 0) -
              parseFloat(summary.rows[0]?.total_outflow || 0),
            avg_restocks_per_month: Math.round((parseInt(summary.rows[0]?.total_movements || 0, 10) / 6) * 10) / 10,
          },
          velocityMetrics: {
              fastMovers,
              slowMovers,
              distribution: [
                  { id: 'fast', label: 'Fast Movers', value: distMap.Fast, color: 'bg-green-500' },
                  { id: 'medium', label: 'Medium Movers', value: distMap.Medium, color: 'bg-indigo-500' },
                  { id: 'slow', label: 'Slow Movers', value: distMap.Slow, color: 'bg-red-500' }
              ],
              velocityTrend
          },
          dateRange: { startDate, endDate },
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Analytics stock-movement error:', error);
    if (error.stack) console.error(error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock movement analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ────────────────────────────────────────────────────────────
// GET /api/analytics/compare
// ────────────────────────────────────────────────────────────
exports.getComparison = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const type = req.query.type || 'business'; // 'business' or 'product'
      const startDate =
        req.query.startDate ||
        new Date(new Date().setMonth(new Date().getMonth() - 6))
          .toISOString()
          .split('T')[0];
      const endDate =
        req.query.endDate || new Date().toISOString().split('T')[0];

      let results = [];

      if (type === 'business') {
        // Business Health: Sales vs Purchases Monthly
        const salesQ = `
          SELECT DATE_TRUNC('month', sale_date)::date AS month,
                 COALESCE(SUM(CASE WHEN is_return = FALSE THEN total_amount ELSE 0 END), 0)::numeric AS sales_revenue
          FROM sales_master
          WHERE sale_date BETWEEN $1 AND $2
          GROUP BY DATE_TRUNC('month', sale_date)
        `;
        const purchasesQ = `
          SELECT DATE_TRUNC('month', purchase_date)::date AS month,
                 COALESCE(SUM(CASE WHEN is_return = FALSE THEN total_amount ELSE 0 END), 0)::numeric AS purchase_cost
          FROM purchase_master
          WHERE purchase_date BETWEEN $1 AND $2
          GROUP BY DATE_TRUNC('month', purchase_date)
        `;
        
        const [salesRes, purchasesRes] = await Promise.all([
          client.query(salesQ, [startDate, endDate]),
          client.query(purchasesQ, [startDate, endDate])
        ]);

        // Merge results by month
        const dataMap = {};
        salesRes.rows.forEach(r => {
          const m = r.month.toISOString().split('T')[0];
          dataMap[m] = { month: m, metric1: Number(r.sales_revenue), metric2: 0, label1: 'Sales Revenue', label2: 'Purchase Costs' };
        });
        purchasesRes.rows.forEach(r => {
          const m = r.month.toISOString().split('T')[0];
          if (!dataMap[m]) {
            dataMap[m] = { month: m, metric1: 0, metric2: Number(r.purchase_cost), label1: 'Sales Revenue', label2: 'Purchase Costs' };
          } else {
            dataMap[m].metric2 = Number(r.purchase_cost);
          }
        });

        results = Object.values(dataMap).sort((a, b) => new Date(a.month) - new Date(b.month));

      } else if (type === 'product') {
        // Product vs Product
        const p1 = req.query.product1;
        const p2 = req.query.product2;
        const metric = req.query.metric || 'revenue'; // 'revenue' or 'quantity'

        if (!p1 || !p2) {
          return res.status(400).json({ success: false, message: 'product1 and product2 are required for product comparison' });
        }

        // Get names for labels
        const p1NameRes = await client.query('SELECT product_name FROM products WHERE product_code = $1', [p1]);
        const p2NameRes = await client.query('SELECT product_name FROM products WHERE product_code = $1', [p2]);
        const p1Name = p1NameRes.rows[0]?.product_name || p1;
        const p2Name = p2NameRes.rows[0]?.product_name || p2;

        const aggField = metric === 'revenue' ? 'SUM(si.amount)' : 'SUM(si.quantity)';

        const prodQ = `
          SELECT DATE_TRUNC('month', sm.sale_date)::date AS month,
                 ${aggField}::numeric AS val
          FROM sales_items si
          JOIN sales_master sm ON si.sale_id = sm.id
          WHERE si.product_code = $1
            AND sm.sale_date BETWEEN $2 AND $3
            AND sm.is_return = FALSE
          GROUP BY DATE_TRUNC('month', sm.sale_date)
        `;

        const [p1Res, p2Res] = await Promise.all([
          client.query(prodQ, [p1, startDate, endDate]),
          client.query(prodQ, [p2, startDate, endDate])
        ]);

        const dataMap = {};
        p1Res.rows.forEach(r => {
          const m = r.month.toISOString().split('T')[0];
          dataMap[m] = { month: m, metric1: Number(r.val), metric2: 0, label1: p1Name, label2: p2Name };
        });
        p2Res.rows.forEach(r => {
          const m = r.month.toISOString().split('T')[0];
          if (!dataMap[m]) {
            dataMap[m] = { month: m, metric1: 0, metric2: Number(r.val), label1: p1Name, label2: p2Name };
          } else {
            dataMap[m].metric2 = Number(r.val);
          }
        });

        results = Object.values(dataMap).sort((a, b) => new Date(a.month) - new Date(b.month));
      } else if (type === 'purchase_vs_sales') {
        // Phase 1: Purchase vs Sales Analysis (Sell-through rates)
        const pvsQ = `
          WITH purchases AS (
            SELECT pi.product_code, pi.product_name, SUM(pi.quantity)::numeric AS purchased_qty, AVG(pi.price)::numeric as avg_purchase_price
            FROM purchase_items pi
            JOIN purchase_master pm ON pi.purchase_id = pm.id
            WHERE pm.purchase_date BETWEEN $1 AND $2 AND pm.is_return = FALSE
            GROUP BY pi.product_code, pi.product_name
          ),
          sales AS (
            SELECT si.product_code, MAX(si.product_name) as product_name, SUM(si.quantity)::numeric AS sold_qty, AVG(si.price)::numeric as avg_sale_price
            FROM sales_items si
            JOIN sales_master sm ON si.sale_id = sm.id
            WHERE sm.sale_date BETWEEN $1 AND $2 AND sm.is_return = FALSE
            GROUP BY si.product_code
          )
          SELECT 
            COALESCE(p.product_code, s.product_code) AS product_code,
            COALESCE(p.product_name, s.product_name) AS product_name,
            COALESCE(p.purchased_qty, 0) AS purchased_qty,
            COALESCE(s.sold_qty, 0) AS sold_qty,
            COALESCE(p.avg_purchase_price, 0) AS unit_cost,
            COALESCE(s.avg_sale_price, 0) AS unit_price
          FROM purchases p
          FULL OUTER JOIN sales s ON p.product_code = s.product_code
          WHERE COALESCE(p.purchased_qty, 0) > 0 OR COALESCE(s.sold_qty, 0) > 0
        `;
        const pvsRes = await client.query(pvsQ, [startDate, endDate]);
        
        let optimal = [];
        let overstocked = [];
        let understocked = [];
        
        let total_overstocked_capital = 0;
        let total_lost_revenue = 0;
        
        // Calculate derived fields
        pvsRes.rows.forEach(r => {
          const purchased = Number(r.purchased_qty);
          const sold = Number(r.sold_qty);
          const cost = Number(r.unit_cost);
          const price = Number(r.unit_price);
          
          let sell_through = 0;
          if (purchased > 0) {
            sell_through = (sold / purchased) * 100;
          } else if (sold > 0) {
            sell_through = 999; // Represents infinity (sold from old stock)
          }

          const productData = {
            product_code: r.product_code,
            product_name: r.product_name,
            purchased_qty: purchased,
            sold_qty: sold,
            sell_through: sell_through,
          };

          if (sell_through >= 85 && sell_through <= 105) {
            optimal.push(productData);
          } else if (sell_through < 85) {
            // Overstocked
            const unsold = purchased - sold; // If sold > purchased, sell_through > 85, so we won't be here.
            const capital_locked = unsold * cost;
            const recommended_reduction_percent = Math.min(100 - sell_through, 100); // Reduce order by the gap
            
            total_overstocked_capital += capital_locked;
            
            overstocked.push({
              ...productData,
              unsold_units: unsold,
              capital_locked: capital_locked,
              recommended_reduction_percent: Math.round(recommended_reduction_percent)
            });
          } else if (sell_through > 105) {
            // Understocked (Demand exceeds purchased supply)
            const lost_sales = Math.max(0, sold - purchased); // Simple estimate of gap. A better estimate would extrapolate sold rate.
            // If they sold 150 but bought 100, the gap is 50. What if they sold out? Hard to know without stock history.
            // We use sold - purchased as a baseline for extra demand.
            const stockout_percent = ((sold - purchased) / purchased) * 100;
            const lost_revenue = lost_sales * price;
            
            total_lost_revenue += lost_revenue;
            
            understocked.push({
              ...productData,
              lost_sales_count: lost_sales,
              lost_revenue: lost_revenue,
              stockout_percent: purchased > 0 ? Math.round(stockout_percent) : 100,
              recommended_increase_percent: purchased > 0 ? Math.round(stockout_percent) : 100
            });
          }
        });
        
        // Final portfolio efficiency (total sold value / total purchased value within range)
        const totalPurchasedValue = pvsRes.rows.reduce((sum, r) => sum + (Number(r.purchased_qty) * Number(r.unit_cost)), 0);
        const totalSoldValue = pvsRes.rows.reduce((sum, r) => sum + (Number(r.sold_qty) * Number(r.unit_cost)), 0); // Use cost to get efficiency of purchasing
        
        const portfolio_efficiency = totalPurchasedValue > 0 ? (totalSoldValue / totalPurchasedValue) * 100 : 0;

        results = {
          optimal: optimal.sort((a,b) => b.sold_qty - a.sold_qty),
          overstocked: overstocked.sort((a,b) => b.capital_locked - a.capital_locked),
          understocked: understocked.sort((a,b) => b.lost_revenue - a.lost_revenue),
          summary: {
            total_overstocked_capital,
            total_lost_revenue,
            portfolio_efficiency: Math.round(portfolio_efficiency),
            gap_from_target: portfolio_efficiency < 100 ? Math.round(100 - portfolio_efficiency) : 0
          }
        };
      }

      res.json({
        success: true,
        data: {
          type,
          results,
          dateRange: { startDate, endDate },
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Analytics comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comparison analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
