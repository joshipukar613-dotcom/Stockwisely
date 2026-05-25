"""
final_nepali_categorize.py
Final categorization pass focusing on Nepali products and missed items
"""

import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="stock_wisely",
    user="postgres",
    password="Pukar321$"
)

print("Final categorization pass - Nepali products and high-volume items...")

# Additional rules for missed products
final_rules = {
    'GROCERIES': [
        # Nepali food items
        'noon', 'salt', 'namak',
        'ciura', 'chyura', 'beaten rice', 'poha',
        'tama', 'bamboo shoot',
        'pustakari', 'pusta kari',
        'chhurpi', 'churpi', 'dried cheese',
        'besan', 'gram flour', 'chickpea flour',
        'yeast', 'baking powder',
        'makhana', 'fox nut',
        'kinowa', 'quinoa',
        'sarseu', 'mustard',
        'lwang', 'clove',
        'soyabean oil', 'mustard oil',
        'paratha', 'parota', 'lachhaa',
        'fullo', 'puffed rice',
        'badam', 'almond',
        'olives', 'olive',
        'rasogolla', 'rasgulla', 'sweet',
        'cereal', 'oatmeal', 'oats', 'flakes',
        'choco pops', 'corn flakes',
        'nutty crunch', 'breakfast cereal'
    ],
    
    'SNACKS': [
        # Nepali snacks
        'titaura', 'lapsi', 'amla candy',
        'lekbesy', 'isha food',
        'martin vita',
        # Candies & gums
        'tic tac', 'mint', 'breath mint',
        'happydent', 'happy dent',
        'lolly', 'lollipop',
        'chewing gum', 'bubble gum',
        # Ready to eat
        'fish', 'instant fish', 'fish snack',
        'chicken sitan', 'meat snack',
        'bikano', 'indian sweets'
    ],
    
    'ALCOHOL': [
        # Wine & liqueurs  
        'wine', 'red wine', 'white wine',
        'merlot', 'cabernet', 'shiraz',
        'silver oak', 'robertson',
        'cherry liq', 'cherry liqueur',
        'liqueur', 'liquor',
        'martin vita 21', 'fortified wine',
        # Mixers
        'ginger ale', 'tonic', 'soda water',
        'mixer', 'cola mix'
    ],
    
    'PERSONAL_CARE': [
        # Beauty & skincare (brands)
        'veet', 'waxing', 'hair removal',
        'emami', 'fair and handsome',
        'lakme', 'lotus', 'vlcc',
        'newlook', 'joy', 'clean & clear',
        'liril', 'lux soap',
        # Specific products
        'cleansing milk', 'face wash', 'facewash',
        'glycerine', 'glycerin',
        'sunscreen', 'sun protection', 'spf',
        'handwash', 'hand wash',
        'liquid soap', 'body wash',
        'fairness cream', 'whitening cream',
        # Laundry
        'ezee', 'gentle wash', 'liquid detergent',
        'dhoni', 'detergent'
    ],
    
    'BABY_PRODUCTS': [
        'cerelac', 'baby cereal',
        'baby food', 'infant food',
        'lactogen', 'nan', 'similac'
    ],
    
    'HOUSEHOLD': [
        # Kitchen items
        'tray', 'bamboo tray',
        'gas regulator', 'cylinder',
        'electric blanket', 'blanket',
        # Lighting
        'lighter', 'lihghter', 'bic lighter',
        'matchbox', 'match stick'
    ],
    
    'TOYS': [
        # Water toys
        'pichkari', 'water gun', 'holi gun',
        'swimming google', 'swim goggles',
        'swimming goggle', 'swim goggle',
        # Toy vehicles
        'metal city bus', 'toy bus',
        'toy car', 'toy train',
        'big gun set', 'toy gun'
    ],
    
    'FASHION': [
        'tourist bag', 'travel bag',
        'swim wear', 'swimming'
    ],
    
    'STATIONERY': [
        'highlighter', 'highligter',
        'marker pen', 'sketch pen'
    ],
    
    'BEVERAGES': [
        'pudding', 'jelly dessert'
    ]
}

cursor = conn.cursor()

# Get remaining OTHER products
cursor.execute("""
    SELECT id, description 
    FROM products 
    WHERE category = 'OTHER'
""")

other_products = cursor.fetchall()
print(f"Processing {len(other_products):,} products...")

categorized = 0
category_counts = {}

for product_id, description in other_products:
    desc_lower = description.lower()
    new_category = 'OTHER'
    
    # Check final rules
    for category, keywords in final_rules.items():
        if any(keyword in desc_lower for keyword in keywords):
            new_category = category
            break
    
    # Update if changed
    if new_category != 'OTHER':
        cursor.execute(
            "UPDATE products SET category = %s WHERE id = %s",
            (new_category, product_id)
        )
        categorized += 1
        category_counts[new_category] = category_counts.get(new_category, 0) + 1

conn.commit()

print(f"\nRe-categorized: {categorized:,} products")
print(f"Remaining in OTHER: {len(other_products) - categorized:,}")

if category_counts:
    print("\nBreakdown:")
    for cat, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {count}")

# Final distribution
cursor.execute("""
    SELECT category, COUNT(*) as count
    FROM products
    GROUP BY category
    ORDER BY count DESC
""")

print("\n" + "="*70)
print("FINAL DISTRIBUTION")
print("="*70)

total = sum(row[1] for row in cursor.fetchall())
cursor.execute("""
    SELECT category, COUNT(*) as count
    FROM products
    GROUP BY category
    ORDER BY count DESC
""")

for category, count in cursor.fetchall():
    percentage = (count / total) * 100
    print(f"{category:<20} {count:>6,}  ({percentage:>5.1f}%)")

print("\n" + "="*70)
print(f"Target: OTHER < 20% ✓ Achieved!" if ((len(other_products) - categorized) / total * 100) < 20 else "")
print("="*70)

cursor.close()
conn.close()