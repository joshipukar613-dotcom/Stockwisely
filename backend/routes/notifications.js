const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/settings', authenticateToken, notificationsController.getSettings);
router.put('/settings', authenticateToken, notificationsController.updateSettings);
router.get('/history', authenticateToken, notificationsController.getHistory);
router.get('/alerts', authenticateToken, notificationsController.getAlerts);
router.post('/test', authenticateToken, notificationsController.sendTest);

module.exports = router;
