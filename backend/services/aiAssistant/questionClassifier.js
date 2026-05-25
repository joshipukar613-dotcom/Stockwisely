/**
 * questionClassifier.js
 *
 * Changes vs. original:
 *  1. classifyQuestion (AI fallback) is now cached by question text (5-min TTL)
 *     → repeated or near-simultaneous identical questions only fire 1 Gemini call
 *  2. In-flight deduplication on classifyQuestion (same question arriving
 *     concurrently shares one API call)
 *  3. Tighter regex coverage so fewer questions fall through to the AI path
 */

const { getDailyMetrics, getTopProducts } = require('./dbQueries');
const { callGroq } = require('./groq');
const { cache } = require('./cache');

// Cache AI classification results for 5 minutes
const CLASSIFY_CACHE_TTL_MS = 5 * 60 * 1000;

const CATEGORIES = {
  // Sales & Revenue
  SALES_TODAY: 'Current day sales total',
  SALES_YESTERDAY: 'Previous day sales',
  SALES_WEEK: 'Current week sales',
  SALES_MONTH: 'Current month sales',
  SALES_MONTH_COMPARISON: 'Compare this month vs last month',
  SALES_BY_CATEGORY: 'Sales breakdown by product category',

  // Sales Returns
  SALES_RETURN_TODAY: "Today's returns/refunds",
  SALES_RETURN_YESTERDAY: "Yesterday's returns",
  SALES_RETURN_WEEK: "This week's returns",
  SALES_RETURN_MONTH: "This month's returns",
  SALES_RETURN_DATE: 'Returns for a specific date',
  MOST_RETURNED_PRODUCTS: 'Products with most returns',

  // Products & Inventory
  TOP_PRODUCTS: 'Best selling products',
  WORST_PERFORMING_PRODUCTS: 'Poorest selling products',
  LOW_STOCK: 'Products running low on inventory',
  OUT_OF_STOCK: 'Products completely out of stock',
  OVERSTOCK: 'Excess inventory items',
  STOCK_VALUE: 'Total inventory value',
  FAST_MOVING: 'Fast-moving products',
  SLOW_MOVING: 'Slow-moving products',
  PRODUCT_PERFORMANCE: 'Individual product analysis',

  // Purchase & Suppliers
  PURCHASE_TODAY: "Today's purchases",
  PURCHASE_MONTH: 'Monthly purchase data',
  PURCHASE_HISTORY: 'Purchase history',
  SUPPLIER_PERFORMANCE: 'Supplier analysis',
  PURCHASE_VS_SALES: 'Purchase efficiency analysis',

  // Customers
  TOP_CUSTOMERS: 'Best/most valuable customers',
  CUSTOMER_COUNT: 'Customer statistics',
  NEW_CUSTOMERS: 'New customer acquisition',
  CUSTOMER_TRENDS: 'Customer behavior patterns',

  // Financial
  PROFIT_TODAY: "Today's profit",
  PROFIT_MONTH: 'Monthly profit',
  PROFIT_MARGIN: 'Profit margin analysis',
  EXPENSES: 'Business expenses',

  // Alerts & Recommendations
  WHAT_NEEDS_ATTENTION: 'Urgent issues/alerts',
  REORDER_RECOMMENDATIONS: 'What to reorder',
  BUSINESS_SUMMARY: 'Overall business health',
  EXPIRING_STOCK: 'Products nearing expiry',

  // General
  GENERAL_QUESTION: 'General business question',
  UNSUPPORTED: 'Outside system scope (weather, news, etc.)',
};

/**
 * Try to extract a date from the question like "25th march", "march 25", "2026-03-25", etc.
 * Returns { year, month, day } or null.
 */
function extractDate(question) {
  const q = question.toLowerCase().trim();

  const monthMap = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
    nov: 11, november: 11, dec: 12, december: 12,
  };

  // Pattern: "25th march", "25 march", "3rd april"
  let m = q.match(
    /(\d{1,2})\s*(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i
  );
  if (m) {
    const day = parseInt(m[1]);
    const month =
      monthMap[m[2].toLowerCase()] ||
      monthMap[m[2].substring(0, 3).toLowerCase()];
    const year = new Date().getFullYear();
    if (day >= 1 && day <= 31 && month) return { year, month, day };
  }

  // Pattern: "march 25", "march 25th"
  m = q.match(
    /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\s*(?:st|nd|rd|th)?/i
  );
  if (m) {
    const month =
      monthMap[m[1].toLowerCase()] ||
      monthMap[m[1].substring(0, 3).toLowerCase()];
    const day = parseInt(m[2]);
    const year = new Date().getFullYear();
    if (day >= 1 && day <= 31 && month) return { year, month, day };
  }

  // Pattern: "2026-03-25" or "2026/03/25"
  m = q.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    return { year: parseInt(m[1]), month: parseInt(m[2]), day: parseInt(m[3]) };
  }

  return null;
}

