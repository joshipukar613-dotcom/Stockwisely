const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Fixing stock discrepancies...');
  
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
  
  let fixedCount = 0;
  for (const p of products) {
    console.log(`Fixing ${p.product_code}: changing stock from ${p.stock} to ${p.batch_stock}`);
    await prisma.$executeRawUnsafe(`
      UPDATE products 
      SET stock = $1 
      WHERE id = $2
    `, p.batch_stock, p.id);
    fixedCount++;
  }
  
  console.log(`Fixed ${fixedCount} products.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
