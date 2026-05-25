const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/customersController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, ctrl.getCustomers);
router.get('/report/stats', authenticateToken, ctrl.getCustomerStats);
router.get('/phone/:phone', authenticateToken, ctrl.getCustomerByPhone);
router.get('/:id', authenticateToken, ctrl.getCustomerById);
router.post('/', authenticateToken, ctrl.createCustomer);
router.put('/:id', authenticateToken, ctrl.updateCustomer);
router.delete('/:id', authenticateToken, ctrl.deleteCustomer);

module.exports = router;
