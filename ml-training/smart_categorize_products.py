"""
complete_final_categorize.py
Complete and final product categorization script
Includes all categories: SNACKS, GROCERIES, BEVERAGES, DAIRY, NOODLES, BAKERY,
PERSONAL_CARE, ALCOHOL, CIGARETTES, HOUSEHOLD, CLEANING, STATIONERY, TOYS,
BABY_PRODUCTS, FASHION, ELECTRONICS, PET_CARE
"""

import psycopg2
from collections import defaultdict

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="stock_wisely",
    user="postgres",
    password="Pukar321$"
)

print("="*80)
print("COMPLETE PRODUCT CATEGORIZATION SYSTEM")
print("="*80)
print("Connected to database...")

# ==============================================================================
# TIER 1: BRAND-SPECIFIC OVERRIDES (Highest Priority)
# ==============================================================================

brand_overrides = {
    'SNACKS': [
        # Chocolates & Candies
        'cadbury', 'dairy milk', 'bournville', 'celebrations', 'gems', 'perk',
        'nestle', 'kitkat', 'kit kat', 'munch', 'milkybar', 'bar one',
        'snickers', 'mars', 'bounty', 'twix', 'milky way', 'galaxy',
        'toblerone', 'ferrero', 'kinder', 'lindt', 'hershey',
        '5 star', 'eclairs', 'alpenliebe', 'mentos', 'polo',
        'center fresh', 'hajmola', 'pulse', 'mango bite',
        'chupa chups', 'perfetti', 'orion', 'capella',
        # Chips & Savory Snacks
        'lays', 'kurkure', 'bingo', 'pringles', 'cheetos', 'doritos',
        'uncle chips', 'mad angles', 'tedhe medhe',
        # Nuts & Namkeen
        'haldiram', 'bikaji', 'balaji', 'bikaneri', 'aloo bhujia',
        'alfaz almond', 'alfaz kaju', 'alfaz pista', 'alfaz walnut', 'alfaz raisins',
        # Biscuits
        'parle', 'britannia', 'sunfeast', 'priya gold',
        'good day', 'bourbon', 'hide & seek', 'nutricho', 'monaco',
        'jim jam', 'dark fantasy', 'tiger', 'treat', 'marie'
    ],
    
    'BEVERAGES': [
        # Soft Drinks
        'coca cola', 'coke', 'pepsi', 'sprite', 'fanta', 'mountain dew',
        'thumsup', 'thums up', 'limca', '7up', 'mirinda',
        # Juices
        'real', 'tropicana', 'maaza', 'frooti', 'slice', 'appy fizz',
        'minute maid', 'pulpy orange',
        # Energy Drinks
        'red bull', 'sting', 'gatorade', 'glucon d',
        # Health Drinks
        'bournvita', 'horlicks', 'complan', 'boost',
        # Tea & Coffee
        'nescafe', 'bru', 'tata tea', 'taj mahal', 'red label',
        'lipton', 'wagh bakri', 'society tea', 'girnar'
    ],
    
    'DAIRY': [
        'ddc', 'ddairy', 'amul', 'mother dairy', 'verka', 'nandini',
        'parag', 'govardhan', 'britannia cheese', 'britannia butter',
        'nutralite', 'milkmaid', 'everyday'
    ],
    
    'NOODLES': [
        'wai wai', 'maggi', 'yippee', 'top ramen', 'knorr',
        '2 pm', 'current', 'mama', 'indomie', 'nongshim',
        'shin ramyun', 'samyang', 'nissin'
    ],
    
    'BAKERY': [
        'modern bread', 'harvest gold', 'britannia bread',
        'english oven', 'bonn', 'monginis'
    ],
    
    'PERSONAL_CARE': [
        'dettol', 'lifebuoy', 'lux', 'dove', 'pears', 'santoor',
        'hamam', 'cinthol', 'godrej', 'rexona', 'nivea',
        'vaseline', 'ponds', 'garnier', 'loreal',
        'pantene', 'head & shoulders', 'clinic plus',
        'sunsilk', 'tresemme', 'colgate', 'pepsodent',
        'close up', 'sensodyne', 'oral b',
        'whisper', 'stayfree', 'sofy', 'carefree',
        'vlcc', 'lotus', 'himalaya', 'patanjali',
        'everyyuth', 'boro plus', 'boroline',
        'denver', 'fogg', 'engage', 'wild stone', 'axe',
        'savlon', 'johnson', 'mee mee'
    ],
    
    'ALCOHOL': [
        'arna', 'tuborg', 'carlsberg', 'gorkha beer', 'everest beer',
        'nepal ice', 'khukuri', 'old durbar', 'signature',
        'royal stag', 'black label', 'red label', 'black dog',
        'teachers', 'imperial blue', 'officers choice',
        'absolut', 'smirnoff', 'bacardi', 'mcdowell',
        '8848 vodka', '8848 whisky', 'ruslan vodka',
        'jameson', 'jack daniels', 'johnnie walker'
    ],
    
    'CIGARETTES': [
        'surya', 'shikhar', 'khukuri cigarette', 'yak cigarette',
        'pilot cigarette', 'scissor cigarette',
        'marlboro', 'gold flake', 'navy cut', 'classic cigarette',
        'wills', 'benson', 'dunhill', 'camel', 'winston',
        'pall mall', 'lucky strike', 'esse'
    ],
    
    'GROCERIES': [
        'aashirvaad', 'pilsbury', 'annapurna', 'fortune',
        'sundrop', 'saffola', 'dhara', 'gemini',
        'india gate', 'daawat', 'kohinoor', 'shrilalmahal',
        'tata salt', 'tata sampann', 'everest masala',
        'mdh', 'catch', 'eastern', 'alfa agro'
    ],
    
    'HOUSEHOLD': [
        'baltra', 'nova', 'prestige', 'hawkins',
        'milton', 'cello', 'tupperware'
    ],
    
    'CLEANING': [
        'harpic', 'lizol', 'domex', 'vim', 'pril',
        'surf', 'wheel', 'ariel', 'tide', 'ghadi',
        'hit', 'mortein', 'good knight', 'all out'
    ],
    
    'BABY_PRODUCTS': [
        'pampers', 'huggies', 'mamy poko', 'cuddlers',
        'aiwibi', 'himalaya baby', 'johnson baby'
    ]
}

