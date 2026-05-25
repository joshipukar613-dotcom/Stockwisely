const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Checking for stock discrepancies...');
  
  const products = await prisma.$queryRawUnsafe(`
    SELECT 
      p.id, 
      p.product_code, 
      p.stock,
      COALESCE(SUM(sb.quantity_remaining), 0) as batch_stock
    FROM products p
    LEFT JOIN stock_batches sb ON p.product_code = sb.product_code AND sb.is_exhausted = false
    GROUP BY p.id, p.product_code, p.stock
    HAVING p.stock != COALESCE(SUM(sb.quantity_remaining), 0)
  `);
  
  console.log('Products with stock discrepancies:', products.length);
  if (products.length > 0) {
    console.log(products.slice(0, 10));
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
