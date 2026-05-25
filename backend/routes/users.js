const express = require('express');
const {
  getAllUsers,
  createUser,
  updateRole,
  toggleStatus,
  resetUserPassword
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

// All user management routes are restricted to ADMIN
router.use(authenticateToken);
router.use(roleCheck(['ADMIN']));

router.get('/', getAllUsers);
router.post('/', createUser);
router.patch('/:userId/role', updateRole);
router.patch('/:userId/status', toggleStatus);
router.post('/:userId/reset-password', resetUserPassword);

module.exports = router;
