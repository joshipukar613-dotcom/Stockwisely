// Auto-category detection utility
// This utility analyzes product names and descriptions to suggest appropriate categories

const categoryKeywords = {
  'Electronics': [
    'phone', 'smartphone', 'iphone', 'samsung', 'galaxy', 'pixel',
    'laptop', 'computer', 'macbook', 'dell', 'hp', 'lenovo', 'asus',
    'tablet', 'ipad', 'android', 'ios',
    'headphones', 'earbuds', 'airpods', 'speaker', 'bluetooth',
    'camera', 'canon', 'nikon', 'sony', 'gopro',
    'tv', 'television', 'monitor', 'display', 'screen',
    'gaming', 'console', 'playstation', 'xbox', 'nintendo',
    'charger', 'cable', 'adapter', 'power bank', 'battery',
    'smart watch', 'fitness tracker', 'wearable',
    'drone', 'robot', 'electronic', 'tech', 'digital'
  ],
  'Clothing': [
    'shirt', 't-shirt', 'blouse', 'top', 'tank top',
    'pants', 'jeans', 'trousers', 'shorts', 'leggings',
    'dress', 'skirt', 'gown', 'frock',
    'jacket', 'coat', 'blazer', 'hoodie', 'sweater', 'cardigan',
    'shoes', 'sneakers', 'boots', 'sandals', 'heels', 'flats',
    'hat', 'cap', 'beanie', 'scarf', 'gloves',
    'underwear', 'bra', 'panties', 'boxers', 'briefs',
    'socks', 'stockings', 'tights',
    'suit', 'formal', 'casual', 'sportswear', 'activewear',
    'fabric', 'cotton', 'silk', 'wool', 'polyester', 'denim'
  ],
  'Food & Beverages': [
    'food', 'snack', 'meal', 'breakfast', 'lunch', 'dinner',
    'bread', 'rice', 'pasta', 'noodles', 'cereal',
    'meat', 'chicken', 'beef', 'pork', 'fish', 'seafood',
    'vegetable', 'fruit', 'apple', 'banana', 'orange', 'tomato',
    'milk', 'cheese', 'yogurt', 'butter', 'cream',
    'coffee', 'tea', 'juice', 'soda', 'water', 'beer', 'wine',
    'chocolate', 'candy', 'cookie', 'cake', 'ice cream',
    'spice', 'salt', 'pepper', 'sugar', 'oil', 'sauce',
    'organic', 'fresh', 'frozen', 'canned', 'packaged'
  ],
  'Home & Garden': [
    'furniture', 'chair', 'table', 'sofa', 'bed', 'desk',
    'lamp', 'light', 'bulb', 'fixture', 'chandelier',
    'curtain', 'blinds', 'carpet', 'rug', 'pillow', 'cushion',
    'kitchen', 'cookware', 'pan', 'pot', 'knife', 'utensil',
    'bathroom', 'towel', 'shower', 'toilet', 'sink',
    'garden', 'plant', 'flower', 'seed', 'fertilizer', 'pot',
    'tool', 'hammer', 'screwdriver', 'drill', 'saw',
    'paint', 'brush', 'roller', 'wallpaper',
    'cleaning', 'detergent', 'soap', 'vacuum', 'mop',
    'decor', 'decoration', 'vase', 'frame', 'mirror'
  ],
  'Health & Beauty': [
    'skincare', 'moisturizer', 'cleanser', 'serum', 'cream',
    'makeup', 'foundation', 'lipstick', 'mascara', 'eyeshadow',
    'shampoo', 'conditioner', 'hair', 'styling', 'gel',
    'perfume', 'cologne', 'fragrance', 'deodorant',
    'toothpaste', 'toothbrush', 'mouthwash', 'dental',
    'vitamin', 'supplement', 'medicine', 'pharmacy',
    'fitness', 'protein', 'workout', 'exercise',
    'spa', 'massage', 'wellness', 'therapy',
    'organic', 'natural', 'herbal', 'essential oil'
  ],
  'Sports & Outdoors': [
    'sports', 'athletic', 'fitness', 'gym', 'workout',
    'running', 'jogging', 'marathon', 'track',
    'football', 'soccer', 'basketball', 'tennis', 'golf',
    'swimming', 'pool', 'water sports', 'diving',
    'cycling', 'bike', 'bicycle', 'mountain bike',
    'hiking', 'camping', 'tent', 'sleeping bag', 'backpack',
    'outdoor', 'adventure', 'climbing', 'mountaineering',
    'fishing', 'hunting', 'archery',
    'equipment', 'gear', 'accessories',
    'team', 'league', 'competition', 'tournament'
  ],
  'Books & Media': [
    'book', 'novel', 'textbook', 'manual', 'guide',
    'magazine', 'newspaper', 'journal', 'publication',
    'cd', 'dvd', 'blu-ray', 'vinyl', 'record',
    'movie', 'film', 'documentary', 'series',
    'music', 'album', 'song', 'soundtrack',
    'game', 'video game', 'board game', 'puzzle',
    'educational', 'learning', 'study', 'reference',
    'fiction', 'non-fiction', 'biography', 'history',
    'art', 'design', 'photography', 'illustration'
  ],
  'Toys & Games': [
    'toy', 'doll', 'action figure', 'stuffed animal',
    'lego', 'blocks', 'building', 'construction',
    'puzzle', 'jigsaw', 'brain teaser',
    'board game', 'card game', 'strategy game',
    'educational toy', 'learning', 'developmental',
    'remote control', 'rc', 'drone', 'robot',
    'outdoor toy', 'ball', 'frisbee', 'kite',
    'craft', 'art supplies', 'coloring', 'drawing',
    'baby', 'infant', 'toddler', 'kids', 'children'
  ],
  'Automotive': [
    'car', 'vehicle', 'automobile', 'truck', 'suv',
    'tire', 'wheel', 'rim', 'brake', 'engine',
    'oil', 'filter', 'spark plug', 'battery',
    'headlight', 'taillight', 'mirror', 'windshield',
    'seat', 'cover', 'mat', 'organizer',
    'gps', 'navigation', 'dash cam', 'stereo',
    'motorcycle', 'bike', 'helmet', 'gear',
    'maintenance', 'repair', 'service', 'parts',
    'accessories', 'upgrade', 'performance'
  ],
  'Office Supplies': [
    'pen', 'pencil', 'marker', 'highlighter', 'eraser',
    'paper', 'notebook', 'binder', 'folder', 'file',
    'stapler', 'clips', 'tape', 'glue', 'scissors',
    'calculator', 'ruler', 'compass', 'protractor',
    'desk', 'chair', 'organizer', 'storage',
    'printer', 'ink', 'toner', 'cartridge',
    'computer', 'keyboard', 'mouse', 'monitor',
    'office', 'business', 'professional', 'corporate',
    'stationery', 'supplies', 'equipment'
  ],
  // Additional 9 categories to make it 19 total
  'Jewelry & Accessories': [
    'jewelry', 'necklace', 'bracelet', 'earrings', 'ring',
    'watch', 'timepiece', 'clock', 'timer',
    'bag', 'handbag', 'purse', 'wallet', 'backpack',
    'sunglasses', 'glasses', 'eyewear', 'contact lens',
    'belt', 'tie', 'scarf', 'accessory',
    'precious', 'gold', 'silver', 'diamond', 'pearl',
    'fashion', 'style', 'trendy', 'designer'
  ],
  'Baby & Kids': [
    'baby', 'infant', 'newborn', 'toddler', 'child',
    'diaper', 'wipes', 'formula', 'baby food',
    'stroller', 'car seat', 'carrier', 'crib',
    'toy', 'educational', 'development', 'learning',
    'clothing', 'onesie', 'romper', 'bib',
    'safety', 'monitor', 'gate', 'lock',
    'nursery', 'decor', 'furniture', 'bedding'
  ],
  'Pet Supplies': [
    'pet', 'dog', 'cat', 'animal', 'puppy', 'kitten',
    'food', 'treat', 'nutrition', 'feeding',
    'toy', 'chew', 'play', 'entertainment',
    'grooming', 'shampoo', 'brush', 'nail clipper',
    'collar', 'leash', 'harness', 'tag',
    'bed', 'blanket', 'carrier', 'crate',
    'health', 'medicine', 'vitamin', 'supplement'
  ],
  'Construction & Hardware': [
    'construction', 'building', 'renovation', 'remodel',
    'tool', 'power tool', 'drill', 'saw', 'hammer',
    'hardware', 'screw', 'nail', 'bolt', 'nut',
    'lumber', 'wood', 'plywood', 'timber',
    'concrete', 'cement', 'brick', 'stone',
    'paint', 'primer', 'stain', 'varnish',
    'plumbing', 'pipe', 'fitting', 'valve',
    'electrical', 'wire', 'outlet', 'switch'
  ],
  'Industrial & Scientific': [
    'industrial', 'manufacturing', 'factory', 'production',
    'scientific', 'laboratory', 'research', 'experiment',
    'equipment', 'machinery', 'instrument', 'device',
    'chemical', 'solution', 'reagent', 'compound',
    'measurement', 'scale', 'meter', 'gauge',
    'safety', 'protection', 'gear', 'equipment',
    'cleaning', 'sanitization', 'sterilization',
    'tool', 'precision', 'calibrated', 'professional'
  ],
  'Arts & Crafts': [
    'art', 'artist', 'painting', 'drawing', 'sketch',
    'craft', 'handmade', 'diy', 'hobby',
    'paint', 'brush', 'canvas', 'paper', 'pencil',
    'sewing', 'knitting', 'crochet', 'embroidery',
    'sculpture', 'clay', 'pottery', 'ceramic',
    'jewelry making', 'beading', 'wire work',
    'scrapbooking', 'card making', 'stamping',
    'fabric', 'textile', 'quilting', 'weaving'
  ],
  'Musical Instruments': [
    'music', 'musical', 'instrument', 'sound', 'audio',
    'guitar', 'piano', 'keyboard', 'drum', 'violin',
    'bass', 'amplifier', 'speaker', 'microphone',
    'recording', 'studio', 'mixing', 'production',
    'sheet music', 'notation', 'score', 'tab',
    'accessory', 'pick', 'string', 'reed', 'stick',
    'band', 'orchestra', 'ensemble', 'performance',
    'lesson', 'instruction', 'tutorial', 'learning'
  ],
  'Travel & Luggage': [
    'travel', 'trip', 'vacation', 'journey', 'adventure',
    'luggage', 'suitcase', 'bag', 'carry on', 'backpack',
    'travel accessory', 'organizer', 'pouch', 'case',
    'comfort', 'neck pillow', 'blanket', 'eye mask',
    'security', 'lock', 'tag', 'tracker',
    'document', 'passport', 'wallet', 'holder',
    'toiletry', 'cosmetic', 'travel size', 'container',
    'outdoor', 'camping', 'hiking', 'exploration'
  ],
  'Party & Event Supplies': [
    'party', 'celebration', 'event', 'gathering', 'festivity',
    'decoration', 'balloon', 'banner', 'streamer', 'confetti',
    'tableware', 'plate', 'cup', 'napkin', 'utensil',
    'cake', 'candle', 'topper', 'serving',
    'favor', 'gift', 'goodie bag', 'prize',
    'game', 'activity', 'entertainment', 'fun',
    'theme', 'birthday', 'wedding', 'holiday',
    'costume', 'mask', 'accessory', 'prop',
    'invitation', 'card', 'thank you', 'note'
  ]
};

