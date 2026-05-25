# Master-Detail Migration: Sales & Purchases

This guide explains the migration from flat `sales_records` to proper invoice structure (`sales_master` + `sales_items`) and similar for purchases.

## What’s created
- `products`: master product catalog keyed by `product_code`.
- `sales_master` and `sales_items`: invoice header and line items.
- `purchase_master` and `purchase_items`: purchase header and line items.
- Triggers: auto-compute `amount`, recompute invoice totals, write `stock_movements` rows on item inserts.
- `sales_analytics`, `ml_predictions`, `dashboard_kpis` for analytics/predictions.

## How totals and stock are updated
- Item `amount = quantity * price` via `trg_item_amount_compute`.
- Invoice totals are recalculated on insert/update/delete of items.
- For `sales_items` inserts: an outwards stock movement is inserted.
- For `purchase_items` inserts: an inwards stock movement is inserted.

## Data migration strategy
The script groups existing flat rows into invoices using heuristics (adjust to your data):
- Sales: group by `source_file + extracted_month` to form one invoice per group. Invoice number: `S-<md5(source_file-month)>`.
- Purchases: group by `fiscal_year + month` to form one invoice per period. Invoice number: `P-<year>-<month>`.

If you have explicit invoice IDs or customer/vendor details in your CSVs, modify the grouping accordingly to preserve true invoices.

## Invoice numbers
- New API-generated invoices use `S-YYYYMMDDHHMMSS-<rand4>` which is unique and sortable.
- For migrated data without true invoice IDs, synthetic IDs are generated as above.

## CSV import
Use `COPY` or `
\copy` in `psql` to load CSVs into staging tables first, then transform if needed:

```sql
-- Example: load cleaned CSV into existing flat tables
COPY public.sales_records(product_code, product_name, quantity, sales_rate, net_amt, cp, dis_pct, dis_amount, extracted_month, source_file)
FROM 'C:/path/to/sales_data_clean.csv' WITH (FORMAT csv, HEADER true);

COPY public.purchase_records(product_code, product_name, category, fiscal_year, month, purchases_qty, avg_rate)
FROM 'C:/path/to/Purchase_data_clean.csv' WITH (FORMAT csv, HEADER true);
```

Then run the migration `002_master_detail_sales_purchases.sql`.

## Running the migration
1. Ensure the backend is connected to your Postgres.
2. Execute `sw-stock-wisely/database/migrations/002_master_detail_sales_purchases.sql` in your DB (e.g., using `psql` or your GUI client).
3. Verify with:
   - `SELECT COUNT(*) FROM sales_master;`
   - `SELECT COUNT(*) FROM sales_items;`
   - `SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 10;`

## API changes
- New endpoint: `POST /api/sales` accepts invoice header and items:

```json
{
  "customer_name": "Ram Sharma",
  "items": [
    {"product_code": "P001", "product_name": "Widget", "quantity": 5, "price": 100},
    {"product_code": "P002", "product_name": "Gadget", "quantity": 3, "price": 80}
  ]
}
```

Response includes computed totals and line items. `GET /api/sales/:id` reads an invoice.

## Prisma impact
- Prisma currently models `User` and `VerificationToken`. We query other tables via `prisma.$queryRaw`. You can extend `schema.prisma` with models for `sales_master`, `sales_items`, etc., later for type-safe access.
- This migration does not break existing Prisma models.

## Best practices
- Prefer true invoice IDs from your source when available.
- Maintain `products` as the single source of truth for product metadata.
- Keep stock updates in triggers for guaranteed consistency, and optionally mirror business logic in application code for validation.

