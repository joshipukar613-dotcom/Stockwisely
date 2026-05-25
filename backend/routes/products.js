const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/expiryController');
const { authenticateToken } = require('../middleware/auth');

router.get('/expiring', authenticateToken, ctrl.getExpiring);
router.post('/expiry/acknowledge', authenticateToken, ctrl.acknowledgeExpiry);
router.get('/expired', authenticateToken, ctrl.getExpired);
router.post('/expired/dispose', authenticateToken, ctrl.disposeExpired);

module.exports = router;
