const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authenticateToken } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All reports routes are restricted to ADMIN and MANAGER
router.use(authenticateToken);
router.use(roleCheck(['ADMIN', 'MANAGER']));

// Get sales summary
router.get('/sales-summary', reportsController.getSalesSummary);

// Get top performing products
router.get('/top-performers', reportsController.getTopPerformers);

// Get slow moving products
router.get('/slow-movers', reportsController.getSlowMovers);

// Get inventory report by category
router.get('/inventory', reportsController.getInventoryReport);

// Get purchase returns report
router.get('/purchase-returns', reportsController.getPurchaseReturnsReport);

// Get Sales VAT report
router.get('/sales-vat', reportsController.getSalesVatReport);

// Get Purchase VAT report
router.get('/purchase-vat', reportsController.getPurchaseVatReport);

// FIFO Reports
router.get('/fifo/profits', reportsController.getBatchProfits);
router.get('/fifo/vendor-comparison', reportsController.getVendorPriceComparison);
router.get('/fifo/cost-trends', reportsController.getWeightedAvgCostTrends);

module.exports = router;


