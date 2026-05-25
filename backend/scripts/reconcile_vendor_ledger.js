const { pool } = require('../config/database');

/**
 * RECONCILE VENDOR LEDGER
 * This script ensures that every record in purchase_master and payment_transactions
 * has a corresponding entry in the vendor_ledger table.
 * 
 * Logic:
 * 1. Fetch all vendors.
 * 2. For each vendor, fetch all their purchases (purchase_master).
 * 3. For each purchase, check if a 'Purchase' entry exists in vendor_ledger with correct amount.
 * 4. For each vendor, fetch all their payments (payment_transactions).
 * 5. For each payment, check if a 'Payment' entry exists in vendor_ledger.
 */

async function reconcile() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting Vendor Ledger reconciliation...');
        await client.query('BEGIN');

        // 1. Get all vendors
        const vendorsRes = await client.query('SELECT id, name FROM vendors');
        const vendors = vendorsRes.rows;

        for (const vendor of vendors) {
            console.log(`\n📦 Processing Vendor: ${vendor.name} (ID: ${vendor.id})`);

            // A. Reconcile Purchases
            const purchasesRes = await client.query(
                'SELECT id, invoice_number, total_amount, amount_paid, purchase_date FROM purchase_master WHERE vendor_name ILIKE $1',
                [vendor.name]
            );

            for (const purchase of purchasesRes.rows) {
                const totalAmount = Number(purchase.total_amount);
                const amountPaid = Number(purchase.amount_paid || 0);

                // 1. RECONCILE DEBIT (Purchase Amount)
                const ledgerDebitRes = await client.query(
                    "SELECT id, debit FROM vendor_ledger WHERE vendor_id = $1 AND transaction_type = 'Purchase' AND reference_number = $2",
                    [vendor.id, purchase.invoice_number]
                );

                if (ledgerDebitRes.rows.length === 0) {
                    console.log(`  ➕ Adding missing Purchase entry: ${purchase.invoice_number} (Rs. ${totalAmount})`);
                    await client.query(
                        `INSERT INTO vendor_ledger (vendor_id, transaction_date, transaction_type, reference_number, debit, description)
                         VALUES ($1, $2, 'Purchase', $3, $4, $5)`,
                        [vendor.id, purchase.purchase_date, purchase.invoice_number, totalAmount, `Purchase Invoice #${purchase.invoice_number}`]
                    );
                } else if (Number(ledgerDebitRes.rows[0].debit) !== totalAmount) {
                    console.log(`  🔄 Updating Purchase entry: ${purchase.invoice_number} (New Total: Rs. ${totalAmount})`);
                    await client.query(
                        "UPDATE vendor_ledger SET debit = $1 WHERE id = $2",
                        [totalAmount, ledgerDebitRes.rows[0].id]
                    );
                }

                // 2. RECONCILE CREDIT (Initial Payments recorded in purchase_master but missing from ledger)
                if (amountPaid > 0) {
                    // Get all payments in ledger for this purchase
                    // We check if either reference matches PMT-ID or if description contains the invoice number
                    const ledgerCreditRes = await client.query(
                        `SELECT SUM(credit) as total_credits FROM vendor_ledger 
                         WHERE vendor_id = $1 AND transaction_type = 'Payment' 
                         AND (reference_number = $2 OR reference_number LIKE $3 OR description LIKE $4)`,
                        [vendor.id, `PMT-${purchase.id}`, `PMT-${purchase.id}%`, `%${purchase.invoice_number}%`]
                    );

                    const totalLedgerCredits = Number(ledgerCreditRes.rows[0]?.total_credits || 0);
                    const diff = amountPaid - totalLedgerCredits;

                    if (diff > 0.01) { // allowance for float epsilon
                        console.log(`  ➕ Adding missing Initial Payment entry for ${purchase.invoice_number}: Rs. ${diff}`);
                        await client.query(
                            `INSERT INTO vendor_ledger (vendor_id, transaction_date, transaction_type, reference_number, credit, description)
                             VALUES ($1, $2, 'Payment', $3, $4, $5)`,
                            [
                                vendor.id,
                                purchase.purchase_date,
                                `INIT-${purchase.id}`,
                                diff,
                                `Initial Payment for Purchase #${purchase.invoice_number}`
                            ]
                        );
                    }
                }
            }

            // B. Reconcile Payments
            const paymentsRes = await client.query(
                'SELECT pt.*, pm.invoice_number FROM payment_transactions pt LEFT JOIN purchase_master pm ON pt.purchase_id = pm.id WHERE pt.vendor_id = $1',
                [vendor.id]
            );

            for (const payment of paymentsRes.rows) {
                const ref = payment.reference_number || `PMT-${payment.purchase_id}`;
                const ledgerRes = await client.query(
                    "SELECT id, credit FROM vendor_ledger WHERE vendor_id = $1 AND transaction_type = 'Payment' AND (reference_number = $2 OR (reference_number = $3 AND credit = $4))",
                    [vendor.id, ref, `PMT-${payment.purchase_id}`, payment.payment_amount]
                );

                if (ledgerRes.rows.length === 0) {
                    console.log(`  ➕ Adding missing Payment entry for Purchase ID ${payment.purchase_id} (Rs. ${payment.payment_amount})`);
                    await client.query(
                        `INSERT INTO vendor_ledger (vendor_id, transaction_date, transaction_type, reference_number, credit, description)
             VALUES ($1, $2, 'Payment', $3, $4, $5)`,
                        [
                            vendor.id,
                            payment.payment_date,
                            ref,
                            payment.payment_amount,
                            payment.notes || `Payment for Purchase Invoice #${payment.invoice_number || payment.purchase_id}`
                        ]
                    );
                }
            }
        }

        await client.query('COMMIT');
        console.log('\n✅ Vendor Ledger reconciliation completed successfully');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Reconciliation failed:', err.message);
    } finally {
        client.release();
        process.exit();
    }
}

reconcile();