# ==============================================================================
# TIER 2: PRODUCT TYPE KEYWORDS
# ==============================================================================

product_type_keywords = {
    'CIGARETTES': [
        'cigarette', 'cigaret', 'ciggaret', 'tobacco',
        'filter cigarette', 'smoking', 'light cigarette',
        'menthol cigarette'
    ],
    
    'SNACKS': [
        'chocolate', 'candy', 'toffee', 'lollipop', 'chewing gum',
        'chips', 'namkeen', 'mixture', 'bhujia', 'sev',
        'popcorn', 'peanut', 'cashew', 'almond',
        'walnut', 'pista', 'raisin', 'dry fruit',
        'cheese ball', 'ring', 'stick', 'extruder',
        'wafer', 'biscuit', 'cookie',
        'bar', 'energy bar', 'protein bar', 'breakfast bar',
        'yoga bar', 'granola bar', 'choco pie'
    ],
    
    'BAKERY': [
        'bread', 'pav', 'pau', 'bun', 'roll',
        'cake', 'pastry', 'muffin', 'donut', 'croissant',
        'toast', 'rusk', 'cracker'
    ],
    
    'BEVERAGES': [
        'juice', 'drink', 'cola', 'soda', 'fizz',
        'water', 'mineral water', 'bottled water',
        'tea', 'coffee', 'shake', 'lassi',
        'buttermilk', 'lemonade', 'squash', 'syrup',
        'energy drink', 'soft drink', 'cold drink',
        'cappuccino', 'instant coffee'
    ],
    
    'DAIRY': [
        'paneer', 'curd', 'dahi', 'butter', 'ghee',
        'cheese', 'cream', 'yogurt',
        'fresh milk', 'toned milk', 'full cream milk',
        'skimmed milk', 'milk pouch', 'milk pack'
    ],
    
    'NOODLES': [
        'noodle', 'noodles', 'pasta', 'macaroni',
        'spaghetti', 'vermicelli', 'chowmein',
        'ramen', 'ramyun', 'instant noodle'
    ],
    
    'GROCERIES': [
        'rice', 'basmati', 'sella', 'chawal',
        'atta', 'flour', 'maida', 'suji', 'rawa',
        'dal', 'daal', 'masoor', 'moong', 'chana',
        'toor', 'urad', 'rajma', 'lobia', 'kabuli',
        'oil', 'mustard oil', 'sunflower oil', 'olive oil',
        'sugar', 'salt', 'haldi', 'turmeric',
        'chilli', 'mirch', 'dhaniya', 'coriander',
        'jeera', 'cumin', 'masala', 'spice',
        'pickle', 'papad', 'achaar',
        'tejpat', 'bay leaf', 'til', 'sesame',
        'souf', 'fennel', 'jayepatri', 'mace',
        'rayo', 'mustard', 'methi', 'fenugreek',
        'simi', 'beans', 'geda', 'pitho',
        'ajinomoto', 'msg', 'jam', 'jelly',
        'honey', 'vinegar', 'sauce', 'ketchup',
        'seeds', 'sunflower seeds',
        'sausage', 'frankfutter', 'buff', 'salami',
        'egg', 'eggs', 'brown egg',
        'rasna', 'tang', 'mishri'
    ],
    
    'PERSONAL_CARE': [
        'soap', 'shampoo', 'conditioner', 'face wash',
        'body wash', 'hand wash', 'lotion', 'cream',
        'toothpaste', 'toothbrush', 'mouthwash',
        'sanitizer', 'tissue', 'toilet paper',
        'napkin', 'sanitary pad', 'tampon',
        'diaper', 'razor', 'shaving cream',
        'deodorant', 'deo', 'body spray', 'body deo',
        'perfume', 'cologne', 'fragrance',
        'hair dryer', 'dryer', 'hair gel', 'hair cream',
        'lip balm', 'lipbalm', 'aloe vera gel',
        'scrub', 'face scrub', 'body scrub',
        'air freshner', 'air freshener', 'room freshner',
        'panty liner', 'pad'
    ],
    
    'HOUSEHOLD': [
        'bag', 'shopping bag', 'file bag',
        'box', 'container', 'jar', 'pot',
        'bottle', 'flask', 'vacuum pot',
        'tiffin', 'lunch box', 'food container',
        'mug', 'cup', 'glass', 'tumbler',
        'plate', 'bowl', 'spoon', 'fork', 'knife',
        'balti', 'bucket', 'basin',
        'kitchen gloves', 'apron',
        'bed', 'drawer', 'shelf', 'rack',
        'chair', 'table', 'stand', 'furniture',
        'wall hook', 'hook', 'hanger',
        'wall art', 'photo frame', 'painting',
        'vase', 'flower pot', 'gamla',
        'lock', 'padlock', 'chain',
        'umbrella', 'raincoat',
        'fan', 'table fan', 'stand fan',
        'candle', 'lighter', 'incense', 'dhoop',
        'nanglo', 'dhakka', 'dhiki'
    ],
    
    'CLEANING': [
        'detergent', 'washing powder', 'washing liquid',
        'dishwash', 'utensil cleaner', 'dish soap',
        'toilet cleaner', 'bathroom cleaner',
        'floor cleaner', 'glass cleaner',
        'mop', 'wiper', 'broom', 'brrom', 'scrub', 'sponge',
        'phenyl', 'disinfectant',
        'insecticide', 'mosquito', 'cockroach',
        'roach gel', 'anti roach'
    ],
    
    'STATIONERY': [
        'pen', 'pencil', 'eraser', 'sharpener',
        'notebook', 'note book', 'copy', 'register',
        'sketch pad', 'drawing book', 'art book',
        'marker', 'highlighter', 'crayon',
        'stapler', 'staples', 'pin', 'clip',
        'tape', 'glue', 'fevicol', 'adhesive',
        'scissors', 'cutter', 'blade',
        'ruler', 'scale', 'compass', 'divider',
        'geometry', 'geomitri', 'geommy',
        'protractor', 'set square',
        'file', 'folder', 'envelope',
        'wrapping paper', 'gift wrap',
        'paint', 'brush', 'canvas', 'color'
    ],
    
    'TOYS': [
        'toy', 'toys', 'doll', 'teddy', 'soft toy',
        'puzzle', 'game', 'board game',
        'balloon', 'baloon', 'party balloon',
        'birthday', 'party decoration',
        'birthday cap', 'party cap', 'party hat',
        'play set', 'kitchen set', 'doctor set',
        'tool set', 'makeup set', 'beauty set',
        'car toy', 'train toy', 'robot toy',
        'remote control', 'rc car', 'rc',
        'bubble gun', 'bubble', 'chu chu',
        'writing board', 'magnetic board', 'drawing board',
        'jump rope', 'skipping rope',
        'ball', 'cricket', 'bat',
        'doremon', 'pikachu', 'cartoon',
        'santa', 'christmas decoration',
        'air pump', 'inflator'
    ],
    
    'BABY_PRODUCTS': [
        'baby', 'infant', 'newborn',
        'baby chair', 'feeding chair', 'high chair',
        'baby bath', 'baby soap', 'baby oil',
        'baby powder', 'baby lotion', 'baby cream',
        'baby shampoo', 'baby wash',
        'diaper', 'nappy', 'diaper cover',
        'baby blanket', 'baby towel', 'baby cloth',
        'kneepad', 'knee pad', 'elbow pad',
        'baby dress', 'baby suit', 'baby sando',
        'baby topi', 'baby cap', 'baby hat',
        'baby shoes', 'baby socks', 'baby slippers',
        'baby jutta', 'baby sandal',
        'baby bottle', 'feeding bottle', 'sipper',
        'baby spoon', 'baby bowl', 'baby plate',
        'baby tiffin', 'baby food container',
        'baby book', 'baby toy', 'baby rattle',
        'baby formula', 'baby food',
        'baby pants', 'baby underwear',
        'feeding mug', 'feeding set'
    ],
    
    'FASHION': [
        'underwear', 'panty', 'bra', 'lingerie',
        'innerwear', 'vest', 'camisole',
        'night suit', 'night dress', 'pyjama', 'nightwear',
        'shoes', 'sandal', 'slipper', 'jutta',
        'chappals', 'floaters', 'footwear',
        'belt', 'wallet', 'purse', 'handbag',
        'gloves', 'bike gloves', 'riding gloves',
        'socks', 'stockings', 'tights',
        'dress', 'suit', 'shirt', 'pant',
        'trouser', 'skirt', 'frock',
        'suruwal', 'topi', 'cap', 'hat',
        'scarf', 'muffler', 'shawl'
    ],
    
    'ELECTRONICS': [
        'battery', 'cell', 'aa battery', 'aaa battery',
        'bulb', 'led', 'led bulb', 'tube light', 'cfl',
        'torch', 'flashlight', 'emergency light',
        'charger', 'mobile charger', 'phone charger',
        'cable', 'usb cable', 'charging cable',
        'adapter', 'plug', 'socket',
        'extension', 'extension cord', 'power strip',
        'heater', 'room heater', 'water heater',
        'kettle', 'electric kettle',
        'scale', 'weighing scale', 'electronic scale'
    ],
    
    'PET_CARE': [
        'dog food', 'cat food', 'pet food',
        'pedigree', 'drools', 'whiskas',
        'dog treats', 'cat treats',
        'pet shampoo', 'pet soap'
    ]
}

