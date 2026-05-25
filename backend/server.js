const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
// Remove mongoSanitize - it's MongoDB specific
// const mongoSanitize = require('express-mongo-sanitize');
// Remove mongoose - we're using Prisma now
// const mongoose = require('mongoose');
const passport = require('passport');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const inventoryRoutes = require('./routes/inventory');
const salesRoutes = require('./routes/sales');
const purchasesRoutes = require('./routes/purchases');
const reportsRoutes = require('./routes/reports');
const vendorsRoutes = require('./routes/vendors');
const notificationsRoutes = require('./routes/notifications');
const productsRoutes = require('./routes/products');
const stockHistoryRoutes = require('./routes/stockHistory');
const analyticsRoutes = require('./routes/analytics');
const aiAssistantRoutes = require('./routes/aiAssistant');
const customersRoutes = require('./routes/customers');
const forecastingRoutes = require('./routes/forecasting');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const isDev = (process.env.NODE_ENV || 'development') === 'development';
    const ip = req.ip || '';
    const xfwd = (req.headers['x-forwarded-for'] || '').toString();
    const isLocal =
      ip.includes('127.0.0.1') ||
      ip.includes('::1') ||
      xfwd.includes('127.0.0.1') ||
      xfwd.includes('::1') ||
      (req.hostname || '').includes('localhost');
    const isGoogleOAuth = /^\/api\/auth\/google/.test(req.path || '');
    return isDev || isLocal || isGoogleOAuth;
  }
});

// Security middleware
app.use(helmet());
app.use(limiter);
// Remove mongoSanitize - MongoDB specific
// app.use(mongoSanitize());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration - Updated to fix preflight issues
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow if origin is in whitelist
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // For development, allow localhost on any port
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }

    // Otherwise reject
    const msg = 'The CORS policy for this site does not allow access from the specified origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Compression
app.use(compression());

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.disable('etag');

// Passport middleware
app.use(passport.initialize());
require('./config/passport')(passport);

// Database connection (PostgreSQL Pool)
const { connectDB, pool } = require('./config/database');
const alertChecker = require('./services/AlertCheckerService');

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Stock Wisely API Server' });
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/stock-history', stockHistoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai-assistant', aiAssistantRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/forecasting', forecastingRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    res.status(200).json({
      status: 'OK',
      database: 'Connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'Error',
      database: 'Disconnected',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

const PORT = process.env.PORT || 5000;

let server;

// Start server
const startServer = async () => {
  try {
    await connectDB();
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`PostgreSQL connected on port 5433`);
      alertChecker.init();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', async (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & disconnect pool
  if (server) {
    server.close(async () => {
      await pool.end();
      process.exit(1);
    });
  } else {
    await pool.end();
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (server) {
    server.close(async () => {
      await pool.end();
      console.log('HTTP server closed');
      console.log('PostgreSQL connection closed');
      process.exit(0);
    });
  }
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  if (server) {
    server.close(async () => {
      await pool.end();
      console.log('HTTP server closed');
      console.log('PostgreSQL connection closed');
      process.exit(0);
    });
  } else {
    await pool.end();
    process.exit(0);
  }
});

startServer();

module.exports = app;
