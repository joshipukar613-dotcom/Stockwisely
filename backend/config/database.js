const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'stock_wisely',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const prisma = new PrismaClient();

// Test database connection
const connectDB = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected successfully');
    console.log(`   Database: ${process.env.DB_NAME || 'stock_wisely'}`);
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}`);
    client.release();
    await prisma.$connect();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error.message);
    process.exit(1);
  }
};

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await pool.end();
  await prisma.$disconnect();
});

module.exports = { pool, prisma, connectDB };
