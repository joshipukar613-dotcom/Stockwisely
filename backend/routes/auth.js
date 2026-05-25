const express = require('express');
const {
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  requestPasswordReset,
  resetPassword,
  changePassword,
  forceChangePassword,
  getCurrentUser,
  updateProfile
} = require('../controllers/authController');
const {
  validateRegister,
  validateLogin,
  validateEmailVerification,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateResendVerification
} = require('../utils/validators');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', validateRegister, register);
router.post('/verify-email', validateEmailVerification, verifyEmail);
router.post('/resend-verification', validateResendVerification, resendVerificationEmail);
router.post('/login', validateLogin, login);
router.post('/forgot-password', validatePasswordResetRequest, requestPasswordReset);
router.post('/reset-password', validatePasswordReset, resetPassword);

// Google OAuth routes
router.get('/google', (req, res, next) => {
  const returnTo = req.query.returnTo || req.headers.referer || process.env.CLIENT_URL;
  const state = Buffer.from(JSON.stringify({ returnTo })).toString('base64');
  const authenticator = require('passport').authenticate('google', { 
    scope: ['profile', 'email'],
    state 
  });
  authenticator(req, res, next);
});
router.get('/google/callback', require('passport').authenticate('google', { session: false }), require('../controllers/googleAuthController').googleCallback);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);
router.put('/profile', authenticateToken, updateProfile);
router.post('/change-password', authenticateToken, changePassword);
router.post('/force-password-change', authenticateToken, forceChangePassword);

module.exports = router;
