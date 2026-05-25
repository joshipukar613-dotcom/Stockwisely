const express = require('express');
const router = express.Router();
const purchasesController = require('../controllers/purchasesController');
const { authenticateToken } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All purchases routes are restricted to ADMIN and MANAGER
router.use(authenticateToken);
router.use(roleCheck(['ADMIN', 'MANAGER']));

// Get paginated purchases
router.get('/', purchasesController.getPurchases);

// Get purchase details by invoice number
router.get('/details/:invoiceNumber', purchasesController.getPurchaseDetails);

// Search purchase by invoice
router.get('/search', purchasesController.searchPurchaseByInvoice);

// Create new purchase
router.post('/', purchasesController.createPurchase);

// Return specific routes
router.get('/returns/list', purchasesController.getPurchaseReturns);
router.get('/returns/summary', purchasesController.getPurchaseReturnsSummary);

// Update purchase item
router.put('/items/:id', purchasesController.updatePurchaseItem);

module.exports = router;

