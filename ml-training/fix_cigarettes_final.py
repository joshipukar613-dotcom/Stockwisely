"""
fix_cigarettes_final2.py
Second pass - catch misspellings
"""

import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="stock_wisely",
    user="postgres",
    password="Pukar321$"
)

cursor = conn.cursor()

# Fix misspelled items
fixes = [
    ("NATURES ESSENSE NEEM GEL FACEWASH 50GM", "PERSONAL_CARE"),
    ("NATURES ESSESNCE NOURISHING AALMOND N HONEY BODY LOTION", "PERSONAL_CARE"),
    ("NATURS ESSESNCE NOURISHING ALMOMD N HONEY BODY LOTION  100ML", "PERSONAL_CARE"),
    ("SBI WENHUA CULTURAL ESSENCE DIARY NOTE BOOK WH64100", "STATIONERY")
]

for description, new_category in fixes:
    cursor.execute(
        "UPDATE products SET category = %s WHERE description = %s",
        (new_category, description)
    )
    print(f"FIXED: {description[:60]} → {new_category}")

conn.commit()

# Show final cigarettes
cursor.execute("""
    SELECT description 
    FROM products 
    WHERE category = 'CIGARETTES'
    ORDER BY description
""")

print("\n" + "="*70)
print("✓ FINAL CIGARETTES CATEGORY (Should be 19 items):")
print("="*70)
cigarettes = cursor.fetchall()
for idx, row in enumerate(cigarettes, 1):
    print(f"{idx:2}. {row[0]}")

print(f"\nTotal: {len(cigarettes)} cigarette products")

cursor.close()
conn.close()