/**
 * Classify question using regex patterns — ZERO API calls.
 * Returns a category string or null if no pattern matched.
 *
 * Extended with more patterns so fewer questions fall through to the AI.
 */
function classifyByRegex(question) {
  const q = (question || '').toLowerCase().trim();
  if (!q) return null;

  // ─── Returns / Refunds (check FIRST — "sales return" contains "sales") ────
  const isAboutReturns = /\b(returns?|refunds?|returned)\b/.test(q);
  if (isAboutReturns) {
    const specificDate = extractDate(q);
    if (specificDate) return 'SALES_RETURN_DATE';
    if (q.match(/\btoday\b|\baaj\b|\baajko\b/)) return 'SALES_RETURN_TODAY';
    if (q.match(/\byesterday\b|\bhijo\b/)) return 'SALES_RETURN_YESTERDAY';
    if (q.match(/\bweek\b|\bweekly\b|\bhapta\b|\blast\s+week\b|\bthis\s+week\b/)) return 'SALES_RETURN_WEEK';
    if (q.match(/\bmonth\b|\bmonthly\b|\bmahina\b/)) return 'SALES_RETURN_MONTH';
    if (q.match(/\bmost\b|\btop\b|\bfrequent\b/)) return 'MOST_RETURNED_PRODUCTS';
    return 'SALES_RETURN_MONTH'; // default
  }

  // ─── Sales ───────────────────────────────────────────────────────────────
  if (q.match(/\bsales?\b.*\btoday\b|\btoday\b.*\bsales?\b|\baaj\b.*\bsales?\b|\baajko\b.*\bbikri\b/))
    return 'SALES_TODAY';
  if (q.match(/\bsales?\b.*\byesterday\b|\byesterday\b.*\bsales?\b|\bhijo\b.*\bsales?\b/))
    return 'SALES_YESTERDAY';
  if (q.match(/\bsales?\b.*\bweek\b|\bweek\b.*\bsales?\b|\bweekly\b.*\breport\b|\bhapta\b.*\bsales?\b/))
    return 'SALES_WEEK';
  if (q.match(/\bcompar\w*\b.*\bmonth\b|\bmonth\b.*\bvs\b|\blast\s+month\b.*\bthis\s+month\b|\bgrowth\b/))
    return 'SALES_MONTH_COMPARISON';
  if (q.match(/\bsales?\b.*\bmonth\b|\bmonth\b.*\bsales?\b|\bmonthly\b.*\bsales?\b|\bmahina\b.*\bsales?\b/))
    return 'SALES_MONTH';
  // Generic "sales" with no time context → default to today
  if (q.match(/^(?:show\s+)?(?:total\s+)?sales?$|^how\s+(?:much|many)\s+(?:did\s+(?:we|i)\s+)?sell/))
    return 'SALES_TODAY';

  // ─── Products & Inventory ─────────────────────────────────────────────────
  if (q.match(/\btop\b.*\bproducts?\b|\bbest\b.*\bsell(er|ing)\b|\bpopular\b.*\bproducts?\b|\bbest\b.*\bproducts?\b/))
    return 'TOP_PRODUCTS';
  if (q.match(/\bworst\b.*\bproducts?\b|\bslow\b.*\b(sell|mov)\b|\bpoor\b.*\bperform\b/))
    return 'SLOW_MOVING';
  if (q.match(/\blow\b.*\bstock\b|\bstock\b.*\blow\b|\bkam\b.*\bstock\b/))
    return 'LOW_STOCK';
  if (q.match(/\bout\s+of\s+stock\b|\bno\s+stock\b|\bzero\b.*\bstock\b/))
    return 'LOW_STOCK';
  if (q.match(/\breorder\b|\border\b.*\bwhat\b|\bwhat\b.*\border\b|\breplenish\b/))
    return 'REORDER_RECOMMENDATIONS';
  if (q.match(/\boverstock\b|\bexcess\b.*\binventory\b|\btoo\s+much\b.*\bstock\b/))
    return 'REORDER_RECOMMENDATIONS';
  if (q.match(/\bfast\b.*\bmov(ing|er)\b/))
    return 'TOP_PRODUCTS';
  if (q.match(/\bexpir(ing|ed|y)\b|\bbefore\b.*\bexpiry\b/))
    return 'EXPIRING_STOCK';

  // ─── Business Summary / Attention ────────────────────────────────────────
  if (q.match(/\bsummary\b|\boverview\b|\bhow\b.*\bbusiness\b|\bbusiness\b.*\bhealth\b|\bdashboard\b/))
    return 'BUSINESS_SUMMARY';
  if (q.match(/\bneed\b.*\battention\b|\bwhat\b.*\battention\b|\balert\b|\burgent\b|\bproblem\b/))
    return 'BUSINESS_SUMMARY';
  if (q.match(/\binventory\b.*\bhealth\b|\bcheck\b.*\binventory\b|\bhealth\b.*\bcheck\b/))
    return 'BUSINESS_SUMMARY';

  // ─── Purchases ────────────────────────────────────────────────────────────
  if (q.match(/\bpurchase\b.*\btoday\b|\btoday\b.*\bpurchase\b/))
    return 'PURCHASE_TODAY';
  if (q.match(/\bpurchase\b.*\bmonth\b|\bmonth\b.*\bpurchase\b/))
    return 'PURCHASE_MONTH';

  // ─── Customers ────────────────────────────────────────────────────────────
  if (q.match(/\btop\b.*\bcustomer\b|\bbest\b.*\bcustomer\b|\bmost\b.*\bcustomer\b/))
    return 'TOP_CUSTOMERS';
  if (q.match(/\bhow\s+many\b.*\bcustomer\b|\bcustomer\b.*\bcount\b|\btotal\b.*\bcustomer\b/))
    return 'CUSTOMER_COUNT';

  // ─── Profit / Financial ───────────────────────────────────────────────────
  if (q.match(/\bprofit\b.*\btoday\b|\btoday\b.*\bprofit\b/))
    return 'PROFIT_TODAY';
  if (q.match(/\bprofit\b.*\bmonth\b|\bmonth\b.*\bprofit\b/))
    return 'PROFIT_MONTH';
  if (q.match(/\bprofit\s+margin\b|\bmargin\b/))
    return 'PROFIT_MARGIN';

  // ─── Explicitly unsupported ───────────────────────────────────────────────
  if (q.match(/\bweather\b|\bnews\b|\bsport\b|\bfootball\b|\bcricket\b|\bwho\s+is\b|\bwhat\s+is\s+the\s+capital\b/))
    return 'UNSUPPORTED';

  return null; // needs AI classification
}

