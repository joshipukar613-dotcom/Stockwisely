const express = require('express');
const router = express.Router();
const passport = require('passport');
const forecastingController = require('../controllers/forecastingController');

const auth = passport.authenticate('jwt', { session: false });

router.get('/summary', auth, forecastingController.getSummary);
router.get('/categories', auth, forecastingController.getCategories);
router.get('/products', auth, forecastingController.getProducts);
router.get('/trends', auth, forecastingController.getTrends);
router.get('/health', auth, forecastingController.getHealth);

module.exports = router;
