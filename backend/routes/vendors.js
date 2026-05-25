const express = require('express');
const router = express.Router();
const vendorsController = require('../controllers/vendorsController');
const { authenticateToken } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All vendors routes are restricted to ADMIN and MANAGER
router.use(authenticateToken);
router.use(roleCheck(['ADMIN', 'MANAGER']));

// Search vendors
router.get('/search', vendorsController.searchVendors);

// Create vendor
router.post('/', vendorsController.createVendor);

// List vendors with stats
router.get('/', vendorsController.listVendors);

// Statistics dashboard
router.get('/statistics', vendorsController.getStatistics);

// Single vendor details
router.get('/:id', vendorsController.getVendor);

// Update vendor
router.put('/:id', vendorsController.updateVendor);

// Delete vendor (soft if has purchases)
router.delete('/:id', vendorsController.deleteVendor);

// Purchases by vendor
router.get('/:id/purchases', vendorsController.getVendorPurchases);

// Products purchased by vendor
router.get('/:id/products', vendorsController.getVendorProducts);

// Payments history
router.get('/:id/payments', vendorsController.getVendorPayments);

// Vendor Ledger history
router.get('/:id/ledger', vendorsController.getVendorLedger);

// Record payment
router.post('/:id/payments', vendorsController.recordPayment);

module.exports = router;
