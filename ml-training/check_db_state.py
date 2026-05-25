"""Quick script to check current database state"""
import psycopg2
import pandas as pd

conn = psycopg2.connect(
    host="localhost", port=5433, database="stock_wisely",
    user="postgres", password="Pukar321$"
)
cur = conn.cursor()

# Sales master info
cur.execute("SELECT MIN(sale_date), MAX(sale_date), COUNT(*) FROM sales_master")
print("Sales Master:", cur.fetchone())

# Sales items
cur.execute("SELECT COUNT(*) FROM sales_items")
print("Sales Items:", cur.fetchone())

# Products
cur.execute("SELECT COUNT(*) FROM products")
print("Products:", cur.fetchone())

# Table columns
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='sales_master' ORDER BY ordinal_position")
print("sales_master columns:", [r[0] for r in cur.fetchall()])

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='sales_items' ORDER BY ordinal_position")
print("sales_items columns:", [r[0] for r in cur.fetchall()])

# Monthly distribution of sales
cur.execute("""
    SELECT date_trunc('month', sale_date)::date as m, COUNT(*) 
    FROM sales_master 
    GROUP BY m ORDER BY m
""")
rows = cur.fetchall()
print(f"\nMonthly sales distribution ({len(rows)} months):")
for r in rows:
    print(f"  {r[0]}: {r[1]} invoices")

# Category distribution
cur.execute("""
    SELECT category, COUNT(*) FROM products 
    GROUP BY category ORDER BY COUNT(*) DESC
""")
print("\nCategory distribution:")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

# Check existing invoice prefixes to understand the format
cur.execute("""
    SELECT LEFT(invoice_number, 6) as prefix, COUNT(*) 
    FROM sales_master 
    GROUP BY prefix 
    ORDER BY prefix
""")
print("\nInvoice prefixes:")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

conn.close()
