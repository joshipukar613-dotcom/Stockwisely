# Stock History Feature - Setup Guide

## Overview
This feature adds comprehensive stock history tracking to the Inventory page, allowing users to view historical stock data for any past date.

## Database Setup

### Step 1: Run Migration Script
Execute the migration script to create the required tables and functions:

```bash
cd backend
node scripts/create_stock_history_tables.js
```

This will create:
- `stock_movements` table - Detailed tracking of all stock movements
- `daily_stock_snapshots` table - Daily closing stock snapshots
- `get_daily_stock_summary()` function - Calculates daily stock summaries

### Step 2: Verify Tables Created
You can verify the tables were created by checking PostgreSQL:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('stock_movements', 'daily_stock_snapshots');
```

## Backend Implementation

### Files Created/Modified:

1. **backend/scripts/create_stock_history_tables.js**
   - Migration script for creating tables and functions

2. **backend/controllers/stockHistoryController.js**
   - `getDailyStockSummary` - Get stock summary for a specific date
   - `getStockHistory` - Get stock history for a date range
   - `getProductStockChanges` - Get detailed changes for a specific product

3. **backend/routes/stockHistory.js**
   - Routes registered at `/api/stock-history`

4. **backend/server.js**
   - Added route registration for stock history

## Frontend Implementation

### Files Created/Modified:

1. **sw-stock-wisely/src/components/inventory/StockHistory.jsx**
   - Main component displaying stock history
   - Features:
     - Date selector with quick shortcuts (Yesterday, Last Week, etc.)
     - Detailed table showing opening, sales, purchases, returns, adjustments, losses, closing stock
     - Summary cards with totals
     - CSV export functionality

2. **sw-stock-wisely/src/pages/Inventory.jsx**
   - Added tabs: Current Stock, Stock History, Low Stock Alerts
   - Integrated StockHistory component

3. **sw-stock-wisely/src/api/index.js**
   - Added `stockHistoryAPI` with methods:
     - `getDailySummary(date)`
     - `getHistory(params)`
     - `getProductChanges(productId, date)`

## API Endpoints

### GET /api/stock-history/daily-summary
Get daily stock summary for a specific date.

**Query Parameters:**
- `date` (optional) - Date in YYYY-MM-DD format (defaults to today)

**Response:**
```json
{
  "success": true,
  "date": "2026-02-18",
  "summary": [
    {
      "product_id": 1,
      "product_name": "Product Name",
      "category": "Category",
      "opening_stock": 100,
      "sales": 10,
      "purchases": 20,
      "returns_in": 2,
      "returns_out": 1,
      "adjustments": 5,
      "losses": 0,
      "closing_stock": 116,
      "net_change": 16
    }
  ]
}
```

### GET /api/stock-history/history
Get stock history for a date range.

**Query Parameters:**
- `startDate` (required) - Start date in YYYY-MM-DD format
- `endDate` (required) - End date in YYYY-MM-DD format
- `productId` (optional) - Filter by product ID

### GET /api/stock-history/product-changes
Get detailed stock changes for a specific product on a date.

**Query Parameters:**
- `productId` (required) - Product ID
- `date` (optional) - Date in YYYY-MM-DD format (defaults to today)

## Integration with Existing Transactions

**IMPORTANT:** To populate stock history data, you need to ensure that all transaction controllers log to the `stock_movements` table when creating:
- Sales
- Purchases
- Sales Returns
- Purchase Returns
- Stock Adjustments

Example logging code (to be added to transaction controllers):

```javascript
// When creating a SALE:
await client.query(`
  INSERT INTO stock_movements 
  (product_id, movement_type, quantity, quantity_before, quantity_after, 
   reference_type, reference_id, reference_number, movement_date, created_by)
  VALUES ($1, 'out', $2, $3, $4, 'sale', $5, $6, CURRENT_DATE, $7)
`, [product_id, quantity, stock_before, stock_after, sale_id, invoice_number, user_id]);

// When creating a PURCHASE:
await client.query(`
  INSERT INTO stock_movements 
  (product_id, movement_type, quantity, quantity_before, quantity_after, 
   reference_type, reference_id, reference_number, movement_date, created_by)
  VALUES ($1, 'in', $2, $3, $4, 'purchase', $5, $6, CURRENT_DATE, $7)
`, [product_id, quantity, stock_before, stock_after, purchase_id, invoice_number, user_id]);
```

## Usage

1. Navigate to the Inventory page
2. Click on the "Stock History" tab
3. Select a date using:
   - Quick shortcuts (Yesterday, 2 Days Ago, Last Week, Last Month)
   - Date picker
4. View the detailed stock summary table
5. Export data as CSV if needed

## Features

- ✅ Historical stock data for any past date
- ✅ Breakdown by transaction type (sales, purchases, returns, adjustments, losses)
- ✅ Opening and closing stock calculations
- ✅ Net change tracking
- ✅ Summary cards with totals
- ✅ CSV export functionality
- ✅ Dark mode support
- ✅ Responsive design

## Notes

- The `daily_stock_snapshots` table can be populated via a scheduled job (cron) that runs daily to create snapshots
- The `stock_movements` table should be populated in real-time as transactions occur
- Historical data will only be available after transactions start logging to `stock_movements`
