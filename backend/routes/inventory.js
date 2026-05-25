const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventoryController');
const { authenticateToken } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Get current stock (latest stock per product)
router.get('/current', authenticateToken, ctrl.getCurrentStock);

// Get categories
// Product routes
router.get('/products', authenticateToken, ctrl.getProducts);
router.get('/categories', authenticateToken, ctrl.getCategories);

// Get low stock products
router.get('/low-stock', authenticateToken, ctrl.getLowStock);

// Read-only metrics (legacy)
router.get('/row-counts', authenticateToken, ctrl.getRowCounts);
router.get('/metrics/dashboard', authenticateToken, ctrl.getDashboardMetrics);

// Inventory adjustment - ADMIN and MANAGER only
router.post('/adjust', authenticateToken, roleCheck(['ADMIN', 'MANAGER']), ctrl.adjustInventory);
const adjCtrl = require('../controllers/stockAdjustmentController');
router.get('/adjustments', authenticateToken, adjCtrl.listAdjustments);
router.get('/adjustments/summary', authenticateToken, adjCtrl.getAdjustmentSummary);
router.post('/adjustments', authenticateToken, roleCheck(['ADMIN', 'MANAGER']), adjCtrl.createAdjustment);
router.get('/products/:productId/adjustments', authenticateToken, adjCtrl.getProductAdjustments);

// Create product - ADMIN and MANAGER only
router.post('/products', authenticateToken, roleCheck(['ADMIN', 'MANAGER']), ctrl.createProduct);

router.get('/products/:code/batches', authenticateToken, ctrl.getProductBatches);
router.get('/products/:code/fifo-price', authenticateToken, ctrl.getFIFOPrice);

module.exports = router;
