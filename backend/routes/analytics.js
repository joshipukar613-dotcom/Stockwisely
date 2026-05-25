const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All analytics routes are restricted to ADMIN and MANAGER
router.use(authenticateToken);
router.use(roleCheck(['ADMIN', 'MANAGER']));

// Sales & Demand analytics
router.get('/sales-demand', analyticsController.getSalesDemand);

// Inventory Health analytics
router.get('/inventory-health', analyticsController.getInventoryHealth);

// Stock Movement analytics
router.get('/stock-movement', analyticsController.getStockMovement);

// Comparison analytics
router.get('/compare', analyticsController.getComparison);

module.exports = router;
