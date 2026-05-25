"""
enhanced_categorize.py
Add more specific categories to reduce OTHER percentage
"""

import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="stock_wisely",
    user="postgres",
    password="Pukar321$"
)

# Additional category rules for remaining OTHER items
additional_rules = {
    'HOUSEHOLD': [
        'bag', 'shopping bag', 'cotton bag', 'plastic bag',
        'wrap', 'wrapping', 'foil', 'aluminum foil',
        'plate', 'cup', 'glass', 'bowl', 'spoon', 'fork', 'knife',
        'container', 'jar', 'bottle', 'flask',
        'bin', 'dustbin', 'basket',
        'apron', 'cloth', 'towel', 'mat',
        'candle', 'lighter', 'match', 'incense', 'dhoop',
        'hanger', 'clip', 'peg'
    ],
    
    'CLEANING': [
        'detergent', 'surf', 'wheel', 'ariel', 'tide', 'ghadi',
        'vim', 'pril', 'exo', 'harpic', 'lizol', 'domex',
        'colin', 'hit', 'mortein', 'good knight', 'all out',
        'broom', 'brrom', 'mop', 'wiper', 'scrub', 'sponge',
        'phenyl', 'floor cleaner', 'toilet cleaner',
        'dishwash', 'utensil cleaner'
    ],
    
    'STATIONERY': [
        'pen', 'pencil', 'notebook', 'copy', 'register',
        'paper', 'file', 'folder', 'envelope',
        'eraser', 'sharpener', 'scale', 'ruler',
        'marker', 'highlighter', 'sketch pen',
        'stapler', 'pin', 'clip', 'tape',
        'glue', 'fevicol', 'scissors'
    ],
    
    'TOYS': [
        'toy', 'soft gun', 'robot', 'car', 'train',
        'doll', 'teddy', 'ball', 'balloon',
        'game', 'puzzle', 'lego', 'blocks'
    ],
    
    'ELECTRONICS': [
        'battery', 'cell', 'aa battery', 'aaa battery',
        'bulb', 'led', 'tube light', 'cfl',
        'torch', 'flashlight', 'charger', 'cable',
        'adapter', 'extension', 'plug', 'socket'
    ],
    
    'PET_CARE': [
        'dog food', 'cat food', 'pet food',
        'pedigree', 'drools', 'whiskas'
    ]
}

cursor = conn.cursor()

# Get products still in OTHER
cursor.execute("""
    SELECT id, description 
    FROM products 
    WHERE category = 'OTHER'
""")

other_products = cursor.fetchall()
print(f"Processing {len(other_products):,} products in OTHER category...")

categorized = 0

for product_id, description in other_products:
    desc_lower = description.lower()
    new_category = 'OTHER'
    
    # Check additional rules
    for category, keywords in additional_rules.items():
        if any(keyword in desc_lower for keyword in keywords):
            new_category = category
            break
    
    # Update if category changed
    if new_category != 'OTHER':
        cursor.execute(
            "UPDATE products SET category = %s WHERE id = %s",
            (new_category, product_id)
        )
        categorized += 1

conn.commit()

print(f"\nRe-categorized {categorized:,} products")
print(f"Remaining in OTHER: {len(other_products) - categorized:,}")

# Get new distribution
cursor.execute("""
    SELECT category, COUNT(*) as count
    FROM products
    GROUP BY category
    ORDER BY count DESC
""")

print("\nUpdated Distribution:")
print(f"{'Category':<20} {'Count':>10}  {'Percentage':>10}")
print("-"*50)

total = sum(row[1] for row in cursor.fetchall())
cursor.execute("""
    SELECT category, COUNT(*) as count
    FROM products
    GROUP BY category
    ORDER BY count DESC
""")

for category, count in cursor.fetchall():
    percentage = (count / total) * 100
    print(f"{category:<20} {count:>10,}  {percentage:>9.1f}%")

cursor.close()
conn.close()