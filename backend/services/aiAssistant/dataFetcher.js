const dbQueries = require('./dbQueries');
const { extractDate } = require('./questionClassifier');

async function fetchDataForCategory(category, question) {
  console.log(`[Data Fetcher] Fetching data for category: ${category}`);
  
  switch(category) {
    // ═══════════════════════════════════════════════════════════
    // SALES CATEGORIES
    // ═══════════════════════════════════════════════════════════
    case 'SALES_TODAY':
      return await dbQueries.getSalesToday();
    
    case 'SALES_YESTERDAY':
      return await dbQueries.getSalesYesterday();
    
    case 'SALES_WEEK':
      return await dbQueries.getSalesWeek();
    
    case 'SALES_MONTH':
      return await dbQueries.getSalesMonth();
    
    case 'SALES_MONTH_COMPARISON':
      return await dbQueries.getMonthlyComparison();
    
    // ═══════════════════════════════════════════════════════════
    // SALES RETURNS CATEGORIES
    // ═══════════════════════════════════════════════════════════
    case 'SALES_RETURN_TODAY':
      return await dbQueries.getSalesReturnsToday();
    
    case 'SALES_RETURN_YESTERDAY':
      return await dbQueries.getSalesReturnsYesterday();
    
    case 'SALES_RETURN_WEEK':
      return await dbQueries.getSalesReturnsWeek();
    
    case 'SALES_RETURN_MONTH':
      return await dbQueries.getSalesReturnsMonth();
    
    case 'SALES_RETURN_DATE': {
      // Extract the date from the question
      const parsedDate = extractDate(question || '');
      if (parsedDate) {
        const dateStr = `${parsedDate.year}-${String(parsedDate.month).padStart(2, '0')}-${String(parsedDate.day).padStart(2, '0')}`;
        return await dbQueries.getSalesReturnsByDate(dateStr);
      }
      // If date extraction fails, fall back to this month
      return await dbQueries.getSalesReturnsMonth();
    }
    
    // ═══════════════════════════════════════════════════════════
    // INVENTORY CATEGORIES
    // ═══════════════════════════════════════════════════════════
    case 'TOP_PRODUCTS':
      return await dbQueries.getTopProducts();
    
    case 'LOW_STOCK':
      return await dbQueries.getLowStockItems();
    
    // ═══════════════════════════════════════════════════════════
    // RECOMMENDATIONS
    // ═══════════════════════════════════════════════════════════
    case 'REORDER_RECOMMENDATIONS':
      return await dbQueries.getReorderRecommendations();
    
    case 'BUSINESS_SUMMARY':
      return await dbQueries.getBusinessSummary();
    
    case 'GENERAL_QUESTION':
      return await dbQueries.getBusinessSummary();
    
    // ═══════════════════════════════════════════════════════════
    // NEW EXTENSIONS (PURCHASE, CUSTOMER, PROFIT, INVENTORY)
    // ═══════════════════════════════════════════════════════════
    case 'PURCHASE_TODAY':
      return await dbQueries.getPurchaseToday();
    
    case 'PURCHASE_MONTH':
      return await dbQueries.getPurchaseMonth();
    
    case 'TOP_CUSTOMERS':
      return await dbQueries.getTopCustomers();
    
    case 'CUSTOMER_COUNT':
      return await dbQueries.getCustomerCount();
    
    case 'PROFIT_TODAY':
      return await dbQueries.getProfitToday();
    
    case 'PROFIT_MONTH':
      return await dbQueries.getProfitMonth();
    
    case 'EXPIRING_STOCK':
      return await dbQueries.getExpiringStock();

    // ═══════════════════════════════════════════════════════════
    // NOT YET IMPLEMENTED
    // ═══════════════════════════════════════════════════════════
    default:
      console.log(`[Data Fetcher] Category not directly implemented: ${category}`);
      throw new Error(`CATEGORY_NOT_IMPLEMENTED: ${category}`);
  }
}

module.exports = { fetchDataForCategory };
