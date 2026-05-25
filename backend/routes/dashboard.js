const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

// Get dashboard summary
router.get('/summary', authenticateToken, dashboardController.getSummary);

module.exports = router;