/**
 * Detects the most likely category for a product based on its name and description
 * @param {string} productName - The name of the product
 * @param {string} productDescription - The description of the product (optional)
 * @returns {Object} - Object containing the detected category and confidence score
 */
export const detectCategory = (productName, productDescription = '') => {
  if (!productName || typeof productName !== 'string') {
    return {
      category: 'Uncategorized',
      confidence: 0,
      suggestions: []
    };
  }

  const text = `${productName} ${productDescription}`.toLowerCase();
  const categoryScores = {};
  const suggestions = [];

  // Calculate scores for each category
  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    let score = 0;
    const matchedKeywords = [];

    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      if (text.includes(keywordLower)) {
        // Give higher weight to exact matches and matches in product name
        const nameMatch = productName.toLowerCase().includes(keywordLower);
        const exactMatch = text.split(/\s+/).includes(keywordLower);
        
        let keywordScore = 1;
        if (nameMatch) keywordScore += 2; // Higher weight for name matches
        if (exactMatch) keywordScore += 1; // Higher weight for exact word matches
        
        score += keywordScore;
        matchedKeywords.push(keyword);
      }
    });

    if (score > 0) {
      categoryScores[category] = {
        score,
        matchedKeywords
      };
    }
  });

  // Sort categories by score
  const sortedCategories = Object.entries(categoryScores)
    .sort(([,a], [,b]) => b.score - a.score)
    .map(([category, data]) => ({
      category,
      score: data.score,
      matchedKeywords: data.matchedKeywords
    }));

  if (sortedCategories.length === 0) {
    return {
      category: 'Uncategorized',
      confidence: 0,
      suggestions: []
    };
  }

  const topCategory = sortedCategories[0];
  const maxPossibleScore = Math.max(...Object.values(categoryKeywords).map(keywords => keywords.length));
  const confidence = Math.min((topCategory.score / maxPossibleScore) * 100, 100);

  // Get top 3 suggestions
  const topSuggestions = sortedCategories.slice(0, 3).map(item => ({
    category: item.category,
    confidence: Math.min((item.score / maxPossibleScore) * 100, 100),
    matchedKeywords: item.matchedKeywords.slice(0, 3) // Show top 3 matched keywords
  }));

  return {
    category: topCategory.category,
    confidence: Math.round(confidence),
    suggestions: topSuggestions,
    matchedKeywords: topCategory.matchedKeywords
  };
};

/**
 * Gets all available categories
 * @returns {Array} - Array of category names
 */
export const getAvailableCategories = () => {
  return Object.keys(categoryKeywords).sort();
};

/**
 * Adds custom keywords to a category
 * @param {string} category - The category name
 * @param {Array} keywords - Array of keywords to add
 */
export const addCustomKeywords = (category, keywords) => {
  if (!categoryKeywords[category]) {
    categoryKeywords[category] = [];
  }
  
  keywords.forEach(keyword => {
    if (!categoryKeywords[category].includes(keyword.toLowerCase())) {
      categoryKeywords[category].push(keyword.toLowerCase());
    }
  });
};

/**
 * Creates a new custom category with keywords
 * @param {string} categoryName - The name of the new category
 * @param {Array} keywords - Array of keywords for the category
 */
export const createCustomCategory = (categoryName, keywords = []) => {
  if (!categoryKeywords[categoryName]) {
    categoryKeywords[categoryName] = keywords.map(k => k.toLowerCase());
    return true;
  }
  return false; // Category already exists
};

export default {
  detectCategory,
  getAvailableCategories,
  addCustomKeywords,
  createCustomCategory
};