// Batch and Expiry Management Utilities

/**
 * Calculate weighted average price across all batches
 * @param {Array} batches - Array of batch objects
 * @returns {number} - Weighted average price
 */
export const calculateWeightedAveragePrice = (batches) => {
  if (!batches || batches.length === 0) return 0;
  
  const activeBatches = batches.filter(batch => !batch.isExpired && batch.quantityRemaining > 0);
  if (activeBatches.length === 0) return 0;
  
  const totalValue = activeBatches.reduce((sum, batch) => 
    sum + (batch.purchasePrice * batch.quantityRemaining), 0);
  const totalQuantity = activeBatches.reduce((sum, batch) => 
    sum + batch.quantityRemaining, 0);
  
  return totalQuantity > 0 ? totalValue / totalQuantity : 0;
};

/**
 * Get nearest expiry date from batches
 * @param {Array} batches - Array of batch objects
 * @returns {string|null} - Nearest expiry date or null
 */
export const getNearestExpiryDate = (batches) => {
  if (!batches || batches.length === 0) return null;
  
  const activeBatches = batches.filter(batch => 
    !batch.isExpired && batch.expiryDate && batch.quantityRemaining > 0);
  
  if (activeBatches.length === 0) return null;
  
  const sortedBatches = activeBatches.sort((a, b) => 
    new Date(a.expiryDate) - new Date(b.expiryDate));
  
  return sortedBatches[0].expiryDate;
};

/**
 * Calculate days until expiry
 * @param {string} expiryDate - Expiry date string
 * @returns {number} - Days until expiry (negative if expired)
 */
export const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Get expiry status based on days until expiry
 * @param {string} expiryDate - Expiry date string
 * @returns {Object} - Status object with type, color, and message
 */
export const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) {
    return {
      type: 'no_expiry',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      message: 'No expiry',
      icon: '∞'
    };
  }
  
  const daysUntil = getDaysUntilExpiry(expiryDate);
  
  if (daysUntil < 0) {
    return {
      type: 'expired',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      message: 'EXPIRED',
      icon: '⚠️',
      daysUntil
    };
  } else if (daysUntil <= 7) {
    return {
      type: 'expiring_week',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      message: `${daysUntil} days`,
      icon: '⚠️',
      daysUntil
    };
  } else if (daysUntil <= 30) {
    return {
      type: 'expiring_soon',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      message: `${daysUntil} days`,
      icon: '⏰',
      daysUntil
    };
  } else {
    return {
      type: 'good',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      message: `${daysUntil} days`,
      icon: '✅',
      daysUntil
    };
  }
};

/**
 * Generate batch number
 * @param {string} productSku - Product SKU
 * @param {number} batchCount - Current batch count
 * @returns {string} - Generated batch number
 */
export const generateBatchNumber = (productSku, batchCount) => {
  const paddedCount = String(batchCount + 1).padStart(3, '0');
  return `${productSku}-B${paddedCount}`;
};

/**
 * Check if product exists and get existing batch info
 * @param {Array} products - Array of all products
 * @param {string} productName - Product name to check
 * @returns {Object|null} - Existing product info or null
 */
export const findExistingProduct = (products, productName) => {
  return products.find(product => 
    product.name.toLowerCase() === productName.toLowerCase());
};

/**
 * Create new batch for existing product
 * @param {Object} product - Existing product
 * @param {Object} batchData - New batch data
 * @returns {Object} - Updated product with new batch
 */
export const addBatchToProduct = (product, batchData) => {
  const newBatch = {
    id: `batch-${product.id}-${Date.now()}`,
    batchNumber: generateBatchNumber(product.sku, product.batches.length),
    quantity: batchData.quantity,
    quantityRemaining: batchData.quantity,
    purchasePrice: batchData.purchasePrice,
    purchaseDate: batchData.purchaseDate,
    expiryDate: batchData.expiryDate,
    isExpired: false
  };
  
  const updatedBatches = [...product.batches, newBatch];
  const newStock = product.stock + batchData.quantity;
  const newAveragePrice = calculateWeightedAveragePrice(updatedBatches);
  const newNearestExpiry = getNearestExpiryDate(updatedBatches);
  
  return {
    ...product,
    stock: newStock,
    averagePrice: newAveragePrice,
    totalBatches: updatedBatches.length,
    nearestExpiryDate: newNearestExpiry,
    batches: updatedBatches
  };
};

/**
 * Get expiry alerts for all products
 * @param {Array} products - Array of all products
 * @returns {Object} - Grouped expiry alerts
 */
export const getExpiryAlerts = (products) => {
  const alerts = {
    expired: [],
    expiring_week: [],
    expiring_soon: []
  };
  
  products.forEach(product => {
    if (!product.batches) return;
    
    product.batches.forEach(batch => {
      if (batch.isExpired || batch.quantityRemaining === 0) return;
      
      const status = getExpiryStatus(batch.expiryDate);
      
      const alertData = {
        productId: product.id,
        batchId: batch.id,
        productName: product.name,
        sku: product.sku,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: batch.quantityRemaining,
        daysUntil: status.daysUntil,
        status: status
      };
      
      switch (status.type) {
        case 'expired':
          alerts.expired.push(alertData);
          break;
        case 'expiring_week':
          alerts.expiring_week.push(alertData);
          break;
        case 'expiring_soon':
          alerts.expiring_soon.push(alertData);
          break;
      }
    });
  });
  
  return alerts;
};

/**
 * Get batch count display info
 * @param {number} batchCount - Number of batches
 * @returns {Object} - Display info for batch count
 */
export const getBatchCountDisplay = (batchCount) => {
  if (batchCount === 1) {
    return {
      text: 'Single batch',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100'
    };
  } else {
    return {
      text: `${batchCount} batches`,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    };
  }
};

/**
 * Get average price display info
 * @param {number} currentPrice - Current product price
 * @param {number} averagePrice - Average price across batches
 * @param {number} batchCount - Number of batches
 * @returns {Object} - Display info for average price
 */
export const getAveragePriceDisplay = (currentPrice, averagePrice, batchCount) => {
  if (batchCount === 1) {
    return {
      showAverage: false,
      text: null,
      variance: null
    };
  }
  
  const variance = ((currentPrice - averagePrice) / averagePrice) * 100;
  
  return {
    showAverage: true,
    text: `Avg of ${batchCount} batches`,
    variance: variance,
    varianceColor: variance > 0 ? 'text-green-600' : 'text-red-600',
    varianceIcon: variance > 0 ? '↗' : '↘'
  };
};