// In-flight map for classifyQuestion deduplication
const classifyInFlight = new Map();

/**
 * Classify question using Gemini AI — 1 API call, cached for 5 minutes.
 * Used as a fallback when regex doesn't match.
 */
async function classifyQuestion(question) {
  const cacheKey = `classify:${question.toLowerCase().trim()}`;

  // 1. Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[AI Classification] Cache hit for: "${question}" → ${cached}`);
    return cached;
  }

  // 2. Deduplicate in-flight requests for the same question
  if (classifyInFlight.has(cacheKey)) {
    console.log(`[AI Classification] Deduplicating in-flight classification`);
    return classifyInFlight.get(cacheKey);
  }

  const categoryList = Object.entries(CATEGORIES)
    .map(([key, desc]) => `- ${key}: ${desc}`)
    .join('\n');

  const prompt = `You are a business intelligence assistant for a retail inventory management system in Nepal.

The system has data about:
- Sales (daily transactions, invoices, returns, revenue)
- Products (inventory levels, categories, pricing, stock movements)
- Purchases (orders from suppliers, costs, purchase returns)
- Customers (purchase history, loyalty)
- Stock movements (in/out, transfers, balance quantities)

Classify this user question into the MOST SPECIFIC category from the list below:

AVAILABLE CATEGORIES:
${categoryList}

User question: "${question}"

Classification rules:
1. Choose the MOST SPECIFIC category that matches the intent
2. If question asks about multiple things, choose the PRIMARY intent
3. If question is too vague, choose GENERAL_QUESTION
4. If asking about things outside the system (weather, news, general knowledge), choose UNSUPPORTED
5. Respond with ONLY the category name in UPPERCASE, nothing else

Category:`;

  const classifyPromise = (async () => {
    try {
      const groqResult = await callGroq(prompt);
      const answer = groqResult.answer || '';
      const words = answer.toUpperCase().replace(/[^A-Z_]/g, ' ').split(/\s+/);
      let category = 'GENERAL_QUESTION';
      for (const word of words) {
        if (CATEGORIES[word]) {
          category = word;
          break;
        }
      }
      console.log(`[AI Classification] "${question}" → ${category}`);
      // Cache result so subsequent identical questions skip the AI call
      cache.set(cacheKey, category, CLASSIFY_CACHE_TTL_MS);
      return category;
    } catch (error) {
      console.error('[AI Classification] Error:', error.message);
      return 'GENERAL_QUESTION';
    } finally {
      classifyInFlight.delete(cacheKey);
    }
  })();

  classifyInFlight.set(cacheKey, classifyPromise);
  return classifyPromise;
}

module.exports = {
  classifyByRegex,
  classifyQuestion,
  extractDate,
  CATEGORIES,
};
