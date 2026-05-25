const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');

const { authenticateToken } = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { handleValidationErrors } = require('../utils/validators');
const aiAssistantController = require('../controllers/aiAssistantController');

const router = express.Router();

// All AI routes are restricted to ADMIN and MANAGER
router.use(authenticateToken);
router.use(roleCheck(['ADMIN', 'MANAGER']));

/**
 * DATA mode limiter — generous because:
 *  - 0 Gemini API calls for regex-matched questions
 *  - At most 1 Gemini call (cached 5 min) for AI-classification fallback
 *  - Full response is cached 2 min, so repeated identical questions
 *    won't even reach Gemini or the database
 */
const aiAskLimiter = rateLimit({
  windowMs: parseInt(process.env.AI_ASK_RATE_LIMIT_WINDOW_MS  || '60000', 10), // 60 s
  max:      parseInt(process.env.AI_ASK_RATE_LIMIT_MAX_REQUESTS || '30',   10), // 30 req / window
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (req, res) => {
    return res.status(429).json({
      answer: '⚠️ Too many requests. Please wait a moment before asking again.',
      rateLimited: true,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * ADVICE mode limiter — stricter because each request costs 1 Gemini API call.
 * The client retries automatically on 429 with back-off, so a strict limit
 * here is safe — the user will eventually get through.
 */
const aiAdviceLimiter = rateLimit({
  windowMs: parseInt(process.env.AI_ADVICE_RATE_LIMIT_WINDOW_MS  || '60000', 10), // 60 s
  max:      parseInt(process.env.AI_ADVICE_RATE_LIMIT_MAX_REQUESTS || '5',    10), // 5 req / window
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (req, res) => {
    return res.status(429).json({
      answer: '⚠️ You\'ve reached the advice request limit (5 per minute). The client will retry automatically — or wait a moment and ask again.',
      rateLimited: true,
      timestamp: new Date().toISOString(),
    });
  },
});

const questionValidation = [
  body('question')
    .exists({ checkFalsy: true })
    .withMessage('Question is required')
    .bail()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Question must be between 1 and 1000 characters'),
  handleValidationErrors,
];

// Data queries — 0 Gemini API calls (regex + DB + deterministic format)
// Falls back to 1 cached AI classification call if regex doesn't match
router.post(
  '/ask',
  aiAskLimiter,
  questionValidation,
  aiAssistantController.ask
);

// Business advice — 1 Gemini API call (DB summary + Gemini advice)
router.post(
  '/advice',
  aiAdviceLimiter,
  questionValidation,
  aiAssistantController.askAdvice
);

module.exports = router;
