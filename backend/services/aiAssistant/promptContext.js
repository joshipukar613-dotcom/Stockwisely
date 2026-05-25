function formatRs(amount) {
  const n = Number(amount || 0);
  if (!Number.isFinite(n)) return 'Rs. 0';
  // MVP: show whole-rupee values, since most DB totals are money amounts.
  const rounded = Math.round(n);
  return `Rs. ${rounded.toLocaleString('en-IN')}`;
}

// ═══════════════════════════════════════════════════════════
// DETERMINISTIC DATA FORMATTER — No Gemini needed
// ═══════════════════════════════════════════════════════════

function formatDataAnswer(category, data) {
  if (!data) return "No data available for this query.";

  switch (category) {
    case 'SALES_TODAY':
      return `📊 **Today's Sales**\n\nTotal Sales: ${formatRs(data.total)}\nInvoices: ${data.count || 0}`;

    case 'SALES_YESTERDAY':
      return `📊 **Yesterday's Sales**\n\nTotal Sales: ${formatRs(data.total)}\nInvoices: ${data.count || 0}`;

    case 'SALES_WEEK':
      return `📊 **This Week's Sales**\n\nTotal Sales: ${formatRs(data.total)}\nInvoices: ${data.count || 0}`;

    case 'SALES_MONTH':
      return `📊 **This Month's Sales**\n\nTotal Sales: ${formatRs(data.total)}\nInvoices: ${data.count || 0}`;

    case 'SALES_MONTH_COMPARISON': {
      const { thisMonthSales, lastMonthSales, growthPercent } = data;
      const growthText = growthPercent === null || typeof growthPercent === 'undefined'
        ? 'N/A (last month sales were 0)'
        : `${growthPercent > 0 ? '+' : ''}${Math.round(growthPercent)}%`;
      const emoji = growthPercent > 0 ? '📈' : growthPercent < 0 ? '📉' : '➡️';
      return `${emoji} **Monthly Comparison**\n\nThis Month: ${formatRs(thisMonthSales)}\nLast Month: ${formatRs(lastMonthSales)}\nGrowth: ${growthText}`;
    }

    case 'SALES_RETURN_TODAY':
      return `🔄 **Today's Sales Returns**\n\nTotal Returns: ${formatRs(data.total)}\nReturn Invoices: ${data.count || 0}`;

    case 'SALES_RETURN_YESTERDAY':
      return `🔄 **Yesterday's Sales Returns**\n\nTotal Returns: ${formatRs(data.total)}\nReturn Invoices: ${data.count || 0}`;

    case 'SALES_RETURN_WEEK':
      return `🔄 **This Week's Sales Returns**\n\nTotal Returns: ${formatRs(data.total)}\nReturn Invoices: ${data.count || 0}`;

    case 'SALES_RETURN_MONTH':
      return `🔄 **This Month's Sales Returns**\n\nTotal Returns: ${formatRs(data.total)}\nReturn Invoices: ${data.count || 0}`;

    case 'SALES_RETURN_DATE': {
      const dateLabel = data.date || 'the requested date';
      return `🔄 **Sales Returns on ${dateLabel}**\n\nTotal Returns: ${formatRs(data.total)}\nReturn Invoices: ${data.count || 0}`;
    }

    case 'TOP_PRODUCTS': {
      const items = Array.isArray(data) ? data : (data?.items || []);
      if (items.length === 0) return '📦 No sales data found for the last 30 days.';
      const list = items.slice(0, 8).map((it, idx) =>
        `${idx + 1}. **${it.productName || it.productCode}** — Qty: ${it.totalQty || 0}, Revenue: ${formatRs(it.revenue)}`
      ).join('\n');
      return `🏆 **Top Products (Last 30 Days)**\n\n${list}`;
    }

    case 'LOW_STOCK': {
      const items = Array.isArray(data) ? data : (data?.items || []);
      if (items.length === 0) return '✅ No low stock items found. Inventory looks good!';
      const list = items.slice(0, 8).map((it, idx) =>
        `${idx + 1}. **${it.description || it.productCode}** — Current: ${it.currentStock ?? 0} (Min: ${it.minimumStockLevel ?? 0})`
      ).join('\n');
      return `⚠️ **Low Stock Items (${items.length} total)**\n\n${list}`;
    }

    case 'REORDER_RECOMMENDATIONS': {
      const items = Array.isArray(data) ? data : (data?.items || []);
      if (items.length === 0) return '✅ No items need reordering right now.';
      const list = items.slice(0, 8).map((it, idx) =>
        `${idx + 1}. **${it.description || it.productCode}** — Current: ${it.currentStock ?? 0}, Need: ${it.minimumStockLevel ?? 0}`
      ).join('\n');
      return `📋 **Reorder Recommendations (${items.length} items)**\n\n${list}`;
    }

    // ═══════════════════════════════════════════════════════════
    // NEW EXTENSIONS (PURCHASES, CUSTOMERS, PROFIT, EXPIRING)
    // ═══════════════════════════════════════════════════════════
    
    case 'PURCHASE_TODAY':
      return `🛒 **Today's Purchases**\n\nTotal Purchases: ${formatRs(data.total)}\nPurchase Invoices: ${data.count || 0}`;

    case 'PURCHASE_MONTH':
      return `🛒 **This Month's Purchases**\n\nTotal Purchases: ${formatRs(data.total)}\nPurchase Invoices: ${data.count || 0}`;

    case 'TOP_CUSTOMERS': {
      const items = Array.isArray(data) ? data : (data?.items || []);
      if (items.length === 0) return '👥 No distinct customer records found.';
      const list = items.map((it, idx) =>
        `${idx + 1}. **${it.customer_name}** — Revenue: ${formatRs(it.revenue)}`
      ).join('\n');
      return `🏆 **Top Customers**\n\n${list}`;
    }

    case 'CUSTOMER_COUNT':
      return `👥 **Customer Statistics**\n\nTotal Unique Customers Found: ${data.count || 0}`;

    case 'PROFIT_TODAY':
      return `💸 **Today's Estimated Profit**\n\nGross Income (Sales - Purchases): ${formatRs(data.total)}\n\n_Note: This is a fast estimate based on daily sales minus daily purchases._`;

    case 'PROFIT_MONTH':
      return `💸 **This Month's Estimated Profit**\n\nGross Income (Sales - Purchases): ${formatRs(data.total)}\n\n_Note: This is a fast estimate based on monthly sales minus monthly purchases._`;

    case 'EXPIRING_STOCK': {
      const items = Array.isArray(data) ? data : (data?.items || []);
      if (items.length === 0) return '✅ Good news! No items expiring within the next 30 days.';
      const list = items.map((it, idx) => {
        const dateObj = new Date(it.expiry_date);
        const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return `${idx + 1}. **${it.product_name}** — Qty: ${it.quantity}, Expires: ${dateStr}`;
      }).join('\n');
      return `⚠️ **Expiring Stock (Next 30 Days)**\n\n${list}`;
    }

    case 'BUSINESS_SUMMARY':
    case 'GENERAL_QUESTION': {
      const { todaySales, todayReturns, lowStockCount } = data || {};
      return `📊 **Business Summary**\n\nToday's Sales: ${formatRs(todaySales?.total || 0)} (${todaySales?.count || 0} invoices)\nToday's Returns: ${formatRs(todayReturns?.total || 0)} (${todayReturns?.count || 0} returns)\nLow Stock Items: ${lowStockCount || 0}`;
    }

    default: {
      // Generic formatter for any data object
      let text = '📊 **Results**\n\n';
      if (typeof data === 'object' && !Array.isArray(data)) {
        Object.entries(data).forEach(([key, val]) => {
          if (val === null || val === undefined) return;
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
          let displayVal = val;
          if (typeof val === 'number') {
            displayVal = key.match(/total|sales|return|profit|revenue/i)
              ? formatRs(val) : val.toLocaleString();
          } else if (typeof val === 'object') {
            displayVal = JSON.stringify(val);
          }
          text += `• ${label}: ${displayVal}\n`;
        });
      } else {
        text += JSON.stringify(data, null, 2);
      }
      return text;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// ADVICE PROMPT BUILDER — For the Business Advice mode
// ═══════════════════════════════════════════════════════════

function buildAdvicePrompt({ question, summaryData }) {
  const { salesToday, salesMonth, returnsToday, returnsMonth, monthComparison, topProducts, lowStockItems, lowStockCount } = summaryData;

  const growthText = monthComparison?.growthPercent != null
    ? `${Math.round(monthComparison.growthPercent)}%`
    : 'N/A';

  const topProductsList = (topProducts || [])
    .map(p => `${p.productName || p.productCode}: Qty ${p.totalQty}, Revenue ${formatRs(p.revenue)}`)
    .join('; ');

  const lowStockList = (lowStockItems || [])
    .map(i => `${i.description || i.productCode}: ${i.currentStock} in stock (min ${i.minimumStockLevel})`)
    .join('; ');

  return `You are a business advisor for a retail/inventory business in Nepal called "Stock Wisely".
You provide practical, actionable advice based on real business data. 
Keep your advice specific and related to the data provided. Do not use emojis.
Format money as "Rs. 1,50,000" (Indian comma format).

CURRENT BUSINESS DATA:
- Today's Sales: ${formatRs(salesToday?.total)} across ${salesToday?.count || 0} invoices
- This Month's Sales: ${formatRs(salesMonth?.total)} across ${salesMonth?.count || 0} invoices
- Today's Returns: ${formatRs(returnsToday?.total)} across ${returnsToday?.count || 0} returns
- This Month's Returns: ${formatRs(returnsMonth?.total)} across ${returnsMonth?.count || 0} returns
- Month-over-Month Growth: ${growthText}
- Top Products (30 days): ${topProductsList || 'No data'}
- Low Stock Items: ${lowStockCount || 0} items ${lowStockList ? `(${lowStockList})` : ''}

USER QUESTION: "${question}"

Provide clear, actionable business advice based on the data above. Be specific with numbers. Keep it concise (3-5 bullet points max).`;
}

// ═══════════════════════════════════════════════════════════
// LEGACY: buildPromptContext (kept for backward compatibility)
// ═══════════════════════════════════════════════════════════

function buildPromptContext({ type, question, data }) {
  const safeQuestion = (question || '').toString().trim();

  const header =
    'You are a helpful AI assistant for a retail business (Stock Wisely). ' +
    'Answer the user in clear professional English. Use ONLY the provided context values. ' +
    'Do NOT invent numbers. Always format money as "Rs. 1,50,000" (comma-separated). ' +
    'Do not use emojis.';

  if (type === 'SALES_TODAY') {
    const { salesToday, saleCount } = data || {};
    const fallbackAnswer =
      `Today's sales were ${formatRs(salesToday)} across ${saleCount || 0} invoices.`;

    const context = [
      `Sales type: SALES_TODAY`,
      `Today sales total: ${formatRs(salesToday)}`,
      `Invoices count: ${saleCount || 0}`,
    ].join('\n');

    const prompt = `${header}\n\n${context}\n\nUser question: ${safeQuestion}\n\nAnswer (concise):`;
    return { prompt, fallbackAnswer };
  }

  if (type === 'SALES_YESTERDAY') {
    const { salesYesterday, saleCount } = data || {};
    const fallbackAnswer =
      `Yesterday's sales were ${formatRs(salesYesterday)} across ${saleCount || 0} invoices.`;

    const context = [
      `Sales type: SALES_YESTERDAY`,
      `Yesterday sales total: ${formatRs(salesYesterday)}`,
      `Invoices count: ${saleCount || 0}`,
    ].join('\n');

    const prompt = `${header}\n\n${context}\n\nUser question: ${safeQuestion}\n\nAnswer (concise):`;
    return { prompt, fallbackAnswer };
  }

  if (type === 'SALES_WEEK') {
    const { salesThisWeek, saleCount } = data || {};
    const fallbackAnswer =
      `This week's sales were ${formatRs(salesThisWeek)} across ${saleCount || 0} invoices.`;

    const context = [
      `Sales type: SALES_WEEK`,
      `This week sales total: ${formatRs(salesThisWeek)}`,
      `Invoices count: ${saleCount || 0}`,
    ].join('\n');

    const prompt = `${header}\n\n${context}\n\nUser question: ${safeQuestion}\n\nAnswer (concise):`;
    return { prompt, fallbackAnswer };
  }

  if (type === 'SALES_MONTH_COMPARISON') {
    const { thisMonthSales, lastMonthSales, growthPercent } = data || {};
    const growthText =
      growthPercent === null || typeof growthPercent === 'undefined'
        ? 'N/A (last month sales were 0)'
        : `${Math.round(growthPercent)}%`;

    const fallbackAnswer =
      `This month sales are ${formatRs(thisMonthSales)} and last month sales were ${formatRs(lastMonthSales)}. ` +
      `Growth: ${growthText}.`;

    const context = [
      `Sales type: SALES_MONTH_COMPARISON (this month vs last month)`,
      `This month sales: ${formatRs(thisMonthSales)}`,
      `Last month sales: ${formatRs(lastMonthSales)}`,
      `Growth percent (computed): ${growthText}`,
    ].join('\n');

    const prompt =
      `${header}\n\n${context}\n\nUser question: ${safeQuestion}\n\nAnswer (concise):`;
    return { prompt, fallbackAnswer };
  }

  if (type === 'SALES_RETURNS_YESTERDAY') {
    const { salesReturnsYesterday, returnCount } = data || {};
    const fallbackAnswer =
      `Yesterday's sales returns were ${formatRs(salesReturnsYesterday)} across ${returnCount || 0} return invoices.`;

    const context = [
      `Sales type: SALES_RETURNS_YESTERDAY`,
      `Yesterday sales returns total: ${formatRs(salesReturnsYesterday)}`,
      `Return invoices count: ${returnCount || 0}`,
    ].join('\n');

    const prompt = `${header}\n\n${context}\n\nUser question: ${safeQuestion}\n\nAnswer (concise):`;
    return { prompt, fallbackAnswer };
  }

  if (type === 'SALES_RETURNS_MONTH') {
    const { salesReturnsThisMonth, returnCount } = data || {};
    const fallbackAnswer =
      `This month's sales returns are ${formatRs(salesReturnsThisMonth)} across ${returnCount || 0} return invoices.`;

    const context = [
      `Sales type: SALES_RETURNS_MONTH`,
      `This month sales returns total: ${formatRs(salesReturnsThisMonth)}`,
      `Return invoices count: ${returnCount || 0}`,
    ].join('\n');

    const prompt = `${header}\n\n${context}\n\nUser question: ${safeQuestion}\n\nAnswer (concise):`;
    return { prompt, fallbackAnswer };
  }

  if (type === 'TOTAL_SALES_RETURNS') {
    const { totalSalesReturns, returnCount } = data || {};
    const fallbackAnswer =
      `Total sales returns are ${formatRs(totalSalesReturns)} across ${returnCount || 0} return invoices (all time).`;

    const context = [
      `Sales type: TOTAL_SALES_RETURNS`,
      `Total sales returns (all time): ${formatRs(totalSalesReturns)}`,
      `Return invoices count: ${returnCount || 0}`,
    ].join('\n');

    const prompt = `${header}\n\n${context}\n\nUser question: ${safeQuestion}\n\nAnswer (concise):`;
    return { prompt, fallbackAnswer };
  }

  if (type === 'LOW_STOCK') {
    const items = Array.isArray(data?.items) ? data.items : [];
    const fallbackAnswer =
      items.length === 0
        ? 'I could not find any low stock items right now.'
        : `Low stock items (${items.length}):\n` +
          items
            .slice(0, 8)
            .map(
              (it, idx) =>
                `${idx + 1}. ${it.description || it.productCode} - current ${it.currentStock ?? 0} (min ${it.minimumStockLevel ?? 0})`
            )
            .join('\n');

    const context = [
      `Sales type: LOW_STOCK`,
      `Low stock items list (latest stock):`,
      ...items.map(
        (it) =>
          `- ${it.productCode} | ${it.description || ''} | current_stock=${it.currentStock ?? 0} | min_stock=${it.minimumStockLevel ?? 0}`
      ),
    ].join('\n');

    const prompt =
      `${header}\n\n${context}\n\nUser question: ${safeQuestion}\n\nAnswer (concise, actionable):`;
    return { prompt, fallbackAnswer };
  }

  if (type === 'TOP_PRODUCTS') {
    const items = Array.isArray(data?.items) ? data.items : [];
    const fallbackAnswer =
      items.length === 0
        ? 'I could not find any sales data for the last 30 days.'
        : `Top products (last 30 days):\n` +
          items
            .slice(0, 8)
            .map(
              (it, idx) =>
                `${idx + 1}. ${it.productName || it.productCode} - qty ${it.totalQty ?? 0}, revenue ${formatRs(it.revenue)}`
            )
            .join('\n');

    const context = [
      `Sales type: TOP_PRODUCTS (last 30 days)`,
      `Top products list:`,
      ...items.map(
        (it) =>
          `- ${it.productCode} | ${it.productName || ''} | total_qty=${it.totalQty ?? 0} | revenue=${formatRs(
            it.revenue
          )}`
      ),
    ].join('\n');

    const prompt = `${header}\n\n${context}\n\nUser question: ${safeQuestion}\n\nAnswer (concise):`;
    return { prompt, fallbackAnswer };
  }

  return {
    prompt: `${header}\n\nUser question: ${safeQuestion}\n\nAnswer:`,
    fallbackAnswer: "That information isn't available in your current data.",
  };
}

module.exports = { buildPromptContext, buildAdvicePrompt, formatDataAnswer, formatRs };