# ==============================================================================
# CATEGORIZATION FUNCTION
# ==============================================================================

def categorize_product(description):
    """
    Smart categorization with priority handling
    Priority: Brand overrides > Product keywords > OTHER
    """
    desc_lower = description.lower().strip()
    
    # TIER 1: Check brand overrides first (highest priority)
    for category, brands in brand_overrides.items():
        for brand in brands:
            if brand in desc_lower:
                return category
    
    # TIER 2: Check product type keywords
    for category, keywords in product_type_keywords.items():
        if any(keyword in desc_lower for keyword in keywords):
            return category
    
    return 'OTHER'

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

def main():
    cursor = conn.cursor()
    
    # Get all products
    cursor.execute("""
        SELECT id, description, category 
        FROM products 
        ORDER BY description
    """)
    
    products = cursor.fetchall()
    total_products = len(products)
    
    print(f"\nProcessing {total_products:,} products...")
    print("="*80)
    
    # Statistics
    category_changes = defaultdict(list)
    unchanged = 0
    changed = 0
    
    # Process each product
    for idx, (product_id, description, current_category) in enumerate(products, 1):
        new_category = categorize_product(description)
        
        if new_category != current_category:
            # Update database
            cursor.execute(
                "UPDATE products SET category = %s WHERE id = %s",
                (new_category, product_id)
            )
            
            # Track change
            change_key = f"{current_category} → {new_category}"
            if len(category_changes[change_key]) < 5:
                category_changes[change_key].append(description)
            
            changed += 1
        else:
            unchanged += 1
        
        # Progress
        if idx % 1000 == 0:
            print(f"Progress: {idx:,}/{total_products:,} ({idx/total_products*100:.1f}%)")
    
    # Commit changes
    conn.commit()
    
    # Print results
    print("\n" + "="*80)
    print("CATEGORIZATION COMPLETE")
    print("="*80)
    print(f"Total products: {total_products:,}")
    print(f"Unchanged: {unchanged:,} ({unchanged/total_products*100:.1f}%)")
    print(f"Changed: {changed:,} ({changed/total_products*100:.1f}%)")
    
    if category_changes:
        print("\n" + "="*80)
        print("SAMPLE CHANGES (First 3 examples per category)")
        print("="*80)
        for change_key in sorted(category_changes.keys()):
            examples = category_changes[change_key]
            print(f"\n{change_key} ({len(examples)} samples):")
            for ex in examples[:3]:
                print(f"  • {ex}")
    
    # Final distribution
    cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM products 
        GROUP BY category 
        ORDER BY count DESC
    """)
    
    print("\n" + "="*80)
    print("FINAL CATEGORY DISTRIBUTION")
    print("="*80)
    print(f"{'Category':<20} {'Count':>10}  {'Percentage':>10}")
    print("-"*80)
    
    for category, count in cursor.fetchall():
        percentage = (count / total_products) * 100
        print(f"{category:<20} {count:>10,}  {percentage:>9.1f}%")
    
    cursor.close()
    
    print("\n" + "="*80)
    print("NEXT STEPS:")
    print("="*80)
    print("1. Review the distribution above")
    print("2. If satisfied (OTHER < 35%), proceed with ML training:")
    print("   python extract_data.py")
    print("   python prepare_features.py")
    print("   python train_lightgbm.py")
    print("3. If not satisfied, check remaining OTHER products:")
    print("   SELECT description FROM products WHERE category = 'OTHER' LIMIT 100;")
    print("="*80)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()
        print("\nDatabase connection closed.")