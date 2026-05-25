const express = require('express');
const router = express.Router();
const stockHistoryController = require('../controllers/stockHistoryController');
const { authenticateToken } = require('../middleware/auth');

router.get('/daily-summary', authenticateToken, stockHistoryController.getDailyStockSummary);
router.get('/history', authenticateToken, stockHistoryController.getStockHistory);
router.get('/product-changes', authenticateToken, stockHistoryController.getProductStockChanges);

module.exports = router;
