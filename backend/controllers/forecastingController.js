const axios = require('axios');

const FORECAST_SERVICE_URL = process.env.FORECAST_SERVICE_URL || 'http://localhost:5002';

// Helper to proxy requests to Flask service
async function proxyToFlask(endpoint, query = {}) {
  try {
    const url = `${FORECAST_SERVICE_URL}/api/forecast/${endpoint}`;
    const response = await axios.get(url, { params: query, timeout: 30000 });
    return response.data;
  } catch (error) {
    console.error(`Forecast service error [${endpoint}]:`, error.message);
    throw new Error('Forecast service unavailable');
  }
}

// GET /api/forecasting/summary
exports.getSummary = async (req, res) => {
  try {
    const data = await proxyToFlask('summary');
    res.json(data);
  } catch (error) {
    res.status(503).json({
      success: false,
      message: error.message || 'Failed to fetch forecast summary'
    });
  }
};

// GET /api/forecasting/categories
exports.getCategories = async (req, res) => {
  try {
    const data = await proxyToFlask('categories');
    res.json(data);
  } catch (error) {
    res.status(503).json({
      success: false,
      message: error.message || 'Failed to fetch category forecasts'
    });
  }
};

// GET /api/forecasting/products?category=all&limit=20
exports.getProducts = async (req, res) => {
  try {
    const data = await proxyToFlask('products', {
      category: req.query.category || 'all',
      limit: req.query.limit || 20
    });
    res.json(data);
  } catch (error) {
    res.status(503).json({
      success: false,
      message: error.message || 'Failed to fetch product forecasts'
    });
  }
};

// GET /api/forecasting/trends?category=all
exports.getTrends = async (req, res) => {
  try {
    const data = await proxyToFlask('trends', {
      category: req.query.category || 'all'
    });
    res.json(data);
  } catch (error) {
    res.status(503).json({
      success: false,
      message: error.message || 'Failed to fetch forecast trends'
    });
  }
};

// GET /api/forecasting/health
exports.getHealth = async (req, res) => {
  try {
    const data = await proxyToFlask('health');
    res.json(data);
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Forecast service offline',
      status: 'offline'
    });
  }
};
