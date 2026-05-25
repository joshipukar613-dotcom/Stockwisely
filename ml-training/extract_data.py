import pandas as pd
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="stock_wisely",
    user="postgres",
    password="Pukar321$"
)

print("Connected to database...")

query = """
SELECT 
    sm.sale_date,
    si.product_name,
    si.quantity,
    si.price,
    si.amount,
    p.category
FROM sales_items si
JOIN sales_master sm ON si.sale_id = sm.id
JOIN products p ON si.product_name = p.description
ORDER BY sm.sale_date, si.product_name;
"""

print("Extracting ALL sales data...")
df = pd.read_sql(query, conn)
conn.close()

print(f"Extracted: {len(df):,} records")
print(f"Date range: {df['sale_date'].min()} to {df['sale_date'].max()}")
print(f"Products: {df['product_name'].nunique():,}")
print(f"Categories: {df['category'].nunique()}")
print(f"Total quantity sold: {df['quantity'].sum():,.2f}")

df.to_csv('data_raw_sales.csv', index=False)
print("Saved to data_raw_sales.csv")

print("\nSample:")
print(df.head(10))