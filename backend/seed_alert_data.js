
const { pool } = require('./config/database');

async function seedData() {
  try {
    const productCode = 'PROD-01753';
    
    // 1. Ensure product exists (it does from previous check)
    
    // 2. Insert Stock Movement (Low Stock)
    console.log('Inserting low stock movement...');
    await pool.query(`
      INSERT INTO stock_movements (product_code, description, balance_qty, extracted_month)
      VALUES ($1, 'Test Product Low Stock', 2, $2)
    `, [productCode, Date.now()]);

    // 3. Create a dummy purchase
    console.log('Creating dummy purchase...');
    const invoiceNumber = `INV-${Date.now()}`;
    const purchaseRes = await pool.query(`
      INSERT INTO purchase_master (vendor_name, purchase_date, total_amount, payment_status, invoice_number)
      VALUES ('Test Vendor', NOW(), 100, 'Paid', $1)
      RETURNING id
    `, [invoiceNumber]);
    const purchaseId = purchaseRes.rows[0].id;

    // 4. Insert Purchase Item (Expiring Soon)
    console.log('Inserting expiring purchase item...');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3); // 3 days from now
    
    await pool.query(`
      INSERT INTO purchase_items (purchase_id, product_code, product_name, quantity, price, amount, expiry_date)
      VALUES ($1, $2, 'Test Product Expiring', 10, 10, 100, $3)
    `, [purchaseId, productCode, expiryDate]);

    console.log('Seed data inserted successfully.');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
     try {
        await pool.end();
    } catch(e) {}
  }
}

seedData();
