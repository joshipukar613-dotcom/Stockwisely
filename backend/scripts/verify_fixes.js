const { pool } = require('../config/database');

async function verify() {
    try {
        console.log('--- Verifying 500 error fix (Vendor Products) ---');
        const vendorsController = require('../controllers/vendorsController');
        // Mock req/res
        const req = { params: { id: 1 } };
        const res = {
            json: (data) => console.log('Vendor Products Response Success:', !!data.success),
            status: (code) => ({
                json: (data) => {
                    console.log('Vendor Products Error:', code, data.message);
                    if (data.error) console.log('Detail:', data.error);
                }
            })
        };
        await vendorsController.getVendorProducts(req, res);

        console.log('\n--- Verifying 403 error fix (Role Check) ---');
        const roleCheck = require('../middleware/roleCheck');
        const next = () => console.log('Role Check Passed: next() called');
        const middleware = roleCheck(['SALES_CLERK']);
        const reqAuth = { user: { role: 'ADMIN' } };
        const resAuth = {
            status: (code) => ({
                json: (data) => console.log('Role Check Failed:', code, data.message)
            })
        };
        middleware(reqAuth, resAuth, next);

        process.exit(0);
    } catch (e) {
        console.error('Verification failed:', e);
        process.exit(1);
    }
}

verify();
