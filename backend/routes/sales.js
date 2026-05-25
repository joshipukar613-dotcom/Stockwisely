const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/salesController');
const { authenticateToken } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All sales routes are restricted to SALES_CLERK
router.use(authenticateToken);
router.use(roleCheck(['ADMIN', 'MANAGER', 'SALES_CLERK']));

// Get paginated sales with filters
router.get('/', ctrl.getSales);

// Get sale details by invoice number
router.get('/details/:invoiceNumber', ctrl.getSaleDetails);

// Create sale (master-detail)
router.post('/', ctrl.createSale);

// Read sale by id
router.get('/:id', ctrl.getSaleById);

// Update sale item
router.put('/items/:id', ctrl.updateSaleItem);

// NEW: Return-specific routes
router.get('/returns/list', ctrl.getReturns);
router.get('/returns/summary', ctrl.getReturnsSummary);
router.get('/customers/:customerName/credits', ctrl.getCustomerCredits);

module.exports = router;

