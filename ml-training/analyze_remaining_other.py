# Quick check what's left
import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="stock_wisely",
    user="postgres",
    password="Pukar321$"
)

cursor = conn.cursor()

# Get sample of remaining OTHER
cursor.execute("""
    SELECT description, COUNT(*) OVER() as total_other
    FROM products 
    WHERE category = 'OTHER'
    ORDER BY RANDOM()
    LIMIT 50
""")

print("Sample of remaining OTHER products:")
print("="*80)
for row in cursor.fetchall():
    print(f"  • {row[0]}")
    total_other = row[1]

print(f"\nTotal remaining in OTHER: {total_other:,}")

# Check if they're high-volume products
cursor.execute("""
    SELECT p.description, COUNT(si.id) as sales_count
    FROM products p
    LEFT JOIN sales_items si ON si.product_name = p.description
    WHERE p.category = 'OTHER'
    GROUP BY p.description
    HAVING COUNT(si.id) > 10
    ORDER BY sales_count DESC
    LIMIT 20
""")

print("\nTop 20 OTHER products by sales volume:")
print("="*80)
results = cursor.fetchall()
if results:
    for desc, count in results:
        print(f"  • {desc} ({count} sales)")
else:
    print("  (No high-volume products in OTHER)")

cursor.close()
conn.close()